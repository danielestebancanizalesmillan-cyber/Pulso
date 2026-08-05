"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PusherClient from "pusher-js";
import { sendCallSignal } from "@/app/actions/message";
import { useTranslation } from "@/lib/i18n";

interface CallModalProps {
    isOpen: boolean;
    onClose: () => void;
    isIncoming?: boolean;
    isAudioOnly?: boolean; // We will treat everything as audio only now
    callerName?: string;
    conversationId: string;
    userId: string;
}

// Simple Web Audio API Synthesizer for ringtones
class RingtonePlayer {
    private ctx: AudioContext | null = null;
    private oscillator: OscillatorNode | null = null;
    private gainNode: GainNode | null = null;
    private intervalId: any = null;
    private type: 'caller' | 'receiver';

    constructor(type: 'caller' | 'receiver') {
        this.type = type;
    }

    start() {
        if (typeof window === 'undefined') return;
        try {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            
            const playBeep = () => {
                if (!this.ctx) return;
                this.oscillator = this.ctx.createOscillator();
                this.gainNode = this.ctx.createGain();
                
                this.oscillator.type = this.type === 'caller' ? 'sine' : 'square';
                this.oscillator.frequency.setValueAtTime(this.type === 'caller' ? 440 : 600, this.ctx.currentTime);
                if (this.type === 'receiver') {
                    this.oscillator.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.1);
                }
                
                this.gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
                this.gainNode.gain.linearRampToValueAtTime(0.1, this.ctx.currentTime + 0.05);
                this.gainNode.gain.setValueAtTime(0.1, this.ctx.currentTime + (this.type === 'caller' ? 1.5 : 0.8));
                this.gainNode.gain.linearRampToValueAtTime(0, this.ctx.currentTime + (this.type === 'caller' ? 1.6 : 0.9));

                this.oscillator.connect(this.gainNode);
                this.gainNode.connect(this.ctx.destination);
                
                this.oscillator.start(this.ctx.currentTime);
                this.oscillator.stop(this.ctx.currentTime + 2);
            };

            playBeep();
            this.intervalId = setInterval(playBeep, this.type === 'caller' ? 4000 : 2000);
        } catch (e) {
            console.error("Audio Context failed", e);
        }
    }

    stop() {
        if (this.intervalId) clearInterval(this.intervalId);
        if (this.oscillator) {
            try { this.oscillator.stop(); } catch (e) {}
        }
        if (this.ctx) {
            this.ctx.close();
            this.ctx = null;
        }
    }
}

