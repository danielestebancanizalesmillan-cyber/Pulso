"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import PusherClient from "pusher-js";
import { Avatar } from "./Avatar";
import { SpeakingPulse } from "./SpaceAudioVisualizer";

interface Participant {
  id: string;
  role: string;
  isMuted: boolean;
  user: {
    id: string;
    name: string;
    username: string;
    avatar?: string | null;
    image?: string | null;
    isVerified?: boolean;
    verificationType?: string;
  };
}

interface SpaceData {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  hostId: string;
  host: { id: string; name: string; username: string; avatar?: string | null; image?: string | null };
  participants: Participant[];
}

interface VoiceSpaceRoomProps {
  space: SpaceData;
  currentUserId: string;
}

// Each peer connection for speakers
type PeerMap = Map<string, RTCPeerConnection>;

export function VoiceSpaceRoom({ space: initialSpace, currentUserId }: VoiceSpaceRoomProps) {
  const router = useRouter();
  const [space, setSpace] = useState(initialSpace);
  const [myRole, setMyRole] = useState<string>(() => {
    const me = initialSpace.participants.find(p => p.user.id === currentUserId);
    return me?.role ?? "LISTENER";
  });
  const [isMuted, setIsMuted] = useState(true);
  const [hasJoined, setHasJoined] = useState(false);
  const [raisedHands, setRaisedHands] = useState<{ id: string; name: string; username: string; avatar?: string | null; image?: string | null }[]>([]);
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());
  const [participants, setParticipants] = useState<Participant[]>(initialSpace.participants);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<PeerMap>(new Map());
  const remoteAudioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const pusherRef = useRef<PusherClient | null>(null);
  const channelRef = useRef<ReturnType<PusherClient["subscribe"]> | null>(null);
  const speakingTimersRef = useRef<Map<string, number>>(new Map());

  const isHost = currentUserId === space.hostId;
  const isSpeaker = myRole === "HOST" || myRole === "SPEAKER";
  const speakers = participants.filter(p => (p.role === "HOST" || p.role === "SPEAKER") && !p.user.id.startsWith("__"));
  const listeners = participants.filter(p => p.role === "LISTENER");

  // ── Send signal via API ──────────────────────────────────────────
  const sendSignal = useCallback(async (payload: object) => {
    await fetch(`/api/spaces/${space.id}/signal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }, [space.id]);

  // ── Create peer for a given remote user ─────────────────────────
  const createPeer = useCallback((remoteUserId: string): RTCPeerConnection => {
    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    peer.onicecandidate = (e) => {
      if (e.candidate) {
        sendSignal({ type: "candidate", candidate: e.candidate.toJSON(), targetId: remoteUserId });
      }
    };

    peer.ontrack = (e) => {
      const stream = e.streams[0] || new MediaStream([e.track]);
      let audio = remoteAudioRefs.current.get(remoteUserId);
      if (!audio) {
        audio = new Audio();
        audio.autoplay = true;
        remoteAudioRefs.current.set(remoteUserId, audio);
      }
      audio.srcObject = stream;

      // Detect speaking via AudioContext
      try {
        const ctx = new AudioContext();
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const detect = () => {
          analyser.getByteFrequencyData(data);
          const avg = data.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
          if (avg > 20) {
            setSpeakingUsers(prev => new Set([...prev, remoteUserId]));
            clearTimeout(speakingTimersRef.current.get(remoteUserId));
            speakingTimersRef.current.set(remoteUserId, window.setTimeout(() => {
              setSpeakingUsers(prev => { const n = new Set(prev); n.delete(remoteUserId); return n; });
            }, 800) as unknown as number);
          }
          requestAnimationFrame(detect);
        };
        detect();
      } catch { /* ignore */ }
    };

    return peer;
  }, [sendSignal]);

  // ── Join the space ───────────────────────────────────────────────
  const joinSpace = useCallback(async () => {
    if (hasJoined) return;
    await fetch(`/api/spaces/${space.id}/join`, { method: "POST" });
    setHasJoined(true);
  }, [space.id, hasJoined]);

  // ── Start microphone (for speakers) ─────────────────────────────
  const startMic = useCallback(async () => {
    if (localStreamRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      // Add tracks to all existing peers
      peersRef.current.forEach((peer) => {
        stream.getTracks().forEach(t => peer.addTrack(t, stream));
      });
      setIsMuted(false);
    } catch (err) {
      console.error("Mic error:", err);
    }
  }, []);

  // ── Setup Pusher & WebRTC ────────────────────────────────────────
  useEffect(() => {
    joinSpace();

    const pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_APP_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });
    pusherRef.current = pusher;
    const channel = pusher.subscribe(`space-${space.id}`);
    channelRef.current = channel;

    // ── Handle WebRTC signals ──
    channel.bind("space-signal", async (data: any) => {
      if (data.senderId === currentUserId) return;
      const { type, senderId, candidate, sdp } = data;
      let peer = peersRef.current.get(senderId);

      if (type === "offer") {
        if (!peer) { peer = createPeer(senderId); peersRef.current.set(senderId, peer); }
        await peer.setRemoteDescription(new RTCSessionDescription(sdp));
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(t => peer!.addTrack(t, localStreamRef.current!));
        }
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        sendSignal({ type: "answer", sdp: answer, targetId: senderId });
      } else if (type === "answer" && peer) {
        await peer.setRemoteDescription(new RTCSessionDescription(sdp));
      } else if (type === "candidate" && candidate) {
        if (!peer) { peer = createPeer(senderId); peersRef.current.set(senderId, peer); }
        if (peer.remoteDescription) {
          await peer.addIceCandidate(new RTCIceCandidate(candidate));
        }
      }
    });

    // ── Handle space events ──
    channel.bind("space-event", async (data: any) => {
      const { type } = data;

      if (type === "RAISE_HAND") {
        setRaisedHands(prev => {
          if (prev.find(u => u.id === data.user.id)) return prev;
          return [...prev, data.user];
        });
      }

      if (type === "SPEAKER_ACCEPTED") {
        if (data.userId === currentUserId) {
          setMyRole("SPEAKER");
          await startMic();
          // Initiate offer to all current speakers
          const speakerIds = participants
            .filter(p => (p.role === "HOST" || p.role === "SPEAKER") && p.user.id !== currentUserId)
            .map(p => p.user.id);
          for (const sid of speakerIds) {
            const peer = createPeer(sid);
            peersRef.current.set(sid, peer);
            if (localStreamRef.current) {
              localStreamRef.current.getTracks().forEach(t => peer.addTrack(t, localStreamRef.current!));
            }
            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);
            sendSignal({ type: "offer", sdp: offer, targetId: sid });
          }
        }
        setRaisedHands(prev => prev.filter(u => u.id !== data.userId));
        setParticipants(prev => prev.map(p =>
          p.user.id === data.userId ? { ...p, role: "SPEAKER", isMuted: false } : p
        ));
      }

      if (type === "SPEAKER_DENIED") {
        setRaisedHands(prev => prev.filter(u => u.id !== data.userId));
      }

      if (type === "SPEAKER_LOWERED") {
        if (data.userId === currentUserId) setMyRole("LISTENER");
        setParticipants(prev => prev.map(p =>
          p.user.id === data.userId ? { ...p, role: "LISTENER", isMuted: true } : p
        ));
      }

      if (type === "USER_LEFT") {
        setParticipants(prev => prev.filter(p => p.user.id !== data.userId));
        peersRef.current.get(data.userId)?.close();
        peersRef.current.delete(data.userId);
      }

      if (type === "SPACE_ENDED") {
        router.push("/spaces");
      }
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`space-${space.id}`);
      peersRef.current.forEach(p => p.close());
      peersRef.current.clear();
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      remoteAudioRefs.current.forEach(a => { a.pause(); a.srcObject = null; });
    };
  }, [space.id, currentUserId]);

  // ── Mute / Unmute ────────────────────────────────────────────────
  const toggleMute = () => {
    if (!localStreamRef.current) return;
    const enabled = !isMuted;
    localStreamRef.current.getAudioTracks().forEach(t => (t.enabled = enabled));
    setIsMuted(!enabled);
  };

  // ── Raise hand ───────────────────────────────────────────────────
  const raiseHand = async () => {
    await fetch(`/api/spaces/${space.id}/raise-hand`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "raise" }),
    });
  };

  // ── Accept speaker ───────────────────────────────────────────────
  const acceptSpeaker = async (userId: string) => {
    await fetch(`/api/spaces/${space.id}/raise-hand`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept", targetUserId: userId }),
    });
  };

  // ── Leave space ──────────────────────────────────────────────────
  const leaveSpace = async () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    await fetch(`/api/spaces/${space.id}/leave`, { method: "POST" });
    router.push("/spaces");
  };

  // ── End space (host) ─────────────────────────────────────────────
  const endSpace = async () => {
    await fetch(`/api/spaces/${space.id}`, { method: "PATCH" });
    await sendSignal({ type: "space_ended", broadcast: true });
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    router.push("/spaces");
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #0f0a1e 0%, #120d24 40%, #0a0f1e 100%)",
      display: "flex", flexDirection: "column",
      position: "relative", overflow: "hidden",
    }}>
      {/* Background decoration */}
      <div style={{
        position: "absolute", top: "-20%", left: "-10%",
        width: "500px", height: "500px", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: "-10%", right: "-10%",
        width: "400px", height: "400px", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(79,70,229,0.12) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Header */}
      <div style={{
        padding: "20px 24px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        backdropFilter: "blur(12px)",
        background: "rgba(0,0,0,0.2)",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
          <div style={{
            width: 10, height: 10, borderRadius: "50%", background: "#ef4444", flexShrink: 0,
            animation: "livePulse 1.5s ease-in-out infinite",
          }} />
          <div style={{ minWidth: 0 }}>
            <h1 style={{
              margin: 0, color: "white", fontSize: "1rem", fontWeight: 700,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {space.title}
            </h1>
            {space.description && (
              <p style={{ margin: 0, color: "rgba(255,255,255,0.5)", fontSize: "0.8rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {space.description}
              </p>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 5,
            background: "rgba(239,68,68,0.15)", borderRadius: "20px",
            padding: "5px 12px", border: "1px solid rgba(239,68,68,0.3)",
          }}>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#ef4444" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            </svg>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#ef4444" }}>
              {participants.length}
            </span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: "24px", display: "flex", flexDirection: "column", gap: "28px", maxWidth: 700, margin: "0 auto", width: "100%" }}>

        {/* Speakers grid */}
        <div>
          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>
            🎤 Hablando
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
            gap: "20px",
          }}>
            {speakers.map(p => (
              <div key={p.user.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <div style={{ position: "relative", width: 72, height: 72 }}>
                  <SpeakingPulse speaking={speakingUsers.has(p.user.id) || (p.user.id === currentUserId && !isMuted)} color="#7c3aed" size={72} />
                  <div style={{
                    width: 72, height: 72, borderRadius: "50%",
                    border: "2.5px solid",
                    borderColor: speakingUsers.has(p.user.id) || (p.user.id === currentUserId && !isMuted)
                      ? "#7c3aed" : "rgba(255,255,255,0.15)",
                    transition: "border-color 0.3s",
                    overflow: "hidden",
                  }}>
                    <Avatar user={p.user} size="lg" />
                  </div>
                  {/* Role badge */}
                  {p.role === "HOST" && (
                    <div style={{
                      position: "absolute", bottom: -4, right: -4,
                      background: "linear-gradient(135deg, #f59e0b, #d97706)",
                      borderRadius: "50%", width: 22, height: 22,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      border: "2px solid #0f0a1e", fontSize: "0.7rem",
                    }}>⭐</div>
                  )}
                  {/* Muted indicator */}
                  {(p.isMuted || (p.user.id === currentUserId && isMuted)) && (
                    <div style={{
                      position: "absolute", bottom: -4, left: -4,
                      background: "rgba(239,68,68,0.9)", borderRadius: "50%",
                      width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center",
                      border: "2px solid #0f0a1e",
                    }}>
                      <svg viewBox="0 0 24 24" width="11" height="11" fill="white">
                        <line x1="1" y1="1" x2="23" y2="23" stroke="white" strokeWidth="2"/>
                        <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
                        <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
                        <line x1="12" y1="19" x2="12" y2="23"/>
                        <line x1="8" y1="23" x2="16" y2="23"/>
                      </svg>
                    </div>
                  )}
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 100 }}>
                    {p.user.name}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>
                    @{p.user.username}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Raised hands (host view) */}
        {isHost && raisedHands.length > 0 && (
          <div style={{
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.2)",
            borderRadius: "16px", padding: "16px",
          }}>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "rgba(245,158,11,0.9)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>
              ✋ Piden hablar
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {raisedHands.map(u => (
                <div key={u.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar user={u} size="sm" />
                    <div>
                      <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "white" }}>{u.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>@{u.username}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => acceptSpeaker(u.id)}
                      style={{
                        background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                        border: "none", borderRadius: "20px", color: "white",
                        padding: "6px 14px", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer",
                      }}
                    >
                      Aceptar
                    </button>
                    <button
                      onClick={() => fetch(`/api/spaces/${space.id}/raise-hand`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "deny", targetUserId: u.id }) })}
                      style={{
                        background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
                        borderRadius: "20px", color: "#ef4444",
                        padding: "6px 14px", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer",
                      }}
                    >
                      Denegar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Listeners */}
        {listeners.length > 0 && (
          <div>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>
              👥 Escuchando · {listeners.length}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {listeners.map(p => (
                <div key={p.user.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.05)", borderRadius: "24px", padding: "6px 12px 6px 6px" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", overflow: "hidden" }}>
                    <Avatar user={p.user} size="sm" />
                  </div>
                  <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>
                    {p.user.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div style={{
        position: "sticky", bottom: 0,
        background: "rgba(10,8,20,0.85)",
        backdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "16px 24px calc(16px + env(safe-area-inset-bottom, 0px))",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 16,
      }}>
        {isSpeaker && (
          <button
            id="space-mute-btn"
            onClick={toggleMute}
            title={isMuted ? "Activar micrófono" : "Silenciar"}
            style={{
              width: 56, height: 56, borderRadius: "50%",
              background: isMuted ? "rgba(239,68,68,0.15)" : "linear-gradient(135deg, #7c3aed, #4f46e5)",
              border: isMuted ? "1.5px solid rgba(239,68,68,0.4)" : "none",
              color: isMuted ? "#ef4444" : "white",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s", boxShadow: isMuted ? "none" : "0 4px 16px rgba(124,58,237,0.4)",
            }}
          >
            {isMuted ? (
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
                <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            )}
          </button>
        )}

        {!isSpeaker && myRole !== "HOST" && (
          <button
            id="space-raise-hand-btn"
            onClick={raiseHand}
            title="Pedir hablar"
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "rgba(245,158,11,0.12)",
              border: "1.5px solid rgba(245,158,11,0.3)",
              borderRadius: "28px", color: "#f59e0b",
              padding: "12px 20px", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer",
            }}
          >
            <span style={{ fontSize: "1.1rem" }}>✋</span>
            Pedir hablar
          </button>
        )}

        {myRole === "SPEAKER" && (
          <button
            onClick={() => fetch(`/api/spaces/${space.id}/raise-hand`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "lower" }) })}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "28px", color: "rgba(255,255,255,0.6)",
              padding: "12px 20px", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer",
            }}
          >
            Dejar de hablar
          </button>
        )}

        {isHost ? (
          <button
            id="space-end-btn"
            onClick={endSpace}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "linear-gradient(135deg, #ef4444, #dc2626)",
              border: "none", borderRadius: "28px", color: "white",
              padding: "14px 24px", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer",
              boxShadow: "0 4px 16px rgba(239,68,68,0.35)",
            }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="white">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
            </svg>
            Terminar Space
          </button>
        ) : (
          <button
            id="space-leave-btn"
            onClick={leaveSpace}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "rgba(239,68,68,0.12)", border: "1.5px solid rgba(239,68,68,0.3)",
              borderRadius: "28px", color: "#ef4444",
              padding: "14px 24px", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer",
            }}
          >
            Salir
          </button>
        )}
      </div>

      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
        @keyframes speakPulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.15); opacity: 0.4; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
