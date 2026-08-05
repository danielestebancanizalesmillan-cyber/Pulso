"use client";

// Force rebuild to fix NextJS Hydration caching trigger
import { useState, useEffect } from "react";
import Link from "next/link";
import { CallModal } from "./CallModal";
import PusherClient from "pusher-js";

import { sendCallNotification } from "@/app/actions/message";

interface ChatHeaderClientProps {
    partner: { id: string, name: string, username: string };
    conversationId: string;
    userId: string;
}

export function ChatHeaderClient({ partner, conversationId, userId }: ChatHeaderClientProps) {
    const [isCallOpen, setIsCallOpen] = useState(false);
    const [isIncoming, setIsIncoming] = useState(false);
    const [isAudioOnly, setIsAudioOnly] = useState(false);

    useEffect(() => {
        const pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_APP_KEY!, {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        });

        const channel = pusher.subscribe(`chat-${conversationId}`);

        channel.bind("incoming-call", (data: any) => {
            if (data.senderId !== userId && !isCallOpen) {
                setIsIncoming(true);
                setIsAudioOnly(data.isAudioOnly || false);
                setIsCallOpen(true);
            }
        });

        return () => {
            pusher.unsubscribe(`chat-${conversationId}`);
        };
    }, [conversationId, userId]);

    const handleStartCall = async (audioOnly: boolean = false) => {
        setIsIncoming(false);
        setIsAudioOnly(audioOnly);
        setIsCallOpen(true);
        
        try {
            await sendCallNotification(conversationId, audioOnly);
        } catch (err) {
            console.error("Call Failed:", err);
        }
    };



    return (
        <>
            <div className="column-header" style={{ position: "sticky", top: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <Link href="/messages" className="back-btn" aria-label="Back">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </Link>
                    <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>{partner.name}</h2>
                </div>

                <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                    <button 
                        onClick={() => handleStartCall(true)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--blue)", display: "flex", alignItems: "center", justifyContent: "center", padding: "8px", borderRadius: "50%", position: "relative", zIndex: 9999, pointerEvents: "auto" }}
                        title="Iniciar Llamada de Voz"
                    >
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                            <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.35-5.3-3.82-6.66-6.66l1.97-1.56a.99.99 0 0 0 .24-1.01 11.37 11.37 0 0 1-.56-3.53c0-.55-.45-1-1-1H4.48c-.55 0-1 .45-1 1C3.48 14.59 13.41 24.52 23.01 24.03c.55 0 1-.45 1-1v-6.65c0-.55-.45-1-1-1z"/>
                        </svg>
                    </button>
                </div>
            </div>

            <CallModal 
                isOpen={isCallOpen} 
                onClose={() => setIsCallOpen(false)} 
                isIncoming={isIncoming}
                isAudioOnly={isAudioOnly}
                callerName={partner.name}
                conversationId={conversationId}
                userId={userId}
            />
        </>
    );
}
