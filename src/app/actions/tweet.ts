"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { pusherServer } from "@/lib/pusher";
import { classifyTweet } from "@/lib/classify";
import { USER_SELECT } from "@/lib/constants";
import { getOllamaResponse, PULSAI_SYSTEM_PROMPT, PULSAI_FEED_PROMPT, getThreadContext, runPulsAIEngine, classifyContent } from "@/lib/ai-service";

export async function createTweet(content: string, parentId?: string, images?: { url: string, type: string }[], quoteOfId?: string, poll?: { options: string[], expiresAt: string }, communityId?: string, isSensitive: boolean = false, location?: { lat: number, lng: number, label: string }) {
    console.log(">> Action: createTweet called with content length:", content.length, "images:", images?.length, "poll:", !!poll);
    const session = await auth();
    console.log(">> Action: Session User ID:", session?.user?.id);
    if (!session?.user?.id) throw new Error("Unauthorized");
    const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
    console.log(">> Action: Database User Found:", !!dbUser);
    if (!dbUser) throw new Error("Session invalid or user deleted. Please log out and log back in.");

    const limit = dbUser.isVerified ? 2000 : 280;
    if (content.length > limit) throw new Error(`Tweet is too long (max ${limit} characters)`);

    // Anti-spam: 5 second cooldown
    const lastTweet = await prisma.tweet.findFirst({
        where: { authorId: session.user.id },
        orderBy: { createdAt: "desc" }
    });
    if (lastTweet) {
        const fiveSecondsAgo = new Date(Date.now() - 5000);
        if (lastTweet.createdAt > fiveSecondsAgo) {
            throw new Error("You are tweeting too fast. Please wait a few seconds.");
        }
    }

    const hashtags = Array.from(new Set(content.match(/#[a-zA-Z0-9_]+/g) || []))
        .map((t) => t.toLowerCase())
        .filter(t => t.length > 3 && !/^\d+$/.test(t.substring(1)));

    // Skip synchronous AI classification to speed up posting. 
    // It will be handled in the background after creation.
    const category = null;
    const classification = isSensitive ? "SENSITIVE" : "SAFE";

    console.log(">> Prisma creating tweet...");
    try {
        const tweet = await prisma.tweet.create({
            data: {
                content,
                authorId: session.user.id,
                parentId: parentId || null,
                quoteOfId: quoteOfId || null,
                communityId: communityId || null,
                countryCode: dbUser.countryCode,
                images: {
                    create: images?.map((img) => ({ url: img.url, type: img.type })) || [],
                },
                category,
                classification,
                poll: poll ? {
                    create: {
                        expiresAt: new Date(poll.expiresAt),
                        options: {
                            create: poll.options.map(o => ({ text: o }))
                        }
                    }
                } : undefined,
                hashtags: {
                    connectOrCreate: hashtags.map((h) => ({
                        where: { text: h },
                        create: { text: h },
                    })),
                },
                locationLat: location?.lat,
                locationLng: location?.lng,
                locationLabel: location?.label,
            },
        });
        console.log(">> Tweet created successfully:", tweet.id);

        const mentions = Array.from(new Set(content.match(/@[a-zA-Z0-9_]+/g) || []))
            .map(m => m.substring(1));

        let pulsaiMentioned = mentions.some(m => m.toLowerCase() === "pulsai");

        // Send notifications in parallel (don't block the main flow)
        const notificationPromises = mentions.map(async (username) => {
            if (username.toLowerCase() === "pulsai") return;
            const mentionedUser = await prisma.user.findUnique({ where: { username } });
            if (mentionedUser && mentionedUser.id !== session.user.id) {
                const notif = await prisma.notification.create({
                    data: {
                        type: "mention",
                        userId: mentionedUser.id,
                        actorId: session.user.id,
                        tweetId: tweet.id,
                    },
                    include: { actor: { select: { name: true, image: true, username: true } } }
                });
                await pusherServer.trigger(`user-${mentionedUser.id}`, "notification", {
                    ...notif,
                    message: `${notif.actor.name} mentioned you in a tweet`
                });
            }
        });

        // Notify parent tweet author if it's a reply
        if (parentId) {
            notificationPromises.push((async () => {
                const parent = await prisma.tweet.findUnique({ where: { id: parentId } });
                if (parent && parent.authorId !== session.user.id) {
                    const notif = await prisma.notification.create({
                        data: {
                            type: "reply",
                            userId: parent.authorId,
                            actorId: session.user.id,
                            tweetId: tweet.id,
                        },
                        include: { actor: { select: { name: true, image: true, username: true } } }
                    });
                    await pusherServer.trigger(`user-${parent.authorId}`, "notification", {
                        ...notif,
                        message: `${notif.actor.name} replied to your tweet`
                    });
                }
                await pusherServer.trigger("tweet-actions", "reply-update", { tweetId: parentId });
            })());
        }

        // Notify quoted tweet author
        if (quoteOfId) {
            notificationPromises.push((async () => {
                const quoted = await prisma.tweet.findUnique({ where: { id: quoteOfId } });
                if (quoted && quoted.authorId !== session.user.id) {
                    const notif = await prisma.notification.create({
                        data: {
                            type: "retweet",
                            userId: quoted.authorId,
                            actorId: session.user.id,
                            tweetId: tweet.id,
                        },
                        include: { actor: { select: { name: true, image: true, username: true } } }
                    });
                    await pusherServer.trigger(`user-${quoted.authorId}`, "notification", {
                        ...notif,
                        message: `${notif.actor.name} quoted your tweet`
                    });
                }
            })());
        }

        // We run notifications in background to return faster
        Promise.all(notificationPromises).catch(err => console.error(">> Error in background notifications:", err));

        // 🤖 BOT TRIGGER: Detect if PulsAI should respond
        try {
            let shouldRespond = false;
            let botId = "";

            // Caso A: Es una respuesta directa a PulsAI
            if (parentId) {
                const parent = await prisma.tweet.findUnique({ 
                    where: { id: parentId }, 
                    select: { author: { select: { id: true, username: true } } } 
                });
                if (parent?.author.username === "PulsAI" && session.user.id !== parent.author.id) {
                    shouldRespond = true;
                    botId = parent.author.id;
                    console.log(">> Bot PulsAI triggered via direct reply.");
                }
            }

            // Caso B: Se mencionó a PulsAI (y no se detectó ya como respuesta directa)
            if (!shouldRespond && pulsaiMentioned) {
                const botUser = await prisma.user.findUnique({ where: { username: "PulsAI" }, select: { id: true } });
                if (botUser && session.user.id !== botUser.id) {
                    shouldRespond = true;
                    botId = botUser.id;
                    console.log(">> Bot PulsAI triggered via mention.");
                }
            }

            if (shouldRespond && botId) {
                // No hacemos 'await' para que el usuario no tenga que esperar. 
                // Usamos `after` de next/server (común en Next 15/16) para desvincular la promesa
                try {
                    const { after } = require('next/server');
                    after(() => {
                        processAIResponse(tweet.id, botId, dbUser.name ?? "User", dbUser.username ?? "user", content).catch(console.error);
                    });
                } catch (e) {
                    setTimeout(() => processAIResponse(tweet.id, botId, dbUser.name ?? "User", dbUser.username ?? "user", content).catch(console.error), 10);
                }
            }
        } catch (botErr) {
            console.error(">> Error in bot trigger logic:", botErr);
        }

        // --- BACKGROUND TASKS ---
        // 1. AI Classification & Moderation (Delayed)
        if (!isSensitive) {
            (async () => {
                try {
                    console.log(">> [Background] Starting classification for tweet:", tweet.id);
                    const [category, classification] = await Promise.all([
                        classifyTweet(content),
                        classifyContent(content)
                    ]);
                    await prisma.tweet.update({
                        where: { id: tweet.id },
                        data: { category, classification }
                    });
                    console.log(`>> [Background] Tweet ${tweet.id} updated with Category: ${category}, Classification: ${classification}`);
                } catch (err) {
                    console.error(">> [Background] Error in classification update:", err);
                }
            })();
        }


        // Trigger real-time event for global feed (if it's a top level tweet)
        if (!parentId) {
            // Fetch the full tweet with author to broadcast
            const fullTweet = await prisma.tweet.findUnique({
                where: { id: tweet.id },
                include: { author: { select: USER_SELECT }, _count: { select: { likes: true, replies: true, retweets: true } } }
            });
            await pusherServer.trigger("global-feed", "new-tweet", fullTweet);
        }

        revalidatePath("/home");
        revalidatePath("/");
        return tweet;
    } catch (e: any) {
        console.error(">> Prisma Tweet Error:", e);
        throw new Error(e.message || "Prisma failed to create tweet");
    }
}

export async function deleteTweet(tweetId: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) throw new Error("Unauthorized");
        const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
        if (!dbUser) throw new Error("Session invalid or user deleted.");

        console.log(">> Attempting to delete tweet with ID:", tweetId, "by user:", session.user.id);
        const result = await prisma.tweet.deleteMany({
            where: { 
                id: tweetId,
                OR: [
                    { authorId: session.user.id },
                    { parentId: { not: null }, parent: { authorId: session.user.id } }
                ]
            },
        });
        console.log(">> Deleted count:", result.count);

        if (result.count === 0) {
            throw new Error("No estás autorizado para borrar este contenido, o ya no existe.");
        }

        await pusherServer.trigger("tweet-actions", "tweet-deleted", { tweetId });

        revalidatePath("/home");
        return { success: true };
    } catch (error: any) {
        console.error(">> Error deleting tweet:", error);
        throw new Error(error.message || "Failed to delete tweet");
    }
}

export async function likeTweet(tweetId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!dbUser) throw new Error("Session invalid or user deleted. Please log out and log back in.");

    console.log(">> executing likeTweet with tweetId:", tweetId, "userId:", session.user.id);

    const existing = await prisma.like.findUnique({
        where: { userId_tweetId: { userId: session.user.id, tweetId } },
    });

    if (existing) {
        await prisma.like.delete({ where: { id: existing.id } });
        const tweet = await prisma.tweet.findUnique({ where: { id: tweetId } });
        if (tweet) {
            await prisma.notification.deleteMany({
                where: { type: "like", userId: tweet.authorId, actorId: session.user.id, tweetId }
            });
        }
    } else {
        await prisma.like.create({
            data: { userId: session.user.id, tweetId },
        });
        const tweet = await prisma.tweet.findUnique({ where: { id: tweetId } });
        if (tweet && tweet.authorId !== session.user.id) {
            const notif = await prisma.notification.create({
                data: {
                    type: "like",
                    userId: tweet.authorId,
                    actorId: session.user.id,
                    tweetId,
                },
                include: { actor: { select: { name: true, image: true, username: true } } }
            });
            await pusherServer.trigger(`user-${tweet.authorId}`, "notification", {
                ...notif,
                message: `${notif.actor.name} liked your tweet`
            });
        }
    }

    await pusherServer.trigger("tweet-actions", "like-update", { tweetId, actorId: session.user.id });
}

