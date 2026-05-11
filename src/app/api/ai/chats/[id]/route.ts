import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: chatId } = await params;

    try {
        const messages = await prisma.aIMessage.findMany({
            where: { chatId: chatId },
            orderBy: { createdAt: "asc" }
        });

        return NextResponse.json({ messages });
    } catch (error) {
        console.error("Error al obtener mensajes de chat de IA:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: chatId } = await params;
    const { searchParams } = new URL(req.url);
    const messageId = searchParams.get("messageId");

    try {
        if (messageId) {
            await prisma.aIMessage.delete({
                where: { 
                    id: messageId, 
                    chatId: chatId,
                    chat: { userId: session.user.id } 
                }
            });
            return NextResponse.json({ success: true, type: "message" });
        } else {
            await prisma.aIChat.delete({
                where: { id: chatId, userId: session.user.id }
            });
            return NextResponse.json({ success: true, type: "chat" });
        }
    } catch (error) {
        console.error("Error al borrar en chat de IA:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
