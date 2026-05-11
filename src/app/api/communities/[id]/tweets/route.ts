import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { USER_SELECT } from "@/lib/constants";

const TWEET_INCLUDE = {
    author: { select: USER_SELECT },
    likes: { select: { userId: true } },
    replies: { select: { id: true } },
    retweets: { select: { id: true, authorId: true } },
    bookmarks: { select: { userId: true } },
    images: { select: { url: true, type: true } },
    poll: {
        include: {
            options: {
                include: {
                    votes: { select: { userId: true } }
                }
            }
        }
    },
    retweetOf: {
        include: {
            author: { select: USER_SELECT },
            likes: { select: { userId: true } },
            replies: { select: { id: true } },
            retweets: { select: { id: true, authorId: true } },
            bookmarks: { select: { userId: true } },
            images: { select: { url: true, type: true } },
            poll: {
                include: {
                    options: {
                        include: {
                            votes: { select: { userId: true } }
                        }
                    }
                }
            },
            quoteOf: {
                include: {
                    author: { select: { name: true, username: true, avatar: true, isVerified: true, pinnedTweetId: true } },
                    images: { select: { url: true, type: true } }
                }
            },
            _count: { select: { likes: true, replies: true, retweets: true, bookmarks: true } },
        },
    },
    quoteOf: {
        include: {
            author: { select: { name: true, username: true, avatar: true, isVerified: true, pinnedTweetId: true } },
            images: { select: { url: true, type: true } }
        }
    },
    _count: { select: { likes: true, replies: true, retweets: true, bookmarks: true } },
};

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const resolvedParams = await params;
    const communityId = resolvedParams.id;
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const limit = 10;

    const tweets = await prisma.tweet.findMany({
        take: limit,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        where: {
            communityId,
            parentId: null
        },
        orderBy: { createdAt: "desc" },
        include: TWEET_INCLUDE as any,
    });

    return NextResponse.json({ tweets });
}
