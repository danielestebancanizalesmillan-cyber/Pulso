import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request, context: any) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id;

    try {
        const params = await context.params;
        const id = params.id;

        const conversation = await prisma.conversation.findUnique({
            where: { id: id },
            include: {
                participants: {
                    select: { id: true, name: true, username: true, avatar: true }
                },
                messages: {
                    where: {
                        deletedBy: { none: { userId: userId } }
                    },
                    orderBy: { createdAt: "asc" },
                    include: { 
                        sender: { select: { id: true, name: true, avatar: true } },
                    },
                },
            },
        });

        if (!conversation) {
            return NextResponse.json({ error: "Not Found" }, { status: 404 });
        }

        const isParticipant = conversation.participants.some(p => p.id === userId);
        if (!isParticipant) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        return NextResponse.json({ conversation });
    } catch (e: any) {
        return NextResponse.json({ error: "Internal Server Error", details: e?.message || String(e) }, { status: 500 });
    }
}
