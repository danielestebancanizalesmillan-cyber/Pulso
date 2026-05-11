import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const following = await prisma.follow.findMany({
        where: { followerId: session.user.id },
        select: { followingId: true },
    });
    const followingIds = following.map((f) => f.followingId);

    const users = await prisma.user.findMany({
        where: {
            id: { notIn: [session.user.id, ...followingIds] },
        },
        take: 5,
        select: { id: true, name: true, username: true, isVerified: true },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users });
}
