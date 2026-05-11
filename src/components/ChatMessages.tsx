"use client";

import { useEffect, useState, useRef } from "react";
import PusherClient from "pusher-js";
import { Avatar } from "@/components/Avatar";
import { markMessagesAsRead, toggleMessageReaction, deleteMessage, deleteMessageForMe } from "@/app/actions/message";
import { useTranslation } from "@/lib/i18n";

interface Message {
    id: string;
    content: string;
    senderId: string;
    createdAt: string;
    type?: string;
    audioUrl?: string | null;
    reactions: {
        userId: string;
        emoji: string;
    }[];
    read: boolean;
    sender?: any;
    isEncrypted?: boolean;
}


const COMMON_EMOJIS = ["❤️", "😂", "😮", "😢", "🔥", "👍"];

interface ChatMessagesProps {
    initialMessages: Message[];
    conversationId: string;
    userId: string;
}

function CustomAudioPlayer({ src, isMe }: { src: string, isMe: boolean }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef<HTMLAudioElement>(null);

    const togglePlay = () => {
        if (isPlaying) audioRef.current?.pause();
        else audioRef.current?.play();
        setIsPlaying(!isPlaying);
    };

    const accentColor = isMe ? "white" : "var(--blue)";
    const textColor = isMe ? "rgba(255,255,255,0.8)" : "var(--text-secondary)";

    return (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 14px", background: isMe ? "rgba(255,255,255,0.1)" : "var(--bg-main)", border: isMe ? "none" : "1px solid var(--border)", borderRadius: "20px", minWidth: "220px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <button onClick={togglePlay} style={{ background: isMe ? "white" : "var(--blue)", color: isMe ? "var(--blue)" : "white", border: "none", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "0.8rem", transition: "transform 0.1s" }}>
                {isPlaying ? "⏸" : "▶"}
            </button>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                <input 
                    type="range" 
                    step="any"
                    value={progress} 
                    max={duration || 100} 
                    onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (audioRef.current) audioRef.current.currentTime = val;
                        setProgress(val);
                    }}
                    style={{ flex: 1, accentColor: accentColor, height: "4px", cursor: "pointer" }} 
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: textColor }}>
                    <span>{Math.floor(progress / 60)}:{(Math.floor(progress % 60)).toString().padStart(2, '0')}</span>
                    <span>{Math.floor(duration / 60)}:{(Math.floor(duration % 60)).toString().padStart(2, '0')}</span>
                </div>
            </div>
            <audio 
                ref={audioRef} 
                src={src} 
                onTimeUpdate={() => setProgress(audioRef.current?.currentTime || 0)} 
                onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} 
                onEnded={() => setIsPlaying(false)} 
                style={{ display: "none" }} 
            />
        </div>
    );
}

