"use client";

import { motion } from "framer-motion";
import { Avatar } from "./Avatar";

interface AdPostCardProps {
    ad: {
        title: string;
        description: string;
        imageUrl?: string;
        videoUrl?: string;
        avatarUrl?: string;
        link: string;
        cta: string;
    };
}

export function AdPostCard({ ad }: AdPostCardProps) {
    const handleAction = () => {
        if (ad.link) {
            let finalLink = ad.link;
            if (!/^https?:\/\//i.test(finalLink)) {
                finalLink = "https://" + finalLink;
            }
            window.open(finalLink, "_blank", "noopener,noreferrer");
        }
    };

    const getYoutubeVideoId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const ytId = ad.videoUrl ? getYoutubeVideoId(ad.videoUrl) : null;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="tweet-card"
            style={{ 
                borderBottom: "1px solid var(--border)", 
                padding: "16px",
                display: "flex",
                gap: "12px",
                position: "relative",
                cursor: "pointer",
                background: "var(--bg-main)"
            }}
            onClick={handleAction}
        >
            {/* Avatar Column */}
            <div style={{ flexShrink: 0 }}>
                <Avatar 
                    user={{ name: ad.title, avatar: ad.avatarUrl || "/favicon.ico" }}
                    size="md"
                />
            </div>

            {/* Content Column */}
            <div style={{ flex: 1, minWidth: 0 }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, color: "var(--text-main)", fontSize: "0.95rem" }}>
                            {ad.title}
                        </span>
                        <VerifiedBadge />
                        <span style={{ 
                            fontSize: "0.75rem", 
                            color: "var(--text-secondary)", 
                            border: "1px solid var(--border)",
                            padding: "1px 6px",
                            borderRadius: "4px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                        }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="2" x2="12" y2="22"></line>
                                <line x1="2" y1="12" x2="22" y2="12"></line>
                                <path d="m20 16-4-4 4-4"></path>
                                <path d="m4 8 4 4-4 4"></path>
                            </svg>
                            Promocionado
                        </span>
                    </div>
                </div>

                {/* Body Text */}
                <p style={{ 
                    fontSize: "0.95rem", 
                    color: "var(--text-main)", 
                    margin: "0 0 12px 0",
                    lineHeight: "1.4",
                    wordBreak: "break-word",
                    whiteSpace: "pre-wrap"
                }}>
                    {ad.description}
                </p>

                {/* Media */}
                {(ad.imageUrl || ad.videoUrl) && (
                    <div style={{ 
                        borderRadius: "16px", 
                        overflow: "hidden", 
                        border: "1px solid var(--border)", 
                        marginBottom: "12px",
                        background: "var(--bg-secondary)",
                        maxHeight: "500px"
                    }}>
                        {ytId ? (
                            <div onClick={e => e.stopPropagation()}>
                                <iframe 
                                    width="100%" 
                                    height="315" 
                                    src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`} 
                                    title="YouTube video player" 
                                    frameBorder="0" 
                                    allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" 
                                    allowFullScreen
                                    referrerPolicy="no-referrer-when-downgrade"
                                    style={{ display: "block", border: "none" }}
                                />
                            </div>
                        ) : ad.videoUrl ? (
                            <video 
                                src={ad.videoUrl} 
                                controls 
                                muted 
                                autoPlay 
                                loop
                                playsInline
                                onClick={(e) => e.stopPropagation()}
                                style={{ width: "100%", maxHeight: "500px", objectFit: "contain", display: "block" }}
                            />
                        ) : (
                            <img 
                                src={ad.imageUrl} 
                                alt="Advertisement" 
                                style={{ width: "100%", maxHeight: "500px", objectFit: "cover", display: "block" }}
                            />
                        )}
                    </div>
                )}

                {/* CTA Button */}
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        handleAction();
                    }}
                    style={{ 
                        width: "100%", 
                        padding: "12px", 
                        borderRadius: "9999px", 
                        border: "none", 
                        background: "var(--primary)", 
                        color: "white", 
                        fontWeight: 700, 
                        fontSize: "0.95rem",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: "8px",
                        transition: "background 0.2s"
                    }}
                    onMouseOver={(e) => e.currentTarget.style.filter = "brightness(0.9)"}
                    onMouseOut={(e) => e.currentTarget.style.filter = "brightness(1)"}
                >
                    {ad.cta || "Más información"}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                </button>
            </div>
        </motion.div>
    );
}

function VerifiedBadge() {
    return (
        <svg viewBox="0 0 24 24" aria-label="Verified account" role="img" style={{ width: "18px", height: "18px", color: "var(--primary)", display: "inline-block" }}>
            <g><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.918-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.337 2.25c-.416-.165-.866-.25-1.336-.25-2.21 0-3.918 1.79-3.918 4 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.46.74 2.76 1.867 3.49-.033.2-.05.405-.05.61 0 2.21 1.71 4 3.918 4 .585 0 1.14-.124 1.636-.347.535 1.34 1.85 2.25 3.337 2.25s2.802-.91 3.337-2.25c.496.223 1.05.347 1.636.347 2.21 0 3.918-1.79 3.918-4 0-.205-.017-.41-.05-.61 1.127-.73 1.867-2.03 1.867-3.49z" fill="currentColor"></path><path d="M15.34 9.17l-4.7 4.7-2.3-2.3-1.42 1.41 3.72 3.72 6.12-6.12-1.42-1.41z" fill="#fff"></path></g>
        </svg>
    );
}
