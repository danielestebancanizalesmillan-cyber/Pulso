"use client";

import { useState, useEffect } from "react";
import { ComposeTweet } from "./ComposeTweet";
import { createPortal } from "react-dom";

export function GlobalCompose() {
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const handleOpen = () => setIsOpen(true);
        window.addEventListener("open-compose", handleOpen);
        
        // Let user hit Escape to close it
        const handleKd = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsOpen(false);
        };
        window.addEventListener("keydown", handleKd);

        return () => {
            window.removeEventListener("open-compose", handleOpen);
            window.removeEventListener("keydown", handleKd);
        };
    }, []);

    if (!mounted || !isOpen) return null;

    return createPortal(
        <div 
            style={{ 
                position: "fixed", top: 0, left: 0, right: 0, bottom: 0, 
                background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "flex-start", 
                justifyContent: "center", zIndex: 99999, paddingTop: "5vh" 
            }} 
            onClick={() => setIsOpen(false)}
        >
            <div 
                style={{ 
                    background: "var(--bg-main)", padding: "16px", borderRadius: "16px", 
                    width: "90%", maxWidth: "600px", boxShadow: "var(--shadow-lg)"
                }} 
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <button className="icon-btn" onClick={() => setIsOpen(false)}>✕</button>
                </div>
                <ComposeTweet onSuccess={() => setIsOpen(false)} autoFocus />
            </div>
        </div>,
        document.body
    );
}
