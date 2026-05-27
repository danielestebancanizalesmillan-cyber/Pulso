"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export function CookieBanner() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem("pulso_cookie_consent");
        if (!consent) {
            const timer = setTimeout(() => setIsVisible(true), 2000);
            return () => clearTimeout(timer);
        }
    }, []);

    const acceptCookies = () => {
        localStorage.setItem("pulso_cookie_consent", "accepted");
        setIsVisible(false);
    };

    const declineCookies = () => {
        localStorage.setItem("pulso_cookie_consent", "declined");
        setIsVisible(false);
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 150, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 150, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    style={{
                        position: "fixed",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        zIndex: 99999,
                        padding: "16px",
                        pointerEvents: "none",
                    }}
                >
                    <div style={{
                        maxWidth: "720px",
                        margin: "0 auto",
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--border)",
                        borderRadius: "16px",
                        padding: "20px 24px",
                        boxShadow: "0 -4px 30px rgba(0,0,0,0.4)",
                        pointerEvents: "auto",
                        display: "flex",
                        flexDirection: "column",
                        gap: "16px",
                    }}>
                        {/* Icono + Texto */}
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                            <div style={{
                                background: "var(--bg-secondary)",
                                borderRadius: "50%",
                                padding: "10px",
                                flexShrink: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <circle cx="8" cy="9" r="1" fill="var(--blue)" />
                                    <circle cx="15" cy="13" r="1" fill="var(--blue)" />
                                    <circle cx="10" cy="15" r="1" fill="var(--blue)" />
                                    <circle cx="13" cy="8" r="1" fill="var(--blue)" />
                                </svg>
                            </div>
                            <div>
                                <h3 style={{ fontWeight: 800, fontSize: "1rem", marginBottom: "4px", color: "var(--text-primary)" }}>
                                    Usamos cookies para mejorar tu experiencia
                                </h3>
                                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                                    Utilizamos cookies propias y de terceros para fines analíticos y para mostrarte contenido personalizado.{" "}
                                    <Link href="/privacy" style={{ color: "var(--blue)", textDecoration: "none" }}>
                                        Política de Privacidad
                                    </Link>
                                </p>
                            </div>
                        </div>

                        {/* Botones */}
                        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                            <button
                                onClick={declineCookies}
                                style={{
                                    background: "transparent",
                                    border: "1px solid var(--border)",
                                    color: "var(--text-primary)",
                                    fontWeight: 700,
                                    padding: "10px 20px",
                                    borderRadius: "9999px",
                                    cursor: "pointer",
                                    fontSize: "0.9rem",
                                    transition: "background 0.2s",
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-secondary)")}
                                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                            >
                                Rechazar
                            </button>
                            <button
                                onClick={acceptCookies}
                                style={{
                                    background: "var(--text-primary)",
                                    color: "var(--bg-primary)",
                                    fontWeight: 700,
                                    padding: "10px 24px",
                                    borderRadius: "9999px",
                                    cursor: "pointer",
                                    fontSize: "0.9rem",
                                    border: "none",
                                    transition: "opacity 0.2s",
                                }}
                                onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                            >
                                Aceptar todas
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
