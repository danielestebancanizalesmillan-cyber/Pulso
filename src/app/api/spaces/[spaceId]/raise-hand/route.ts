import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { NextResponse } from "next/server";

// POST /api/spaces/[spaceId]/raise-hand — Request to speak
export async function POST(req: Request, { params }: { params: Promise<{ spaceId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { spaceId } = await params;
    const { action, targetUserId } = await req.json();
    // action: "raise" | "accept" | "deny" | "lower"

    const space = await prisma.voiceSpace.findUnique({ where: { id: spaceId } });
    if (!space || space.status !== "LIVE") {
      return NextResponse.json({ error: "Space no disponible" }, { status: 404 });
    }

    if (action === "raise") {
      // Listener requests to speak — notify host
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, name: true, username: true, avatar: true, image: true },
      });
      await pusherServer.trigger(`space-${spaceId}`, "space-event", {
        type: "RAISE_HAND",
        user,
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "accept" && space.hostId === session.user.id) {
      // Host accepts — upgrade participant to SPEAKER
      await prisma.voiceSpaceParticipant.update({
        where: { spaceId_userId: { spaceId, userId: targetUserId } },
        data: { role: "SPEAKER", isMuted: false },
      });
      await pusherServer.trigger(`space-${spaceId}`, "space-event", {
        type: "SPEAKER_ACCEPTED",
        userId: targetUserId,
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "deny" && space.hostId === session.user.id) {
      await pusherServer.trigger(`space-${spaceId}`, "space-event", {
        type: "SPEAKER_DENIED",
        userId: targetUserId,
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "lower") {
      // Speaker steps down or host removes speaker
      const participant = await prisma.voiceSpaceParticipant.findUnique({
        where: { spaceId_userId: { spaceId, userId: session.user.id } },
      });
      if (!participant) return NextResponse.json({ error: "No en el space" }, { status: 404 });

      await prisma.voiceSpaceParticipant.update({
        where: { spaceId_userId: { spaceId, userId: session.user.id } },
        data: { role: "LISTENER", isMuted: true },
      });
      await pusherServer.trigger(`space-${spaceId}`, "space-event", {
        type: "SPEAKER_LOWERED",
        userId: session.user.id,
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  } catch (error) {
    console.error("[POST /api/spaces/[spaceId]/raise-hand]", error);
    return NextResponse.json({ error: "Error en la solicitud" }, { status: 500 });
  }
}
