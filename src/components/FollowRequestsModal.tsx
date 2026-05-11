"use client";

import { useState, useEffect } from "react";
import { getPendingFollowRequests, approveFollowRequest, denyFollowRequest } from "@/app/actions/followRequest";
import { Avatar } from "./Avatar";

interface FollowRequestsModalProps {
    onClose: () => void;
}

export function FollowRequestsModal({ onClose }: FollowRequestsModalProps) {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadRequests = async () => {
        try {
            const data = await getPendingFollowRequests();
            setRequests(data);
        } catch (error) {
            console.error("Error loading follow requests:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRequests();
    }, []);

    const handleApprove = async (id: string) => {
        try {
            await approveFollowRequest(id);
            setRequests(prev => prev.filter(r => r.id !== id));
        } catch (error) {
            alert("Error al aprobar");
        }
    };

    const handleDeny = async (id: string) => {
        try {
            await denyFollowRequest(id);
            setRequests(prev => prev.filter(r => r.id !== id));
        } catch (error) {
            alert("Error al rechazar");
        }
    };

    return (
        <div style={{
            position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
            background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
        }}>
            <div style={{
                background: "var(--bg-primary)", padding: "24px", borderRadius: "16px",
                width: "100%", maxWidth: "500px", maxHeight: "80vh", overflowY: "auto",
                boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                border: "1px solid var(--border)", color: "var(--text-primary)"
            }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <h3 style={{ fontSize: "1.3rem", fontWeight: 800 }}>Solicitudes de Seguimiento</h3>
                    <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "1.5rem" }}>×</button>
                </div>

                {loading ? (
                    <div style={{ textAlign: "center", padding: "20px" }}>Cargando...</div>
                ) : requests.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "20px", color: "var(--text-secondary)" }}>
                        No tienes solicitudes pendientes.
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {requests.map((r) => (
                            <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: "var(--bg-hover)", borderRadius: "12px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                    <Avatar user={r.sender} size="md" />
                                    <div>
                                        <div style={{ fontWeight: 700 }}>{r.sender.name}</div>
                                        <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>@{r.sender.username}</div>
                                    </div>
                                </div>
                                <div style={{ display: "flex", gap: "8px" }}>
                                    <button 
                                        onClick={() => handleApprove(r.id)} 
                                        className="btn btn-primary" 
                                        style={{ padding: "6px 12px", fontSize: "0.85rem", borderRadius: "20px" }}
                                    >
                                        Aceptar
                                    </button>
                                    <button 
                                        onClick={() => handleDeny(r.id)} 
                                        className="btn btn-outline" 
                                        style={{ padding: "6px 12px", fontSize: "0.85rem", borderRadius: "20px" }}
                                    >
                                        Rechazar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
