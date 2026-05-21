import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/spaces/[spaceId] — Get space data
export async function GET(_req: Request, { params }: { params: Promise<{ spaceId: string }> }) {
  try {
    const { spaceId } = await params;
    const space = await prisma.voiceSpace.findUnique({
      where: { id: spaceId },
      include: {
        host: {
          select: { id: true, name: true, username: true, avatar: true, image: true, isVerified: true, verificationType: true },
        },
        participants: {
          where: { leftAt: null },
          include: {
            user: {
              select: { id: true, name: true, username: true, avatar: true, image: true, isVerified: true, verificationType: true },
            },
          },
          orderBy: { joinedAt: "asc" },
        },
      },
    });

    if (!space) {
      return NextResponse.json({ error: "Space no encontrado" }, { status: 404 });
    }

    return NextResponse.json(space);
  } catch (error) {
    console.error("[GET /api/spaces/[spaceId]]", error);
    return NextResponse.json({ error: "Error al obtener el space" }, { status: 500 });
  }
}

// PATCH /api/spaces/[spaceId] — End the space (host only)
export async function PATCH(req: Request, { params }: { params: Promise<{ spaceId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { spaceId } = await params;
    const space = await prisma.voiceSpace.findUnique({ where: { id: spaceId } });

    if (!space) {
      return NextResponse.json({ error: "Space no encontrado" }, { status: 404 });
    }

    if (space.hostId !== session.user.id) {
      return NextResponse.json({ error: "Solo el host puede terminar el space" }, { status: 403 });
    }

    const updated = await prisma.voiceSpace.update({
      where: { id: spaceId },
      data: { status: "ENDED", endedAt: new Date() },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/spaces/[spaceId]]", error);
    return NextResponse.json({ error: "Error al actualizar el space" }, { status: 500 });
  }
}