export async function retweetTweet(tweetId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!dbUser) throw new Error("Session invalid or user deleted. Please log out and log back in.");

    const existing = await prisma.tweet.findFirst({
        where: { authorId: session.user.id, retweetOfId: tweetId },
    });

    if (existing) {
        await prisma.tweet.delete({ where: { id: existing.id } });
        const tweet = await prisma.tweet.findUnique({ where: { id: tweetId } });
        if (tweet) {
            await prisma.notification.deleteMany({
                where: { type: "retweet", userId: tweet.authorId, actorId: session.user.id, tweetId: existing.id }
            });
        }
    } else {
        const rt = await prisma.tweet.create({
            data: {
                content: "",
                authorId: session.user.id,
                retweetOfId: tweetId,
            },
        });
        const tweet = await prisma.tweet.findUnique({ where: { id: tweetId } });
        if (tweet && tweet.authorId !== session.user.id) {
            const notif = await prisma.notification.create({
                data: {
                    type: "retweet",
                    userId: tweet.authorId,
                    actorId: session.user.id,
                    tweetId: rt.id,
                },
                include: { actor: { select: { name: true, image: true, username: true } } }
            });
            await pusherServer.trigger(`user-${tweet.authorId}`, "notification", {
                ...notif,
                message: `${notif.actor.name} retweeted your tweet`
            });
        }
    }

    await pusherServer.trigger("tweet-actions", "rt-update", { tweetId, actorId: session.user.id });
}

