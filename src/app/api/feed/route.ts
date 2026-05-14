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

    // In "For You", interests are used for boosting, not for strict filtering
    // Unless we are in a specific category tab (not implemented yet)

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

    const [tweets, ads] = await Promise.all([
        prisma.tweet.findMany({
            take: limit * 3, // Overfetch to score in memory
            skip: cursor ? 1 : 0,
            cursor: cursor ? { id: cursor } : undefined,
            where,
            orderBy: { createdAt: "desc" },
            include: TWEET_INCLUDE as any,
        }),
        prisma.ad.findMany({
            where: { active: true },
            take: 2 // Get a few ads to inject
        })
    ]);

    let finalTweets: any[] = [];

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
            
            // Interest boost
            const interestBoost = (t.category && selectedCategories.includes(t.category)) ? 2.0 : 1.0;
            const finalScore = score * interestBoost;

            const hoursPassed = (Date.now() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60);
            const decayedScore = finalScore / Math.pow(hoursPassed + 2, 1.5);
            
            return { ...t, score: decayedScore };
        });

        scoredTweets.sort((a, b) => b.score - a.score);
        finalTweets = scoredTweets.slice(0, limit);
    } else {
        finalTweets = tweets.slice(0, limit);
    }

    // Inject Ads every 5 tweets for non-verified users
    const isVerified = (session.user as { isVerified?: boolean })?.isVerified;
    if (!isVerified && ads.length > 0) {
        const result: typeof finalTweets = [];
        finalTweets.forEach((tweet, index) => {
            result.push(tweet);
            if ((index + 1) % 5 === 0) {
                const adIndex = Math.floor((index + 1) / 5) - 1;
                if (ads[adIndex % ads.length]) {
                    result.push({
                        ...ads[adIndex % ads.length],
                        id: `ad-${ads[adIndex % ads.length].id}-${index}`,
                        isAd: true
                    });
                }
            }
        });
        return NextResponse.json({ tweets: result });
    }

    return NextResponse.json({ tweets: finalTweets });
}
