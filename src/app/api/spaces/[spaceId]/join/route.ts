import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// POST /api/spaces/[spaceId]/join
export async function POST(_req: Request, { params }: { params: Promise<{ spaceId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { spaceId } = await params;
    const space = await prisma.voiceSpace.findUnique({ where: { id: spaceId } });

    if (!space || space.status !== "LIVE") {
      return NextResponse.json({ error: "Space no disponible" }, { status: 404 });
    }

    // Upsert: if participant left before, re-join
    const participant = await prisma.voiceSpaceParticipant.upsert({
      where: { spaceId_userId: { spaceId, userId: session.user.id } },
      create: {
        spaceId,
        userId: session.user.id,
        role: space.hostId === session.user.id ? "HOST" : "LISTENER",
        isMuted: space.hostId === session.user.id ? false : true,
        leftAt: null,
      },
      update: {
        leftAt: null,
        joinedAt: new Date(),
      },
    });

    return NextResponse.json(participant);
  } catch (error) {
    console.error("[POST /api/spaces/[spaceId]/join]", error);
    return NextResponse.json({ error: "Error al unirse al space" }, { status: 500 });
  }
}
