import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { USER_SELECT } from "@/lib/constants";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const q = req.nextUrl.searchParams.get("q") || "";
    const lowerQ = q.toLowerCase();

    // Advanced Filters parsing
    const fromMatch = q.match(/from:(\w+)/i);
    const minLikesMatch = q.match(/min_likes:(\d+)/i);
    const hasMediaMatch = q.match(/has:(media|images)/i);
    const sinceMatch = q.match(/since:(\d{4}-\d{2}-\d{2})/i);
    const untilMatch = q.match(/until:(\d{4}-\d{2}-\d{2})/i);
    
    // Clean string for text search
    let cleanQ = q
        .replace(/from:\w+/gi, "")
        .replace(/min_likes:\d+/gi, "")
        .replace(/has:(media|images)/gi, "")
        .replace(/since:\d{4}-\d{2}-\d{2}/gi, "")
        .replace(/until:\d{4}-\d{2}-\d{2}/gi, "")
        .trim();

    const tweetWhere: any = {
        parentId: null,
    };

    const hashtagSearch = cleanQ.replace(/^#/, '').toLowerCase();

    if (cleanQ) {
        const words = cleanQ.split(/\s+/).filter(w => w.length > 0);
        const wordConditions = words.map(word => ({
            content: { contains: word, mode: "insensitive" } as any
        }));

        tweetWhere.OR = [
            { content: { contains: cleanQ, mode: "insensitive" } },
            { AND: wordConditions },
            { hashtags: { some: { text: { contains: hashtagSearch, mode: "insensitive" } } } }
        ];
    }

    if (fromMatch) {
        tweetWhere.author = { username: fromMatch[1] };
    }

    if (hasMediaMatch) {
        tweetWhere.images = { some: {} };
    }

    if (sinceMatch || untilMatch) {
        tweetWhere.createdAt = {};
        if (sinceMatch) tweetWhere.createdAt.gte = new Date(sinceMatch[1]);
        if (untilMatch) tweetWhere.createdAt.lte = new Date(untilMatch[1]);
    }

    const [users, tweets, hashtags] = await Promise.all([
        prisma.user.findMany({
            where: {
                OR: [
                    { name: { contains: cleanQ || q, mode: "insensitive" } },
                    { username: { contains: cleanQ || q, mode: "insensitive" } },
                ],
                NOT: { id: session.user.id },
            },
            take: 10,
            select: { id: true, name: true, username: true, bio: true, avatar: true, isVerified: true },
        }),
        prisma.tweet.findMany({
            where: tweetWhere,
            take: minLikesMatch ? 50 : 20, // Increase limit for local filtering
            orderBy: { createdAt: "desc" },
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
        }),
        prisma.hashtag.findMany({
            where: { text: { contains: hashtagSearch || q.replace(/^#/, '').toLowerCase(), mode: "insensitive" } },
            take: 5,
            select: { text: true, _count: { select: { tweets: true } } },
        }),
    ]);

    // Local filter for min_likes
    let filteredTweets = tweets;
    if (minLikesMatch) {
        const minLikes = parseInt(minLikesMatch[1], 10);
        filteredTweets = tweets.filter(t => (t._count?.likes || 0) >= minLikes).slice(0, 20);
    }

    return NextResponse.json({ users, tweets: filteredTweets, hashtags });
}