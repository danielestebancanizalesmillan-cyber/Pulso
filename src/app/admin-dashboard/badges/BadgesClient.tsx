"use client";

import { useState } from "react";
import { Plus, Trash2, Image as ImageIcon } from "lucide-react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function BadgesClient({ initialBadges }: { initialBadges: any[] }) {
    const [badges, setBadges] = useState(initialBadges);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleCreate = async () => {
        if (!name || !imageFile) {
            toast.error("El nombre y la imagen son obligatorios");
            return;
        }

        setLoading(true);
        try {
            // 1. Upload image to Cloudinary via existing route
            const formData = new FormData();
            formData.append("file", imageFile);
            
            const uploadRes = await fetch("/api/upload", {
                method: "POST",
                body: formData
            });

            if (!uploadRes.ok) throw new Error("Fallo al subir la imagen");
            const uploadData = await uploadRes.json();
            const imageUrl = uploadData.url;

            // 2. Create Badge
            const badgeRes = await fetch("/api/admin/badges", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, description, imageUrl })
            });

            if (!badgeRes.ok) throw new Error("Fallo al crear la insignia");
            const newBadge = await badgeRes.json();
            
            setBadges([newBadge, ...badges]);
            setName("");
            setDescription("");
            setImageFile(null);
            setImagePreview(null);
            toast.success("Insignia creada exitosamente");
            router.refresh();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Seguro que deseas eliminar esta insignia? Se removerá de todos los usuarios.")) return;
        try {
            const res = await fetch(`/api/admin/badges/${id}`, {
                method: "DELETE"
            });
            if (!res.ok) throw new Error("Fallo al eliminar");
            setBadges(badges.filter(b => b.id !== id));
            toast.success("Insignia eliminada");
            router.refresh();
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <div>
                    <h1 style={{ fontSize: "1.8rem", fontWeight: 800, margin: 0 }}>Gestión de Insignias</h1>
                    <p style={{ color: "#64748b", margin: "4px 0 0 0" }}>Crea insignias personalizadas para asignar a los usuarios</p>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }}>
                {/* Creador Form */}
                <div style={{ background: "white", padding: "24px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                    <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "16px" }}>Nueva Insignia</h2>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <div>
                            <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 600, marginBottom: "8px" }}>Nombre de la Insignia</label>
                            <input 
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ej: Fundador, Creador VIP..."
                                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none" }}
                            />
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 600, marginBottom: "8px" }}>Descripción (opcional)</label>
                            <input 
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Breve detalle..."
                                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none" }}
                            />
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 600, marginBottom: "8px" }}>Imagen de la Insignia</label>
                            <div style={{ border: "2px dashed #cbd5e1", borderRadius: "8px", padding: "20px", textAlign: "center", cursor: "pointer", position: "relative" }}>
                                <input 
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
                                />
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Preview" style={{ width: "48px", height: "48px", objectFit: "contain", margin: "0 auto" }} />
                                ) : (
                                    <div style={{ color: "#64748b", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                                        <ImageIcon size={24} />
                                        <span style={{ fontSize: "0.85rem" }}>Clic para subir</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button 
                            onClick={handleCreate}
                            disabled={loading || !name || !imageFile}
                            style={{ 
                                background: "var(--blue)", color: "white", padding: "12px", borderRadius: "8px", border: "none", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: (!name || !imageFile || loading) ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "8px" 
                            }}
                        >
                            <Plus size={18} />
                            {loading ? "Creando..." : "Crear Insignia"}
                        </button>
                    </div>
                </div>

                {/* Lista de Insignias */}
                <div style={{ background: "white", borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                                <th style={{ padding: "16px", textAlign: "left", fontSize: "0.85rem", color: "#64748b", fontWeight: 600 }}>Insignia</th>
                                <th style={{ padding: "16px", textAlign: "left", fontSize: "0.85rem", color: "#64748b", fontWeight: 600 }}>Nombre</th>
                                <th style={{ padding: "16px", textAlign: "left", fontSize: "0.85rem", color: "#64748b", fontWeight: 600 }}>Descripción</th>
                                <th style={{ padding: "16px", textAlign: "right", fontSize: "0.85rem", color: "#64748b", fontWeight: 600 }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {badges.map((badge) => (
                                <tr key={badge.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                    <td style={{ padding: "16px" }}>
                                        <img src={badge.imageUrl} alt={badge.name} style={{ width: "32px", height: "32px", objectFit: "contain" }} />
                                    </td>
                                    <td style={{ padding: "16px", fontWeight: 600 }}>{badge.name}</td>
                                    <td style={{ padding: "16px", color: "#64748b", fontSize: "0.9rem" }}>{badge.description || "-"}</td>
                                    <td style={{ padding: "16px", textAlign: "right" }}>
                                        <button 
                                            onClick={() => handleDelete(badge.id)}
                                            style={{ background: "#fee2e2", color: "#ef4444", border: "none", padding: "8px", borderRadius: "6px", cursor: "pointer" }}
                                            title="Eliminar insignia"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {badges.length === 0 && (
                                <tr>
                                    <td colSpan={4} style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>
                                        No hay insignias creadas.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
