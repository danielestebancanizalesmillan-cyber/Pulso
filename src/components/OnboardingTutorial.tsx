"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, MessageSquare, Heart, Search, X } from "lucide-react";

const steps = [
    {
        title: "¡Bienvenido a Pulso!",
        description: "Tu nueva red social favorita. Aquí podrás conectar con personas, descubrir tendencias y compartir tus ideas sin límites.",
        icon: <Sparkles size={48} className="text-blue-500" />
    },
    {
        title: "Explora y Descubre",
        description: "Usa la barra de búsqueda o el panel de tendencias para encontrar temas interesantes, hashtags y nuevos usuarios a quienes seguir.",
        icon: <Search size={48} className="text-blue-500" />
    },
    {
        title: "Interactúa",
        description: "Dale me gusta, comenta o comparte (retweet) las publicaciones que te parezcan interesantes. Tu interacción ayuda a personalizar tu Feed 'Para Ti'.",
        icon: <Heart size={48} className="text-pink-500" />
    },
    {
        title: "Inteligencia Artificial Integrada",
        description: "Prueba a PulsAI, nuestro asistente virtual avanzado. Te ayudará a redactar, investigar y resumir información directamente desde tu cuenta.",
        icon: <MessageSquare size={48} className="text-purple-500" />
    }
];

export function OnboardingTutorial() {
    const [isOpen, setIsOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        const hasSeenTutorial = localStorage.getItem("pulso_tutorial_seen");
        if (!hasSeenTutorial) {
            // Un pequeño delay para que la página cargue primero
            const timer = setTimeout(() => setIsOpen(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleClose();
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        localStorage.setItem("pulso_tutorial_seen", "true");
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="bg-bg-elevated border border-border w-full max-w-md rounded-2xl shadow-2xl relative overflow-hidden"
                >
                    <button 
                        onClick={handleClose}
                        className="absolute top-4 right-4 text-text-secondary hover:text-text-primary transition-colors bg-bg-secondary p-1 rounded-full"
                    >
                        <X size={20} />
                    </button>

                    <div className="p-8 flex flex-col items-center text-center">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3 }}
                            className="flex flex-col items-center"
                        >
                            <div className="mb-6 p-4 bg-bg-secondary rounded-full">
                                {steps[currentStep].icon}
                            </div>
                            <h2 className="text-2xl font-bold mb-3">{steps[currentStep].title}</h2>
                            <p className="text-text-secondary text-base leading-relaxed">
                                {steps[currentStep].description}
                            </p>
                        </motion.div>

                        <div className="mt-8 flex flex-col w-full gap-4">
                            <div className="flex justify-center gap-2 mb-2">
                                {steps.map((_, i) => (
                                    <div 
                                        key={i}
                                        className={`h-2 rounded-full transition-all duration-300 ${i === currentStep ? "w-8 bg-blue" : "w-2 bg-border"}`}
                                    />
                                ))}
                            </div>
                            
                            <button
                                onClick={handleNext}
                                className="w-full bg-blue hover:bg-blue-hover text-white font-bold py-3 px-4 rounded-full transition-colors"
                            >
                                {currentStep === steps.length - 1 ? "Comenzar" : "Siguiente"}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
