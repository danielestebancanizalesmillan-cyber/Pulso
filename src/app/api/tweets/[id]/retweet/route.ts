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

        // Verify tweet exists
        const targetTweet = await prisma.tweet.findUnique({
            where: { id }
        });

        if (!targetTweet) {
            return NextResponse.json({ error: "Tweet not found" }, { status: 404 });
        }

        // Check if user already retweeted this
        const existingRetweet = await prisma.tweet.findFirst({
            where: {
                authorId: session.user.id,
                retweetOfId: id,
            }
        });

        if (existingRetweet) {
            // Undo retweet
            await prisma.tweet.delete({
                where: { id: existingRetweet.id }
            });
            return NextResponse.json({ retweeted: false });
        } else {
            // Create retweet
            await prisma.tweet.create({
                data: {
                    content: "", // Retweets usually have empty content if not quote tweeting
                    authorId: session.user.id,
                    retweetOfId: id,
                }
            });
            return NextResponse.json({ retweeted: true });
        }
    } catch (error) {
        console.error("[TWEETS_RETWEET_POST]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
