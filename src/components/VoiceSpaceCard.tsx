"use client";

import Link from "next/link";
import { Avatar } from "./Avatar";

interface SpaceCardProps {
  space: {
    id: string;
    title: string;
    description?: string | null;
    status: string;
    startedAt: string;
    host: {
      id: string;
      name: string;
      username: string;
      avatar?: string | null;
      image?: string | null;
      isVerified?: boolean;
      verificationType?: string;
    };
    participants: Array<{
      role: string;
      leftAt: string | null;
      user: {
        id: string;
        name: string;
        username: string;
        avatar?: string | null;
        image?: string | null;
      };
    }>;
  };
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}

export function VoiceSpaceCard({ space }: SpaceCardProps) {
  const active = space.participants.filter(p => !p.leftAt);
  const speakers = active.filter(p => p.role === "HOST" || p.role === "SPEAKER");
  const listenerCount = active.filter(p => p.role === "LISTENER").length;
  const speakerUsers = speakers.slice(0, 3).map(p => p.user);

  return (
    <Link href={`/spaces/${space.id}`} style={{ textDecoration: "none" }}>
      <div
        className="space-card"
        style={{
          background: "var(--bg-card, #18181b)",
          border: "1px solid var(--border, rgba(255,255,255,0.08))",
          borderRadius: "20px",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          cursor: "pointer",
          transition: "all 0.2s ease",
          position: "relative",
          overflow: "hidden",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(124,58,237,0.4)";
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 32px rgba(124,58,237,0.15)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border, rgba(255,255,255,0.08))";
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
          (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
        }}
      >
        {/* Decorative gradient bg */}
        <div style={{
          position: "absolute", top: 0, right: 0,
          width: "160px", height: "160px",
          background: "radial-gradient(circle at top right, rgba(124,58,237,0.12), transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* Live badge + time */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(239,68,68,0.15)", borderRadius: "20px",
            padding: "4px 10px",
            border: "1px solid rgba(239,68,68,0.3)",
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: "50%",
              background: "#ef4444",
              animation: "livePulse 1.5s ease-in-out infinite",
            }} />
            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#ef4444", letterSpacing: "0.08em" }}>
              EN VIVO
            </span>
          </div>
          <span style={{ fontSize: "0.78rem", color: "var(--text-secondary, #888)" }}>
            Hace {timeAgo(space.startedAt)}
          </span>
        </div>

        {/* Title */}
        <div>
          <h3 style={{
            margin: 0, fontSize: "1rem", fontWeight: 700,
            color: "var(--text-main, #fff)", lineHeight: 1.4,
            display: "-webkit-box", WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {space.title}
          </h3>
          {space.description && (
            <p style={{
              margin: "4px 0 0", fontSize: "0.85rem",
              color: "var(--text-secondary, #888)", lineHeight: 1.4,
              display: "-webkit-box", WebkitLineClamp: 1,
              WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>
              {space.description}
            </p>
          )}
        </div>

        {/* Speakers row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            {speakerUsers.map((u, i) => (
              <div key={u.id} style={{
                marginLeft: i > 0 ? -10 : 0,
                border: "2px solid var(--bg-card, #18181b)",
                borderRadius: "50%", zIndex: speakerUsers.length - i,
              }}>
                <Avatar user={u} size="sm" />
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-main, #fff)" }}>
              {speakers.map(s => s.user.name).slice(0, 2).join(", ")}
              {speakers.length > 2 ? ` +${speakers.length - 2}` : ""}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary, #888)" }}>
              Hablando
            </div>
          </div>
        </div>

        {/* Footer: mic icon + listener count */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          paddingTop: 10,
          borderTop: "1px solid var(--border, rgba(255,255,255,0.06))",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="white">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
              </svg>
            </div>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary, #888)" }}>
              Pulso Spaces
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-secondary, #888)", fontSize: "0.8rem" }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            {active.length} {active.length === 1 ? "oyente" : "oyentes"}
          </div>
        </div>
      </div>
    </Link>
  );
}
