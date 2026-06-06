import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher";

export async function POST(req: Request, context: any) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id;

    try {
        const params = await context.params;
        const conversationId = params.id;
        
        const body = await req.json();
        const { content, type = "text", isEncrypted = false } = body;

        if (!content || content.length > 2000) {
            return NextResponse.json({ error: "Invalid content length" }, { status: 400 });
        }

        // Verify conversation membership
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            select: { participants: { select: { id: true } } }
        });
        
        const isParticipant = conversation?.participants.some(p => p.id === userId);
        if (!isParticipant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const message = await prisma.message.create({
            data: {
                content,
                conversationId,
                senderId: userId,
                type,
                isEncrypted,
            },
            include: { sender: { select: { id: true, name: true, avatar: true } } }
        });

        // Restore conversation for any participant who deleted it
        await prisma.deletedConversation.deleteMany({
            where: { conversationId }
        });

        await prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
        });

        // Trigger real-time message via Pusher
        await pusherServer.trigger(`chat-${conversationId}`, "new-message", message);

        // Notify recipient
        const recipient = conversation?.participants.find(p => p.id !== userId);
        if (recipient) {
            await pusherServer.trigger(`user-${recipient.id}`, "message-notification", {
                type: "message",
                message: `New message from ${message.sender.name}`,
                conversationId
            });
        }

        return NextResponse.json({ message });
    } catch (e: any) {
        return NextResponse.json({ error: "Internal Server Error", details: e?.message || String(e) }, { status: 500 });
    }
}
