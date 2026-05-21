import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/spaces — List all live spaces
export async function GET() {
  try {
    const spaces = await prisma.voiceSpace.findMany({
      where: { status: "LIVE" },
      include: {
        host: {
          select: { id: true, name: true, username: true, avatar: true, image: true, isVerified: true, verificationType: true },
        },
        participants: {
          where: { leftAt: null },
          include: {
            user: {
              select: { id: true, name: true, username: true, avatar: true, image: true },
            },
          },
        },
      },
      orderBy: { startedAt: "desc" },
    });
    return NextResponse.json(spaces);
  } catch (error) {
    console.error("[GET /api/spaces]", error);
    return NextResponse.json({ error: "Error al obtener spaces" }, { status: 500 });
  }
}

// POST /api/spaces — Create a new Voice Space
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { title, description } = await req.json();
    if (!title?.trim()) {
      return NextResponse.json({ error: "El título es requerido" }, { status: 400 });
    }

    // Create the space
    const space = await prisma.voiceSpace.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        hostId: session.user.id,
        status: "LIVE",
      },
    });

    // Add the host as a participant with HOST role
    await prisma.voiceSpaceParticipant.create({
      data: {
        spaceId: space.id,
        userId: session.user.id,
        role: "HOST",
        isMuted: false,
      },
    });

    return NextResponse.json(space, { status: 201 });
  } catch (error) {
    console.error("[POST /api/spaces]", error);
    return NextResponse.json({ error: "Error al crear el space" }, { status: 500 });
  }
}
