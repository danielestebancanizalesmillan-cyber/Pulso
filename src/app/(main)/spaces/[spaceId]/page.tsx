import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { VoiceSpaceRoom } from "@/components/VoiceSpaceRoom";

interface Props {
  params: Promise<{ spaceId: string }>;
}

export default async function SpaceRoomPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

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
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 16,
        background: "linear-gradient(160deg, #0f0a1e 0%, #120d24 40%, #0a0f1e 100%)",
        color: "white", textAlign: "center", padding: 24,
      }}>
        <div style={{ fontSize: "4rem" }}>🎙️</div>
        <h2 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700 }}>Space no encontrado</h2>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.5)" }}>
          Este Space ha terminado o no existe.
        </p>
        <a href="/spaces" style={{
          marginTop: 8, background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
          color: "white", borderRadius: "24px", padding: "12px 24px",
          fontWeight: 700, textDecoration: "none", fontSize: "0.95rem",
        }}>
          Ver Spaces activos
        </a>
      </div>
    );
  }

  if (space.status === "ENDED") {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 16,
        background: "linear-gradient(160deg, #0f0a1e 0%, #120d24 40%, #0a0f1e 100%)",
        color: "white", textAlign: "center", padding: 24,
      }}>
        <div style={{ fontSize: "4rem" }}>🎙️</div>
        <h2 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700 }}>Este Space ha terminado</h2>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.5)" }}>
          Fue creado por <strong>@{space.host.username}</strong>
        </p>
        <a href="/spaces" style={{
          marginTop: 8, background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
          color: "white", borderRadius: "24px", padding: "12px 24px",
          fontWeight: 700, textDecoration: "none", fontSize: "0.95rem",
        }}>
          Ver Spaces activos
        </a>
      </div>
    );
  }

  return (
    <VoiceSpaceRoom
      space={space as any}
      currentUserId={session.user.id}
    />
  );
}

export async function generateMetadata({ params }: Props) {
  const { spaceId } = await params;
  const space = await prisma.voiceSpace.findUnique({
    where: { id: spaceId },
    select: { title: true, description: true },
  });
  return {
    title: space ? `${space.title} — Pulso Spaces` : "Space — Pulso",
    description: space?.description || "Sala de audio en vivo en Pulso",
  };
}
