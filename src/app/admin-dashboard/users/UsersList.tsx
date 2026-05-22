"use client";

import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { updateUserRole, updateUserVerification } from "@/app/actions/admin";
import { Search, MoreVertical, Plus, X, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";

export function UsersList({ initialUsers, availableBadges }: { initialUsers: any[], availableBadges: any[] }) {
    const [users, setUsers] = useState(initialUsers);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState<string | null>(null);
    const [managingBadgesFor, setManagingBadgesFor] = useState<any | null>(null);

    const filteredUsers = users.filter(u => 
        u.name?.toLowerCase().includes(search.toLowerCase()) || 
        u.username?.toLowerCase().includes(search.toLowerCase())
    );

    const onRoleChange = async (userId: string, role: string) => {
        setLoading(userId);
        try {
            await updateUserRole(userId, role);
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
        } catch (e) { console.error(e); }
        finally { setLoading(null); }
    };

    const onVerificationChange = async (userId: string, type: string) => {
        setLoading(userId);
        try {
            await updateUserVerification(userId, type !== "NONE", type);
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, isVerified: type !== "NONE", verificationType: type } : u));
        } catch (e) { console.error(e); }
        finally { setLoading(null); }
    };

    const assignBadge = async (badgeId: string) => {
        if (!managingBadgesFor) return;
        setLoading("badge-assign");
        try {
            const res = await fetch(`/api/admin/users/${managingBadgesFor.username}/badges`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ badgeId })
            });
            if (!res.ok) throw new Error(await res.text());
            const newAssignment = await res.json();
            
            // Re-fetch or manually add (manual is faster)
            const badgeObj = availableBadges.find(b => b.id === badgeId);
            setUsers(prev => prev.map(u => {
                if (u.id === managingBadgesFor.id) {
                    return { ...u, badges: [...(u.badges || []), { badgeId, badge: badgeObj, ...newAssignment }] };
                }
                return u;
            }));
            
            // update local modal state
            setManagingBadgesFor((prev: any) => ({
                ...prev,
                badges: [...(prev.badges || []), { badgeId, badge: badgeObj, ...newAssignment }]
            }));
            toast.success("Insignia asignada");
        } catch (e: any) {
            toast.error("Error: el usuario podría ya tener esta insignia");
        } finally {
            setLoading(null);
        }
    };

    const removeBadge = async (badgeId: string) => {
        if (!managingBadgesFor) return;
        setLoading("badge-remove");
        try {
            const res = await fetch(`/api/admin/users/${managingBadgesFor.username}/badges?badgeId=${badgeId}`, {
                method: "DELETE"
            });
            if (!res.ok) throw new Error("Fallo al remover");
            
            setUsers(prev => prev.map(u => {
                if (u.id === managingBadgesFor.id) {
                    return { ...u, badges: u.badges.filter((b: any) => b.badgeId !== badgeId) };
                }
                return u;
            }));

            setManagingBadgesFor((prev: any) => ({
                ...prev,
                badges: prev.badges.filter((b: any) => b.badgeId !== badgeId)
            }));
            toast.success("Insignia removida");
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLoading(null);
        }
    };

    return (
        <div>
            <div style={{ padding: "16px", borderBottom: "1px solid #f1f5f9", background: "#fcfcfd", display: "flex", alignItems: "center", gap: "12px" }}>
                <Search size={18} color="#94a3b8" />
                <input 
                    type="text" 
                    placeholder="Buscar por nombre o @usuario..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: "0.95rem", color: "#1e293b" }}
                />
            </div>

            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                        <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                            <th style={{ padding: "16px", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Usuario</th>
                            <th style={{ padding: "16px", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Rol</th>
                            <th style={{ padding: "16px", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Verificación</th>
                            <th style={{ padding: "16px", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Miembro desde</th>
                            <th style={{ padding: "16px" }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map(u => (
                            <tr key={u.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.2s" }} className="table-row-hover">
                                <td style={{ padding: "16px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                        <Avatar user={u} size="sm" />
                                        <div>
                                            <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "4px" }}>
                                                {u.name}
                                                <VerifiedBadge type={u.verificationType || (u.isVerified ? "BLUE" : "NONE")} size={14} customBadges={u.badges} />
                                            </div>
                                            <div style={{ color: "#64748b", fontSize: "0.85rem" }}>@{u.username}</div>
                                        </div>
                                    </div>
                                </td>
                                <td style={{ padding: "16px" }}>
                                    <select 
                                        value={u.role} 
                                        onChange={(e) => onRoleChange(u.id, e.target.value)}
                                        disabled={loading === u.id}
                                        style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "white", fontSize: "0.85rem", fontWeight: 500, color: "#475569" }}
                                    >
                                        <option value="USER">Usuario</option>
                                        <option value="ADMIN">Administrador</option>
                                    </select>
                                </td>
                                <td style={{ padding: "16px" }}>
                                    <select 
                                        value={u.verificationType || "NONE"} 
                                        onChange={(e) => onVerificationChange(u.id, e.target.value)}
                                        disabled={loading === u.id}
                                        style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "white", fontSize: "0.85rem", fontWeight: 500, color: "#475569" }}
                                    >
                                        <option value="NONE">Ninguna</option>
                                        <option value="BLUE">Azul (Personal)</option>
                                        <option value="GOLD">Dorado (Empresa)</option>
                                        <option value="GREY">Gris (Servidor Público/Estatal)</option>
                                    </select>
                                </td>
                                <td style={{ padding: "16px", fontSize: "0.85rem", color: "#64748b" }}>
                                    {new Date(u.createdAt).toLocaleDateString()}
                                </td>
                                <td style={{ padding: "16px", textAlign: "right", display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-end" }}>
                                    <button 
                                        onClick={() => setManagingBadgesFor(u)}
                                        style={{ background: "#e0f2fe", color: "var(--blue)", border: "none", padding: "6px 12px", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}
                                    >
                                        Insignias ({u.badges?.length || 0})
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {managingBadgesFor && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ background: "white", width: "90%", maxWidth: "400px", borderRadius: "16px", padding: "24px", position: "relative" }}>
                        <button 
                            onClick={() => setManagingBadgesFor(null)}
                            style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
                        >
                            <X size={20} />
                        </button>
                        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: "0 0 4px 0", color: "#0f172a" }}>Gestionar Insignias</h2>
                        <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: "20px" }}>@{managingBadgesFor.username}</p>

                        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
                            {managingBadgesFor.badges?.length === 0 && (
                                <div style={{ color: "#94a3b8", fontSize: "0.9rem", textAlign: "center", padding: "12px" }}>No tiene insignias asignadas.</div>
                            )}
                            {managingBadgesFor.badges?.map((ub: any) => (
                                <div key={ub.badgeId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                        <img src={ub.badge.imageUrl} alt={ub.badge.name} style={{ width: 32, height: 32, objectFit: "contain" }} />
                                        <span style={{ fontWeight: 600 }}>{ub.badge.name}</span>
                                    </div>
                                    <button 
                                        onClick={() => removeBadge(ub.badgeId)}
                                        disabled={loading === "badge-remove"}
                                        style={{ background: "#fee2e2", color: "#ef4444", border: "none", padding: "6px", borderRadius: "6px", cursor: "pointer" }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 600, marginBottom: "8px" }}>Añadir nueva insignia</label>
                            <select 
                                onChange={(e) => {
                                    if(e.target.value) assignBadge(e.target.value);
                                    e.target.value = "";
                                }}
                                disabled={loading === "badge-assign"}
                                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none" }}
                            >
                                <option value="">Selecciona una insignia...</option>
                                {availableBadges.filter(b => !managingBadgesFor.badges?.find((ub: any) => ub.badgeId === b.id)).map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{ __html: `
                .table-row-hover:hover {
                    background: #fcfcfd;
                }
            `}} />
        </div>
    );
}