export async function toggleBookmark(tweetId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!dbUser) throw new Error("Session invalid or user deleted. Please log out and log back in.");

    const existing = await prisma.bookmark.findUnique({
        where: { userId_tweetId: { userId: session.user.id, tweetId } },
    });

    if (existing) {
        await prisma.bookmark.delete({ where: { id: existing.id } });
    } else {
        await prisma.bookmark.create({
            data: { userId: session.user.id, tweetId },
        });
    }

    await pusherServer.trigger("tweet-actions", "bookmark-update", { tweetId, actorId: session.user.id });
}

export async function toggleHighlight(tweetId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!dbUser) throw new Error("Session invalid or user deleted. Please log out and log back in.");

    const tweet = await prisma.tweet.findUnique({
        where: { id: tweetId }
    });

    if (!tweet || tweet.authorId !== session.user.id) {
        throw new Error("Only the author can highlight this tweet");
    }

    const existing = await prisma.highlight.findUnique({
        where: { userId_tweetId: { userId: session.user.id, tweetId } },
    });

    if (existing) {
        await prisma.highlight.delete({ where: { id: existing.id } });
    } else {
        await prisma.highlight.create({
            data: { userId: session.user.id, tweetId },
        });
    }

    revalidatePath("/home");
    revalidatePath(`/${session.user.username}`);
}

