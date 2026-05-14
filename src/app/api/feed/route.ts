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

export async function GET(req: Request) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const type = searchParams.get("type") || "for-you";
    const countryCode = searchParams.get("countryCode");
    const limit = 10;

    // Get user interests
    const userInterests = await prisma.userInterest.findMany({
        where: { userId },
        select: { category: true }
    });
    const selectedCategories = userInterests.map(i => i.category);

    // Get security filters
    const [blockedByMe, blockedMe, mutedByMe] = await Promise.all([
        prisma.block.findMany({ where: { blockerId: userId }, select: { blockedId: true } }),
        prisma.block.findMany({ where: { blockedId: userId }, select: { blockerId: true } }),
        prisma.mute.findMany({ where: { muterId: userId }, select: { mutedId: true } }),
    ]);

    const excludeUserIds = [
        ...blockedByMe.map(b => b.blockedId),
        ...blockedMe.map(b => b.blockerId),
        ...mutedByMe.map(m => m.mutedId)
    ];

    let where: any = { 
        parentId: null,
        authorId: { notIn: excludeUserIds }
    };

    if (selectedCategories.length > 0) {
        where.category = { in: selectedCategories };
    }

    if (countryCode && countryCode !== "GLOBAL") {
        where.countryCode = countryCode;
    }

    if (type === "following") {
        const following = await prisma.follow.findMany({
            where: { followerId: userId },
            select: { followingId: true },
        });
        const followingIds = following.map((f) => f.followingId);
        where.authorId = { 
            in: followingIds,
            notIn: excludeUserIds
        };
    }

    const tweets = await prisma.tweet.findMany({
        take: limit * 3, // Overfetch to score in memory
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        where,
        orderBy: { createdAt: "desc" },
        include: TWEET_INCLUDE as any,
    });

    if (type === "for-you" || !type) {
        const scoredTweets = tweets.map((t: any) => {
            const likesCount = t._count?.likes || 0;
            const retweetsCount = t._count?.retweets || 0;
            const repliesCount = t._count?.replies || 0;
            
            // Base engagement score
            const baseScore = likesCount * 2 + retweetsCount * 3 + repliesCount * 2;
            
            // Verification and Promotion boosts
            const verifiedBoost = t.author?.isVerified ? 2.5 : 1.0;
            const promotedBoost = t.isPromoted ? 10.0 : 1.0;
            
            const score = baseScore * verifiedBoost * promotedBoost;
            
            const hoursPassed = (Date.now() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60);
            const decayedScore = score / Math.pow(hoursPassed + 2, 1.5);
            
            return { ...t, score: decayedScore };
        });

        scoredTweets.sort((a, b) => b.score - a.score);
        return NextResponse.json({ tweets: scoredTweets.slice(0, limit) });
    }

    return NextResponse.json({ tweets: tweets.slice(0, limit) });
}
