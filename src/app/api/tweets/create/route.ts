import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { content, inReplyToId } = body;

        if (!content || content.trim().length === 0) {
            return NextResponse.json({ error: "Content is required" }, { status: 400 });
        }

        const tweet = await prisma.tweet.create({
            data: {
                content: content.trim(),
                authorId: session.user.id,
                parentId: inReplyToId || null,
            },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        avatar: true,
                        isVerified: true,
                    }
                },
                _count: {
                    select: {
                        likes: true,
                        replies: true,
                        retweets: true,
                    }
                }
            }
        });

        return NextResponse.json(tweet);
    } catch (error) {
        console.error("[TWEETS_CREATE_POST]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
