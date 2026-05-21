"use client";

import { useState, useEffect } from "react";
import { CreateSpaceModal } from "@/components/CreateSpaceModal";
import { VoiceSpaceCard } from "@/components/VoiceSpaceCard";
import { useSession } from "next-auth/react";

export default function SpacesPage() {
  const { data: session } = useSession();
  const [spaces, setSpaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const fetchSpaces = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/spaces");
      const data = await res.json();
      setSpaces(Array.isArray(data) ? data : []);
    } catch {
      setSpaces([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpaces();
    const interval = setInterval(fetchSpaces, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-main)",
    }}>
      {/* Hero header */}
      <div style={{
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(160deg, #1a0f3a 0%, #0f1628 60%, var(--bg-main) 100%)",
        borderBottom: "1px solid var(--border)",
        padding: "40px 24px 32px",
      }}>
        {/* Decorations */}
        <div style={{ position: "absolute", top: "-40px", right: "-40px", width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-20px", left: "20%", width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle, rgba(79,70,229,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ position: "relative", maxWidth: 700, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
            <div style={{
              width: 50, height: 50, borderRadius: "50%",
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 20px rgba(124,58,237,0.4)",
            }}>
              <svg viewBox="0 0 24 24" width="26" height="26" fill="white">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23" stroke="white" strokeWidth="2"/>
                <line x1="8" y1="23" x2="16" y2="23" stroke="white" strokeWidth="2"/>
              </svg>
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, color: "var(--text-main)", lineHeight: 1.2 }}>
                Pulso Spaces
              </h1>
              <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--text-secondary)" }}>
                Salas de audio en vivo
              </p>
            </div>
          </div>

          <p style={{ margin: "0 0 24px", color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: 1.6, maxWidth: 480 }}>
            Únete a conversaciones en vivo o crea tu propio Space y habla con tu comunidad en tiempo real.
          </p>

          {session?.user && (
            <button
              id="open-create-space"
              onClick={() => setShowCreate(true)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                border: "none", borderRadius: "28px", color: "white",
                padding: "14px 28px", fontWeight: 700, fontSize: "0.95rem",
                cursor: "pointer", boxShadow: "0 4px 20px rgba(124,58,237,0.35)",
                transition: "all 0.2s",
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-1px)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23" stroke="white" strokeWidth="2"/>
              </svg>
              Iniciar un Space
            </button>
          )}
        </div>
      </div>

      {/* Spaces grid */}
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "28px 24px" }}>
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                background: "var(--bg-card)", borderRadius: 20, padding: 20,
                border: "1px solid var(--border)", height: 200,
                animation: "pulse 1.5s ease-in-out infinite",
              }} />
            ))}
          </div>
        ) : spaces.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              background: "linear-gradient(135deg, rgba(124,58,237,0.15), rgba(79,70,229,0.1))",
              border: "1px solid rgba(124,58,237,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="rgba(124,58,237,0.7)" strokeWidth="1.5">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "var(--text-main)" }}>
                No hay Spaces activos
              </h2>
              <p style={{ margin: "8px 0 0", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                ¡Sé el primero en iniciar una conversación!
              </p>
            </div>
            {session?.user && (
              <button
                onClick={() => setShowCreate(true)}
                style={{
                  marginTop: 8, background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                  border: "none", borderRadius: "24px", color: "white",
                  padding: "12px 24px", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer",
                }}
              >
                Crear Space
              </button>
            )}
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", animation: "livePulse 1.5s ease-in-out infinite" }} />
                <span style={{ fontWeight: 700, color: "var(--text-main)", fontSize: "0.95rem" }}>
                  {spaces.length} {spaces.length === 1 ? "Space en vivo" : "Spaces en vivo"}
                </span>
              </div>
              <button
                onClick={fetchSpaces}
                style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: 5 }}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
                Actualizar
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
              {spaces.map(space => (
                <VoiceSpaceCard key={space.id} space={space} />
              ))}
            </div>
          </>
        )}
      </div>

      {showCreate && <CreateSpaceModal onClose={() => setShowCreate(false)} />}

      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
