"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTheme, WallpaperConfig } from "./ThemeProvider";
import { upload } from "@vercel/blob/client";

interface WallpaperPickerModalProps {
    onClose: () => void;
}

const GRADIENT_PRESETS = [
    { label: "Aurora", value: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)" },
    { label: "Sunset", value: "linear-gradient(135deg, #f83600, #f9d423)" },
    { label: "Ocean", value: "linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)" },
    { label: "Sakura", value: "linear-gradient(135deg, #f953c6, #b91d73)" },
    { label: "Forest", value: "linear-gradient(135deg, #134e5e, #71b280)" },
    { label: "Midnight", value: "linear-gradient(135deg, #000000, #0f2027, #203a43)" },
    { label: "Lavender", value: "linear-gradient(135deg, #e0c3fc, #8ec5fc)" },
    { label: "Fire", value: "linear-gradient(135deg, #f12711, #f5af19)" },
    { label: "Galaxy", value: "linear-gradient(135deg, #09009f, #00ff95 360%)" },
    { label: "Rose Gold", value: "linear-gradient(135deg, #b76e79, #c9b0a0, #e8cfc5)" },
    { label: "Deep Sea", value: "linear-gradient(135deg, #004e92, #000428)" },
    { label: "Neon", value: "linear-gradient(135deg, #12c2e9, #c471ed, #f64f59)" },
];

