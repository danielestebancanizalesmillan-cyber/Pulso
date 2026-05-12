"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Lock, ArrowRight, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminLoginPage() {
    const [pin, setPin] = useState("");
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(false);

        try {
            const res = await fetch("/api/admin/unlock", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pin })
            });

            if (res.ok) {
                router.push("/admin-dashboard");
                router.refresh();
            } else {
                setError(true);
                setPin("");
            }
        } catch (err) {
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ 
            height: "100vh", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            background: "#0f172a",
            color: "white",
            fontFamily: "inherit"
        }}>
            <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
                <div style={{ position: "absolute", top: "20%", left: "30%", width: "400px", height: "400px", background: "#3b82f6", filter: "blur(150px)", opacity: 0.1 }} />
                <div style={{ position: "absolute", bottom: "20%", right: "30%", width: "400px", height: "400px", background: "#6366f1", filter: "blur(150px)", opacity: 0.1 }} />
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ 
                    width: "100%", 
                    maxWidth: "400px", 
                    padding: "40px", 
                    background: "rgba(30, 41, 59, 0.5)", 
                    backdropFilter: "blur(20px)",
                    borderRadius: "24px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
                    textAlign: "center",
                    zIndex: 1
                }}
            >
                <div style={{ 
                    width: "64px", 
                    height: "64px", 
                    background: "rgba(59, 130, 246, 0.2)", 
                    color: "#3b82f6",
                    borderRadius: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 24px"
                }}>
                    <Shield size={32} />
                </div>

                <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "8px" }}>Área Restringida</h1>
                <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: "32px" }}>
                    Introduce la contraseña maestra para acceder al panel de control de Pulso.
                </p>

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ position: "relative" }}>
                        <Lock size={18} style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
                        <input 
                            type="password" 
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            placeholder="Contraseña Maestra"
                            autoFocus
                            style={{ 
                                width: "100%", 
                                padding: "14px 16px 14px 48px", 
                                background: "rgba(15, 23, 42, 0.6)", 
                                border: error ? "1px solid #ef4444" : "1px solid rgba(255,255,255,0.1)",
                                borderRadius: "12px",
                                color: "white",
                                fontSize: "1rem",
                                outline: "none",
                                transition: "all 0.2s"
                            }}
                        />
                    </div>

                    {error && (
                        <motion.div 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            style={{ color: "#ef4444", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px", justifyContent: "center" }}
                        >
                            <AlertCircle size={14} /> Contraseña incorrecta. Reintenta.
                        </motion.div>
                    )}

                    <button 
                        type="submit" 
                        disabled={loading || !pin}
                        style={{ 
                            marginTop: "8px",
                            padding: "14px",
                            background: "#3b82f6",
                            color: "white",
                            border: "none",
                            borderRadius: "12px",
                            fontWeight: 700,
                            fontSize: "1rem",
                            cursor: loading ? "not-allowed" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            transition: "all 0.2s"
                        }}
                    >
                        {loading ? "Verificando..." : (
                            <>
                                Desbloquear Panel <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>

                <div style={{ marginTop: "32px", fontSize: "0.75rem", color: "#64748b" }}>
                    Solo personal autorizado. Cada intento fallido queda registrado.
                </div>
            </motion.div>
        </div>
    );
}
