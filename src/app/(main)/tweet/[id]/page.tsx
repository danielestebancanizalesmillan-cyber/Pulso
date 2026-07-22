import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { USER_SELECT } from "@/lib/constants";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { TweetCard } from "@/components/TweetCard";
import { ComposeTweet } from "@/components/ComposeTweet";
import { TweetActionBar } from "@/components/TweetActionBar";
import { PostContentTranslator } from "@/components/PostContentTranslator";
import { ViewCounter } from "@/components/ViewCounter";
import { Avatar } from "@/components/Avatar";
import Link from "next/link";

const TWEET_INCLUDE = {
    author: { select: USER_SELECT },
    likes: { select: { userId: true } },
    bookmarks: { select: { userId: true } },
    parent: {
        include: {
            author: { select: USER_SELECT },
            likes: { select: { userId: true } },
            replies: { select: { id: true } },
            _count: { select: { likes: true, replies: true, retweets: true } },
            parent: {
                include: {
                    author: { select: USER_SELECT }
                }
            }
        }
    },
    images: { select: { url: true, type: true } },
    replies: {
        include: {
            author: { select: USER_SELECT },
            likes: { select: { userId: true } },
            bookmarks: { select: { userId: true } },
            images: { select: { url: true, type: true } },
            replies: {
                include: {
                    author: { select: USER_SELECT },
                    likes: { select: { userId: true } },
                    bookmarks: { select: { userId: true } },
                    images: { select: { url: true, type: true } },
                    _count: { select: { likes: true, replies: true, retweets: true } },
                },
                orderBy: { createdAt: "asc" as const },
            },
            retweets: { select: { id: true, authorId: true } },
            _count: { select: { likes: true, replies: true, retweets: true, bookmarks: true } },
        },
        orderBy: { createdAt: "asc" as const },
    },
    retweets: { select: { id: true, authorId: true } },
    retweetOf: {
        include: {
            author: { select: USER_SELECT },
            likes: { select: { userId: true } },
            replies: { select: { id: true } },
            retweets: { select: { id: true, authorId: true } },
            bookmarks: { select: { userId: true } },
            images: { select: { url: true, type: true } },
            quoteOf: {
                include: {
                    author: { select: { name: true, username: true, avatar: true } },
                    images: { select: { url: true, type: true } }
                }
            },
            _count: { select: { likes: true, replies: true, retweets: true, bookmarks: true } },
        },
    },
    quoteOf: {
        include: {
            author: { select: { name: true, username: true, avatar: true, isVerified: true } },
            images: { select: { url: true, type: true } }
        }
    },
    poll: {
        include: {
            options: {
                include: {
                    votes: { select: { userId: true } }
                }
            }
        }
    },
    _count: { select: { likes: true, replies: true, retweets: true, bookmarks: true } },
};

import { TweetDetailContent } from "@/components/TweetDetailContent";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const tweet = await prisma.tweet.findUnique({
        where: { id: resolvedParams.id },
        include: { 
            author: { select: { name: true, username: true } },
            images: { select: { url: true } }
        }
    });

    if (!tweet) return { title: "Tweet no encontrado" };

    const headersList = await headers();
    const host = headersList.get("host") || "pulso-tdch.vercel.app";
    const protocol = host.includes("localhost") ? "http" : "https";
    const baseUrl = `${protocol}://${host}`;
    const ogImageUrl = `${baseUrl}/api/og?id=${resolvedParams.id}`;

    const ogImages: any[] = [{ url: ogImageUrl, width: 1200, height: 600 }];
    if (tweet.images && tweet.images.length > 0) {
        let imageUrl = tweet.images[0].url;
        if (!imageUrl.startsWith("http")) {
            imageUrl = `${baseUrl}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
        }
        ogImages.unshift({
            url: imageUrl,
            alt: tweet.content ? tweet.content.substring(0, 100) : "Pulso Media"
        });
    }

    return {
        title: `${tweet.author.name} (@${tweet.author.username}) en Pulso`,
        description: tweet.content ? (tweet.content.substring(0, 160) + (tweet.content.length > 160 ? "..." : "")) : "Ver tweet en Pulso",
        openGraph: {
            title: `${tweet.author.name} (@${tweet.author.username}) en Pulso`,
            description: tweet.content ? (tweet.content.substring(0, 160) + (tweet.content.length > 160 ? "..." : "")) : "Ver tweet en Pulso",
            images: ogImages,
            type: "article"
        },
        twitter: {
            card: "summary_large_image",
            title: `${tweet.author.name} (@${tweet.author.username}) en Pulso`,
            description: tweet.content ? (tweet.content.substring(0, 160) + (tweet.content.length > 160 ? "..." : "")) : "Ver tweet en Pulso",
            images: ogImages.map(img => img.url),
        }
    };
}

export default async function TweetPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const session = await auth();
    const userId = session?.user?.id;

    const tweet = await prisma.tweet.findUnique({
        where: { id: resolvedParams.id },
        include: TWEET_INCLUDE as any,
    });

    if (!tweet) notFound();

    return (
        <TweetDetailContent tweet={tweet} userId={userId} />
    );
}
