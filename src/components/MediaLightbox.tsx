"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import { TweetActionBar } from "./TweetActionBar";

interface MediaLightboxProps {
    images: { url: string; type?: string }[];
    initialIndex: number;
    onClose: () => void;
    tweet?: any;
    userId?: string;
}

export function MediaLightbox({ images, initialIndex, onClose, tweet, userId }: MediaLightboxProps) {
    const [index, setIndex] = useState(initialIndex);
    const { t } = useTranslation();

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleEsc);
        document.body.style.overflow = "hidden";
        return () => {
            window.removeEventListener("keydown", handleEsc);
            document.body.style.overflow = "auto";
        };
    }, [onClose]);

    const handleNext = (e?: React.MouseEvent) => {
        e?.preventDefault();
        e?.stopPropagation();
        setIndex((prev) => (prev + 1) % images.length);
    };

    const handlePrev = (e?: React.MouseEvent) => {
        e?.preventDefault();
        e?.stopPropagation();
        setIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    const currentMedia = images[index];

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 9999,
                    background: "rgba(0,0,0,0.95)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "20px"
                }}
                onClick={onClose}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    style={{
                        position: "absolute",
                        top: 20,
                        left: 20,
                        background: "rgba(255,255,255,0.1)",
                        border: "none",
                        color: "white",
                        padding: "10px",
                        borderRadius: "50%",
                        cursor: "pointer",
                        zIndex: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "background 0.2s"
                    }}
                    title={t("close")}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.2)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
                >
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>

                {/* Media Content Area */}
                <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                    <motion.div
                        key={index}
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        style={{ position: "relative", maxWidth: "100%", maxHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {currentMedia.type === 'video' ? (
                            <video
                                src={currentMedia.url}
                                controls
                                autoPlay
                                muted
                                style={{ maxWidth: "100%", maxHeight: "80vh", borderRadius: "12px", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}
                            />
                        ) : currentMedia.type === 'audio' ? (
                            <div style={{ width: "100%", maxWidth: 800, padding: 20, background: "rgba(0,0,0,0.6)", borderRadius: 12 }}>
                                <audio src={currentMedia.url} crossOrigin="anonymous" controls style={{ width: "100%" }} />
                            </div>
                        ) : (
                            <img
                                src={currentMedia.url}
                                alt="Lightbox"
                                style={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain", borderRadius: "12px", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}
                            />
                        )}
                    </motion.div>

                    {/* Navigation Arrows */}
                    {images.length > 1 && (
                        <>
                            <button
                                onClick={handlePrev}
                                style={{
                                    position: "absolute",
                                    left: 0,
                                    background: "rgba(255,255,255,0.05)",
                                    border: "none",
                                    color: "white",
                                    padding: "20px",
                                    borderRadius: "50%",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    transition: "background 0.2s"
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                                title={t("previous")}
                            >
                                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <polyline points="15 18 9 12 15 6"></polyline>
                                </svg>
                            </button>
                            <button
                                onClick={handleNext}
                                style={{
                                    position: "absolute",
                                    right: 0,
                                    background: "rgba(255,255,255,0.05)",
                                    border: "none",
                                    color: "white",
                                    padding: "20px",
                                    borderRadius: "50%",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    transition: "background 0.2s"
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                                title={t("next")}
                            >
                                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <polyline points="9 18 15 12 9 6"></polyline>
                                </svg>
                            </button>
                        </>
                    )}
                </div>

                {/* Bottom Actions Bar */}
                <div 
                    style={{ 
                        width: "100%", 
                        maxWidth: "600px", 
                        padding: "10px 0 30px", 
                        display: "flex", 
                        flexDirection: "column", 
                        alignItems: "center", 
                        gap: 12 
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {images.length > 1 && (
                        <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", background: "rgba(255,255,255,0.1)", padding: "4px 12px", borderRadius: "20px", fontWeight: 600 }}>
                            {index + 1} / {images.length}
                        </div>
                    )}
                    
                    {tweet && userId && (
                        <div style={{ width: "100%", background: "rgba(0,0,0,0.5)", padding: "0 20px", borderRadius: "32px", border: "1px solid rgba(255,255,255,0.1)" }}>
                            <TweetActionBar tweet={tweet} userId={userId} />
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
