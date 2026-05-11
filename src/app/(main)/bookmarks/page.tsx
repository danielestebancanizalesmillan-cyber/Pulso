import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { USER_SELECT } from "@/lib/constants";
import { TweetCard } from "@/components/TweetCard";
import { redirect } from "next/navigation";

export const metadata = {
    title: "Bookmarks / Pulso",
};

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
            _count: { select: { likes: true, replies: true, retweets: true, bookmarks: true } },
        }
    },
    quoteOf: {
        include: {
            author: { select: { name: true, username: true, avatar: true, isVerified: true } },
            images: { select: { url: true, type: true } }
        }
    },
    _count: { select: { likes: true, replies: true, retweets: true, bookmarks: true } },
};

import { BookmarksContent } from "@/components/BookmarksContent";

export default async function BookmarksPage({ searchParams }: { searchParams: Promise<{ folderId?: string }> }) {
    const session = await auth();
    if (!session?.user?.id) return redirect("/login");

    const { folderId } = await searchParams;
    const userId = session.user.id;
    const username = (session.user as any).username;

    const folders = await prisma.bookmarkFolder.findMany({
        where: { userId },
        orderBy: { name: "asc" },
    });

    const bookmarks = await prisma.bookmark.findMany({
        where: { 
            userId,
            folderId: folderId || undefined,
        },
        orderBy: { createdAt: "desc" },
        include: {
            tweet: {
                include: TWEET_INCLUDE as any,
            },
        },
    });

    const tweets = bookmarks.map((b) => b.tweet);

    return (
        <BookmarksContent 
            tweets={tweets} 
            userId={userId} 
            username={username} 
            folders={folders} 
            currentFolderId={folderId}
        />
    );
}
