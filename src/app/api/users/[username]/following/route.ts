import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ username: string }> }
) {
    try {
        const { username } = await params;
        const following = await prisma.follow.findMany({
            where: {
                follower: {
                    username: username
                }
            },
            include: {
                following: true
            }
        });

        const users = following.map(f => f.following);
        return NextResponse.json(users);
    } catch (error) {
        console.error("Error fetching following:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
