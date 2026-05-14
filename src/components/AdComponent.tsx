"use client";

import React from "react";

interface AdProps {
    title: string;
    description: string;
    image?: string;
    video?: string;
    cta: string;
    url: string;
    type?: "standard" | "premium" | "sidebar";
}

export function AdComponent({ title, description, image, video, cta, url, type = "standard" }: AdProps) {
    const isSidebar = type === "sidebar";

    return (
        <div 
            style={{ 
                background: "var(--bg-main)", 
                border: "1px solid var(--border)", 
                borderRadius: isSidebar ? "16px" : "0", 
                padding: "16px",
                margin: isSidebar ? "16px 0" : "0",
                position: "relative",
                cursor: "pointer",
                transition: "background 0.2s",
                borderLeft: type === "premium" ? "4px solid var(--blue)" : "1px solid var(--border)",
            }}
            onClick={() => window.open(url, "_blank")}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg-main)")}
        >
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <div style={{ 
                    width: 40, 
                    height: 40, 
                    borderRadius: "50%", 
                    background: "linear-gradient(135deg, #00B4DB 0%, #0083B0 100%)", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center",
                    flexShrink: 0,
                    boxShadow: "0 2px 8px rgba(0, 180, 219, 0.3)"
                }}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                    </svg>
                </div>
                
                <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{title}</span>
                        <div style={{ background: "rgba(0,0,0,0.05)", padding: "1px 6px", borderRadius: "4px", fontSize: "0.65rem", fontWeight: 700, color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                            PROMO
                        </div>
                    </div>
                    <p style={{ fontSize: "0.9rem", color: "var(--text-primary)", lineHeight: "1.4", margin: "4px 0" }}>
                        {description}
                    </p>
                    
                    {video ? (
                        <div style={{ marginTop: "10px", borderRadius: "12px", overflow: "hidden", border: "1px solid var(--border)", background: "#000" }}>
                            <video src={video} autoPlay muted loop playsInline style={{ width: "100%", display: "block" }} />
                        </div>
                    ) : image && (
                        <div style={{ marginTop: "10px", borderRadius: "12px", overflow: "hidden", border: "1px solid var(--border)" }}>
                            <img src={image} alt="Ad" style={{ width: "100%", display: "block" }} />
                        </div>
                    )}
                    
                    <button style={{ 
                        marginTop: "12px", 
                        background: "var(--blue)", 
                        color: "white", 
                        border: "none", 
                        borderRadius: "20px", 
                        padding: "6px 16px", 
                        fontSize: "0.85rem", 
                        fontWeight: 700,
                        cursor: "pointer",
                        width: isSidebar ? "100%" : "auto"
                    }}>
                        {cta}
                    </button>
                </div>
            </div>
        </div>
    );
}

export const MOCK_ADS = [
    {
        title: "Pulso Verificado",
        description: "Obtén tu insignia azul, escribe posts más largos y disfruta de una experiencia sin anuncios. ¡Únete a la élite de Pulso hoy!",
        cta: "Suscribirse",
        url: "/settings",
        image: "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=1000&auto=format&fit=crop"
    },
    {
        title: "PulsAI Research",
        description: "¿Necesitas analizar datos complejos en segundos? PulsAI es tu asistente de investigación de próxima generación. Pruébalo gratis.",
        cta: "Probar PulsAI",
        url: "/ai",
        image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=1000&auto=format&fit=crop"
    },
    {
        title: "Diseño Web Pro",
        description: "Crea sitios web impresionantes como Pulso con nuestro nuevo framework. Rápido, escalable y hermoso.",
        cta: "Ver más",
        url: "https://google.com",
        image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1000&auto=format&fit=crop"
    }
];
