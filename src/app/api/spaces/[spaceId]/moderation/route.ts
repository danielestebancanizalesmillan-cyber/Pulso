import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { NextResponse } from "next/server";

// POST /api/spaces/[spaceId]/moderation — Handle host/moderator actions
export async function POST(req: Request, { params }: { params: Promise<{ spaceId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { spaceId } = await params;
    const { action, targetUserId } = await req.json();

    const space = await prisma.voiceSpace.findUnique({ where: { id: spaceId } });
    if (!space || space.status !== "LIVE") {
      return NextResponse.json({ error: "Space no disponible o ya finalizado" }, { status: 404 });
    }

    // Verify current user is Host or Moderator
    const currentUserPart = await prisma.voiceSpaceParticipant.findUnique({
      where: { spaceId_userId: { spaceId, userId: session.user.id } }
    });

    const isHost = space.hostId === session.user.id;
    const isMod = currentUserPart?.role === "MODERATOR";

    if (!isHost && !isMod) {
      return NextResponse.json({ error: "No tienes permisos de moderación" }, { status: 403 });
    }

    // Execute actions
    if (action === "mute_user") {
      if (!targetUserId) return NextResponse.json({ error: "targetUserId requerido" }, { status: 400 });
      
      await prisma.voiceSpaceParticipant.update({
        where: { spaceId_userId: { spaceId, userId: targetUserId } },
        data: { isMuted: true }
      });

      await pusherServer.trigger(`space-${spaceId}`, "space-event", {
        type: "USER_MUTED_BY_MOD",
        userId: targetUserId
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "unmute_user") {
      if (!targetUserId) return NextResponse.json({ error: "targetUserId requerido" }, { status: 400 });
      
      await prisma.voiceSpaceParticipant.update({
        where: { spaceId_userId: { spaceId, userId: targetUserId } },
        data: { isMuted: false }
      });

      await pusherServer.trigger(`space-${spaceId}`, "space-event", {
        type: "USER_UNMUTED_BY_MOD",
        userId: targetUserId
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "make_moderator") {
      if (!targetUserId) return NextResponse.json({ error: "targetUserId requerido" }, { status: 400 });
      if (!isHost) return NextResponse.json({ error: "Solo el Host puede asignar moderadores" }, { status: 403 });

      await prisma.voiceSpaceParticipant.update({
        where: { spaceId_userId: { spaceId, userId: targetUserId } },
        data: { role: "MODERATOR" }
      });

      await pusherServer.trigger(`space-${spaceId}`, "space-event", {
        type: "ROLE_CHANGED",
        userId: targetUserId,
        role: "MODERATOR"
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "make_speaker") {
      if (!targetUserId) return NextResponse.json({ error: "targetUserId requerido" }, { status: 400 });

      await prisma.voiceSpaceParticipant.update({
        where: { spaceId_userId: { spaceId, userId: targetUserId } },
        data: { role: "SPEAKER" }
      });

      await pusherServer.trigger(`space-${spaceId}`, "space-event", {
        type: "ROLE_CHANGED",
        userId: targetUserId,
        role: "SPEAKER"
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "make_listener") {
      if (!targetUserId) return NextResponse.json({ error: "targetUserId requerido" }, { status: 400 });

      await prisma.voiceSpaceParticipant.update({
        where: { spaceId_userId: { spaceId, userId: targetUserId } },
        data: { role: "LISTENER", isMuted: true }
      });

      await pusherServer.trigger(`space-${spaceId}`, "space-event", {
        type: "ROLE_CHANGED",
        userId: targetUserId,
        role: "LISTENER"
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "expel_user") {
      if (!targetUserId) return NextResponse.json({ error: "targetUserId requerido" }, { status: 400 });
      if (targetUserId === space.hostId) return NextResponse.json({ error: "No puedes expulsar al Host" }, { status: 400 });

      // Expel means set leftAt
      await prisma.voiceSpaceParticipant.update({
        where: { spaceId_userId: { spaceId, userId: targetUserId } },
        data: { leftAt: new Date() }
      });

      await pusherServer.trigger(`space-${spaceId}`, "space-event", {
        type: "USER_EXPELLED",
        userId: targetUserId
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "mute_all") {
      // Mute everyone currently a speaker or moderator, except the host
      await prisma.voiceSpaceParticipant.updateMany({
        where: {
          spaceId,
          role: { in: ["SPEAKER", "MODERATOR"] },
          userId: { not: space.hostId }
        },
        data: { isMuted: true }
      });

      await pusherServer.trigger(`space-${spaceId}`, "space-event", {
        type: "MUTE_ALL",
        exceptUserId: space.hostId
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  } catch (error) {
    console.error("[POST /api/spaces/[spaceId]/moderation]", error);
    return NextResponse.json({ error: "Error en la moderación" }, { status: 500 });
  }
}
