"use client";

import { useState } from "react";
import { resolveReport } from "@/app/actions/admin";
import { AlertCircle, Check, X, ShieldAlert, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export function ReportList({ initialReports }: { initialReports: any[] }) {
    const [reports, setReports] = useState(initialReports);
    const [loading, setLoading] = useState<string | null>(null);

    const onResolve = async (id: string, status: "RESOLVED" | "DISMISSED") => {
        setLoading(id);
        try {
            await resolveReport(id, status);
            setReports(prev => prev.filter(r => r.id !== id));
        } catch (e) { console.error(e); }
        finally { setLoading(null); }
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <AnimatePresence>
                {reports.map(r => (
                    <motion.div 
                        key={r.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        style={{ background: "white", padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                    >
                        <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                                <div style={{ padding: "6px", borderRadius: "8px", background: "#fee2e2", color: "#ef4444" }}>
                                    <AlertCircle size={18} />
                                </div>
                                <span style={{ fontWeight: 700, color: "#1e293b" }}>{r.targetType === "TWEET" ? "Tweet Reportado" : "Usuario Reportado"}</span>
                                <span style={{ color: "#64748b", fontSize: "0.8rem" }}>• Por @{r.reporter.username}</span>
                            </div>
                            
                            <p style={{ margin: "0 0 12px 0", color: "#475569", fontSize: "0.95rem", fontStyle: "italic" }}>
                                "{r.reason}"
                            </p>
                            
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <Link 
                                    href={r.targetType === "TWEET" ? `/tweet/${r.targetId}` : `/${r.targetId}`} 
                                    target="_blank"
                                    style={{ color: "var(--blue)", fontSize: "0.85rem", fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}
                                >
                                    Ver contenido reportado <ExternalLink size={14} />
                                </Link>
                                <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{new Date(r.createdAt).toLocaleString()}</span>
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: "8px", marginLeft: "24px" }}>
                            <button 
                                onClick={() => onResolve(r.id, "RESOLVED")}
                                disabled={loading === r.id}
                                style={{ padding: "8px 16px", borderRadius: "8px", background: "#10b981", color: "white", border: "none", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px" }}
                            >
                                <Check size={16} /> Resolver
                            </button>
                            <button 
                                onClick={() => onResolve(r.id, "DISMISSED")}
                                disabled={loading === r.id}
                                style={{ padding: "8px 16px", borderRadius: "8px", background: "#f1f5f9", color: "#475569", border: "none", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px" }}
                            >
                                <X size={16} /> Ignorar
                            </button>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>

            {reports.length === 0 && (
                <div style={{ textAlign: "center", padding: "80px 0", color: "#64748b" }}>
                    <ShieldAlert size={64} style={{ margin: "0 auto 16px", opacity: 0.3 }} />
                    <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#1e293b" }}>Comunidad Limpia</h3>
                    <p>No hay reportes de contenido pendientes de revisión.</p>
                </div>
            )}
        </div>
    );
}
