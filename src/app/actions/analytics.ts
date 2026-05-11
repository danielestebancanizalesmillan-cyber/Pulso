"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function getCreatorAnalytics() {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    // Fetch user profile stats
    const [userStats, tweets] = await Promise.all([
        prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                _count: {
                    select: {
                        followers: true,
                        following: true,
                    }
                }
            }
        }),
        prisma.tweet.findMany({
            where: { authorId: session.user.id, retweetOfId: null }, // Original tweets & quotes only
            select: {
                id: true,
                content: true,
                views: true,
                createdAt: true,
                _count: { select: { likes: true, replies: true, retweets: true, bookmarks: true } }
            },
            orderBy: { createdAt: "desc" },
        })
    ]);

    const totalViews = tweets.reduce((acc, t) => acc + (t.views || 0), 0);
    const totalLikes = tweets.reduce((acc, t) => acc + (t._count?.likes || 0), 0);
    const totalReplies = tweets.reduce((acc, t) => acc + (t._count?.replies || 0), 0);
    const totalRetweets = tweets.reduce((acc, t) => acc + (t._count?.retweets || 0), 0);
    const totalBookmarks = tweets.reduce((acc, t) => acc + (t._count?.bookmarks || 0), 0);

    // Score for sorting top tweets: views + likes * 2 + RT * 2
    const topTweets = [...tweets]
        .sort((a, b) => {
            const scoreA = (a.views || 0) + (a._count?.likes || 0) * 2 + (a._count?.retweets || 0);
            const scoreB = (b.views || 0) + (b._count?.likes || 0) * 2 + (b._count?.retweets || 0);
            return scoreB - scoreA;
        })
        .slice(0, 5);

    return {
        followersCount: userStats?._count.followers || 0,
        followingCount: userStats?._count.following || 0,
        totalViews,
        totalLikes,
        totalReplies,
        totalRetweets,
        totalBookmarks,
        totalTweets: tweets.length,
        topTweets
    };
}
