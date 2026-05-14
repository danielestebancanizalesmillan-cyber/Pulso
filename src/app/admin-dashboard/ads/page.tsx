"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AdminAdsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [ads, setAds] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingAd, setEditingAd] = useState<any>(null);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        imageUrl: "",
        link: "",
        cta: "Más información",
        active: true
    });

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const method = editingAd ? "PUT" : "POST";
        const body = editingAd ? { ...formData, id: editingAd.id } : formData;

        try {
            const res = await fetch("/api/admin/ads", {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });
            if (res.ok) {
                fetchAds();
                setShowForm(false);
                setEditingAd(null);
                setFormData({ title: "", description: "", imageUrl: "", link: "", cta: "Más información", active: true });
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Borrar anuncio?")) return;
        try {
            await fetch(`/api/admin/ads?id=${id}`, { method: "DELETE" });
            fetchAds();
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) return <div style={{ padding: "20px", color: "#1e293b" }}>Cargando anuncios...</div>;

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
                        <div style={{ display: "grid", gap: "8px" }}>
                            <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#64748b" }}>Título del Anuncio</label>
                            <input 
                                type="text" placeholder="Ej: ¡Oferta Especial!" value={formData.title} 
                                onChange={e => setFormData({ ...formData, title: e.target.value })} 
                                style={{ padding: "12px", borderRadius: "10px", border: "1px solid #cbd5e1", background: "#f8fafc", color: "#1e293b", fontSize: "1rem" }} required
                            />
                        </div>
                        <div style={{ display: "grid", gap: "8px" }}>
                            <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#64748b" }}>Descripción</label>
                            <textarea 
                                placeholder="Describe brevemente el anuncio..." value={formData.description} 
                                onChange={e => setFormData({ ...formData, description: e.target.value })} 
                                style={{ padding: "12px", borderRadius: "10px", border: "1px solid #cbd5e1", background: "#f8fafc", color: "#1e293b", fontSize: "1rem", minHeight: "100px" }} required
                            />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                            <div style={{ display: "grid", gap: "8px" }}>
                                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#64748b" }}>URL de Imagen</label>
                                <input 
                                    type="text" placeholder="https://..." value={formData.imageUrl} 
                                    onChange={e => setFormData({ ...formData, imageUrl: e.target.value })} 
                                    style={{ padding: "12px", borderRadius: "10px", border: "1px solid #cbd5e1", background: "#f8fafc", color: "#1e293b" }}
                                />
                            </div>
                            <div style={{ display: "grid", gap: "8px" }}>
                                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#64748b" }}>Enlace de Destino</label>
                                <input 
                                    type="text" placeholder="https://..." value={formData.link} 
                                    onChange={e => setFormData({ ...formData, link: e.target.value })} 
                                    style={{ padding: "12px", borderRadius: "10px", border: "1px solid #cbd5e1", background: "#f8fafc", color: "#1e293b" }} required
                                />
                            </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", alignItems: "center" }}>
                            <div style={{ display: "grid", gap: "8px" }}>
                                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#64748b" }}>Texto del Botón (CTA)</label>
                                <input 
                                    type="text" placeholder="Más información" value={formData.cta} 
                                    onChange={e => setFormData({ ...formData, cta: e.target.value })} 
                                    style={{ padding: "12px", borderRadius: "10px", border: "1px solid #cbd5e1", background: "#f8fafc", color: "#1e293b" }}
                                />
                            </div>
                            <label style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "0.95rem", fontWeight: 600, cursor: "pointer", marginTop: "24px" }}>
                                <input type="checkbox" checked={formData.active} onChange={e => setFormData({ ...formData, active: e.target.checked })} style={{ width: "20px", height: "20px" }} />
                                Anuncio Activo
                            </label>
                        </div>
                        <div style={{ display: "flex", gap: "16px", marginTop: "12px" }}>
                            <button type="submit" style={{ background: "#3b82f6", color: "white", padding: "12px 32px", borderRadius: "12px", border: "none", fontWeight: 700, cursor: "pointer", fontSize: "1rem" }}>
                                {editingAd ? "Guardar Cambios" : "Crear Anuncio"}
                            </button>
                            <button type="button" onClick={() => setShowForm(false)} style={{ background: "transparent", border: "1px solid #e2e8f0", color: "#64748b", padding: "12px 32px", borderRadius: "12px", cursor: "pointer", fontSize: "1rem" }}>
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
                {ads.map(ad => (
                    <div key={ad.id} style={{ background: "#ffffff", padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0", display: "flex", gap: "20px", alignItems: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                        {ad.imageUrl ? (
                            <img src={ad.imageUrl} style={{ width: "100px", height: "100px", objectFit: "cover", borderRadius: "12px", background: "#f1f5f9" }} alt="" />
                        ) : (
                            <div style={{ width: "100px", height: "100px", background: "#f1f5f9", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
                                Sin Imagen
                            </div>
                        )}
                        <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
                                <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#1e293b" }}>{ad.title}</h3>
                                {ad.active ? (
                                    <span style={{ background: "#dcfce7", color: "#15803d", fontSize: "0.7rem", padding: "3px 10px", borderRadius: "20px", fontWeight: 700 }}>Activo</span>
                                ) : (
                                    <span style={{ background: "#fee2e2", color: "#b91c1c", fontSize: "0.7rem", padding: "3px 10px", borderRadius: "20px", fontWeight: 700 }}>Inactivo</span>
                                )}
                            </div>
                            <p style={{ fontSize: "0.95rem", color: "#475569", marginBottom: "8px" }}>{ad.description}</p>
                            <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Link: <span style={{ color: "#3b82f6" }}>{ad.link}</span></div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            <button 
                                onClick={() => { setEditingAd(ad); setFormData({ ...ad }); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                style={{ background: "#f1f5f9", border: "none", color: "#1e293b", padding: "10px 20px", borderRadius: "10px", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem" }}
                            >
                                Editar
                            </button>
                            <button 
                                onClick={() => handleDelete(ad.id)}
                                style={{ background: "transparent", border: "1px solid #fee2e2", color: "#ef4444", padding: "10px 20px", borderRadius: "10px", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem" }}
                            >
                                Borrar
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
