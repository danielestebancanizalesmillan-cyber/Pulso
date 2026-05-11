import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const chats = await prisma.aIChat.findMany({
            where: { userId: session.user.id },
            orderBy: { updatedAt: "desc" },
            include: {
                _count: { select: { messages: true } }
            }
        });

        return NextResponse.json({ chats });
    } catch (error) {
        console.error("Error al obtener chats de IA:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { title } = await req.json().catch(() => ({ title: "Nueva conversación" }));

        const chat = await prisma.aIChat.create({
            data: {
                title: title || "Nueva conversación",
                userId: session.user.id
            }
        });

        return NextResponse.json({ chat });
    } catch (error) {
        console.error("Error al crear chat de IA:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
