"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";

export default function AdminAdsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [ads, setAds] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingAd, setEditingAd] = useState<any>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState("");

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        imageUrl: "",
        videoUrl: "",
        avatarUrl: "",
        link: "",
        cta: "Más información",
        active: true
    });

    const [inputModes, setInputModes] = useState({
        avatar: "url", // "url" | "file"
        image: "url",
        video: "url"
    });

    const avatarInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (status === "unauthenticated" || (status === "authenticated" && session?.user?.role !== "ADMIN")) {
            router.push("/");
        } else if (status === "authenticated") {
            fetchAds();
        }
    }, [status, session]);

    const fetchAds = async () => {
        try {
            const res = await fetch("/api/admin/ads");
            const data = await res.json();
            setAds(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (file: File) => {
        const newBlob = await upload(file.name, file, {
            access: 'public',
            handleUploadUrl: '/api/upload',
        });
        return newBlob.url;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        setIsUploading(true);
        let finalData = { ...formData };

        try {
            // Handle file uploads if any
            if (inputModes.avatar === "file" && avatarInputRef.current?.files?.[0]) {
                setUploadProgress("Subiendo avatar...");
                finalData.avatarUrl = await handleFileUpload(avatarInputRef.current.files[0]);
            }
            if (inputModes.image === "file" && imageInputRef.current?.files?.[0]) {
                setUploadProgress("Subiendo imagen...");
                finalData.imageUrl = await handleFileUpload(imageInputRef.current.files[0]);
            }
            if (inputModes.video === "file" && videoInputRef.current?.files?.[0]) {
                setUploadProgress("Subiendo video...");
                finalData.videoUrl = await handleFileUpload(videoInputRef.current.files[0]);
            }

            setUploadProgress("Guardando anuncio...");

            const method = editingAd ? "PUT" : "POST";
            const body = editingAd ? { ...finalData, id: editingAd.id } : finalData;

            const res = await fetch("/api/admin/ads", {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });
            
            if (res.ok) {
                fetchAds();
                setShowForm(false);
                setEditingAd(null);
                setFormData({ title: "", description: "", imageUrl: "", videoUrl: "", avatarUrl: "", link: "", cta: "Más información", active: true });
                if (avatarInputRef.current) avatarInputRef.current.value = "";
                if (imageInputRef.current) imageInputRef.current.value = "";
                if (videoInputRef.current) videoInputRef.current.value = "";
            }
        } catch (error) {
            console.error(error);
            alert("Error al subir los archivos o guardar el anuncio.");
        } finally {
            setIsUploading(false);
            setUploadProgress("");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Borrar anuncio?")) return;
        try {
            const res = await fetch(`/api/admin/ads?id=${id}`, { method: "DELETE" });
            if (!res.ok) {
                const err = await res.json();
                alert(`Error al borrar: ${err.error || res.status}`);
                return;
            }
            fetchAds();
        } catch (error) {
            console.error(error);
            alert("Error de red al intentar borrar el anuncio.");
        }
    };

    if (loading) return <div style={{ padding: "20px", color: "#1e293b" }}>Cargando anuncios...</div>;

    const renderMediaInput = (label: string, field: "avatar" | "image" | "video", stateField: "avatarUrl" | "imageUrl" | "videoUrl", ref: React.RefObject<HTMLInputElement | null>, accept: string) => (
        <div style={{ display: "grid", gap: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#64748b" }}>{label}</label>
                <div style={{ display: "flex", gap: "4px" }}>
                    <button type="button" onClick={() => setInputModes({ ...inputModes, [field]: "url" })} style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "10px", border: "1px solid #cbd5e1", background: inputModes[field] === "url" ? "#e2e8f0" : "transparent", cursor: "pointer", color: "#475569" }}>URL</button>
                    <button type="button" onClick={() => setInputModes({ ...inputModes, [field]: "file" })} style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "10px", border: "1px solid #cbd5e1", background: inputModes[field] === "file" ? "#e2e8f0" : "transparent", cursor: "pointer", color: "#475569" }}>Archivo</button>
                </div>
            </div>
            {inputModes[field] === "url" ? (
                <input 
                    type="text" placeholder="https://..." value={formData[stateField] || ""} 
                    onChange={e => setFormData({ ...formData, [stateField]: e.target.value })} 
                    style={{ padding: "12px", borderRadius: "10px", border: "1px solid #cbd5e1", background: "#f8fafc", color: "#1e293b" }}
                />
            ) : (
                <input 
                    type="file" ref={ref} accept={accept}
                    style={{ padding: "10px", borderRadius: "10px", border: "1px solid #cbd5e1", background: "#f8fafc", color: "#1e293b", fontSize: "0.9rem" }}
                />
            )}
        </div>
    );

    const getYoutubeVideoId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    return (
        <div style={{ padding: "24px", color: "#1e293b", maxWidth: "1000px", margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "#0f172a" }}>Gestión de Anuncios</h1>
                <button 
                    onClick={() => { setShowForm(!showForm); setEditingAd(null); }}
                    style={{ background: "#3b82f6", color: "white", padding: "10px 24px", borderRadius: "12px", border: "none", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)" }}
                >
                    {showForm ? "Cerrar Formulario" : "Nuevo Anuncio"}
                </button>
            </div>

            {showForm && (
                <div style={{ background: "#ffffff", padding: "32px", borderRadius: "16px", marginBottom: "32px", border: "1px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
                    <h2 style={{ marginBottom: "20px", fontSize: "1.25rem", fontWeight: 700, color: "#1e293b" }}>{editingAd ? "Editar Anuncio" : "Crear Anuncio"}</h2>
                    <form onSubmit={handleSubmit} style={{ display: "grid", gap: "20px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                            <div style={{ display: "grid", gap: "8px" }}>
                                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#64748b" }}>Título del Anuncio (Nombre visible)</label>
                                <input 
                                    type="text" placeholder="Ej: Pulso Premium" value={formData.title} 
                                    onChange={e => setFormData({ ...formData, title: e.target.value })} 
                                    style={{ padding: "12px", borderRadius: "10px", border: "1px solid #cbd5e1", background: "#f8fafc", color: "#1e293b", fontSize: "1rem" }} required
                                />
                            </div>
                            {renderMediaInput("Foto de Perfil (Avatar)", "avatar", "avatarUrl", avatarInputRef, "image/*")}
                        </div>
                        
                        <div style={{ display: "grid", gap: "8px" }}>
                            <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#64748b" }}>Descripción (Texto del post)</label>
                            <textarea 
                                placeholder="Describe brevemente el anuncio..." value={formData.description} 
                                onChange={e => setFormData({ ...formData, description: e.target.value })} 
                                style={{ padding: "12px", borderRadius: "10px", border: "1px solid #cbd5e1", background: "#f8fafc", color: "#1e293b", fontSize: "1rem", minHeight: "100px" }} required
                            />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                            {renderMediaInput("URL/Archivo de Imagen", "image", "imageUrl", imageInputRef, "image/*")}
                            {renderMediaInput("URL/Archivo de Video", "video", "videoUrl", videoInputRef, "video/*")}
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", alignItems: "center" }}>
                            <div style={{ display: "grid", gap: "8px" }}>
                                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#64748b" }}>Enlace de Destino</label>
                                <input 
                                    type="text" placeholder="https://..." value={formData.link} 
                                    onChange={e => setFormData({ ...formData, link: e.target.value })} 
                                    style={{ padding: "12px", borderRadius: "10px", border: "1px solid #cbd5e1", background: "#f8fafc", color: "#1e293b" }} required
                                />
                            </div>
                            <div style={{ display: "grid", gap: "8px" }}>
                                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#64748b" }}>Texto del Botón (CTA)</label>
                                <input 
                                    type="text" placeholder="Más información" value={formData.cta} 
                                    onChange={e => setFormData({ ...formData, cta: e.target.value })} 
                                    style={{ padding: "12px", borderRadius: "10px", border: "1px solid #cbd5e1", background: "#f8fafc", color: "#1e293b" }}
                                />
                            </div>
                        </div>

                        <label style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "0.95rem", fontWeight: 600, cursor: "pointer", marginTop: "12px" }}>
                            <input type="checkbox" checked={formData.active} onChange={e => setFormData({ ...formData, active: e.target.checked })} style={{ width: "20px", height: "20px" }} />
                            Anuncio Activo
                        </label>

                        {isUploading && (
                            <div style={{ padding: "12px", background: "#dbeafe", color: "#1e40af", borderRadius: "8px", fontSize: "0.9rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
                                <div className="spinner" style={{ width: "16px", height: "16px", border: "2px solid #1e40af", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
                                {uploadProgress}
                            </div>
                        )}

                        <div style={{ display: "flex", gap: "16px", marginTop: "12px" }}>
                            <button type="submit" disabled={isUploading} style={{ background: isUploading ? "#94a3b8" : "#3b82f6", color: "white", padding: "12px 32px", borderRadius: "12px", border: "none", fontWeight: 700, cursor: isUploading ? "not-allowed" : "pointer", fontSize: "1rem" }}>
                                {editingAd ? "Guardar Cambios" : "Crear Anuncio"}
                            </button>
                            <button type="button" disabled={isUploading} onClick={() => setShowForm(false)} style={{ background: "transparent", border: "1px solid #e2e8f0", color: "#64748b", padding: "12px 32px", borderRadius: "12px", cursor: isUploading ? "not-allowed" : "pointer", fontSize: "1rem" }}>
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div style={{ display: "grid", gap: "20px" }}>
                {ads.length === 0 && !loading && (
                    <div style={{ textAlign: "center", padding: "60px", background: "#ffffff", borderRadius: "16px", border: "1px dashed #cbd5e1", color: "#64748b" }}>
                        No hay anuncios creados todavía. ¡Crea el primero!
                    </div>
                )}
                {ads.map(ad => {
                    const ytId = ad.videoUrl ? getYoutubeVideoId(ad.videoUrl) : null;
                    return (
                    <div key={ad.id} style={{ background: "#ffffff", padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0", display: "flex", gap: "20px", alignItems: "flex-start", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            <img src={ad.avatarUrl || "/favicon.ico"} style={{ width: "48px", height: "48px", objectFit: "cover", borderRadius: "50%", background: "#f1f5f9" }} alt="Avatar" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                                <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#1e293b" }}>{ad.title}</h3>
                                <span style={{ background: "#f1f5f9", color: "#64748b", fontSize: "0.65rem", padding: "2px 6px", borderRadius: "4px", fontWeight: 700, textTransform: "uppercase" }}>Promocionado</span>
                                {ad.active ? (
                                    <span style={{ background: "#dcfce7", color: "#15803d", fontSize: "0.65rem", padding: "2px 6px", borderRadius: "4px", fontWeight: 700 }}>Activo</span>
                                ) : (
                                    <span style={{ background: "#fee2e2", color: "#b91c1c", fontSize: "0.65rem", padding: "2px 6px", borderRadius: "4px", fontWeight: 700 }}>Inactivo</span>
                                )}
                            </div>
                            <p style={{ fontSize: "0.95rem", color: "#475569", marginBottom: "12px" }}>{ad.description}</p>
                            
                            {(ad.imageUrl || ad.videoUrl) && (
                                <div style={{ marginBottom: "12px", borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0", background: "#0f172a", width: "fit-content", maxWidth: "100%" }}>
                                    {ytId ? (
                                        <iframe 
                                            width="400" 
                                            height="225" 
                                            src={`https://www.youtube-nocookie.com/embed/${ytId}?rel=0&modestbranding=1`} 
                                            title="YouTube video player" 
                                            frameBorder="0" 
                                            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                            referrerPolicy="no-referrer-when-downgrade"
                                            style={{ display: "block", border: "none" }}
                                        />
                                    ) : ad.videoUrl ? (
                                        <video src={ad.videoUrl} style={{ maxHeight: "200px", maxWidth: "100%", display: "block" }} controls muted />
                                    ) : (
                                        <img src={ad.imageUrl} style={{ maxHeight: "200px", maxWidth: "100%", display: "block", objectFit: "cover" }} alt="" />
                                    )}
                                </div>
                            )}
                            
                            <div style={{ fontSize: "0.85rem", color: "#64748b", background: "#f8fafc", padding: "8px 12px", borderRadius: "8px", display: "inline-block", border: "1px solid #e2e8f0" }}>
                                CTA: <strong>{ad.cta}</strong> → <a href={ad.link} target="_blank" rel="noreferrer" style={{ color: "#3b82f6", textDecoration: "none" }}>{ad.link}</a>
                            </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            <button 
                                onClick={() => { setEditingAd(ad); setFormData({ ...ad }); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                style={{ background: "#f1f5f9", border: "none", color: "#1e293b", padding: "8px 16px", borderRadius: "8px", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem" }}
                            >
                                Editar
                            </button>
                            <button 
                                onClick={() => handleDelete(ad.id)}
                                style={{ background: "transparent", border: "1px solid #fee2e2", color: "#ef4444", padding: "8px 16px", borderRadius: "8px", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem" }}
                            >
                                Borrar
                            </button>
                        </div>
                    </div>
                    );
                })}
            </div>
        </div>
    );
}
