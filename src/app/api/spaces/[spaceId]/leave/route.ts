import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { NextResponse } from "next/server";

// POST /api/spaces/[spaceId]/leave
export async function POST(req: Request, { params }: { params: Promise<{ spaceId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { spaceId } = await params;

    await prisma.voiceSpaceParticipant.update({
      where: { spaceId_userId: { spaceId, userId: session.user.id } },
      data: { leftAt: new Date() },
    });

    await pusherServer.trigger(`space-${spaceId}`, "space-event", {
      type: "USER_LEFT",
      userId: session.user.id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[POST /api/spaces/[spaceId]/leave]", error);
    return NextResponse.json({ error: "Error al salir del space" }, { status: 500 });
  }
}
