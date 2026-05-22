import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ username: string }> }) {
    try {
        const session = await auth();
        if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { badgeId } = await req.json();
        const { username } = await params;

        const user = await prisma.user.findUnique({
            where: { username }
        });

        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const userBadge = await prisma.userBadge.create({
            data: {
                userId: user.id,
                badgeId
            }
        });

        return NextResponse.json(userBadge);
    } catch (e: any) {
        if (e.code === 'P2002') {
            return NextResponse.json({ error: "User already has this badge" }, { status: 400 });
        }
        return NextResponse.json({ error: "Failed to assign badge" }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ username: string }> }) {
    try {
        const session = await auth();
        if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const url = new URL(req.url);
        const badgeId = url.searchParams.get("badgeId");
        const { username } = await params;

        if (!badgeId) return NextResponse.json({ error: "Missing badgeId" }, { status: 400 });

        const user = await prisma.user.findUnique({
            where: { username }
        });

        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        await prisma.userBadge.delete({
            where: {
                userId_badgeId: {
                    userId: user.id,
                    badgeId
                }
            }
        });

        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: "Failed to remove badge" }, { status: 500 });
    }
}
