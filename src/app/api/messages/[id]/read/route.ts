import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher";

export async function PATCH(req: Request, context: any) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id;

    try {
        const params = await context.params;
        const conversationId = params.id;

        await prisma.message.updateMany({
            where: {
                conversationId: conversationId,
                conversation: { participants: { some: { id: userId } } }, 
                senderId: { not: userId },
                read: false,
            },
            data: { read: true },
        });

        await pusherServer.trigger(`user-${userId}`, "messages-read", {
            conversationId
        });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: "Internal Server Error", details: e?.message || String(e) }, { status: 500 });
    }
}