export function WallpaperPickerModal({ onClose }: WallpaperPickerModalProps) {
    const { wallpaper, setWallpaper } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState<"presets" | "upload">("presets");
    const [preview, setPreview] = useState<WallpaperConfig>(wallpaper);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => setMounted(true), []);

    if (!mounted) return null;

    const applyPreset = (gradient: string) => {
        const wp: WallpaperConfig = { type: "gradient", value: gradient, blur: preview.blur ?? 4, opacity: preview.opacity ?? 0.7 };
        setPreview(wp);
    };

    const handleImageFile = async (file: File) => {
        if (!file) return;
        setUploadError("");
        setUploading(true);
        try {
            const sanitized = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
            const blob = await upload(`wallpaper_${Date.now()}_${sanitized}`, file, {
                access: "public",
                handleUploadUrl: "/api/upload",
            });
            const wp: WallpaperConfig = {
                type: "image",
                value: blob.url,
                blur: preview.blur ?? 4,
                opacity: preview.opacity ?? 0.7,
            };
            setPreview(wp);
        } catch (e: any) {
            // Fallback: use local object URL for preview (won't persist across sessions)
            const localUrl = URL.createObjectURL(file);
            const wp: WallpaperConfig = {
                type: "image",
                value: localUrl,
                blur: preview.blur ?? 4,
                opacity: preview.opacity ?? 0.7,
            };
            setPreview(wp);
            setUploadError("No se pudo subir al servidor. Se usará localmente en este navegador.");
        } finally {
            setUploading(false);
        }
    };

    const handleApply = () => {
        setWallpaper(preview);
        onClose();
    };

    const handleRemove = () => {
        const wp: WallpaperConfig = { type: "none", value: "" };
        setWallpaper(wp);
        setPreview(wp);
        onClose();
    };

    const previewBg = preview.type === "gradient"
        ? preview.value
        : preview.type === "image"
        ? `url(${preview.value})`
        : "var(--bg-elevated)";

    return createPortal(
        <div
            style={{
                position: "fixed", inset: 0,
                background: "rgba(0,0,0,0.75)",
                backdropFilter: "blur(8px)",
                display: "flex", alignItems: "center", justifyContent: "center",
                zIndex: 6000,
            }}
            onClick={onClose}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: "var(--bg-elevated)",
                    borderRadius: "20px",
                    width: "90%",
                    maxWidth: "520px",
                    maxHeight: "90vh",
                    overflowY: "auto",
                    boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
                    border: "1px solid var(--border)",
                }}
            >
                {/* Header */}
                <div style={{
                    padding: "20px 24px 0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800 }}>🎨 Fondo de Pantalla</h2>
                        <p style={{ margin: "2px 0 0", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                            Personaliza el fondo de Pulso
                        </p>
                    </div>
                    <button className="icon-btn" onClick={onClose} style={{ background: "var(--bg-hover)" }}>✕</button>
                </div>

                {/* Live Preview */}
                <div style={{ padding: "16px 24px" }}>
                    <div style={{
                        height: 120,
                        borderRadius: 14,
                        overflow: "hidden",
                        position: "relative",
                        border: "1px solid var(--border)",
                        background: preview.type === "image" ? undefined : previewBg,
                        backgroundImage: preview.type === "image" ? previewBg : undefined,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                    }}>
                        {preview.type === "image" && (
                            <div style={{
                                position: "absolute", inset: 0,
                                background: "var(--bg-main)",
                                opacity: preview.opacity ?? 0.7,
                                backdropFilter: `blur(${preview.blur ?? 4}px)`,
                            }} />
                        )}
                        <div style={{
                            position: "absolute", inset: 0,
                            display: "flex", flexDirection: "column",
                            alignItems: "center", justifyContent: "center",
                            gap: 6,
                        }}>
                            <div style={{
                                background: "rgba(255,255,255,0.12)",
                                backdropFilter: "blur(12px)",
                                padding: "6px 16px",
                                borderRadius: 999,
                                fontSize: "0.8rem",
                                color: "white",
                                border: "1px solid rgba(255,255,255,0.2)",
                                fontWeight: 600,
                            }}>
                                Vista previa
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: 4 }}>
                    {(["presets", "upload"] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                flex: 1,
                                padding: "10px",
                                background: "none",
                                border: "none",
                                borderBottom: activeTab === tab ? "3px solid var(--blue)" : "3px solid transparent",
                                color: activeTab === tab ? "var(--text-primary)" : "var(--text-secondary)",
                                fontWeight: 700,
                                fontSize: "0.9rem",
                                cursor: "pointer",
                                transition: "all 0.2s",
                            }}
                        >
                            {tab === "presets" ? "✨ Gradientes" : "🖼️ Subir imagen"}
                        </button>
                    ))}
                </div>

                <div style={{ padding: "16px 24px" }}>
                    {activeTab === "presets" && (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                            {/* None option */}
                            <button
                                onClick={() => setPreview({ type: "none", value: "" })}
                                style={{
                                    height: 60,
                                    borderRadius: 10,
                                    border: preview.type === "none" ? "3px solid var(--blue)" : "2px solid var(--border)",
                                    cursor: "pointer",
                                    background: "var(--bg-main)",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 4,
                                    transition: "border 0.15s",
                                    fontSize: "1.1rem",
                                }}
                            >
                                <span>🚫</span>
                                <span style={{ fontSize: "0.6rem", color: "var(--text-secondary)", fontWeight: 600 }}>Ninguno</span>
                            </button>

                            {GRADIENT_PRESETS.map(preset => (
                                <button
                                    key={preset.label}
                                    onClick={() => applyPreset(preset.value)}
                                    style={{
                                        height: 60,
                                        borderRadius: 10,
                                        background: preset.value,
                                        border: (preview.type === "gradient" && preview.value === preset.value)
                                            ? "3px solid var(--blue)"
                                            : "2px solid transparent",
                                        cursor: "pointer",
                                        position: "relative",
                                        overflow: "hidden",
                                        transition: "border 0.15s, transform 0.15s",
                                        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.05)")}
                                    onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
                                    title={preset.label}
                                >
                                    <span style={{
                                        position: "absolute", bottom: 4, left: 0, right: 0,
                                        textAlign: "center", fontSize: "0.6rem",
                                        color: "white", fontWeight: 700,
                                        textShadow: "0 1px 4px rgba(0,0,0,0.8)",
                                    }}>
                                        {preset.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}

                    {activeTab === "upload" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    border: "2px dashed var(--border)",
                                    borderRadius: 14,
                                    padding: "32px 16px",
                                    textAlign: "center",
                                    cursor: "pointer",
                                    transition: "border-color 0.2s, background 0.2s",
                                    background: "var(--bg-main)",
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.borderColor = "var(--blue)";
                                    e.currentTarget.style.background = "rgba(29,155,240,0.05)";
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.borderColor = "var(--border)";
                                    e.currentTarget.style.background = "var(--bg-main)";
                                }}
                                onDragOver={e => e.preventDefault()}
                                onDrop={e => {
                                    e.preventDefault();
                                    const file = e.dataTransfer.files?.[0];
                                    if (file && file.type.startsWith("image/")) handleImageFile(file);
                                }}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    style={{ display: "none" }}
                                    onChange={e => {
                                        const file = e.target.files?.[0];
                                        if (file) handleImageFile(file);
                                    }}
                                />
                                {uploading ? (
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                                        <div className="spinner" />
                                        <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.9rem" }}>Subiendo imagen...</p>
                                    </div>
                                ) : (
                                    <>
                                        <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>🖼️</div>
                                        <p style={{ margin: 0, fontWeight: 700, fontSize: "1rem" }}>Arrastra o haz clic</p>
                                        <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                                            PNG, JPG, WEBP — máx. 10MB
                                        </p>
                                    </>
                                )}
                            </div>

                            {uploadError && (
                                <p style={{ margin: 0, color: "var(--yellow, #f9d423)", fontSize: "0.8rem", background: "rgba(249,212,35,0.1)", padding: "8px 12px", borderRadius: 8 }}>
                                    ⚠️ {uploadError}
                                </p>
                            )}

                            {preview.type === "image" && (
                                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                    <div>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                            <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Opacidad del overlay</label>
                                            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                                                {Math.round((preview.opacity ?? 0.7) * 100)}%
                                            </span>
                                        </div>
                                        <input
                                            type="range" min={0} max={100} step={5}
                                            value={Math.round((preview.opacity ?? 0.7) * 100)}
                                            onChange={e => setPreview(p => ({ ...p, opacity: parseInt(e.target.value) / 100 }))}
                                            style={{ width: "100%", accentColor: "var(--blue)" }}
                                        />
                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: 2 }}>
                                            <span>Fondo visible</span><span>Fondo oculto</span>
                                        </div>
                                    </div>

                                    <div>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                            <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Desenfoque</label>
                                            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                                                {preview.blur ?? 4}px
                                            </span>
                                        </div>
                                        <input
                                            type="range" min={0} max={20} step={1}
                                            value={preview.blur ?? 4}
                                            onChange={e => setPreview(p => ({ ...p, blur: parseInt(e.target.value) }))}
                                            style={{ width: "100%", accentColor: "var(--blue)" }}
                                        />
                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: 2 }}>
                                            <span>Nítido</span><span>Muy difuso</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div style={{
                    padding: "16px 24px 24px",
                    display: "flex",
                    gap: 10,
                    borderTop: "1px solid var(--border)",
                }}>
                    {wallpaper.type !== "none" && (
                        <button
                            onClick={handleRemove}
                            style={{
                                padding: "10px 16px",
                                borderRadius: 999,
                                border: "1px solid var(--border)",
                                background: "transparent",
                                color: "var(--red, #f4212e)",
                                cursor: "pointer",
                                fontWeight: 600,
                                fontSize: "0.9rem",
                            }}
                        >
                            Quitar fondo
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        style={{
                            flex: 1,
                            padding: "10px",
                            borderRadius: 999,
                            border: "1px solid var(--border)",
                            background: "transparent",
                            color: "var(--text-primary)",
                            cursor: "pointer",
                            fontWeight: 600,
                            fontSize: "0.9rem",
                        }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleApply}
                        disabled={preview.type === wallpaper.type && preview.value === wallpaper.value}
                        style={{
                            flex: 2,
                            padding: "10px",
                            borderRadius: 999,
                            border: "none",
                            background: "var(--blue)",
                            color: "white",
                            cursor: "pointer",
                            fontWeight: 700,
                            fontSize: "0.9rem",
                            opacity: (preview.type === wallpaper.type && preview.value === wallpaper.value) ? 0.5 : 1,
                            transition: "opacity 0.2s",
                        }}
                    >
                        ✓ Aplicar fondo
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
