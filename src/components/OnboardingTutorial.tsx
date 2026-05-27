"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const steps = [
    {
        title: "¡Bienvenido a Pulso!",
        description: "Tu nueva red social favorita. Aquí podrás conectar con personas, descubrir tendencias y compartir tus ideas sin límites.",
        color: "var(--blue)",
        icon: (
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3C12 3 12 8 7 8C12 8 12 13 12 13C12 13 12 8 17 8C12 8 12 3 12 3Z" />
                <path d="M5 16C5 16 5 19 3 19C5 19 5 22 5 22C5 22 5 19 7 19C5 19 5 16 5 16Z" />
                <path d="M19 14C19 14 19 17 17 17C19 17 19 20 19 20C19 20 19 17 21 17C19 17 19 14 19 14Z" />
            </svg>
        ),
    },
    {
        title: "Explora y Descubre",
        description: "Usa la barra de búsqueda o el panel de tendencias para encontrar temas interesantes, hashtags y nuevos usuarios a quienes seguir.",
        color: "var(--green)",
        icon: (
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
        ),
    },
    {
        title: "Interactúa",
        description: "Dale me gusta, comenta o comparte (retweet) las publicaciones que te parezcan interesantes. Tu interacción ayuda a personalizar tu Feed.",
        color: "var(--red)",
        icon: (
            <svg width="48" height="48" viewBox="0 0 24 24" fill="var(--red)" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
        ),
    },
    {
        title: "Inteligencia Artificial",
        description: "Prueba PulsAI, nuestro asistente virtual avanzado. Pronto podrás redactar, investigar y resumir información directamente desde tu cuenta.",
        color: "#a855f7",
        icon: (
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
        ),
    },
];

export function OnboardingTutorial() {
    const [isOpen, setIsOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        const hasSeenTutorial = localStorage.getItem("pulso_tutorial_seen");
        if (!hasSeenTutorial) {
            const timer = setTimeout(() => setIsOpen(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep((prev) => prev + 1);
        } else {
            handleClose();
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        localStorage.setItem("pulso_tutorial_seen", "true");
    };

    if (!isOpen) return null;

    const step = steps[currentStep];

    return (
        <AnimatePresence>
            {/* Fullscreen overlay */}
            <div
                style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 99999,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(0,0,0,0.65)",
                    backdropFilter: "blur(6px)",
                    padding: "16px",
                }}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--border)",
                        borderRadius: "20px",
                        width: "100%",
                        maxWidth: "420px",
                        boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
                        position: "relative",
                        overflow: "hidden",
                    }}
                >
                    {/* Close button */}
                    <button
                        onClick={handleClose}
                        style={{
                            position: "absolute",
                            top: "14px",
                            right: "14px",
                            background: "var(--bg-secondary)",
                            border: "none",
                            borderRadius: "50%",
                            width: "32px",
                            height: "32px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            color: "var(--text-secondary)",
                            zIndex: 2,
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>

                    <div style={{ padding: "40px 32px 32px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3 }}
                            style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
                        >
                            {/* Icon */}
                            <div style={{
                                background: "var(--bg-secondary)",
                                borderRadius: "50%",
                                width: "80px",
                                height: "80px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                marginBottom: "24px",
                            }}>
                                {step.icon}
                            </div>

                            {/* Title */}
                            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "10px", color: "var(--text-primary)" }}>
                                {step.title}
                            </h2>

                            {/* Description */}
                            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: 1.6, maxWidth: "340px" }}>
                                {step.description}
                            </p>
                        </motion.div>

                        {/* Progress dots */}
                        <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginTop: "28px", marginBottom: "20px" }}>
                            {steps.map((_, i) => (
                                <div
                                    key={i}
                                    style={{
                                        height: "6px",
                                        borderRadius: "9999px",
                                        transition: "all 0.3s",
                                        width: i === currentStep ? "28px" : "6px",
                                        background: i === currentStep ? "var(--blue)" : "var(--border)",
                                    }}
                                />
                            ))}
                        </div>

                        {/* Button */}
                        <button
                            onClick={handleNext}
                            style={{
                                width: "100%",
                                background: "var(--blue)",
                                color: "white",
                                fontWeight: 700,
                                padding: "14px",
                                borderRadius: "9999px",
                                border: "none",
                                cursor: "pointer",
                                fontSize: "1rem",
                                transition: "background 0.2s",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--blue-hover)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--blue)")}
                        >
                            {currentStep === steps.length - 1 ? "¡Comenzar!" : "Siguiente"}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
