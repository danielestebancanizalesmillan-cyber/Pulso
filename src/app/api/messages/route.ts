import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id;

    try {
        const conversations = await prisma.conversation.findMany({
            where: {
                participants: { some: { id: userId } },
                deletedBy: { none: { userId } },
                messages: { some: {} }
            },
            include: {
                participants: {
                    select: { id: true, name: true, username: true, avatar: true }
                },
                messages: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                },
                _count: {
                    select: {
                        messages: {
                            where: { read: false, senderId: { not: userId } }
                        }
                    }
                }
            },
            orderBy: { updatedAt: "desc" },
        });

        return NextResponse.json({ conversations });
    } catch (e: any) {
        return NextResponse.json({ error: "Internal Server Error", details: e?.message || String(e) }, { status: 500 });
    }
}
