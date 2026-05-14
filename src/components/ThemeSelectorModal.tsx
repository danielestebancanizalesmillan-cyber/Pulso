"use client";

import { useTheme } from "./ThemeProvider";
import { useTranslation } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Theme = "dark" | "soft-dark" | "light" | "soft-light" | "yellow" | "brown";

interface ThemeSelectorModalProps {
    onClose: () => void;
}

const THEMES: { id: Theme; labelKey: string; color: string; bg: string }[] = [
    { id: "light", labelKey: "switchToLight", color: "#1d9bf0", bg: "#ffffff" },
    { id: "soft-light", labelKey: "switchToSoftLight", color: "#1d9bf0", bg: "#f5f8fa" },
    { id: "dark", labelKey: "switchToDark", color: "#1d9bf0", bg: "#000000" },
    { id: "soft-dark", labelKey: "switchToSoftDark", color: "#1d9bf0", bg: "#15202b" },
    { id: "yellow", labelKey: "switchToYellow", color: "#000000", bg: "#ffeb3b" },
    { id: "brown", labelKey: "switchToBrown", color: "#ffb74d", bg: "#3e2723" },
];

export function ThemeSelectorModal({ onClose }: ThemeSelectorModalProps) {
    const { theme, setThemeString } = useTheme();
    const { t } = useTranslation();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return createPortal(
        <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 5000
        }} onClick={onClose}>
            <div style={{
                background: "var(--bg-elevated)", padding: "24px", borderRadius: "16px",
                width: "90%", maxWidth: "400px", boxShadow: "var(--shadow-lg)"
            }} onClick={e => e.stopPropagation()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <h2 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0 }}>{t("selectTheme")}</h2>
                    <button className="icon-btn" onClick={onClose} style={{ background: "var(--bg-hover)" }}>✕</button>
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {THEMES.map((tItem) => {
                        const isActive = theme === tItem.id;
                        return (
                            <button
                                key={tItem.id}
                                onClick={() => setThemeString(tItem.id)}
                                style={{
                                    display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                                    padding: "16px 8px", borderRadius: "12px",
                                    background: tItem.bg,
                                    border: isActive ? `2px solid var(--blue)` : `2px solid var(--border)`,
                                    color: tItem.id.includes("light") || tItem.id === "yellow" ? "#000" : "#fff",
                                    cursor: "pointer",
                                    transition: "all 0.2s"
                                }}
                            >
                                <div style={{
                                    width: 24, height: 24, borderRadius: "50%",
                                    background: tItem.color,
                                    border: isActive ? "none" : "2px solid rgba(128,128,128,0.3)"
                                }}>
                                    {isActive && (
                                        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, margin: "4px auto", display: "block" }}>
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    )}
                                </div>
                                <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{t(tItem.labelKey)}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>,
        document.body
    );
}
