import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { USER_SELECT } from "@/lib/constants";

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


export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const tweet = await prisma.tweet.findUnique({
            where: { id },
            include: TWEET_INCLUDE as any,
        });

        if (!tweet) {
            return NextResponse.json({ error: "Tweet not found" }, { status: 404 });
        }

        return NextResponse.json(tweet);
    } catch (error) {
        console.error("Error fetching single tweet:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
