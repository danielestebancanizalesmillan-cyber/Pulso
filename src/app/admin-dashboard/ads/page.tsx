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

    if (loading) return <div style={{ padding: "20px", color: "var(--text-primary)" }}>Cargando anuncios...</div>;

    return (
        <div style={{ padding: "24px", color: "var(--text-primary)", maxWidth: "1000px", margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <h1 style={{ fontSize: "1.8rem", fontWeight: 800 }}>Gestión de Anuncios</h1>
                <button 
                    onClick={() => { setShowForm(true); setEditingAd(null); }}
                    style={{ background: "var(--blue)", color: "white", padding: "8px 20px", borderRadius: "20px", border: "none", fontWeight: 700, cursor: "pointer" }}
                >
                    Nuevo Anuncio
                </button>
            </div>

            {showForm && (
                <div style={{ background: "var(--bg-card)", padding: "24px", borderRadius: "16px", marginBottom: "24px", border: "1px solid var(--border)" }}>
                    <h2 style={{ marginBottom: "16px" }}>{editingAd ? "Editar Anuncio" : "Crear Anuncio"}</h2>
                    <form onSubmit={handleSubmit} style={{ display: "grid", gap: "16px" }}>
                        <input 
                            type="text" placeholder="Título" value={formData.title} 
                            onChange={e => setFormData({ ...formData, title: e.target.value })} 
                            style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", background: "transparent", color: "inherit" }} required
                        />
                        <textarea 
                            placeholder="Descripción" value={formData.description} 
                            onChange={e => setFormData({ ...formData, description: e.target.value })} 
                            style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", background: "transparent", color: "inherit", minHeight: "80px" }} required
                        />
                        <input 
                            type="text" placeholder="URL de Imagen (opcional)" value={formData.imageUrl} 
                            onChange={e => setFormData({ ...formData, imageUrl: e.target.value })} 
                            style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", background: "transparent", color: "inherit" }}
                        />
                        <input 
                            type="text" placeholder="Link de destino" value={formData.link} 
                            onChange={e => setFormData({ ...formData, link: e.target.value })} 
                            style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", background: "transparent", color: "inherit" }} required
                        />
                        <input 
                            type="text" placeholder="Texto del botón (CTA)" value={formData.cta} 
                            onChange={e => setFormData({ ...formData, cta: e.target.value })} 
                            style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", background: "transparent", color: "inherit" }}
                        />
                        <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <input type="checkbox" checked={formData.active} onChange={e => setFormData({ ...formData, active: e.target.checked })} />
                            Activo
                        </label>
                        <div style={{ display: "flex", gap: "12px" }}>
                            <button type="submit" style={{ background: "var(--blue)", color: "white", padding: "10px 20px", borderRadius: "20px", border: "none", fontWeight: 700, cursor: "pointer" }}>
                                {editingAd ? "Actualizar" : "Crear"}
                            </button>
                            <button type="button" onClick={() => setShowForm(false)} style={{ background: "transparent", border: "1px solid var(--border)", color: "inherit", padding: "10px 20px", borderRadius: "20px", cursor: "pointer" }}>
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div style={{ display: "grid", gap: "16px" }}>
                {ads.map(ad => (
                    <div key={ad.id} style={{ background: "var(--bg-card)", padding: "16px", borderRadius: "12px", border: "1px solid var(--border)", display: "flex", gap: "16px", alignItems: "center" }}>
                        {ad.imageUrl && (
                            <img src={ad.imageUrl} style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "8px" }} alt="" />
                        )}
                        <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <h3 style={{ fontSize: "1.1rem" }}>{ad.title}</h3>
                                {!ad.active && <span style={{ background: "var(--red)", color: "white", fontSize: "0.6rem", padding: "2px 6px", borderRadius: "4px" }}>Inactivo</span>}
                            </div>
                            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>{ad.description}</p>
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                            <button 
                                onClick={() => { setEditingAd(ad); setFormData({ ...ad }); setShowForm(true); }}
                                style={{ background: "transparent", border: "1px solid var(--border)", color: "inherit", padding: "6px 12px", borderRadius: "16px", cursor: "pointer" }}
                            >
                                Editar
                            </button>
                            <button 
                                onClick={() => handleDelete(ad.id)}
                                style={{ background: "transparent", border: "1px solid var(--red)", color: "var(--red)", padding: "6px 12px", borderRadius: "16px", cursor: "pointer" }}
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
