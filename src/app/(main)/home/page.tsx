import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { USER_SELECT } from "@/lib/constants";
import { ComposeTweet } from "@/components/ComposeTweet";
import { InfiniteFeed } from "@/components/InfiniteFeed";
import { HomeTabs } from "@/components/HomeTabs";

const TWEET_INCLUDE = {
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
                    author: { select: { name: true, username: true, avatar: true, isVerified: true } },
                    images: { select: { url: true, type: true } }
                }
            },
            _count: { select: { likes: true, replies: true, retweets: true, bookmarks: true } },
        },
    },
    _count: { select: { likes: true, replies: true, retweets: true, bookmarks: true } },
};

import Link from "next/link";

const EMPTY_TWEETS: any[] = [];

export default async function HomePage({ searchParams }: { searchParams: Promise<{ tab?: string, geo?: string }> }) {
    const resolvedSearchParams = await searchParams;
    const tab = resolvedSearchParams.tab || "for-you";
    const geo = resolvedSearchParams.geo || "local";

    const session = await auth();
    const userId = session?.user?.id;
    const userCountry = (session?.user as any)?.countryCode;
    const isGuest = !userId;

    return (
        <>
            <div className="column-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h1>Home</h1>
                {userCountry && (
                    <div style={{ display: "flex", background: "var(--bg-hover)", borderRadius: "20px", padding: "4px" }}>
                        <Link 
                            href={`/home?tab=${tab}&geo=local`} 
                            style={{ 
                                padding: "4px 12px", 
                                borderRadius: "16px", 
                                fontSize: "0.85rem", 
                                textDecoration: "none",
                                background: geo === "local" ? "var(--blue)" : "transparent",
                                color: geo === "local" ? "white" : "var(--text-secondary)"
                            }}
                        >
                            📍 {userCountry}
                        </Link>
                        <Link 
                            href={`/home?tab=${tab}&geo=global`} 
                            style={{ 
                                padding: "4px 12px", 
                                borderRadius: "16px", 
                                fontSize: "0.85rem", 
                                textDecoration: "none",
                                background: geo === "global" ? "var(--blue)" : "transparent",
                                color: geo === "global" ? "white" : "var(--text-secondary)"
                            }}
                        >
                            🌐 Global
                        </Link>
                    </div>
                )}
            </div>
            {session && <HomeTabs tab={tab} geo={geo} />}
            {session && <ComposeTweet />}
            <InfiniteFeed 
                tab={isGuest ? "global" : tab} 
                initialTweets={EMPTY_TWEETS} 
                endpoint={isGuest ? "/api/feed/global" : "/api/feed"}
                currentUserId={userId}
                countryCode={geo === "global" ? "GLOBAL" : userCountry}
            />
        </>
    );
}
