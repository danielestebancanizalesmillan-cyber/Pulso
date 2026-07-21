"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n";

interface CreateSpaceModalProps {
  onClose: () => void;
}

export function CreateSpaceModal({ onClose }: CreateSpaceModalProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!title.trim()) { setError(t("titleRequired")); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || t("failedToCreate")); setLoading(false); return; }
      onClose();
      router.push(`/spaces/${data.id}`);
    } catch {
      setError(t("networkError"));
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px",
    }} onClick={onClose}>
      <div style={{
        background: "var(--bg-card, #18181b)",
        borderRadius: "24px",
        padding: "32px",
        width: "100%",
        maxWidth: "480px",
        boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
        border: "1px solid var(--border, rgba(255,255,255,0.08))",
        display: "flex", flexDirection: "column", gap: "20px",
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--text-main, #fff)" }}>
                {t("createSpace")}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary, #888)" }}>
                {t("liveAudioRoom")}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary, #888)", padding: 4 }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Title input */}
        <div>
          <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary, #888)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {t("spaceTitle")}
          </label>
          <input
            id="space-title"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={t("whatTalkAbout")}
            maxLength={120}
            style={{
              width: "100%", marginTop: 8,
              background: "var(--bg-input, rgba(255,255,255,0.05))",
              border: "1.5px solid var(--border, rgba(255,255,255,0.1))",
              borderRadius: "12px", padding: "12px 16px",
              color: "var(--text-main, #fff)", fontSize: "1rem",
              outline: "none", boxSizing: "border-box",
              transition: "border-color 0.2s",
            }}
            onFocus={e => (e.target.style.borderColor = "#7c3aed")}
            onBlur={e => (e.target.style.borderColor = "var(--border, rgba(255,255,255,0.1))")}
            autoFocus
          />
          <div style={{ textAlign: "right", fontSize: "0.75rem", color: "var(--text-secondary, #888)", marginTop: 4 }}>
            {title.length}/120
          </div>
        </div>

        {/* Description input */}
        <div>
          <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary, #888)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {t("descriptionOptional")}
          </label>
          <textarea
            id="space-description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={t("describeSpace")}
            maxLength={280}
            rows={3}
            style={{
              width: "100%", marginTop: 8,
              background: "var(--bg-input, rgba(255,255,255,0.05))",
              border: "1.5px solid var(--border, rgba(255,255,255,0.1))",
              borderRadius: "12px", padding: "12px 16px",
              color: "var(--text-main, #fff)", fontSize: "0.95rem",
              outline: "none", resize: "none", boxSizing: "border-box",
              transition: "border-color 0.2s", fontFamily: "inherit",
            }}
            onFocus={e => (e.target.style.borderColor = "#7c3aed")}
            onBlur={e => (e.target.style.borderColor = "var(--border, rgba(255,255,255,0.1))")}
          />
        </div>

        {/* Info */}
        <div style={{
          background: "rgba(124,58,237,0.1)", borderRadius: "12px",
          padding: "12px 16px", display: "flex", gap: 10, alignItems: "flex-start",
          border: "1px solid rgba(124,58,237,0.2)",
        }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#7c3aed" strokeWidth="2" style={{ flexShrink: 0, marginTop: 2 }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span style={{ fontSize: "0.82rem", color: "var(--text-secondary, #888)", lineHeight: 1.5 }}>
            {t("spacePublicNotice")}
          </span>
        </div>

        {/* Error */}
        {error && (
          <div style={{ color: "#ef4444", fontSize: "0.85rem", background: "rgba(239,68,68,0.15)", padding: "10px 14px", borderRadius: "10px" }}>
            {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: "12px",
              background: "var(--bg-hover, rgba(255,255,255,0.06))",
              border: "1px solid var(--border, rgba(255,255,255,0.1))",
              borderRadius: "12px", color: "var(--text-main, #fff)",
              fontWeight: 600, cursor: "pointer", fontSize: "0.95rem",
            }}
          >
            {t("cancel")}
          </button>
          <button
            id="create-space-btn"
            onClick={handleCreate}
            disabled={loading || !title.trim()}
            style={{
              flex: 2, padding: "12px",
              background: loading || !title.trim()
                ? "rgba(124,58,237,0.4)"
                : "linear-gradient(135deg, #7c3aed, #4f46e5)",
              border: "none", borderRadius: "12px",
              color: "white", fontWeight: 700,
              cursor: loading || !title.trim() ? "not-allowed" : "pointer",
              fontSize: "0.95rem", display: "flex", alignItems: "center",
              justifyContent: "center", gap: 8, transition: "opacity 0.2s",
            }}
          >
            {loading ? (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="white" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              </svg>
            )}
            {loading ? t("creating") : t("startSpace")}
          </button>
        </div>
      </div>
    </div>
  );
}
