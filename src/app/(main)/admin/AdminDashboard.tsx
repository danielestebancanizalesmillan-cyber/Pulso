"use client";

import { useState } from "react";
import { Check, X, ShieldAlert, Award, AlertCircle, Users } from "lucide-react";
import { resolveReport, handleVerification, updateUserRole, updateUserVerification } from "@/app/actions/admin";
import { Avatar } from "@/components/Avatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";

export function AdminDashboard({ reports, verifications, users }: { reports: any[], verifications: any[], users: any[] }) {
    const [activeTab, setActiveTab] = useState<"reports" | "verifications" | "users">("reports");
    const [loading, setLoading] = useState<string | null>(null);

    const onResolveReport = async (id: string, status: "RESOLVED" | "DISMISSED") => {
        setLoading(id);
        try {
            await resolveReport(id, status);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(null);
        }
    };

    const onHandleVerification = async (id: string, approve: boolean) => {
        setLoading(id);
        try {
            await handleVerification(id, approve);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(null);
        }
    };

    const onUpdateUserRole = async (userId: string, role: string) => {
        setLoading(userId);
        try {
            await updateUserRole(userId, role);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(null);
        }
    };

    const onUpdateUserVerification = async (userId: string, isVerified: boolean, type: string) => {
        setLoading(userId);
        try {
            await updateUserVerification(userId, isVerified, type);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(null);
        }
    };

    return (
        <>
            <div className="column-header">
                <h1>Panel de Administración</h1>
            </div>

            {/* Dashboard Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--border)", background: "var(--bg-primary)" }}>
                <button 
                    onClick={() => setActiveTab("reports")}
                    className={`profile-tab ${activeTab === "reports" ? "active" : ""}`}
                    style={{ flex: 1, textAlign: "center", textDecoration: "none", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}
                >
                    <ShieldAlert size={18} />
                    <span>Reportes ({reports.length})</span>
                </button>
                <button 
                    onClick={() => setActiveTab("verifications")}
                    className={`profile-tab ${activeTab === "verifications" ? "active" : ""}`}
                    style={{ flex: 1, textAlign: "center", textDecoration: "none", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}
                >
                    <Award size={18} />
                    <span>Verificaciones ({verifications.length})</span>
                </button>
                <button 
                    onClick={() => setActiveTab("users")}
                    className={`profile-tab ${activeTab === "users" ? "active" : ""}`}
                    style={{ flex: 1, textAlign: "center", textDecoration: "none", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}
                >
                    <Users size={18} />
                    <span>Usuarios ({users.length})</span>
                </button>
            </div>

            {/* Content Lists */}
            <div style={{ padding: "16px" }}>
                {activeTab === "reports" && (
                    <div>
                        {reports.length === 0 ? (
                            <div className="empty-state">
                                <ShieldAlert size={48} style={{ color: "var(--text-secondary)", marginBottom: "1rem" }} />
                                <h2>No hay reportes pendientes</h2>
                                <p>Buen trabajo moderando la comunidad.</p>
                            </div>
                        ) : (
                            reports.map(r => (
                                <div key={r.id} style={{
                                    border: "1px solid var(--border)",
                                    borderRadius: "12px",
                                    padding: "16px",
                                    marginBottom: "12px",
                                    background: "var(--bg-secondary)",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "8px"
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                                            <AlertCircle size={16} />
                                            <span>Reportado por <strong>@{r.reporter.username}</strong></span>
                                        </div>
                                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                                            {new Date(r.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, marginBottom: "4px" }}>Tipo: {r.targetType}</div>
                                        <div style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>Motivo: "{r.reason}"</div>
                                        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>ID de Destino: {r.targetId}</div>
                                    </div>
                                    <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                                        <button 
                                            disabled={loading === r.id}
                                            onClick={() => onResolveReport(r.id, "RESOLVED")}
                                            className="btn btn-outline" 
                                            style={{ flex: 1, color: "var(--green)", borderColor: "rgba(0,186,124,0.3)", display: "flex", justifyContent: "center", gap: "6px" }}
                                        >
                                            <Check size={16} /> Aceptar
                                        </button>
                                        <button 
                                            disabled={loading === r.id}
                                            onClick={() => onResolveReport(r.id, "DISMISSED")}
                                            className="btn btn-outline" 
                                            style={{ flex: 1, color: "var(--red)", borderColor: "rgba(244,33,46,0.3)", display: "flex", justifyContent: "center", gap: "6px" }}
                                        >
                                            <X size={16} /> Descartar
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === "verifications" && (
                    <div>
                        {verifications.length === 0 ? (
                            <div className="empty-state">
                                <Award size={48} style={{ color: "var(--text-secondary)", marginBottom: "1rem" }} />
                                <h2>No hay solicitudes pendientes</h2>
                                <p>Todos los usuarios están sincronizados.</p>
                            </div>
                        ) : (
                            verifications.map(v => (
                                <div key={v.id} style={{
                                    border: "1px solid var(--border)",
                                    borderRadius: "12px",
                                    padding: "16px",
                                    marginBottom: "12px",
                                    background: "var(--bg-secondary)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between"
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                        <Avatar user={v.user} size="md" />
                                        <div>
                                            <div style={{ fontWeight: 700 }}>{v.user.name}</div>
                                            <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>@{v.user.username}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", gap: "8px" }}>
                                        <button 
                                            disabled={loading === v.id}
                                            onClick={() => onHandleVerification(v.id, true)}
                                            className="btn btn-outline" 
                                            style={{ padding: "8px 12px", color: "var(--green)", borderColor: "rgba(0,186,124,0.3)" }}
                                            aria-label="Aprobar"
                                        >
                                            <Check size={18} />
                                        </button>
                                        <button 
                                            disabled={loading === v.id}
                                            onClick={() => onHandleVerification(v.id, false)}
                                            className="btn btn-outline" 
                                            style={{ padding: "8px 12px", color: "var(--red)", borderColor: "rgba(244,33,46,0.3)" }}
                                            aria-label="Rechazar"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === "users" && (
                    <div>
                        {users.length === 0 ? (
                            <div className="empty-state">
                                <Users size={48} style={{ color: "var(--text-secondary)", marginBottom: "1rem" }} />
                                <h2>No hay usuarios</h2>
                            </div>
                        ) : (
                            users.map(u => (
                                <div key={u.id} style={{
                                    border: "1px solid var(--border)",
                                    borderRadius: "12px",
                                    padding: "16px",
                                    marginBottom: "12px",
                                    background: "var(--bg-secondary)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between"
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                        <Avatar user={u} size="md" />
                                        <div>
                                            <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
                                                {u.name}
                                                {u.isVerified && <VerifiedBadge type={u.verificationType} size={14} />}
                                            </div>
                                            <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>@{u.username}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                                        <div>
                                            <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Rol</label>
                                            <select 
                                                value={u.role} 
                                                onChange={(e) => onUpdateUserRole(u.id, e.target.value)}
                                                style={{ background: "var(--bg-primary)", color: "var(--text-primary)", border: "1px solid var(--border)", borderRadius: "6px", padding: "4px 8px" }}
                                                disabled={loading === u.id}
                                            >
                                                <option value="USER">User</option>
                                                <option value="ADMIN">Admin</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Verificación</label>
                                            <select 
                                                value={u.verificationType === "NONE" || !u.isVerified ? "NONE" : u.verificationType} 
                                                onChange={(e) => onUpdateUserVerification(u.id, e.target.value !== "NONE", e.target.value)}
                                                style={{ background: "var(--bg-primary)", color: "var(--text-primary)", border: "1px solid var(--border)", borderRadius: "6px", padding: "4px 8px" }}
                                                disabled={loading === u.id}
                                            >
                                                <option value="NONE">Ninguna</option>
                                                <option value="BLUE">Azul</option>
                                                <option value="GOLD">Dorado</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </>
    );
}
