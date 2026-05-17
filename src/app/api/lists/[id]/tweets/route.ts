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
                    author: { select: { name: true, username: true, avatar: true, isVerified: true } },
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
    _count: { select: { likes: true, replies: true, retweets: true, bookmarks: true } },
};

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const resolvedParams = await params;
    const listId = resolvedParams.id;
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const limit = 10;

    const list = await prisma.tweetList.findUnique({
        where: { id: listId },
        include: { members: { select: { userId: true } } }
    });

    if (!list) return NextResponse.json({ error: "List not found" }, { status: 404 });
    if (list.isPrivate && list.creatorId !== session.user.id) {
        return NextResponse.json({ error: "Private list" }, { status: 403 });
    }

    const memberIds = list.members.map(m => m.userId);

    const userDb = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { showSensitiveContent: true }
    });
    const showSensitive = userDb?.showSensitiveContent ?? false;

    const where: any = {
        authorId: { in: memberIds },
        parentId: null
    };

    if (!showSensitive) {
        where.classification = "SAFE";
    }

    const tweets = await prisma.tweet.findMany({
        take: limit,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        where,
        orderBy: { createdAt: "desc" },
        include: TWEET_INCLUDE as any,
    });

    return NextResponse.json({ tweets });
}
