"use client";

import { motion } from "framer-motion";
import { useTranslation } from "@/lib/i18n";

export default function PulsAIPage() {
    const { t } = useTranslation();

    return (
        <div style={{ 
            height: "100%", 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center", 
            justifyContent: "center",
            padding: "20px",
            textAlign: "center",
            position: "relative",
            overflow: "hidden"
        }}>
            {/* Animated Background Glow */}
            <div style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "300px",
                height: "300px",
                background: "var(--blue)",
                filter: "blur(120px)",
                opacity: 0.15,
                borderRadius: "50%",
                zIndex: 0
            }} />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                style={{ zIndex: 1 }}
            >
                <div style={{ 
                    width: "80px", 
                    height: "80px", 
                    background: "var(--blue-faint)", 
                    borderRadius: "24px", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center",
                    margin: "0 auto 24px",
                    boxShadow: "0 0 30px rgba(29, 155, 240, 0.2)"
                }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" style={{ width: 40, height: 40 }}>
                        <path d="M12 3C12 3 12 8 7 8C12 8 12 13 12 13C12 13 12 8 17 8C12 8 12 3 12 3Z" />
                    </svg>
                </div>

                <h1 style={{ fontSize: "2.5rem", fontWeight: 900, marginBottom: "8px", background: "linear-gradient(to bottom, var(--text-primary), var(--text-secondary))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    PulsAI
                </h1>
                
                <div style={{ 
                    display: "inline-block",
                    padding: "4px 12px",
                    background: "var(--blue)",
                    color: "white",
                    borderRadius: "9999px",
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    marginBottom: "24px"
                }}>
                    Coming Soon
                </div>

                <p style={{ maxWidth: "400px", color: "var(--text-secondary)", lineHeight: "1.6", fontSize: "1.1rem" }}>
                    Estamos entrenando a la inteligencia artificial más avanzada para potenciar tu experiencia en Pulso. 
                    Muy pronto podrás investigar, analizar y crear como nunca antes.
                </p>

                <div style={{ marginTop: "40px", display: "flex", gap: "12px", justifyContent: "center" }}>
                    {[1, 2, 3].map((i) => (
                        <motion.div
                            key={i}
                            animate={{ opacity: [0.2, 0.5, 0.2] }}
                            transition={{ repeat: Infinity, duration: 2, delay: i * 0.4 }}
                            style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--blue)" }}
                        />
                    ))}
                </div>
            </motion.div>
        </div>
    );
}
