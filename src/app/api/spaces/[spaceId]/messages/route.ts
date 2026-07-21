import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { NextResponse } from "next/server";

// GET /api/spaces/[spaceId]/messages — Get chat messages for a space
export async function GET(req: Request, { params }: { params: Promise<{ spaceId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { spaceId } = await params;

    const messages = await prisma.voiceSpaceMessage.findMany({
      where: { spaceId },
      include: {
        user: {
          select: { id: true, name: true, username: true, avatar: true, image: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("[GET /api/spaces/[spaceId]/messages]", error);
    return NextResponse.json({ error: "Error al obtener mensajes" }, { status: 500 });
  }
}

// POST /api/spaces/[spaceId]/messages — Send a chat message in the space
export async function POST(req: Request, { params }: { params: Promise<{ spaceId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { spaceId } = await params;
    const { content } = await req.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Contenido requerido" }, { status: 400 });
    }

    // Verify user is in this Space
    const participant = await prisma.voiceSpaceParticipant.findUnique({
      where: { spaceId_userId: { spaceId, userId: session.user.id } },
      select: { id: true }
    });
    if (!participant) {
      return NextResponse.json({ error: "No eres participante de este espacio" }, { status: 403 });
    }

    const message = await prisma.voiceSpaceMessage.create({
      data: {
        spaceId,
        userId: session.user.id,
        content: content.trim(),
      },
      include: {
        user: {
          select: { id: true, name: true, username: true, avatar: true, image: true },
        },
      },
    });

    // Trigger Pusher event
    await pusherServer.trigger(`space-${spaceId}`, "space-message", {
      message,
    });

    return NextResponse.json(message);
  } catch (error) {
    console.error("[POST /api/spaces/[spaceId]/messages]", error);
    return NextResponse.json({ error: "Error al enviar mensaje" }, { status: 500 });
  }
}
