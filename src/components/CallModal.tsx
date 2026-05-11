"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PusherClient from "pusher-js";
import { sendCallSignal } from "@/app/actions/message";

interface CallModalProps {
    isOpen: boolean;
    onClose: () => void;
    isIncoming?: boolean;
    isAudioOnly?: boolean;
    callerName?: string;
    conversationId: string;
    userId: string;
}

function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const check = () => setIsMobile(window.matchMedia("(max-width: 768px)").matches);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);
    return isMobile;
}

export function CallModal({ isOpen, onClose, isIncoming = false, isAudioOnly = false, callerName = "Usuario", conversationId, userId }: CallModalProps) {
    const [status, setStatus] = useState<"idle" | "calling" | "connected" | "ended">("idle");
    const [mounted, setMounted] = useState(false);
    const isMobile = useIsMobile();
    
    // Feature States
    const [isLocalMain, setIsLocalMain] = useState(false);
    const [isLocalReady, setIsLocalReady] = useState(false);


    const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

    // WebRTC References
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const peerRef = useRef<RTCPeerConnection | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const remoteStreamRef = useRef<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!isOpen) return;

        peerRef.current = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        });

        const initLocalStream = async () => {
            const currentPeer = peerRef.current;
            if (!currentPeer) return;

            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: !isAudioOnly ? (isMobile ? { facingMode: facingMode } : true) : false, 
                    audio: true 
                });

                if ((currentPeer.connectionState as string) === "closed") return;

                streamRef.current = stream;
                if (localVideoRef.current) localVideoRef.current.srcObject = stream;

                stream.getTracks().forEach(track => {
                    currentPeer.addTrack(track, stream);
                });
                setIsLocalReady(true);



                if (isIncoming) {
                    setStatus("calling"); // Wait for offer
                } else {
                    setStatus("calling");
                    const offer = await currentPeer.createOffer();
                    
                    if ((currentPeer.connectionState as string) === "closed") return;

                    await currentPeer.setLocalDescription(offer);
                    sendCallSignal(conversationId, { type: "offer", sdp: offer });
                }
            } catch (err) {
                console.error("Media error:", err);
                setStatus("ended");
            }
        };

        const pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_APP_KEY!, {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        });
        const channel = pusher.subscribe(`chat-${conversationId}`);

        initLocalStream();

        if (peerRef.current) {
            peerRef.current.ontrack = (event) => {
                if (event.streams && event.streams[0]) {
                    setRemoteStream(event.streams[0]);
                } else {
                    const fallbackStream = new MediaStream();
                    fallbackStream.addTrack(event.track);
                    setRemoteStream(fallbackStream);
                }
                setStatus("connected");
            };
        }

        peerRef.current.onicecandidate = (event) => {
            if (event.candidate) {

                sendCallSignal(conversationId, { type: "candidate", candidate: event.candidate.toJSON() });
            }
        };

        channel.bind("call-signal", async (data: any) => {
            if (data.senderId === userId) return;

            const currentPeer = peerRef.current;
            if (!currentPeer || (currentPeer.connectionState as string) === "closed") return;

            try {
                if (data.type === "offer") {
                    await currentPeer.setRemoteDescription(new RTCSessionDescription(data.sdp));
                    if (isIncoming) setStatus("idle");
                    
                    while (iceCandidatesQueue.current.length > 0) {
                        const cand = iceCandidatesQueue.current.shift();
                        await currentPeer.addIceCandidate(new RTCIceCandidate(cand!));
                    }
                } else if (data.type === "answer") {
                    await currentPeer.setRemoteDescription(new RTCSessionDescription(data.sdp));
                    setStatus("connected");
                    
                    while (iceCandidatesQueue.current.length > 0) {
                        const cand = iceCandidatesQueue.current.shift();
                        await currentPeer.addIceCandidate(new RTCIceCandidate(cand!));
                    }
                } else if (data.type === "candidate" && data.candidate) {
                    if (currentPeer.remoteDescription) {
                        await currentPeer.addIceCandidate(new RTCIceCandidate(data.candidate));
                    } else {
                        iceCandidatesQueue.current.push(data.candidate);
                    }
                } else if (data.type === "ended") {
                    // Synchronized Hangup
                    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
                    currentPeer.close();
                    setStatus("ended");
                }
            } catch (err) {
                console.error("Signal Handling Error:", err);
            }
        });

        return () => {
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
            if (peerRef.current) peerRef.current.close();
            channel.unbind("call-signal");
            pusher.unbind_all();
            pusher.unsubscribe(`chat-${conversationId}`);
        };
    }, [isOpen, conversationId, userId, isIncoming, isAudioOnly]);

    useEffect(() => {
        if (status === "connected") {
            if (localVideoRef.current && streamRef.current && !isAudioOnly) {
                localVideoRef.current.srcObject = streamRef.current;
            }
            if (remoteVideoRef.current && remoteStream) {
                remoteVideoRef.current.srcObject = remoteStream;
            }
        }
    }, [status, isAudioOnly, remoteStream]);

    const acceptCall = async () => {
        const currentPeer = peerRef.current;
        if (!currentPeer || (currentPeer.connectionState as string) === "closed") return;
        try {
            setStatus("calling");
            const answer = await currentPeer.createAnswer();
            if (currentPeer.connectionState === "closed") return;

            await currentPeer.setLocalDescription(answer);
            sendCallSignal(conversationId, { type: "answer", sdp: answer });
            setStatus("connected");
        } catch (err) {
            console.error("Accept Error:", err);
        }
    };

    const endCall = () => {
        sendCallSignal(conversationId, { type: "ended" });
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        if (peerRef.current) peerRef.current.close();
        setStatus("ended");
        onClose();
    };

    const toggleCamera = async () => {
        if (isAudioOnly || !streamRef.current) return;
        try {
            const newMode = facingMode === "user" ? "environment" : "user";
            setFacingMode(newMode);
            
            const newStream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: newMode }, 
                audio: true 
            });
            
            const videoTrack = newStream.getVideoTracks()[0];
            const sender = peerRef.current?.getSenders().find(s => s.track?.kind === "video");
            
            if (sender && videoTrack) {
                sender.replaceTrack(videoTrack);
            }
            
            if (localVideoRef.current) localVideoRef.current.srcObject = newStream;
            streamRef.current.getVideoTracks().forEach(t => t.stop()); // stop old video only
            streamRef.current = newStream;
        } catch (err) {
            console.error("Toggle Camera Error:", err);
        }
    };

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div style={{ position: "fixed", inset: 0, background: "rgba(10, 10, 15, 0.88)", backdropFilter: "blur(18px)", zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", animation: "fadeIn 0.25s ease" }}>
            <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px" }}>
                
                {status !== "connected" && status !== "ended" && (
                    <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                        <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "var(--blue)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", color: "white", fontWeight: 800, boxShadow: "0 4px 15px rgba(0, 180, 219, 0.3)" }}>
                            {callerName[0].toUpperCase()}
                        </div>
                        <div style={{ color: "white", fontSize: "1.4rem", fontWeight: 700, background: "rgba(255,255,255,0.08)", padding: "10px 24px", borderRadius: "30px", backdropFilter: "blur(4px)" }}>
                            {status === "calling" 
                                ? (isIncoming ? `Conectando llamada de ${callerName}...` : `Llamando a ${callerName}...`) 
                                : `Llamada entrante de ${callerName}`}
                        </div>

                        {isAudioOnly && <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Solo Audio</div>}
                    </div>
                )}

                {isIncoming && status === "idle" && (
                    <div style={{ display: "flex", gap: "24px", marginTop: "30px" }}>
                        <button 
                            onClick={acceptCall} 
                            disabled={!isLocalReady}
                            style={{ 
                                background: "linear-gradient(135deg, #00B4DB 0%, #0083B0 100%)", 
                                opacity: isLocalReady ? 1 : 0.6,
                                color: "white", 
                                border: "none", 
                                borderRadius: "50%", 
                                width: "70px", 
                                height: "70px", 
                                cursor: isLocalReady ? "pointer" : "not-allowed", 
                                display: "flex", 
                                alignItems: "center", 
                                justifyContent: "center", 
                                boxShadow: "0 4px 15px rgba(0, 180, 219, 0.4)" 
                            }}
                        >
                            <svg viewBox="0 0 24 24" width="30" height="30" fill="white"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.35-5.3-3.82-6.66-6.66l1.97-1.56a.99.99 0 0 0 .24-1.01 11.37 11.37 0 0 1-.56-3.53c0-.55-.45-1-1-1H4.48c-.55 0-1 .45-1 1C3.48 14.59 13.41 24.52 23.01 24.03c.55 0 1-.45 1-1v-6.65c0-.55-.45-1-1-1z"/></svg>
                        </button>

                        <button onClick={endCall} style={{ background: "linear-gradient(135deg, #FF416C 0%, #FF4B2B 100%)", color: "white", border: "none", borderRadius: "50%", width: "70px", height: "70px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 15px rgba(255, 65, 108, 0.4)" }}>
                            <svg viewBox="0 0 24 24" width="30" height="30" fill="white"><path d="M12 9c-2.5 0-4.85.59-6.93 1.63a.98.98 0 0 0-.49.85c0 .28.11.55.33.74L6.9 14.2c.18.17.45.24.71.18 1.34-.33 2.76-.5 4.19-.5a8.77 8.77 0 0 1 4.39.81c.25.07.54 0 .73-.18l2.1-2.1a1 1 0 0 0 0-1.41C16.94 9.59 14.5 9 12 9z"/></svg>
                        </button>
                    </div>
                )}

                {status === "ended" && (
                    <div style={{ color: "white", textAlign: "center", display: "flex", flexDirection: "column", gap: 16, background: "rgba(255,255,255,0.05)", padding: "24px", borderRadius: "16px" }}>
                        <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>Llamada finalizada</div>
                        <button onClick={onClose} style={{ background: "var(--blue)", color: "white", border: "none", borderRadius: "25px", padding: "10px 24px", fontWeight: 600 }}>Cerrar</button>
                    </div>
                )}

                {status === "connected" && (
                    <div className="call-modal-video-container" style={{ position: "relative", width: "95%", height: "85%", background: "#050508", borderRadius: "20px", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
                        
                        {/* Remote Video (Main typically) */}
                        {!isLocalMain ? (
                            <div style={{ width: "100%", height: "100%", background: "#0c0c0f" }}>
                                {isAudioOnly ? (
                                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "1.5rem" }}>Solo Audio</div>
                                ) : (
                                    <video ref={remoteVideoRef} autoPlay playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                )}
                            </div>
                        ) : (
                            <video ref={localVideoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        )}

                        {/* Local/Small Floating Video */}
                        <div 
                            onClick={() => setIsLocalMain(!isLocalMain)}
                            style={{ 
                                position: "absolute", 
                                top: isMobile ? "20px" : "auto", 
                                bottom: isMobile ? "auto" : "20px", 
                                right: "20px", 
                                width: isMobile ? "120px" : "160px", 
                                height: isMobile ? "90px" : "120px", 
                                borderRadius: "12px", 
                                background: "#111", 
                                overflow: "hidden", 
                                border: "2px solid rgba(255,255,255,0.2)", 
                                cursor: "pointer", 
                                zIndex: 10 
                            }}
                        >
                            {!isLocalMain ? (

                                <video ref={localVideoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                                <video ref={remoteVideoRef} autoPlay playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            )}
                        </div>

                        {/* Extra Controls Bar (Swap & Flip & Hangup) */}
                        <div style={{ position: "absolute", bottom: "calc(20px + env(safe-area-inset-bottom, 0px))", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "16px", background: "rgba(0,0,0,0.5)", padding: "10px 20px", borderRadius: "30px", backdropFilter: "blur(12px)", zIndex: 25, alignItems: "center" }}>
                            <button onClick={() => setIsLocalMain(!isLocalMain)} style={{ background: "none", border: "none", color: "white", cursor: "pointer", padding: "4px", fontSize: "1.2rem" }} title="Cambiar vista">
                                🔄
                            </button>
                            {!isAudioOnly && (
                                <button onClick={toggleCamera} style={{ background: "none", border: "none", color: "white", cursor: "pointer", padding: "4px", fontSize: "1.2rem" }} title="Girar cámara">
                                    📷
                                </button>
                            )}
                            <button onClick={endCall} style={{ background: "linear-gradient(135deg, #FF416C 0%, #FF4B2B 100%)", color: "white", border: "none", borderRadius: "50%", width: "38px", height: "38px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 8px rgba(255, 65, 108, 0.4)" }} title="Colgar">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M12 9c-2.5 0-4.85.59-6.93 1.63a.98.98 0 0 0-.49.85c0 .28.11.55.33.74L6.9 14.2c.18.17.45.24.71.18 1.34-.33 2.76-.5 4.19-.5a8.77 8.77(0) 0 1 4.39.81c.25.07.54 0 .73-.18l2.1-2.1a1 1(0) 0 0 0-1.41C16.94 9.59 14.5 9 12 9z"/></svg>
                            </button>
                        </div>
                    </div>
                )}


                {status === "calling" && (

                    <button onClick={endCall} style={{ position: "absolute", bottom: "calc(45px + env(safe-area-inset-bottom, 0px))", background: "linear-gradient(135deg, #FF416C 0%, #FF4B2B 100%)", color: "white", border: "none", borderRadius: "35px", padding: "14px 32px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", zIndex: 30 }}>
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M12 9c-2.5 0-4.85.59-6.93 1.63a.98.98 0 0 0-.49.85c0 .28.11.55.33.74L6.9 14.2c.18.17.45.24.71.18 1.34-.33 2.76-.5 4.19-.5a8.77 8.77 0 0 1 4.39.81c.25.07.54 0 .73-.18l2.1-2.1a1 1 0 0 0 0-1.41C16.94 9.59 14.5 9 12 9z"/></svg>
                        <span>Colgar</span>
                    </button>
                )}

            </div>
        </div>,
        document.body
    );
}
