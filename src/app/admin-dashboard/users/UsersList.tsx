"use client";

import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { updateUserRole, updateUserVerification } from "@/app/actions/admin";
import { Search, MoreVertical } from "lucide-react";

export function UsersList({ initialUsers }: { initialUsers: any[] }) {
    const [users, setUsers] = useState(initialUsers);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState<string | null>(null);

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
                                                {u.isVerified && <VerifiedBadge type={u.verificationType} size={14} />}
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
                                    </select>
                                </td>
                                <td style={{ padding: "16px", fontSize: "0.85rem", color: "#64748b" }}>
                                    {new Date(u.createdAt).toLocaleDateString()}
                                </td>
                                <td style={{ padding: "16px", textAlign: "right" }}>
                                    <button style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}>
                                        <MoreVertical size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .table-row-hover:hover {
                    background: #fcfcfd;
                }
            `}} />
        </div>
    );
}
