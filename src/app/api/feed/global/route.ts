
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { USER_SELECT } from "@/lib/constants";
import { auth } from "@/lib/auth";


export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const limit = 10;

    const session = await auth();
    let showSensitive = false;
    if (session?.user?.id) {
        const userDb = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { showSensitiveContent: true }
        });
        showSensitive = userDb?.showSensitiveContent ?? false;
    }

    const where: any = { parentId: null, retweetOfId: null };
    if (!showSensitive) {
        where.classification = "SAFE";
    }

    const tweets = await prisma.tweet.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit * 3,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,

        include: {
            author: { select: USER_SELECT },
            likes: { select: { userId: true } },
            replies: { select: { id: true } },
            retweets: { select: { id: true, authorId: true } },
            bookmarks: { select: { userId: true } },
            images: { select: { url: true, type: true } },
            quoteOf: {
                include: {
                    author: { select: { name: true, username: true, avatar: true, isVerified: true } },
                    images: { select: { url: true, type: true } }
                }
            },
            _count: { select: { likes: true, replies: true, retweets: true, bookmarks: true } },
        },
    });

    const scoredTweets = tweets.map((t: any) => {
        const likesCount = t._count?.likes || 0;
        const retweetsCount = t._count?.retweets || 0;
        const repliesCount = t._count?.replies || 0;
        
        const score = likesCount * 1.5 + retweetsCount * 2.5 + repliesCount * 1.5;
        const hoursPassed = (Date.now() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60);
        const decayedScore = score / Math.pow(hoursPassed + 2, 1.3); // Slightly slower decay for global
        
        return { ...t, score: decayedScore };
    });

    scoredTweets.sort((a: any, b: any) => b.score - a.score);

    return NextResponse.json({ tweets: scoredTweets.slice(0, limit) });
}