export function CallModal({ isOpen, onClose, isIncoming = false, callerName = "Usuario", conversationId, userId }: CallModalProps) {
    const { t } = useTranslation();
    const [status, setStatus] = useState<"idle" | "calling" | "connected" | "ended">(isIncoming ? "idle" : "calling");
    const [mounted, setMounted] = useState(false);
    
    // Feature States
    const [isLocalReady, setIsLocalReady] = useState(false);

    // WebRTC References
    const localAudioRef = useRef<HTMLAudioElement>(null);
    const remoteAudioRef = useRef<HTMLAudioElement>(null);
    const peerRef = useRef<RTCPeerConnection | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const remoteStreamRef = useRef<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    
    // Signaling queues
    const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
    const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);
    
    // Ringtone
    const ringtoneRef = useRef<RingtonePlayer | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!isOpen) return;

        // Initialize Peer Connection
        peerRef.current = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        });

        const currentPeer = peerRef.current;

        // Start appropriate ringtone
        if (status === "idle" || status === "calling") {
            ringtoneRef.current = new RingtonePlayer(isIncoming ? 'receiver' : 'caller');
            // User interaction might be required, but we try anyway
            ringtoneRef.current.start();
        }

        const initCaller = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
                if (currentPeer.connectionState === "closed") return;

                streamRef.current = stream;
                if (localAudioRef.current) localAudioRef.current.srcObject = stream;

                stream.getTracks().forEach(track => currentPeer.addTrack(track, stream));
                setIsLocalReady(true);
            } catch (err) {
                console.error("Media error:", err);
                setStatus("ended");
                setTimeout(() => onClose(), 2000);
            }
        };

        const pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_APP_KEY!, {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        });
        const channel = pusher.subscribe(`chat-${conversationId}`);

        if (!isIncoming) {
            initCaller();
        } else {
            // Signal to caller that we are ringing and ready to receive offer
            sendCallSignal(conversationId, { type: "ringing" });
        }

        currentPeer.ontrack = (event) => {
            if (event.streams && event.streams[0]) {
                setRemoteStream(event.streams[0]);
            } else {
                const fallbackStream = new MediaStream();
                fallbackStream.addTrack(event.track);
                setRemoteStream(fallbackStream);
            }
            setStatus("connected");
            ringtoneRef.current?.stop();
        };

        currentPeer.onicecandidate = (event) => {
            if (event.candidate) {
                sendCallSignal(conversationId, { type: "candidate", candidate: event.candidate.toJSON() });
            }
        };

        channel.bind("call-signal", async (data: any) => {
            if (data.senderId === userId) return;
            if (currentPeer.connectionState === "closed") return;

            try {
                if (data.type === "ringing") {
                    if (!isIncoming) {
                        // Receiver is ringing, we can now send the offer
                        const offer = await currentPeer.createOffer();
                        await currentPeer.setLocalDescription(offer);
                        sendCallSignal(conversationId, { type: "offer", sdp: offer });
                    }
                } else if (data.type === "offer") {
                    if (isIncoming && status === "idle") {
                        // Store offer until user accepts
                        pendingOfferRef.current = data.sdp;
                    } else if (!isIncoming) {
                        // Edge case clash, shouldn't happen normally
                        await currentPeer.setRemoteDescription(new RTCSessionDescription(data.sdp));
                    }
                } else if (data.type === "answer") {
                    await currentPeer.setRemoteDescription(new RTCSessionDescription(data.sdp));
                    setStatus("connected");
                    ringtoneRef.current?.stop();
                    
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
                    ringtoneRef.current?.stop();
                    setStatus("ended");
                    setTimeout(() => onClose(), 2000);
                }
            } catch (err) {
                console.error("Signal Handling Error:", err);
            }
        });

        return () => {
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
            if (peerRef.current) peerRef.current.close();
            ringtoneRef.current?.stop();
            channel.unbind("call-signal");
            pusher.unbind_all();
            pusher.unsubscribe(`chat-${conversationId}`);
        };
    }, [isOpen, conversationId, userId, isIncoming]);

    useEffect(() => {
        if (status === "connected") {
            if (localAudioRef.current && streamRef.current) {
                localAudioRef.current.srcObject = streamRef.current;
            }
            if (remoteAudioRef.current && remoteStream) {
                remoteAudioRef.current.srcObject = remoteStream;
            }
        }
    }, [status, remoteStream]);

    const acceptCall = async () => {
        ringtoneRef.current?.stop();
        setStatus("calling"); // UI intermediate state
        const currentPeer = peerRef.current;
        if (!currentPeer || currentPeer.connectionState === "closed") return;
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
            streamRef.current = stream;
            if (localAudioRef.current) localAudioRef.current.srcObject = stream;
            stream.getTracks().forEach(track => currentPeer.addTrack(track, stream));
            setIsLocalReady(true);

            if (pendingOfferRef.current) {
                await currentPeer.setRemoteDescription(new RTCSessionDescription(pendingOfferRef.current));
                const answer = await currentPeer.createAnswer();
                await currentPeer.setLocalDescription(answer);
                sendCallSignal(conversationId, { type: "answer", sdp: answer });

                while (iceCandidatesQueue.current.length > 0) {
                    const cand = iceCandidatesQueue.current.shift();
                    await currentPeer.addIceCandidate(new RTCIceCandidate(cand!));
                }
            }
        } catch (err) {
            console.error("Accept Error:", err);
            setStatus("ended");
            setTimeout(() => onClose(), 2000);
        }
    };

    const endCall = () => {
        sendCallSignal(conversationId, { type: "ended" });
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        if (peerRef.current) peerRef.current.close();
        ringtoneRef.current?.stop();
        setStatus("ended");
        onClose();
    };

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div style={{ position: "fixed", inset: 0, background: "rgba(10, 10, 15, 0.88)", backdropFilter: "blur(18px)", zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", animation: "fadeIn 0.25s ease" }}>
            <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px" }}>
                
                {status !== "connected" && status !== "ended" && (
                    <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                        <div style={{ width: "100px", height: "100px", borderRadius: "50%", background: "linear-gradient(135deg, #00B4DB 0%, #0083B0 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3rem", color: "white", fontWeight: 800, boxShadow: "0 4px 20px rgba(0, 180, 219, 0.4)", animation: (status === "calling" || status === "idle") ? "livePulse 2s infinite" : "none" }}>
                            {callerName[0].toUpperCase()}
                        </div>
                        <div style={{ color: "white", fontSize: "1.4rem", fontWeight: 700, background: "rgba(255,255,255,0.08)", padding: "10px 24px", borderRadius: "30px", backdropFilter: "blur(4px)", marginTop: "20px" }}>
                            {status === "calling" 
                                ? (isIncoming ? t('connectingCall').replace('{name}', callerName) : t('callingUser').replace('{name}', callerName)) 
                                : (isIncoming ? t('incomingCallFrom').replace('{name}', callerName) : t('callingUser').replace('{name}', callerName))}
                        </div>

                        <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "8px" }}>
                            {t('callAudioOnly')}
                        </div>
                    </div>
                )}

                {isIncoming && status === "idle" && (
                    <div style={{ display: "flex", gap: "32px", marginTop: "40px" }}>
                        <button 
                            onClick={acceptCall} 
                            style={{ 
                                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", 
                                color: "white", 
                                border: "none", 
                                borderRadius: "50%", 
                                width: "70px", 
                                height: "70px", 
                                cursor: "pointer", 
                                display: "flex", 
                                alignItems: "center", 
                                justifyContent: "center", 
                                boxShadow: "0 4px 15px rgba(16, 185, 129, 0.4)" 
                            }}
                            title={t('accept')}
                        >
                            <svg viewBox="0 0 24 24" width="30" height="30" fill="white"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.35-5.3-3.82-6.66-6.66l1.97-1.56a.99.99 0 0 0 .24-1.01 11.37 11.37 0 0 1-.56-3.53c0-.55-.45-1-1-1H4.48c-.55 0-1 .45-1 1C3.48 14.59 13.41 24.52 23.01 24.03c.55 0 1-.45 1-1v-6.65c0-.55-.45-1-1-1z"/></svg>
                        </button>

                        <button onClick={endCall} style={{ background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)", color: "white", border: "none", borderRadius: "50%", width: "70px", height: "70px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 15px rgba(239, 68, 68, 0.4)" }} title={t('deny')}>
                            <svg viewBox="0 0 24 24" width="30" height="30" fill="white"><path d="M12 9c-2.5 0-4.85.59-6.93 1.63a.98.98 0 0 0-.49.85c0 .28.11.55.33.74L6.9 14.2c.18.17.45.24.71.18 1.34-.33 2.76-.5 4.19-.5a8.77 8.77 0 0 1 4.39.81c.25.07.54 0 .73-.18l2.1-2.1a1 1 0 0 0 0-1.41C16.94 9.59 14.5 9 12 9z"/></svg>
                        </button>
                    </div>
                )}

                {status === "ended" && (
                    <div style={{ color: "white", textAlign: "center", display: "flex", flexDirection: "column", gap: 16, background: "rgba(255,255,255,0.05)", padding: "24px", borderRadius: "16px" }}>
                        <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>{t('callEnded')}</div>
                        <button onClick={onClose} style={{ background: "var(--blue)", color: "white", border: "none", borderRadius: "25px", padding: "10px 24px", fontWeight: 600 }}>{t('close')}</button>
                    </div>
                )}

                {status === "connected" && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "24px" }}>
                        <div style={{ width: "120px", height: "120px", borderRadius: "50%", background: "linear-gradient(135deg, #00B4DB 0%, #0083B0 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3.5rem", color: "white", fontWeight: 800, boxShadow: "0 4px 20px rgba(0, 180, 219, 0.4)" }}>
                            {callerName[0].toUpperCase()}
                        </div>
                        <div style={{ color: "white", fontSize: "1.5rem", fontWeight: 700 }}>
                            {callerName}
                        </div>
                        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "1rem" }}>
                            00:00 {/* Could implement a real timer later */}
                        </div>

                        {/* Hidden audio elements for connection */}
                        <audio ref={localAudioRef} autoPlay muted />
                        <audio ref={remoteAudioRef} autoPlay />

                        <div style={{ display: "flex", gap: "16px", background: "rgba(0,0,0,0.5)", padding: "10px 20px", borderRadius: "30px", backdropFilter: "blur(12px)", zIndex: 25, alignItems: "center", marginTop: "20px" }}>
                            <button onClick={endCall} style={{ background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)", color: "white", border: "none", borderRadius: "50%", width: "48px", height: "48px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 8px rgba(239, 68, 68, 0.4)" }} title={t('endCall')}>
                                <svg viewBox="0 0 24 24" width="24" height="24" fill="white"><path d="M12 9c-2.5 0-4.85.59-6.93 1.63a.98.98 0 0 0-.49.85c0 .28.11.55.33.74L6.9 14.2c.18.17.45.24.71.18 1.34-.33 2.76-.5 4.19-.5a8.77 8.77 0 0 1 4.39.81c.25.07.54 0 .73-.18l2.1-2.1a1 1 0 0 0 0-1.41C16.94 9.59 14.5 9 12 9z"/></svg>
                            </button>
                        </div>
                    </div>
                )}

                {status === "calling" && (
                    <button onClick={endCall} style={{ position: "absolute", bottom: "calc(45px + env(safe-area-inset-bottom, 0px))", background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)", color: "white", border: "none", borderRadius: "35px", padding: "14px 32px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", zIndex: 30, boxShadow: "0 4px 15px rgba(239, 68, 68, 0.4)" }}>
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M12 9c-2.5 0-4.85.59-6.93 1.63a.98.98 0 0 0-.49.85c0 .28.11.55.33.74L6.9 14.2c.18.17.45.24.71.18 1.34-.33 2.76-.5 4.19-.5a8.77 8.77 0 0 1 4.39.81c.25.07.54 0 .73-.18l2.1-2.1a1 1 0 0 0 0-1.41C16.94 9.59 14.5 9 12 9z"/></svg>
                        <span>{t('endCall')}</span>
                    </button>
                )}
            </div>
        </div>,
        document.body
    );
}
