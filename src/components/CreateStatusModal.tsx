"use client";

import { useState, useEffect, useRef } from "react";
import { createStatus, searchYouTube } from "@/app/actions/status";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import { upload } from "@vercel/blob/client";

const PRESET_SONGS = [
    { name: "Lo-Fi Chill 🎧", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
    { name: "Electro Beat ⚡", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
    { name: "Smooth Jazz 🎷", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
    { name: "Acoustic 🎸", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3" }
];

const PRESET_BACKS = [
    { id: "clouds", label: "Azul ☁️", bg: "linear-gradient(180deg, #4facfe 0%, #00f2fe 100%)" },
    { id: "sunset", label: "Ocaso 🌅", bg: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" },
    { id: "night", label: "Noche 🌌", bg: "linear-gradient(135deg, #30cfd0 0%, #330867 100%)" },
    { id: "neon", label: "Neón 🎆", bg: "linear-gradient(135deg, #f857a6 0%, #ff5858 100%)" }
];

export function CreateStatusModal({ onClose }: { onClose: () => void }) {
    const [type, setType] = useState<"TEXT" | "IMAGE">("TEXT");
    const [content, setContent] = useState("");
    const [audioUrl, setAudioUrl] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [backgroundStyle, setBackgroundStyle] = useState("clouds");

    // Music Search states
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Audio segment states
    const [audioTitle, setAudioTitle] = useState("");
    const [audioStart, setAudioStart] = useState(0);
    const [audioDuration, setAudioDuration] = useState(15);

    // Image upload states
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);

    // Audio Preview refs
    const audioPreviewRef = useRef<HTMLAudioElement>(null);

    // Text Styling & Position States
    const [textPos, setTextPos] = useState({ x: 50, y: 50 }); // percentages (0-100)
    const [fontSize, setFontSize] = useState(1.8); // in rem
    const [useTextBg, setUseTextBg] = useState(true); // default true for better contrast
    const [textColor, setTextColor] = useState("#ffffff");

    const previewAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        const delayDebounce = setTimeout(async () => {
            const res = await searchYouTube(searchQuery);
            setSearchResults(res);
            setIsSearching(false);
        }, 500);

        return () => clearTimeout(delayDebounce);
    }, [searchQuery]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreview(URL.createObjectURL(selectedFile));
            setType("IMAGE");
        }
    };

    // Auto-update audio preview start time
    useEffect(() => {
        if (audioPreviewRef.current) {
            audioPreviewRef.current.currentTime = audioStart;
        }
    }, [audioStart]);

    const handleSubmit = async () => {
        if (type === "TEXT" && !content.trim()) {
            return toast.error("El estado no puede estar vacío");
        }
        if (type === "IMAGE" && !file) {
            return toast.error("Por favor selecciona una imagen");
        }

        setIsSubmitting(true);
        try {
            let uploadedUrl = null;
            if (type === "IMAGE" && file) {
                const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                const newBlob = await upload(sanitizedName, file, {
                    access: 'public',
                    handleUploadUrl: '/api/upload',
                });
                uploadedUrl = newBlob.url;
            }

            const baseStyleOptions = { textPos, fontSize, useTextBg, textColor, audioTitle: audioTitle || null };
            const styleOptions = (type === "TEXT" || content) ? JSON.stringify(baseStyleOptions) : JSON.stringify({ audioTitle: audioTitle || null });

            await createStatus(
                type, 
                type === "TEXT" ? content : content || null, 
                uploadedUrl, 
                audioUrl || null, 
                type === "TEXT" ? backgroundStyle : null,
                audioStart || 0,
                audioDuration || 15,
                styleOptions
            );
            toast.success("¡Historia creada!");
            onClose();
        } catch (error) {
            console.error("CreateStatus error:", error);
            toast.error("Error al crear la historia");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
            <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                style={{ position: "relative", width: "100%", maxWidth: "400px", height: "600px", borderRadius: "24px", overflow: "hidden", boxShadow: "0 12px 48px rgba(0,0,0,0.3)", display: "flex", flexDirection: "column" }}
            >
                {/* ☁️ Background layer ☁️ */}
                {type === "TEXT" ? (
                    <div style={{ position: "absolute", inset: 0, background: PRESET_BACKS.find(b => b.id === backgroundStyle)?.bg || "linear-gradient(180deg, #4facfe 0%, #00f2fe 100%)", overflow: "hidden", zIndex: 0 }}>
                        {backgroundStyle === "clouds" && (
                            <motion.div animate={{ x: ["0%", "-50%", "0%"] }} transition={{ repeat: Infinity, duration: 40, ease: "linear" }} style={{ position: "absolute", bottom: "-50px", left: 0, width: "200%", height: "200px", background: "rgba(255,255,255,0.4)", borderRadius: "50%", filter: "blur(20px)" }} />
                        )}
                    </div>
                ) : (
                    <div style={{ position: "absolute", inset: 0, background: preview ? `url(${preview}) center/cover no-repeat` : "#1a1a1a", zIndex: 0 }}>
                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.7))" }} />
                    </div>
                )}

                {/* Navbar de edición */}
                <div style={{ position: "relative", zIndex: 2, padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <button onClick={onClose} style={{ background: "rgba(0,0,0,0.4)", border: "none", color: "white", width: "32px", height: "32px", borderRadius: "50%", cursor: "pointer" }}>✕</button>
                    <div style={{ display: "flex", gap: "8px", background: "rgba(0,0,0,0.4)", padding: "4px", borderRadius: "20px" }}>
                        <button onClick={() => setType("TEXT")} style={{ background: type === "TEXT" ? "white" : "transparent", color: type === "TEXT" ? "black" : "white", border: "none", padding: "6px 12px", borderRadius: "16px", fontSize: "0.8rem", cursor: "pointer", fontWeight: "bold" }}>Texto</button>
                        <button onClick={() => setType("IMAGE")} style={{ background: type === "IMAGE" ? "white" : "transparent", color: type === "IMAGE" ? "black" : "white", border: "none", padding: "6px 12px", borderRadius: "16px", fontSize: "0.8rem", cursor: "pointer", fontWeight: "bold" }}>Foto</button>
                    </div>
                </div>

                {type === "TEXT" && (
                    <div style={{ position: "relative", zIndex: 2, display: "flex", justifyContent: "center", gap: "12px", marginTop: "2px", marginBottom: "-10px" }}>
                        {PRESET_BACKS.map((b) => (
                            <button 
                                key={b.id} 
                                onClick={() => setBackgroundStyle(b.id)} 
                                style={{ 
                                    width: "22px", 
                                    height: "22px", 
                                    borderRadius: "50%", 
                                    background: b.bg, 
                                    border: backgroundStyle === b.id ? "2px solid white" : "2px solid rgba(255,255,255,0.3)", 
                                    cursor: "pointer", 
                                    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                                    transform: backgroundStyle === b.id ? "scale(1.18)" : "scale(1)",
                                    transition: "all 0.2s"
                                }} 
                            />
                        ))}
                    </div>
                )}

                {/* Form Content */}
                <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column", padding: "20px", marginTop: "20px" }}>
                    <div ref={previewAreaRef} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", position: "relative", width: "100%" }}>
                        {type === "TEXT" ? (
                            <motion.div 
                                drag 
                                dragConstraints={previewAreaRef}
                                dragElastic={0.1}
                                onDragEnd={(event, info) => {
                                    if (previewAreaRef.current) {
                                        const rect = previewAreaRef.current.getBoundingClientRect();
                                        const x = ((info.point.x - rect.left) / rect.width) * 100;
                                        const y = ((info.point.y - rect.top) / rect.height) * 100;
                                        setTextPos({ 
                                            x: Math.min(Math.max(x, 5), 95), 
                                            y: Math.min(Math.max(y, 5), 95) 
                                        });
                                    }
                                }}
                                style={{ 
                                    position: "absolute", 
                                    left: `${textPos.x}%`, 
                                    top: `${textPos.y}%`, 
                                    transform: "translate(-50%, -50%)", 
                                    background: useTextBg ? "rgba(0,0,0,0.45)" : "transparent", 
                                    backdropFilter: useTextBg ? "blur(12px)" : "none",
                                    padding: "12px 20px", 
                                    borderRadius: "20px",
                                    border: useTextBg ? "1px solid rgba(255,255,255,0.15)" : "none",
                                    boxShadow: useTextBg ? "0 8px 32px rgba(0,0,0,0.2)" : "none",
                                    cursor: "move",
                                    width: "auto",
                                    maxWidth: "90%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                }}
                            >
                                <textarea 
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="¿Qué estás pensando?"
                                    maxLength={150}
                                    style={{ 
                                        background: "transparent", 
                                        border: "none", 
                                        color: textColor, 
                                        fontSize: `${fontSize}rem`, 
                                        fontWeight: "800", 
                                        textAlign: "center", 
                                        width: "100%", 
                                        resize: "none", 
                                        outline: "none", 
                                        textShadow: "0 2px 4px rgba(0,0,0,0.15)",
                                        wordBreak: "break-word"
                                    }}
                                />
                            </motion.div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", width: "100%" }}>
                                {!preview ? (
                                    <label style={{ background: "rgba(255,255,255,0.2)", color: "white", padding: "12px 24px", borderRadius: "24px", cursor: "pointer", fontWeight: "bold", border: "1px dashed rgba(255,255,255,0.4)" }}>
                                        📷 Subir Foto
                                        <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
                                    </label>
                                ) : (
                                    <label style={{ background: "rgba(0,0,0,0.5)", color: "white", padding: "6px 12px", borderRadius: "16px", fontSize: "0.75rem", cursor: "pointer" }}>
                                        Cambiar foto
                                        <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
                                    </label>
                                )}
                                <input 
                                    type="text" 
                                    value={content} 
                                    onChange={(e) => setContent(e.target.value)} 
                                    placeholder="Añade un subtítulo (opcional)..." 
                                    style={{ background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.4)", color: "white", textAlign: "center", outline: "none", width: "80%", fontSize: "1rem" }}
                                />
                                {content && (
                                    <motion.div 
                                        drag 
                                        dragConstraints={previewAreaRef}
                                        dragElastic={0.1}
                                        onDragEnd={(event, info) => {
                                            if (previewAreaRef.current) {
                                                const rect = previewAreaRef.current.getBoundingClientRect();
                                                const x = ((info.point.x - rect.left) / rect.width) * 100;
                                                const y = ((info.point.y - rect.top) / rect.height) * 100;
                                                setTextPos({ 
                                                    x: Math.min(Math.max(x, 5), 95), 
                                                    y: Math.min(Math.max(y, 5), 95) 
                                                });
                                            }
                                        }}
                                        style={{ 
                                            position: "absolute", 
                                            left: `${textPos.x}%`, 
                                            top: `${textPos.y}%`, 
                                            transform: "translate(-50%, -50%)", 
                                            background: useTextBg ? "rgba(0,0,0,0.45)" : "transparent", 
                                            backdropFilter: useTextBg ? "blur(12px)" : "none",
                                            padding: "12px 20px", 
                                            borderRadius: "20px",
                                            border: useTextBg ? "1px solid rgba(255,255,255,0.15)" : "none",
                                            boxShadow: useTextBg ? "0 8px 32px rgba(0,0,0,0.2)" : "none",
                                            cursor: "move",
                                            width: "auto",
                                            maxWidth: "90%",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center"
                                        }}
                                    >
                                        <div style={{ color: textColor, fontSize: `${fontSize}rem`, fontWeight: "800", textAlign: "center", wordBreak: "break-word", textShadow: "0 2px 4px rgba(0,0,0,0.15)" }}>
                                            {content}
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Text Style Controls */}
                    {type === "TEXT" && (
                        <div style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(16px)", padding: "12px", borderRadius: "18px", marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", border: "1px solid rgba(255,255,255,0.2)", position: "relative", zIndex: 2 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
                                <span style={{ fontSize: "0.75rem", color: "white", fontWeight: "600" }}>Tamaño:</span>
                                <input type="range" min="1" max="3" step="0.1" value={fontSize} onChange={(e) => setFontSize(parseFloat(e.target.value))} style={{ flex: 1, accentColor: "white", height: "4px", borderRadius: "2px", cursor: "pointer" }} />
                            </div>
                            <button onClick={() => setUseTextBg(!useTextBg)} style={{ background: useTextBg ? "white" : "rgba(255,255,255,0.2)", color: useTextBg ? "black" : "white", border: "none", padding: "6px 12px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "bold", cursor: "pointer", transition: "all 0.2s" }}>
                                Fondo
                            </button>
                        </div>
                    )}

                    {/* Sleek Music Box */}
                    <div style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(16px)", padding: "16px", borderRadius: "20px", marginBottom: "16px", display: "flex", flexDirection: "column", gap: "12px", border: "1px solid rgba(255,255,255,0.2)" }}>
                        <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.8)", fontWeight: 700, letterSpacing: "0.5px" }}>SELECCIONA MÚSICA</div>
                        
                        {!audioUrl && (
                            <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }} className="no-scrollbar">
                                {PRESET_SONGS.map((song, i) => (
                                    <button 
                                        key={i} 
                                        type="button"
                                        onClick={() => { setAudioUrl(song.url); setAudioTitle(song.name); }} 
                                        style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "none", padding: "8px 14px", borderRadius: "16px", fontSize: "0.8rem", cursor: "pointer", whiteSpace: "nowrap", fontWeight: 600 }}
                                    >
                                        {song.name}
                                    </button>
                                ))}
                            </div>
                        )}

                        {!audioUrl && (
                            <input 
                                type="text" 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="🔍 Buscar canción (YouTube Music)..."
                                style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", outline: "none", fontSize: "0.80rem", width: "100%", padding: "10px 12px", borderRadius: "12px" }}
                            />
                        )}

                        {isSearching && <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.7rem", textAlign: "center" }}>Buscando...</div>}

                        {searchResults.length > 0 && !audioUrl && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "150px", overflowY: "auto", paddingRight: "4px" }} className="no-scrollbar">
                                {searchResults.map((item) => (
                                    <div 
                                        key={item.id} 
                                        onClick={() => { setAudioUrl(item.url); setAudioTitle(item.title); setSearchResults([]); setSearchQuery(""); }} 
                                        style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px", background: "rgba(255,255,255,0.08)", borderRadius: "10px", cursor: "pointer" }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
                                        onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                                    >
                                        {item.thumbnail && <img src={item.thumbnail} style={{ width: "40px", height: "30px", borderRadius: "4px", objectFit: "cover" }} alt="tb" />}
                                        <div style={{ flex: 1, overflow: "hidden" }}>
                                            <div style={{ color: "white", fontSize: "0.8rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
                                            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.65rem" }}>{item.duration}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {audioUrl && (
                            <div style={{ marginTop: "4px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                        <span style={{ fontSize: "1rem" }}>🎵</span>
                                        <span style={{ fontSize: "0.85rem", color: "white", fontWeight: 600, maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{audioTitle || "Sonido seleccionado"}</span>
                                    </div>
                                    <button onClick={() => { setAudioUrl(""); setAudioTitle(""); setSearchQuery(""); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: "0.75rem" }}>Quitar</button>
                                </div>

                                {/* Audio Preview Player */}
                                {(() => {
                                    const match = audioUrl.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
                                    const ytId = (match && match[2].length === 11) ? match[2] : null;
                                    if (ytId) {
                                        const end = audioStart + audioDuration;
                                        return (
                                            <iframe 
                                                src={`https://www.youtube.com/embed/${ytId}?autoplay=1&controls=0&mute=0&start=${audioStart}&end=${end}`} 
                                                style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }} 
                                                allow="autoplay; encrypted-media; clipboard-write; accelerometer; gyroscope; picture-in-picture"
                                            />
                                        );
                                    }
                                    return <audio ref={audioPreviewRef} src={audioUrl} autoPlay loop style={{ display: "none" }} />;
                                })()}

                                <div style={{ display: "flex", gap: "16px" }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(255,255,255,0.7)", fontSize: "0.65rem", marginBottom: "4px" }}>
                                            <span>Inicio</span>
                                            <span>{audioStart}s</span>
                                        </div>
                                        <input type="range" min="0" max="180" value={audioStart} onChange={(e) => setAudioStart(parseInt(e.target.value))} style={{ width: "100%", accentColor: "white", height: "4px", borderRadius: "2px", cursor: "pointer" }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(255,255,255,0.7)", fontSize: "0.65rem", marginBottom: "4px" }}>
                                            <span>Duración</span>
                                            <span>{audioDuration}s</span>
                                        </div>
                                        <input type="range" min="15" max="30" value={audioDuration} onChange={(e) => setAudioDuration(parseInt(e.target.value))} style={{ width: "100%", accentColor: "white", height: "4px", borderRadius: "2px", cursor: "pointer" }} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={handleSubmit} 
                        disabled={isSubmitting}
                        style={{ background: "white", color: type === "TEXT" ? "#00b2fe" : "black", border: "none", padding: "14px", borderRadius: "24px", fontWeight: "bold", cursor: "pointer", opacity: isSubmitting ? 0.7 : 1, filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.1))" }}
                    >
                        {isSubmitting ? "Creando..." : "Compartir historia"}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
