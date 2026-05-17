"use client";

import { useState, useEffect, useRef } from "react";
import { deleteStatus, markStatusViewed } from "@/app/actions/status";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar } from "./Avatar";
import { toast } from "react-hot-toast";

declare global {
    interface Window {
        YT?: any;
        onYouTubeIframeAPIReady?: () => void;
    }
}

function getYouTubeId(url?: string | null) {
    if (!url) return null;
    const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
    return match && match[2].length === 11 ? match[2] : null;
}

function loadYouTubeApi() {
    return new Promise<void>((resolve) => {
        if (window.YT?.Player) {
            resolve();
            return;
        }

        const previousReady = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
            previousReady?.();
            resolve();
        };

        const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
        if (!existing) {
            const tag = document.createElement("script");
            tag.src = "https://www.youtube.com/iframe_api";
            document.head.appendChild(tag);
        } else {
            const interval = setInterval(() => {
                if (window.YT?.Player) {
                    clearInterval(interval);
                    resolve();
                }
            }, 100);
            setTimeout(() => {
                clearInterval(interval);
                resolve();
            }, 5000);
        }
    });
}

export function StatusViewerModal({ group, onClose }: { group: any, onClose: () => void }) {
    const { data: session } = useSession();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [audioLoading, setAudioLoading] = useState(false);
    const [audioPlaying, setAudioPlaying] = useState(false);

    const items = group.items;
    const currentItem = items[currentIndex];
    const isOwner = currentItem.userId === session?.user?.id;

    // Parse Style Options for text styling and position
    let styleOpts: any = null;
    if (currentItem.styleOptions) {
        try {
            styleOpts = JSON.parse(currentItem.styleOptions);
        } catch (e) {
            console.error("Error parsing styleOptions", e);
        }
    }
    const textPos = styleOpts?.textPos || { x: 50, y: 50 };
    const hasTextStyle = Boolean(styleOpts?.textPos);

    // Dynamic duration based on audio selection
    const durationCount = currentItem.audioDuration || 5; 
    const stepInterval = (durationCount * 1000) / 100; // time in ms per 1% progress

    useEffect(() => {
        setProgress(0);
        setAudioLoading(false);
        setAudioPlaying(false);

        if (session?.user?.id && !isOwner) {
            markStatusViewed(currentItem.id).catch(console.error);
        }

        const startTime = Date.now();
        const durationMs = durationCount * 1000;

        const timer = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const percentage = Math.min((elapsed / durationMs) * 100, 100);
            setProgress(percentage);

            if (percentage >= 100) {
                clearInterval(timer);
                handleNext();
            }
        }, 30); // 30ms para animación ultra fluida

        return () => clearInterval(timer);
    }, [currentIndex, durationCount]);

    // Sync with global player state
    useEffect(() => {
        const syncState = () => {
            const state = window.__globalAudioState;
            setAudioPlaying(!!(state?.isPlaying && state?.userId === currentItem.id));
        };

        syncState();

        window.addEventListener("global-audio-state-change", syncState);
        return () => {
            window.removeEventListener("global-audio-state-change", syncState);
        };
    }, [currentItem.id]);

    // Auto-play status audio de fondo when slide changes
    useEffect(() => {
        if (currentItem.audioUrl) {
            const t = setTimeout(() => {
                window.dispatchEvent(new CustomEvent("play-global-audio", {
                    detail: {
                        url: currentItem.audioUrl,
                        title: currentItem.audioTitle,
                        start: currentItem.audioStart,
                        userId: currentItem.id,
                        isStatus: true
                    }
                }));
            }, 300);
            return () => clearTimeout(t);
        }
    }, [currentIndex, currentItem.id]);

    // Restore profile background music on unmount
    useEffect(() => {
        return () => {
            window.dispatchEvent(new CustomEvent("restore-global-audio"));
        };
    }, []);

    const handleNext = () => {
        if (currentIndex < items.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            onClose();
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const handleDelete = async () => {
        if (!isOwner) return;
        try {
            await deleteStatus(currentItem.id);
            toast.success("Historia eliminada");
            if (items.length === 1) {
                onClose();
            } else {
                handleNext();
            }
        } catch (error) {
            toast.error("Error al eliminar");
        }
    };

    const toggleAudio = () => {
        if (!currentItem.audioUrl) return;

        const state = window.__globalAudioState;
        if (state?.isPlaying && state?.userId === currentItem.id) {
            window.dispatchEvent(new CustomEvent("pause-global-audio"));
        } else if (state?.userId === currentItem.id && !state?.isPlaying) {
            window.dispatchEvent(new CustomEvent("resume-global-audio"));
        } else {
            setAudioLoading(true);
            window.dispatchEvent(new CustomEvent("play-global-audio", {
                detail: {
                    url: currentItem.audioUrl,
                    title: currentItem.audioTitle,
                    start: currentItem.audioStart,
                    userId: currentItem.id,
                    isStatus: true
                }
            }));
            setTimeout(() => setAudioLoading(false), 800);
        }
    };

    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 5000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={(e) => e.stopPropagation()}
                style={{ position: "relative", width: "100%", maxWidth: "450px", height: "100%", padding: "16px", display: "flex", flexDirection: "column", overflow: "hidden" }}
            >
                {/* ☁️ Background layer ☁️ */}
                {currentItem.type === "IMAGE" && currentItem.mediaUrl ? (
                    <div style={{ position: "absolute", inset: 0, background: `url(${currentItem.mediaUrl}) center/cover no-repeat`, zIndex: 0 }}>
                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.6))" }} />
                    </div>
                ) : (
                    <div style={{ 
                        position: "absolute", 
                        inset: 0, 
                        background: currentItem.background === "sunset" ? "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" :
                                    currentItem.background === "night" ? "linear-gradient(135deg, #30cfd0 0%, #330867 100%)" :
                                    currentItem.background === "neon" ? "linear-gradient(135deg, #f857a6 0%, #ff5858 100%)" :
                                    "linear-gradient(180deg, #4facfe 0%, #00f2fe 100%)", // Default clouds/blue
                        overflow: "hidden", 
                        zIndex: 0 
                    }}>
                        {currentItem.background === "clouds" && (
                            <motion.div animate={{ x: ["0%", "-50%", "0%"] }} transition={{ repeat: Infinity, duration: 40, ease: "linear" }} style={{ position: "absolute", bottom: "-50px", left: 0, width: "200%", height: "200px", background: "rgba(255,255,255,0.35)", borderRadius: "50%", filter: "blur(20px)" }} />
                        )}
                    </div>
                )}

                {/* Top Bars Progress slider container items row */}
                <div style={{ position: "relative", zIndex: 2, display: "flex", gap: "4px", marginBottom: "16px" }}>
                    {items.map((_: any, idx: number) => (
                        <div key={idx} style={{ flex: 1, height: "3px", background: "rgba(255,255,255,0.3)", borderRadius: "1.5px", overflow: "hidden" }}>
                            <div style={{ height: "100%", background: "white", width: idx === currentIndex ? `${progress}%` : idx < currentIndex ? "100%" : "0%" }} />
                        </div>
                    ))}
                </div>

                {/* User Info header inside sheet list menu options row */}
                <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "space-between", color: "white" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ border: "2px solid white", borderRadius: "50%", display: "flex" }}>
                            <Avatar user={group.user} size="md" />
                        </div>
                        <span style={{ fontWeight: "600", fontSize: "0.95rem" }}>{group.user.name}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        {isOwner && (
                            <button onClick={handleDelete} style={{ background: "rgba(255,0,0,0.2)", border: "none", color: "white", padding: "6px", borderRadius: "50%", cursor: "pointer", display: "flex" }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                            </button>
                        )}
                        <button onClick={onClose} style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: "1.1rem" }}>✕</button>
                    </div>
                </div>

                {/* Main Content Viewer inside slider sheet wrapper motion container */}
                <div style={{ position: "relative", zIndex: 2, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", width: "100%" }}>
                    <motion.div 
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        style={{ 
                            position: hasTextStyle ? "absolute" : "relative",
                            left: hasTextStyle ? `${textPos.x}%` : "auto",
                            top: hasTextStyle ? `${textPos.y}%` : "auto",
                            transform: hasTextStyle ? "translate(-50%, -50%)" : "none",
                            background: styleOpts ? (styleOpts.useTextBg ? "rgba(0,0,0,0.45)" : "transparent") : "rgba(0,0,0,0.45)", 
                            backdropFilter: styleOpts ? (styleOpts.useTextBg ? "blur(12px)" : "none") : "blur(12px)", 
                            padding: "16px 24px", 
                            borderRadius: "20px", 
                            maxWidth: "90%", 
                            border: styleOpts ? (styleOpts.useTextBg ? "1px solid rgba(255,255,255,0.18)" : "none") : "1px solid rgba(255,255,255,0.18)",
                            boxShadow: styleOpts ? (styleOpts.useTextBg ? "0 12px 40px rgba(0,0,0,0.3)" : "none") : "0 12px 40px rgba(0,0,0,0.3)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                        }}
                    >
                        <p style={{ 
                            color: styleOpts ? (styleOpts.textColor || "white") : "white", 
                            fontSize: styleOpts?.fontSize ? `${styleOpts.fontSize}rem` : "1.75rem", 
                            fontWeight: "800", 
                            textAlign: "center", 
                            textShadow: "0 2px 4px rgba(0,0,0,0.2)", 
                            wordBreak: "break-word", 
                            lineHeight: 1.35, 
                            margin: 0 
                        }}>
                            {currentItem.content}
                        </p>
                    </motion.div>
                </div>

                {/* Bottom audio controller slider toolbar track action view */}
                {currentItem.audioUrl && (
                    <div style={{ position: "relative", zIndex: 2, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(10px)", padding: "10px 16px", borderRadius: "12px", display: "flex", alignItems: "center", gap: "8px", color: "white", marginBottom: "30px", border: "1px solid rgba(255,255,255,0.1)" }}>
                        <div style={{ fontSize: "1.1rem" }}>🎵</div>
                        <div style={{ fontSize: "0.85rem", opacity: 0.9, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {styleOpts?.audioTitle || "Reproduciendo música..."}
                        </div>
                        <button
                            onClick={toggleAudio}
                            disabled={audioLoading}
                            style={{ background: "white", color: "black", border: "none", borderRadius: "999px", padding: "6px 12px", fontSize: "0.75rem", fontWeight: 800, cursor: audioLoading ? "wait" : "pointer" }}
                        >
                            {audioLoading ? "..." : audioPlaying ? "Pausar" : "Audio"}
                        </button>
                    </div>
                )}

                {/* Navigation Controls areas floating nodes inside wrapper grid row offset */}
                <div style={{ position: "absolute", top: "60px", bottom: "80px", left: 0, width: "30%", zIndex: 3, cursor: "pointer" }} onClick={handlePrev} />
                <div style={{ position: "absolute", top: "60px", bottom: "80px", right: 0, width: "30%", zIndex: 3, cursor: "pointer" }} onClick={handleNext} />
            </motion.div>
        </div>
    );
}