function MessageItem({ msg, userId, t, setMessages, onMediaClick, isE2eReady }: { msg: Message, userId: string, t: any, setMessages: any, onMediaClick?: (url: string) => void, isE2eReady: boolean }) {
    const [isHovered, setIsHovered] = useState(false);
    const [showReactions, setShowReactions] = useState(false);
    const [showDeleteMenu, setShowDeleteMenu] = useState(false);
    const isMe = msg.senderId === userId;

    const [decryptedContent, setDecryptedContent] = useState<React.ReactNode | null>(msg.isEncrypted ? null : msg.content);
    const [isE2eReadyLocal, setIsE2eReadyLocal] = useState(false);

    useEffect(() => {
        if (!msg.isEncrypted) return;
        
        async function decrypt() {
            try {
                const privateKey = localStorage.getItem("e2ee_private_key");
                if (privateKey) {
                    const { decryptContent } = await import("@/lib/e2ee");
                    
                    let ciphertext = msg.content;
                    try {
                        const parsed = JSON.parse(msg.content);
                        ciphertext = isMe ? parsed.from : parsed.to;
                    } catch (e) {
                        ciphertext = msg.content;
                    }

                    if (!ciphertext) {
                        setDecryptedContent("⚠️ No disponible");
                        return;
                    }

                    const text = await decryptContent(ciphertext, privateKey);
                    setDecryptedContent(text);
                } else {
                    setDecryptedContent("🔒 Cifrado (Falta llave)");
                }
            } catch (err) {
                console.error("Decryption Failed:", err);
                setDecryptedContent("⚠️ No se pudo descifrar");
            }
        }
        decrypt();
    }, [msg.content, msg.isEncrypted, isE2eReady]);






        const handleToggleReaction = async (emoji: string) => {
        await toggleMessageReaction(msg.id, emoji);
        setShowReactions(false);
    };

    const handleDelete = async (mode: "me" | "all") => {
        setShowDeleteMenu(false);
        try {
            setMessages((prev: any[]) => prev.filter((m) => m.id !== msg.id));
            if (mode === "me") {
                await deleteMessageForMe(msg.id);
            } else {
                await deleteMessage(msg.id);
            }
        } catch (err) {
            alert("Error al borrar: " + (err instanceof Error ? err.message : String(err)));
            // Revert state
            setMessages((prev: any[]) => [...prev, msg].sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
        }
    };

    return (
        <div 
            className="message-row" 
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => { setIsHovered(false); setShowReactions(false); }}
            style={{ 
                display: "flex", 
                flexDirection: isMe ? "row-reverse" : "row", 
                gap: "8px", 
                alignItems: "flex-end", 
                position: "relative", 
                marginBottom: msg.reactions?.length > 0 ? "12px" : "0" 
            }}
        >
            {!isMe && <Avatar user={msg.sender} size="sm" />}
            <div style={{
                maxWidth: "70%",
                padding: "10px 14px",
                borderRadius: "18px",
                background: isMe ? "var(--blue)" : "var(--bg-hover)",
                color: isMe ? "white" : "var(--text-primary)",
                fontSize: "0.95rem",
                lineHeight: "1.4",
                borderBottomRightRadius: isMe ? "4px" : "18px",
                borderBottomLeftRadius: isMe ? "18px" : "4px",
                position: "relative"
            }}>
                {msg.type === "audio" ? (
                    <CustomAudioPlayer src={msg.audioUrl || ""} isMe={isMe} />
                ) : msg.type === "image" ? (
                    <img src={msg.audioUrl || ""} alt="Adjunto" onClick={() => onMediaClick?.(msg.audioUrl!)} style={{ maxWidth: "100%", borderRadius: "12px", marginTop: "4px", display: "block", cursor: "pointer", transition: "transform 0.2s" }} className="hover-scale" />
                ) : msg.type === "video" ? (
                    <video src={msg.audioUrl || ""} controls style={{ maxWidth: "100%", borderRadius: "12px", marginTop: "4px", display: "block" }} />
                ) : (
                    decryptedContent || "Cargando..."
                )}



                {/* Reactions Display */}
                {msg.reactions?.length > 0 && (
                    <div style={{ 
                        position: "absolute", 
                        bottom: "-12px", 
                        [isMe ? "right" : "left"]: "12px",
                        background: "var(--bg-main)",
                        border: "1px solid var(--border)",
                        borderRadius: "12px",
                        padding: "2px 6px",
                        display: "flex",
                        gap: "4px",
                        fontSize: "0.80rem",
                        zIndex: 5,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                        cursor: "pointer"
                    }}>
                        {Object.entries(
                            msg.reactions.reduce((acc: any, r: any) => {
                                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                return acc;
                            }, {})
                        ).map(([emoji, count]: [string, any]) => (
                            <span key={emoji} onClick={() => handleToggleReaction(emoji)} style={{ display: "flex", alignItems: "center", gap: "2px" }} title="Remove reaction">
                                {emoji} <span style={{ fontSize: "0.7rem", opacity: 0.8, color: "var(--text-primary)" }}>{count}</span>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Actions Button */}
            <div className="message-actions" style={{ 
                opacity: isHovered || showReactions || showDeleteMenu ? 1 : 0, 
                transition: "opacity 0.2s", 
                display: "flex", 
                gap: "4px", 
                alignItems: "center", 
                position: "relative" 
            }}>
                {showReactions && (
                    <div style={{ position: "absolute", bottom: "35px", [isMe ? "right" : "left"]: 0, display: "flex", gap: "8px", background: "var(--bg-main)", padding: "8px 12px", borderRadius: "24px", boxShadow: "0 4px 16px rgba(0,0,0,0.15)", zIndex: 30, border: "1px solid var(--border)" }}>
                        {COMMON_EMOJIS.map(e => (
                            <span 
                                key={e} 
                                onClick={() => handleToggleReaction(e)} 
                                style={{ cursor: "pointer", fontSize: "1.3rem", transition: "transform 0.1s" }}
                                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.25)")}
                                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                            >
                                {e}
                            </span>
                        ))}
                    </div>
                )}
                <button 
                    onClick={() => setShowReactions(!showReactions)}
                    style={{ background: "transparent", border: "none", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}
                    title="React"
                >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                </button>
                <button 
                    onClick={() => setShowDeleteMenu(!showDeleteMenu)}
                    style={{ background: "transparent", border: "none", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}
                    title="Delete Options"
                >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
                {showDeleteMenu && (
                    <div style={{ position: "absolute", bottom: "35px", [isMe ? "right" : "left"]: 0, background: "var(--bg-main)", padding: "6px", borderRadius: "12px", boxShadow: "0 4px 16px rgba(0,0,0,0.18)", zIndex: 35, border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "2px", minWidth: "140px" }}>
                        <button onClick={() => handleDelete("me")} style={{ border: "none", background: "transparent", cursor: "pointer", padding: "8px 12px", fontSize: "0.85rem", color: "var(--text-primary)", textAlign: "left", borderRadius: "6px", width: "100%" }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>Borrar para mí</button>
                        {isMe && (
                            <button onClick={() => handleDelete("all")} style={{ border: "none", background: "transparent", cursor: "pointer", padding: "8px 12px", fontSize: "0.85rem", color: "var(--red)", textAlign: "left", borderRadius: "6px", width: "100%" }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>Borrar para todos</button>
                        )}
                    </div>
                )}
            </div>

            {isMe && msg.read && (
                <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: "4px" }}>
                    {t("seen")}
                </span>
            )}
        </div>
    );
}

export function ChatMessages({ initialMessages, conversationId, userId }: ChatMessagesProps) {
    const { t } = useTranslation();
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [isTyping, setIsTyping] = useState(false);
    const [isE2eReady, setIsE2eReady] = useState(false);
    const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        async function setupE2EE() {
            try {
                let privKey = localStorage.getItem("e2ee_private_key");
                let pubKey = localStorage.getItem("e2ee_public_key");

                const { getE2EKeys, updateE2EKeys } = await import("@/app/actions/user");
                const userKeys = await getE2EKeys();

                if (privKey && pubKey) {
                    // Pre-existing local keys.
                    if (userKeys?.privateKey && userKeys?.publicKey) {
                        // Server has keys. If they differ, Server is the source of truth!
                        if (userKeys.privateKey !== privKey || userKeys.publicKey !== pubKey) {
                            localStorage.setItem("e2ee_private_key", userKeys.privateKey);
                            localStorage.setItem("e2ee_public_key", userKeys.publicKey);
                        }
                    } else {
                        // Server is missing keys (e.g. initial migration). Push local to server.
                        await updateE2EKeys(pubKey, privKey);
                    }
                } else {
                    if (userKeys?.privateKey && userKeys?.publicKey) {
                        localStorage.setItem("e2ee_private_key", userKeys.privateKey);
                        localStorage.setItem("e2ee_public_key", userKeys.publicKey);
                    } else {
                        const { generateKeypair } = await import("@/lib/e2ee");
                        const keys = await generateKeypair();
                        localStorage.setItem("e2ee_private_key", keys.privateKey);
                        localStorage.setItem("e2ee_public_key", keys.publicKey);
                        
                        await updateE2EKeys(keys.publicKey, keys.privateKey);
                    }
                }
                setIsE2eReady(true);
            } catch (err) {
                console.error("E2EE Setup Failed:", err);
            }
        }



        setupE2EE();
    }, []);



    useEffect(() => {
        const pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_APP_KEY!, {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        });

        const channel = pusher.subscribe(`chat-${conversationId}`);
        channel.bind("new-message", (newMessage: Message) => {
            setMessages((prev) => {
                if (prev.find((m) => m.id === newMessage.id)) return prev;
                return [...prev, newMessage];
            });
            if (newMessage.senderId !== userId) {
                markMessagesAsRead(conversationId).catch(console.error);
            }
        });

        channel.bind("messages-read", () => {
            setMessages((prev) => prev.map(m => ({ ...m, read: true })));
        });

        channel.bind("message-reaction", (data: any) => {
            setMessages((prev) => prev.map(m => {
                if (m.id !== data.messageId) return m;
                const reactions = [...m.reactions];
                if (data.removed) {
                    return { ...m, reactions: reactions.filter(r => !(r.userId === data.userId && r.emoji === data.emoji)) };
                } else {
                    return { ...m, reactions: [...reactions, { userId: data.userId, emoji: data.emoji }] };
                }
            }));
        });

                channel.bind("delete-message-for-me", (data: { messageId: string, userId: string }) => {
            if (data.userId === userId) {
                setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
            }
        });

        channel.bind("delete-message", (data: { messageId: string }) => {
            setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
        });

        channel.bind("typing", (data: { userId: string, isTyping: boolean }) => {
            if (data.userId !== userId) {
                setIsTyping(data.isTyping);
            }
        });

        markMessagesAsRead(conversationId).catch(console.error);

        return () => {
            pusher.unsubscribe(`chat-${conversationId}`);
        };
    }, [conversationId, userId]);

    useEffect(() => {
        scrollRef.current?.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: "smooth"
        });
    }, [messages]);

    return (
        <div ref={scrollRef} className="message-container" style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px", background: "var(--bg-main)", position: "relative" }}>
            {messages.length === 0 ? (
                <div className="empty-state">{t("noMessagesYet")}</div>
            ) : (
                messages.map((msg) => (
                    <MessageItem key={msg.id} msg={msg} userId={userId} t={t} setMessages={setMessages} onMediaClick={setSelectedMedia} isE2eReady={isE2eReady} />
                ))

            )}
            
            {isTyping && (
                <div style={{ display: "flex", alignItems: "center", padding: "10px 16px", background: "var(--bg-hover)", borderRadius: "18px", borderBottomLeftRadius: "4px", alignSelf: "flex-start", maxWidth: "max-content", marginBottom: "8px", animation: "fadeIn 0.2s" }}>
                    <img src="/typing.svg" alt="Escribiendo..." style={{ height: "12px", display: "block" }} />
                </div>
            )}

            {/* Lightbox Modal Overlay */}
            {selectedMedia && (
                <div 
                    onClick={() => setSelectedMedia(null)} 
                    style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.85)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", animation: "fadeIn 0.15s ease-in-out" }}
                >
                    <button style={{ position: "absolute", top: "24px", right: "24px", background: "none", border: "none", color: "white", fontSize: "1.8rem", cursor: "pointer", opacity: 0.8 }} onClick={() => setSelectedMedia(null)}>✕</button>
                    <img 
                        src={selectedMedia} 
                        alt="Preview" 
                        style={{ maxHeight: "90vh", maxWidth: "90vw", borderRadius: "12px", boxShadow: "0 8px 32px rgba(0,0,0,0.4)", objectFit: "contain" }} 
                        onClick={(e) => e.stopPropagation()} 
                    />
                </div>
            )}
        </div>

    );
}
