import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { USER_SELECT } from "@/lib/constants";
import { notFound } from "next/navigation";
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
        include: { author: { select: { name: true, username: true } } }
    });

    if (!tweet) return { title: "Tweet no encontrado" };

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const ogImageUrl = `${baseUrl}/api/og?id=${resolvedParams.id}`;

    return {
        title: `${tweet.author.name} (@${tweet.author.username}) en Pulso`,
        description: tweet.content ? (tweet.content.substring(0, 160) + (tweet.content.length > 160 ? "..." : "")) : "Ver tweet en Pulso",
        openGraph: {
            images: [ogImageUrl],
        },
        twitter: {
            card: "summary_large_image",
            images: [ogImageUrl],
        }
    };
}

export default async function TweetPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const session = await auth();
    const userId = session?.user?.id!;

    const tweet = await prisma.tweet.findUnique({
        where: { id: resolvedParams.id },
        include: TWEET_INCLUDE as any,
    });

    if (!tweet) notFound();

    return (
        <TweetDetailContent tweet={tweet} userId={userId} />
    );
}
