import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { USER_SELECT } from "@/lib/constants";
import { notFound } from "next/navigation";
import { TweetCard } from "@/components/TweetCard";
import { Avatar } from "@/components/Avatar";
import { FollowButton } from "@/components/FollowButton";
import { MessageButton } from "@/components/MessageButton";
import Link from "next/link";

const TWEET_INCLUDE = {
    author: { select: USER_SELECT },
    likes: { select: { userId: true } },
    replies: { select: { id: true } },
    retweets: { select: { id: true, authorId: true } },
    bookmarks: { select: { userId: true } },
    highlights: { select: { userId: true } },
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
                    author: { select: { name: true, username: true, avatar: true } },
                    images: { select: { url: true, type: true } }
                }
            },
            _count: { select: { likes: true, replies: true, retweets: true, bookmarks: true } },
        },
    },
    quoteOf: {
        include: {
            author: { select: { name: true, username: true, avatar: true } },
            images: { select: { url: true, type: true } }
        }
    },
    _count: { select: { likes: true, replies: true, retweets: true, bookmarks: true } },
};

import { ProfileContent } from "@/components/ProfileContent";

export default async function ProfilePage({ params, searchParams }: { params: Promise<{ username: string }>, searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const resolvedParams = await params;
    const resolvedSearchParams = await searchParams;
    const tab = (resolvedSearchParams.tab as string) || "posts";

    const session = await auth();
    const currentUserId = session?.user?.id!;

    const user = await prisma.user.findUnique({
        where: { username: resolvedParams.username },
        include: {
            _count: { select: { followers: true, following: true, tweets: true } },
        },
    });

    if (!user) notFound();

    const [isFollowing, isBlocked, isMuted, isBlockingMe, isPendingRequest] = (currentUserId && currentUserId !== user.id)
        ? await Promise.all([
            prisma.follow.findUnique({
                where: { followerId_followingId: { followerId: currentUserId, followingId: user.id } },
            }).then(r => !!r),
            prisma.block.findUnique({
                where: { blockerId_blockedId: { blockerId: currentUserId, blockedId: user.id } },
            }).then(r => !!r),
            prisma.mute.findUnique({
                where: { muterId_mutedId: { muterId: currentUserId, mutedId: user.id } },
            }).then(r => !!r),
            prisma.block.findUnique({
                where: { blockerId_blockedId: { blockerId: user.id, blockedId: currentUserId } },
            }).then(r => !!r),
            prisma.followRequest.findUnique({
                where: { senderId_receiverId: { senderId: currentUserId, receiverId: user.id } }
            }).then(r => !!r),
        ])
        : [false, false, false, false, false];

    const isOwn = currentUserId === user.id;

    let tweetsWhere: any = { authorId: user.id, parentId: null };
    if (tab === "replies") {
        tweetsWhere = { authorId: user.id, parentId: { not: null } };
    } else if (tab === "likes") {
        tweetsWhere = { likes: { some: { userId: user.id } } };
    } else if (tab === "highlights") {
        tweetsWhere = { highlights: { some: { userId: user.id } } };
    }

    const canSeeTweets = isOwn || isFollowing || !user.isPrivate;

    const tweets = canSeeTweets 
        ? await prisma.tweet.findMany({
            where: { ...tweetsWhere, id: { not: user.pinnedTweetId || undefined } },
            orderBy: { createdAt: "desc" },
            take: 30,
            include: TWEET_INCLUDE as any,
        })
        : [];
    let pinnedTweet = null;
    if (user.pinnedTweetId) {
        pinnedTweet = await prisma.tweet.findUnique({
            where: { id: user.pinnedTweetId },
            include: TWEET_INCLUDE as any,
        });
    }

    return (
        <ProfileContent 
            user={user} 
            tweets={tweets} 
            pinnedTweet={pinnedTweet}
            tab={tab} 
            isOwn={isOwn} 
            isFollowing={isFollowing} 
            isPendingRequest={isPendingRequest}
            isBlocked={isBlocked}
            isMuted={isMuted}
            isBlockingMe={isBlockingMe}
            currentUserId={currentUserId} 
        />
    );
}
