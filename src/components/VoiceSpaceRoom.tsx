"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import PusherClient from "pusher-js";
import { Avatar } from "./Avatar";
import { SpeakingPulse } from "./SpaceAudioVisualizer";
import { EmojiPicker } from "./EmojiPicker";
import { useTranslation } from "@/lib/i18n";

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
  const { t } = useTranslation();
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
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [hasClickedJoin, setHasClickedJoin] = useState(false);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<PeerMap>(new Map());
  const remoteAudioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const pusherRef = useRef<PusherClient | null>(null);
  const channelRef = useRef<ReturnType<PusherClient["subscribe"]> | null>(null);
  const speakingTimersRef = useRef<Map<string, number>>(new Map());

  const isHost = currentUserId === space.hostId;
  const isSpeaker = myRole === "HOST" || myRole === "SPEAKER";
  
  const activeSpeakers = participants.filter(p => 
    (p.role === "HOST" || p.role === "SPEAKER") && 
    !(p.user.id === currentUserId ? isMuted : p.isMuted) &&
    !p.user.id.startsWith("__")
  );

  const silentListeners = participants.filter(p => 
    p.role === "LISTENER" || 
    ((p.role === "HOST" || p.role === "SPEAKER") && (p.user.id === currentUserId ? isMuted : p.isMuted))
  );

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
        stream.getTracks().forEach(t => {
          const alreadyAdded = peer.getSenders().some(s => s.track === t);
          if (!alreadyAdded) {
            peer.addTrack(t, stream);
          }
        });
      });
      setIsMuted(false);
    } catch (err) {
      console.error("Mic error:", err);
    }
  }, []);

  // ── Setup Pusher & WebRTC ────────────────────────────────────────
  useEffect(() => {
    if (!hasClickedJoin) return;
    
    joinSpace();

    if (myRole === "HOST" || myRole === "SPEAKER") {
      startMic();
    }

    const pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_APP_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });
    pusherRef.current = pusher;
    const channel = pusher.subscribe(`space-${space.id}`);
    channelRef.current = channel;

    fetch(`/api/spaces/${space.id}/messages`)
      .then(res => res.json())
      .then(data => {
        if (data.messages) setChatMessages(data.messages);
      })
      .catch(err => console.error("Error loading chat messages:", err));

    channel.bind("space-message", (data: any) => {
      setChatMessages(prev => [...prev, data.message]);
    });

    // ── Handle WebRTC signals ──
    channel.bind("space-signal", async (data: any) => {
      if (data.senderId === currentUserId) return;
      const { type, senderId, candidate, sdp } = data;

      if (type === "mute_changed") {
        setParticipants(prev => prev.map(p => 
          p.user.id === senderId ? { ...p, isMuted: data.isMuted } : p
        ));
        return;
      }

      let peer = peersRef.current.get(senderId);

      if (type === "offer") {
        if (!peer) { peer = createPeer(senderId); peersRef.current.set(senderId, peer); }
        await peer.setRemoteDescription(new RTCSessionDescription(sdp));
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(t => {
            const alreadyAdded = peer!.getSenders().some(s => s.track === t);
            if (!alreadyAdded) {
              peer!.addTrack(t, localStreamRef.current!);
            }
          });
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

      if (type === "USER_JOINED") {
        setParticipants(prev => {
          if (prev.find(p => p.user.id === data.participant.user.id)) {
            // Update role if they already exist
            return prev.map(p => p.user.id === data.participant.user.id ? data.participant : p);
          }
          return [...prev, data.participant];
        });
      }

      if (type === "USER_MUTED_BY_MOD") {
        if (data.userId === currentUserId) {
          if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach(t => (t.enabled = false));
          }
          setIsMuted(true);
          sendSignal({ type: "mute_changed", isMuted: true });
        }
        setParticipants(prev => prev.map(p =>
          p.user.id === data.userId ? { ...p, isMuted: true } : p
        ));
      }

      if (type === "USER_UNMUTED_BY_MOD") {
        if (data.userId === currentUserId) {
          if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach(t => (t.enabled = true));
          }
          setIsMuted(false);
          sendSignal({ type: "mute_changed", isMuted: false });
        }
        setParticipants(prev => prev.map(p =>
          p.user.id === data.userId ? { ...p, isMuted: false } : p
        ));
      }

      if (type === "ROLE_CHANGED") {
        if (data.userId === currentUserId) {
          setMyRole(data.role);
          if (data.role === "LISTENER") {
            localStreamRef.current?.getTracks().forEach(t => t.stop());
            localStreamRef.current = null;
            setIsMuted(true);
          } else {
            await startMic();
          }
        }
        setParticipants(prev => prev.map(p =>
          p.user.id === data.userId ? { ...p, role: data.role, isMuted: data.role === "LISTENER" } : p
        ));
      }

      if (type === "USER_EXPELLED") {
        if (data.userId === currentUserId) {
          leaveSpace();
        }
        setParticipants(prev => prev.filter(p => p.user.id !== data.userId));
      }

      if (type === "MUTE_ALL") {
        if (currentUserId !== data.exceptUserId && (myRole === "SPEAKER" || myRole === "MODERATOR")) {
          if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach(t => (t.enabled = false));
          }
          setIsMuted(true);
          sendSignal({ type: "mute_changed", isMuted: true });
        }
        setParticipants(prev => prev.map(p =>
          p.user.id !== data.exceptUserId ? { ...p, isMuted: true } : p
        ));
      }

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
              localStreamRef.current.getTracks().forEach(t => {
                const alreadyAdded = peer.getSenders().some(s => s.track === t);
                if (!alreadyAdded) {
                  peer.addTrack(t, localStreamRef.current!);
                }
              });
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
  }, [space.id, currentUserId, hasClickedJoin]);

  // ── Mute / Unmute ────────────────────────────────────────────────
  const toggleMute = () => {
    if (!localStreamRef.current) return;
    const newMuteState = !isMuted;
    localStreamRef.current.getAudioTracks().forEach(t => {
      t.enabled = !newMuteState;
    });
    setIsMuted(newMuteState);
    sendSignal({ type: "mute_changed", isMuted: newMuteState });
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

  // ── Send chat message ───────────────────────────────────────────
  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    try {
      const res = await fetch(`/api/spaces/${space.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: chatInput }),
      });
      if (res.ok) {
        setChatInput("");
      }
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  // ── Moderation actions ───────────────────────────────────────────
  const moderateUser = async (action: string, targetUserId: string) => {
    try {
      await fetch(`/api/spaces/${space.id}/moderation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, targetUserId })
      });
    } catch (err) {
      console.error(`Failed to moderate user with action ${action}:`, err);
    }
  };

  const muteAllUsers = async () => {
    try {
      await fetch(`/api/spaces/${space.id}/moderation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mute_all" })
      });
    } catch (err) {
      console.error("Failed to mute all users:", err);
    }
  };

  if (!hasClickedJoin) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 24,
        background: "linear-gradient(160deg, #0f0a1e 0%, #120d24 40%, #0a0f1e 100%)",
        color: "white", textAlign: "center", padding: 24,
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: "50%",
          background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "2.5rem", boxShadow: "0 8px 32px rgba(124,58,237,0.4)"
        }}>
          🎙️
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.8rem", fontWeight: 700 }}>{space.title}</h2>
          <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,0.6)" }}>
            {space.description || t("liveAudioRoom")}
          </p>
        </div>
        <button
          onClick={() => setHasClickedJoin(true)}
          style={{
            background: "linear-gradient(135deg, #10b981, #059669)",
            color: "white", border: "none", borderRadius: "30px",
            padding: "16px 36px", fontSize: "1.1rem", fontWeight: 700,
            cursor: "pointer", boxShadow: "0 8px 24px rgba(16,185,129,0.3)",
            transition: "all 0.2s"
          }}
        >
          {t("joinSpace")}
        </button>
      </div>
    );
  }

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

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
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

          <button
            onClick={() => setShowChat(!showChat)}
            style={{
              background: showChat ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.06)",
              border: `1px solid ${showChat ? "#7c3aed" : "rgba(255,255,255,0.1)"}`,
              borderRadius: "20px", padding: "5px 12px", color: "white", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 5, transition: "all 0.2s"
            }}
          >
            <span>💬</span>
            <span>{t("chat")}</span>
          </button>
        </div>
      </div>

      {/* Middle content wrapper */}
      <div style={{ display: "flex", flex: 1, position: "relative", width: "100%", overflow: "hidden" }}>
        
        {/* Stage Wrapper */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          height: "100%",
        }}>
          {/* Main content */}
          <div style={{ flex: 1, padding: "24px", display: "flex", flexDirection: "column", gap: "28px", maxWidth: 700, margin: "0 auto", width: "100%" }}>
            
            {/* Speakers grid */}
            <div>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>
                🎙️ {t("speaking")}
              </div>
              {activeSpeakers.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center", color: "rgba(255,255,255,0.3)", border: "1px dashed rgba(255,255,255,0.06)", borderRadius: "16px" }}>
                  {t("noOneSpeaking")}
                </div>
              ) : (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
                  gap: "20px",
                }}>
                  {activeSpeakers.map(p => (
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
                          display: "flex", alignItems: "center", justifyContent: "center"
                        }}>
                          <Avatar user={p.user} size="lg" />
                        </div>
                        {/* Role badge */}
                        {(p.role === "HOST" || p.role === "MODERATOR") && (
                          <div style={{
                            position: "absolute", bottom: -4, right: -4,
                            background: p.role === "HOST" 
                              ? "linear-gradient(135deg, #f59e0b, #d97706)"
                              : "linear-gradient(135deg, #10b981, #059669)",
                            borderRadius: "50%", width: 22, height: 22,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            border: "2px solid #0f0a1e", fontSize: "0.7rem", color: "white", fontWeight: "bold"
                          }} title={p.role}>
                            {p.role === "HOST" ? "⭐" : "🛡️"}
                          </div>
                        )}
                        {/* Muted indicator */}
                        {(p.isMuted || (p.user.id === currentUserId && isMuted)) && (
                          <div style={{
                            position: "absolute", bottom: -4, left: -4,
                            background: "rgba(239,68,68,0.9)", borderRadius: "50%",
                            width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center",
                            border: "2px solid #0f0a1e",
                          }}>
                            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="white" strokeWidth="2">
                              <line x1="1" y1="1" x2="23" y2="23" />
                              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                              <line x1="12" y1="19" x2="12" y2="23" />
                              <line x1="8" y1="23" x2="16" y2="23" />
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
              )}
            </div>

            {/* Raised hands (host/moderator view) */}
            {(isHost || myRole === "MODERATOR") && raisedHands.length > 0 && (
              <div style={{
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.2)",
                borderRadius: "16px", padding: "16px",
              }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "rgba(245,158,11,0.9)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>
                  ✋ {t("askingToSpeak")}
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
                          {t("accept")}
                        </button>
                        <button
                          onClick={() => fetch(`/api/spaces/${space.id}/raise-hand`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "deny", targetUserId: u.id }) })}
                          style={{
                            background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
                            borderRadius: "20px", color: "#ef4444",
                            padding: "6px 14px", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer",
                          }}
                        >
                          {t("deny")}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Listeners */}
            {silentListeners.length > 0 && (
              <div>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>
                  👥 {t("listening")} · {silentListeners.length}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {silentListeners.map(p => (
                    <div key={p.user.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.05)", borderRadius: "24px", padding: "6px 12px 6px 6px" }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
            zIndex: 10,
          }}>
            {isSpeaker && (
              <button
                id="space-mute-btn"
                onClick={toggleMute}
                title={isMuted ? t("unmute") : t("mute")}
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
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="1" y1="1" x2="23" y2="23" />
                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                )}
              </button>
            )}

            {!isSpeaker && myRole !== "HOST" && (
              <button
                id="space-raise-hand-btn"
                onClick={raiseHand}
                title={t("askingToSpeak")}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: "rgba(245,158,11,0.12)",
                  border: "1.5px solid rgba(245,158,11,0.3)",
                  borderRadius: "28px", color: "#f59e0b",
                  padding: "12px 20px", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer",
                }}
              >
                <span style={{ fontSize: "1.1rem" }}>✋</span>
                {t("askingToSpeak")}
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
                {t("stopSpeaking")}
              </button>
            )}

            {(isHost || myRole === "MODERATOR") && (
              <button
                onClick={muteAllUsers}
                title={t("muteAll")}
                style={{
                  background: "rgba(239,68,68,0.12)", border: "1.5px solid rgba(239,68,68,0.3)",
                  borderRadius: "28px", color: "#ef4444",
                  padding: "12px 20px", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
                }}
              >
                🔇 {t("muteAll")}
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
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                </svg>
                {t("endSpace")}
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
                {t("leave")}
              </button>
            )}
          </div>
        </div>

        {/* Chat Drawer */}
        {showChat && (
          <div style={{
            width: "350px", background: "#110b24",
            borderLeft: "1px solid rgba(255,255,255,0.06)",
            display: "flex", flexDirection: "column", zIndex: 20,
            boxShadow: "-4px 0 24px rgba(0,0,0,0.5)",
            height: "100%",
          }}>
            {/* Chat Header */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: "white", fontWeight: 700, fontSize: "0.95rem" }}>{t("spaceChat")}</span>
              <button onClick={() => setShowChat(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "1.1rem" }}>✕</button>
            </div>

            {/* Messages Feed */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
              {chatMessages.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "rgba(255,255,255,0.3)", fontSize: "0.85rem" }}>
                  <span>{t("noSpaceMessages")}</span>
                  <span style={{ fontSize: "0.75rem", marginTop: 4 }}>{t("beTheFirstSpaceMessage")}</span>
                </div>
              ) : (
                chatMessages.map((msg, index) => (
                  <div key={msg.id || index} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ flexShrink: 0 }}>
                      <Avatar user={msg.user} size="sm" />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                        <span style={{ color: "white", fontSize: "0.78rem", fontWeight: 600 }}>{msg.user.name}</span>
                        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.68rem" }}>@{msg.user.username}</span>
                      </div>
                      <p style={{ margin: 0, color: "rgba(255,255,255,0.85)", fontSize: "0.82rem", wordBreak: "break-word" }}>
                        {msg.content}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Message Input Footer */}
            <div style={{ padding: "16px", borderTop: "1px solid rgba(255,255,255,0.06)", position: "relative" }}>
              {showEmojiPicker && (
                <div style={{ position: "absolute", bottom: "100%", left: 16, zIndex: 100 }}>
                  <EmojiPicker
                    onSelect={(emoji) => {
                      setChatInput(prev => prev + emoji);
                      setShowEmojiPicker(false);
                    }}
                    onClose={() => setShowEmojiPicker(false)}
                  />
                </div>
              )}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", padding: 4 }}
                >
                  😊
                </button>
                <input
                  type="text"
                  placeholder={t("sendMessage")}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
                  style={{
                    flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "20px", padding: "8px 16px", color: "white", fontSize: "0.82rem", outline: "none",
                  }}
                />
                <button
                  onClick={sendChatMessage}
                  style={{
                    background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                    border: "none", borderRadius: "50%", width: 32, height: 32,
                    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white"
                  }}
                >
                  ➤
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Participant List Modal */}
      {showParticipantsModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000,
        }}>
          <div style={{
            background: "#120d24", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "16px", width: "400px", maxHeight: "80vh", display: "flex", flexDirection: "column",
            boxShadow: "0 10px 25px rgba(0,0,0,0.5)", overflow: "hidden"
          }}>
            {/* Modal Header */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: "white", fontWeight: 700, fontSize: "1rem" }}>{t("participants")} ({participants.length})</span>
              <button onClick={() => setShowParticipantsModal(false)} style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: "1.2rem" }}>✕</button>
            </div>

            {/* Modal List */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
              
              {/* Hablando */}
              <div>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#7c3aed", marginBottom: 8, textTransform: "uppercase" }}>🎙️ {t("onStage")}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {participants.filter(p => p.role === "HOST" || p.role === "SPEAKER" || p.role === "MODERATOR").map(p => (
                    <div key={p.user.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar user={p.user} size="sm" />
                        <div>
                          <div style={{ fontSize: "0.85rem", color: "white", fontWeight: 600 }}>{p.user.name}</div>
                          <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>@{p.user.username}</div>
                        </div>
                      </div>
                      
                      {/* Moderation actions for host/mod */}
                      {(isHost || myRole === "MODERATOR") && p.user.id !== currentUserId && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => moderateUser(p.isMuted ? "unmute_user" : "mute_user", p.user.id)}
                            style={{
                              background: "rgba(255,255,255,0.06)", border: "none", borderRadius: "4px",
                              color: "white", padding: "4px 8px", fontSize: "0.7rem", cursor: "pointer"
                            }}
                          >
                            {p.isMuted ? t("unmute") : t("mute")}
                          </button>
                          
                          {isHost && p.role !== "MODERATOR" && (
                            <button
                              onClick={() => moderateUser("make_moderator", p.user.id)}
                              style={{
                                background: "rgba(16,185,129,0.15)", border: "none", borderRadius: "4px",
                                color: "#10b981", padding: "4px 8px", fontSize: "0.7rem", cursor: "pointer"
                              }}
                            >
                              Mod
                            </button>
                          )}

                          <button
                            onClick={() => moderateUser("make_listener", p.user.id)}
                            style={{
                              background: "rgba(245,158,11,0.15)", border: "none", borderRadius: "4px",
                              color: "#f59e0b", padding: "4px 8px", fontSize: "0.7rem", cursor: "pointer"
                            }}
                          >
                            {t("demoteToListener")}
                          </button>

                          <button
                            onClick={() => moderateUser("expel_user", p.user.id)}
                            style={{
                              background: "rgba(239,68,68,0.15)", border: "none", borderRadius: "4px",
                              color: "#ef4444", padding: "4px 8px", fontSize: "0.7rem", cursor: "pointer"
                            }}
                          >
                            {t("expel")}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Escuchando */}
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "rgba(255,255,255,0.4)", marginBottom: 8, textTransform: "uppercase" }}>👥 {t("listeners")}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {participants.filter(p => p.role === "LISTENER").map(p => (
                    <div key={p.user.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar user={p.user} size="sm" />
                        <div>
                          <div style={{ fontSize: "0.85rem", color: "white", fontWeight: 600 }}>{p.user.name}</div>
                          <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>@{p.user.username}</div>
                        </div>
                      </div>
                      
                      {/* Promote to speaker option */}
                      {(isHost || myRole === "MODERATOR") && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => moderateUser("make_speaker", p.user.id)}
                            style={{
                              background: "rgba(124,58,237,0.15)", border: "none", borderRadius: "4px",
                              color: "#7c3aed", padding: "4px 8px", fontSize: "0.7rem", cursor: "pointer"
                            }}
                          >
                            {t("promoteToSpeaker")}
                          </button>
                          <button
                            onClick={() => moderateUser("expel_user", p.user.id)}
                            style={{
                              background: "rgba(239,68,68,0.15)", border: "none", borderRadius: "4px",
                              color: "#ef4444", padding: "4px 8px", fontSize: "0.7rem", cursor: "pointer"
                            }}
                          >
                            {t("expel")}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

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
