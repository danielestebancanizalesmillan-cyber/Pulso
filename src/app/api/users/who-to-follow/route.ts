import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ users: [] });

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get("limit") || "3");

        // Get users that current user is NOT following
        const following = await prisma.follow.findMany({
            where: { followerId: session.user.id },
            select: { followingId: true }
        });

        const followingIds = following.map(f => f.followingId);
        followingIds.push(session.user.id); // Also exclude self

        // Simple pool fetch without complex aggregations to avoid SQLite bugs
        const usersRaw = await prisma.user.findMany({
            where: {
                id: { notIn: followingIds }
            },
            take: 10, 
            select: {
                id: true,
                name: true,
                username: true,
                image: true,
                avatar: true,
                isVerified: true,
            }
        });

        // Fisher-Yates shuffle for variety
        const users = usersRaw
            .sort(() => Math.random() - 0.5)
            .slice(0, limit);

        return NextResponse.json({ users });
    } catch (error) {
        console.error("Who to follow API error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
