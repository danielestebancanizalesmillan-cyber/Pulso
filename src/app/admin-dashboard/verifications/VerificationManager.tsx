"use client";

import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { handleVerification } from "@/app/actions/admin";
import { Check, X, Award, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function VerificationManager({ initialRequests }: { initialRequests: any[] }) {
    const [requests, setRequests] = useState(initialRequests);
    const [loading, setLoading] = useState<string | null>(null);

    const onHandle = async (id: string, approve: boolean) => {
        setLoading(id);
        try {
            await handleVerification(id, approve);
            setRequests(prev => prev.filter(r => r.id !== id));
        } catch (e) { console.error(e); }
        finally { setLoading(null); }
    };

    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "20px" }}>
            <AnimatePresence>
                {requests.map(r => (
                    <motion.div 
                        key={r.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        style={{ background: "white", padding: "24px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
                            <Avatar user={r.user} size="lg" />
                            <div>
                                <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#0f172a" }}>{r.user.name}</div>
                                <div style={{ color: "#64748b", fontSize: "0.9rem" }}>@{r.user.username}</div>
                            </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#64748b", fontSize: "0.85rem", marginBottom: "24px" }}>
                            <Clock size={16} />
                            Solicitado el {new Date(r.createdAt).toLocaleDateString()}
                        </div>

                        <div style={{ display: "flex", gap: "12px" }}>
                            <button 
                                onClick={() => onHandle(r.id, true)}
                                disabled={loading === r.id}
                                style={{ flex: 1, padding: "12px", borderRadius: "10px", background: "#10b981", color: "white", border: "none", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "all 0.2s" }}
                                onMouseEnter={(e) => e.currentTarget.style.filter = "brightness(0.9)"}
                                onMouseLeave={(e) => e.currentTarget.style.filter = "brightness(1)"}
                            >
                                <Check size={18} /> Aprobar
                            </button>
                            <button 
                                onClick={() => onHandle(r.id, false)}
                                disabled={loading === r.id}
                                style={{ flex: 1, padding: "12px", borderRadius: "10px", background: "#fee2e2", color: "#ef4444", border: "none", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "all 0.2s" }}
                                onMouseEnter={(e) => e.currentTarget.style.background = "#fecaca"}
                                onMouseLeave={(e) => e.currentTarget.style.background = "#fee2e2"}
                            >
                                <X size={18} /> Rechazar
                            </button>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
            
            {requests.length === 0 && (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "80px 0", color: "#64748b" }}>
                    <Award size={64} style={{ margin: "0 auto 16px", opacity: 0.3 }} />
                    <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#1e293b" }}>Todo al día</h3>
                    <p>No hay solicitudes de verificación pendientes.</p>
                </div>
            )}
        </div>
    );
}
