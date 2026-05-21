import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { NextResponse } from "next/server";

// POST /api/spaces/[spaceId]/signal — WebRTC signaling via Pusher
export async function POST(req: Request, { params }: { params: Promise<{ spaceId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { spaceId } = await params;
    const body = await req.json();

    await pusherServer.trigger(`space-${spaceId}`, "space-signal", {
      ...body,
      senderId: session.user.id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[POST /api/spaces/[spaceId]/signal]", error);
    return NextResponse.json({ error: "Error en el signaling" }, { status: 500 });
  }
}
