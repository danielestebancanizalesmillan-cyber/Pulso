"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Cookie, X } from "lucide-react";

export function CookieBanner() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem("pulso_cookie_consent");
        if (!consent) {
            // Un delay para que no aparezca de golpe al cargar la página
            const timer = setTimeout(() => setIsVisible(true), 2000);
            return () => clearTimeout(timer);
        }
    }, []);

    const acceptCookies = () => {
        localStorage.setItem("pulso_cookie_consent", "accepted");
        setIsVisible(false);
    };

    const declineCookies = () => {
        localStorage.setItem("pulso_cookie_consent", "declined");
        setIsVisible(false);
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 150, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 150, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="fixed bottom-0 left-0 right-0 z-[9999] p-4 md:p-6 pointer-events-none"
                >
                    <div className="max-w-4xl mx-auto bg-bg-elevated border border-border shadow-2xl rounded-2xl p-5 md:p-6 pointer-events-auto relative overflow-hidden">
                        {/* Pequeño brillo de fondo para estética */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue opacity-10 blur-[50px] rounded-full pointer-events-none" />
                        
                        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center relative z-10">
                            <div className="bg-bg-secondary p-3 rounded-full shrink-0">
                                <Cookie size={28} className="text-blue" />
                            </div>
                            
                            <div className="flex-1">
                                <h3 className="text-lg font-bold mb-1">Usamos cookies para mejorar tu experiencia</h3>
                                <p className="text-sm text-text-secondary leading-relaxed">
                                    Utilizamos cookies propias y de terceros para fines analíticos y para mostrarte publicidad y contenido personalizado en base a un perfil elaborado a partir de tus hábitos de navegación. 
                                    Puedes consultar nuestra <Link href="/privacy" className="text-blue hover:underline">Política de Privacidad</Link> para más información.
                                </p>
                            </div>

                            <div className="flex flex-row md:flex-col gap-3 w-full md:w-auto shrink-0">
                                <button
                                    onClick={acceptCookies}
                                    className="flex-1 md:flex-none bg-text-primary text-bg-primary hover:opacity-90 font-bold py-2.5 px-6 rounded-full transition-opacity whitespace-nowrap"
                                >
                                    Aceptar todas
                                </button>
                                <button
                                    onClick={declineCookies}
                                    className="flex-1 md:flex-none bg-transparent hover:bg-bg-secondary text-text-primary border border-border font-bold py-2.5 px-6 rounded-full transition-colors whitespace-nowrap"
                                >
                                    Rechazar
                                </button>
                            </div>
                        </div>
                        
                        <button 
                            onClick={declineCookies}
                            className="absolute top-3 right-3 text-text-secondary hover:text-text-primary transition-colors md:hidden"
                            aria-label="Cerrar"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
