import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        const existingLike = await prisma.like.findUnique({
            where: {
                userId_tweetId: {
                    userId: session.user.id,
                    tweetId: id,
                }
            }
        });

        if (existingLike) {
            // Unlike
            await prisma.like.delete({
                where: { id: existingLike.id }
            });
            return NextResponse.json({ liked: false });
        } else {
            // Like
            await prisma.like.create({
                data: {
                    userId: session.user.id,
                    tweetId: id,
                }
            });
            return NextResponse.json({ liked: true });
        }
    } catch (error) {
        console.error("[TWEETS_LIKE_POST]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