export async function voteInPoll(optionId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const option = await prisma.pollOption.findUnique({
        where: { id: optionId },
        include: { poll: true }
    });

    if (!option) throw new Error("Option not found");
    if (new Date() > option.poll.expiresAt) throw new Error("Poll has expired");

    // Check if already voted in THIS poll
    const existingVote = await prisma.pollVote.findFirst({
        where: {
            userId: session.user.id,
            option: { pollId: option.pollId }
        }
    });

    if (existingVote) throw new Error("Already voted in this poll");

    await prisma.pollVote.create({
        data: {
            userId: session.user.id,
            optionId
        }
    });

    await pusherServer.trigger("tweet-actions", "poll-update", { pollId: option.pollId });

    revalidatePath("/home");
    return { success: true };
}

export async function togglePinTweet(tweetId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const tweet = await prisma.tweet.findUnique({ where: { id: tweetId } });
    if (!tweet || tweet.authorId !== session.user.id) {
        throw new Error("Only the author can pin this tweet");
    }

    const user = await prisma.user.findUnique({ 
        where: { id: session.user.id },
        select: { pinnedTweetId: true }
    });

    const isPinned = user?.pinnedTweetId === tweetId;

    await prisma.user.update({
        where: { id: session.user.id },
        data: { pinnedTweetId: isPinned ? null : tweetId }
    });

    revalidatePath("/home");
    revalidatePath(`/${session.user.username}`);
    return { success: true };
}

export async function promoteTweet(tweetId: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    
    const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!dbUser?.isVerified) throw new Error("Only verified users can promote posts");

    const tweet = await prisma.tweet.findUnique({ where: { id: tweetId } });
    if (!tweet || tweet.authorId !== session.user.id) {
        throw new Error("Only the author can promote this tweet");
    }

    await prisma.tweet.update({
        where: { id: tweetId },
        data: { isPromoted: !tweet.isPromoted }
    });

    revalidatePath("/home");
    revalidatePath("/");
    return { success: true };
}

export async function editTweet(tweetId: string, newContent: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const tweet = await prisma.tweet.findUnique({ where: { id: tweetId } });
    if (!tweet || tweet.authorId !== session.user.id) {
        throw new Error("Only the author can edit this tweet");
    }

    const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!dbUser?.isVerified) throw new Error("Only verified users can edit posts");

    // Check time window (60 minutes)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (tweet.createdAt < oneHourAgo) {
        throw new Error("The editing window (60 minutes) has expired");
    }

    await prisma.tweet.update({
        where: { id: tweetId },
        data: { 
            content: newContent,
            isEdited: true
        }
    });

    revalidatePath("/home");
    revalidatePath("/");
    revalidatePath(`/tweet/${tweetId}`);
    return { success: true };
}

export async function incrementViewCount(tweetId: string) {
    try {
        await prisma.tweet.update({
            where: { id: tweetId },
            data: { views: { increment: 1 } }
        });
        
        // Optional: Trigger pusher for live view updates if needed
        await pusherServer.trigger("tweet-actions", "view-update", { tweetId });
        
        return { success: true };
    } catch (e) {
        console.error("Failed to increment view count:", e);
        return { success: false };
    }
}

/**
 * Procesa la respuesta de la IA en segundo plano para no bloquear el posteo del usuario.
 */
async function processAIResponse(tweetId: string, botId: string, userName: string, userUsername: string, content: string) {
    try {
        console.log(">> Starting background AI processing for tweet:", tweetId);
        
        // Obtener contexto del hilo
        const threadContext = await getThreadContext(tweetId);
        
        // Ejecutar el motor de PulsAI con capacidad de investigación (tools)
        const { response: aiResponse, sources: usedSources } = await runPulsAIEngine([
            ...threadContext
        ], true); // true = modo feed (output texto plano)

        if (aiResponse) {
            // Create the reply as PulsAI
            const botReply = await prisma.tweet.create({
                data: {
                    content: aiResponse,
                    authorId: botId,
                    parentId: tweetId,
                    category: "AI_RESPONSE",
                    aiSources: (usedSources && usedSources.length > 0) ? JSON.stringify(usedSources) : null
                }
            });
            console.log(">> PulsAI background task: successfully replied with sources", botReply.id);
            
            // Revalidate and signal real-time update
            // revalidatePath(`/tweet/${tweetId}`); // Throws error in Next.js background promises
            await pusherServer.trigger("tweet-actions", "reply-update", { tweetId });
        }
    } catch (error: any) {
        console.error(">> Error in background AI processing:", error);
        
        // Fallback: Notify the user that the AI engine is currently offline or crashed.
        try {
            await prisma.tweet.create({
                data: {
                    content: "Mis sistemas neuronales locales (Ollama) acaban de colapsar por falta de memoria RAM/VRAM. Por favor, reinicia mi servidor o usa un modelo más ligero.",
                    authorId: botId,
                    parentId: tweetId,
                    category: "AI_RESPONSE"
                }
            });
            await pusherServer.trigger("tweet-actions", "reply-update", { tweetId });
        } catch (e) {
            console.error(">> Failed to insert fallback AI reply:", e);
        }
    }
}
