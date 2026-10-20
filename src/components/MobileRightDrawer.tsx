"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Home, 
    Search, 
    Bell, 
    Mail, 
    Mic, 
    Users, 
    ListFilter, 
    Bookmark, 
    Bot, 
    BarChart2, 
    User, 
    Settings, 
    ShieldAlert, 
    LogOut, 
    X, 
    Menu, 
    Palette, 
    Image as ImageIcon,
    ExternalLink
} from "lucide-react";
import { Avatar } from "./Avatar";
import { VerifiedBadge } from "./VerifiedBadge";
import { NotificationBadge } from "./NotificationBadge";
import { MessageBadge } from "./MessageBadge";
import { ThemeSelectorModal } from "./ThemeSelectorModal";
import { WallpaperPickerModal } from "./WallpaperPickerModal";
import { useTranslation } from "@/lib/i18n";

export function MobileRightDrawer() {
    const { data: session } = useSession();
    const pathname = usePathname();
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [showThemeModal, setShowThemeModal] = useState(false);
    const [showWallpaperModal, setShowWallpaperModal] = useState(false);

    const user = session?.user as any;
    const username = user?.username || "";

    // Cerrar el drawer al cambiar de ruta
    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    // Escuchar eventos globales para abrir el drawer si algún componente lo dispara
    useEffect(() => {
        const handleOpen = () => setIsOpen(true);
        const handleClose = () => setIsOpen(false);
        const handleToggle = () => setIsOpen(prev => !prev);

        window.addEventListener("open-mobile-drawer", handleOpen);
        window.addEventListener("close-mobile-drawer", handleClose);
        window.addEventListener("toggle-mobile-drawer", handleToggle);

        return () => {
            window.removeEventListener("open-mobile-drawer", handleOpen);
            window.removeEventListener("close-mobile-drawer", handleClose);
            window.removeEventListener("toggle-mobile-drawer", handleToggle);
        };
    }, []);

    // Bloquear scroll de fondo cuando el drawer esté abierto
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    if (!user) return null;

    // Todas las pestañas completas de Pulso
    const navigationLinks = [
        {
            href: "/home",
            label: t("home") || "Inicio",
            icon: Home
        },
        {
            href: "/explore",
            label: t("explore") || "Explorar / Buscar",
            icon: Search
        },
        {
            href: `/${username}`,
            label: t("profile") || "Perfil",
            icon: User
        },
        {
            href: "/spaces",
            label: "Espacios (Spaces)",
            icon: Mic
        },
        {
            href: "/notifications",
            label: t("notifications") || "Notificaciones",
            icon: Bell,
            badge: <NotificationBadge initialCount={0} />
        },
        {
            href: "/messages",
            label: t("messages") || "Mensajes",
            icon: Mail,
            badge: <MessageBadge />
        },
        {
            href: "/ai",
            label: "PulsAI",
            icon: Bot,
            chip: "IA"
        },
        {
            href: "/communities",
            label: t("communities") || "Comunidades",
            icon: Users
        },
        {
            href: "/lists",
            label: t("lists") || "Listas",
            icon: ListFilter
        },
        {
            href: "/bookmarks",
            label: t("bookmarks") || "Guardados",
            icon: Bookmark
        },
        {
            href: "/analytics",
            label: t("analytics") || "Estadísticas",
            icon: BarChart2
        },
        {
            href: "/settings",
            label: t("settings") || "Ajustes",
            icon: Settings
        },
        ...(user?.role === "ADMIN" ? [{
            href: "/admin-dashboard",
            label: "Panel de Administración",
            icon: ShieldAlert,
            chip: "Admin"
        }] : [])
    ];

    return (
        <>
            {/* Drawer Modal & Backdrop */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop oscuro */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => setIsOpen(false)}
                            style={{
                                position: "fixed",
                                inset: 0,
                                background: "rgba(0, 0, 0, 0.65)",
                                backdropFilter: "blur(4px)",
                                WebkitBackdropFilter: "blur(4px)",
                                zIndex: 9998
                            }}
                        />

                        {/* Barra lateral derecha desplegable */}
                        <motion.aside
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 28, stiffness: 300 }}
                            style={{
                                position: "fixed",
                                top: 0,
                                right: 0,
                                bottom: 0,
                                width: "86%",
                                maxWidth: "340px",
                                height: "100%",
                                background: "var(--bg-primary, #000)",
                                borderLeft: "1px solid var(--border)",
                                zIndex: 9999,
                                display: "flex",
                                flexDirection: "column",
                                boxShadow: "-8px 0 32px rgba(0, 0, 0, 0.5)",
                                overflow: "hidden"
                            }}
                        >
                            {/* Cabecera del Drawer */}
                            <div style={{
                                padding: "16px 20px",
                                borderBottom: "1px solid var(--border)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                background: "rgba(var(--bg-rgb, 0, 0, 0), 0.6)",
                                backdropFilter: "blur(12px)"
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <img src="/pulso-logo.png" alt="Pulso" style={{ width: 28, height: 28, borderRadius: "50%" }} />
                                    <span style={{ fontWeight: 800, fontSize: "1.1rem", letterSpacing: "-0.3px" }}>Navegación</span>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    aria-label="Cerrar menú"
                                    style={{
                                        background: "var(--bg-secondary, rgba(255,255,255,0.05))",
                                        border: "1px solid var(--border)",
                                        borderRadius: "50%",
                                        width: "36px",
                                        height: "36px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: "var(--text-primary)",
                                        cursor: "pointer"
                                    }}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Tarjeta de Perfil de Usuario */}
                            <Link 
                                href={`/${username}`} 
                                onClick={() => setIsOpen(false)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "14px",
                                    padding: "16px 20px",
                                    textDecoration: "none",
                                    background: "var(--bg-secondary, rgba(255,255,255,0.03))",
                                    borderBottom: "1px solid var(--border)",
                                    transition: "background 0.2s"
                                }}
                            >
                                <Avatar user={user} size="md" />
                                <div style={{ overflow: "hidden", flex: 1 }}>
                                    <div style={{ 
                                        fontWeight: 800, 
                                        fontSize: "1rem", 
                                        color: "var(--text-primary)",
                                        display: "flex", 
                                        alignItems: "center", 
                                        gap: "4px",
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis"
                                    }}>
                                        {user?.name}
                                        <VerifiedBadge type={user?.verificationType || (user?.isVerified ? "BLUE" : "NONE")} size={15} customBadges={user?.badges} />
                                    </div>
                                    <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                                        @{username}
                                    </div>
                                </div>
                                <ExternalLink size={16} color="var(--text-secondary)" />
                            </Link>

                            {/* Lista con TODAS las Pestañas de Navegación */}
                            <div style={{
                                flex: 1,
                                overflowY: "auto",
                                padding: "12px 14px",
                                display: "flex",
                                flexDirection: "column",
                                gap: "4px"
                            }}>
                                <div style={{ 
                                    fontSize: "0.75rem", 
                                    fontWeight: 700, 
                                    textTransform: "uppercase", 
                                    letterSpacing: "0.8px", 
                                    color: "var(--text-secondary)",
                                    padding: "8px 12px 4px"
                                }}>
                                    Pestañas Principales
                                </div>

                                {navigationLinks.map((item) => {
                                    const isActive = pathname === item.href || (item.href !== "/home" && pathname.startsWith(item.href));
                                    const IconComponent = item.icon;

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setIsOpen(false)}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                padding: "12px 14px",
                                                borderRadius: "14px",
                                                textDecoration: "none",
                                                background: isActive ? "var(--bg-hover, rgba(29, 155, 240, 0.12))" : "transparent",
                                                color: isActive ? "var(--blue)" : "var(--text-primary)",
                                                fontWeight: isActive ? 700 : 500,
                                                fontSize: "0.95rem",
                                                transition: "all 0.15s ease"
                                            }}
                                        >
                                            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                                                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                                                    <IconComponent size={21} strokeWidth={isActive ? 2.5 : 2} color={isActive ? "var(--blue)" : "currentColor"} />
                                                    {item.badge}
                                                </div>
                                                <span>{item.label}</span>
                                            </div>

                                            {item.chip && (
                                                <span style={{
                                                    fontSize: "0.65rem",
                                                    fontWeight: 800,
                                                    padding: "2px 7px",
                                                    borderRadius: "10px",
                                                    background: item.chip === "Admin" ? "#ef4444" : "var(--blue)",
                                                    color: "white",
                                                    textTransform: "uppercase"
                                                }}>
                                                    {item.chip}
                                                </span>
                                            )}
                                        </Link>
                                    );
                                })}

                                {/* Opciones de Personalización Rápidas */}
                                <div style={{ 
                                    fontSize: "0.75rem", 
                                    fontWeight: 700, 
                                    textTransform: "uppercase", 
                                    letterSpacing: "0.8px", 
                                    color: "var(--text-secondary)",
                                    padding: "16px 12px 4px",
                                    borderTop: "1px solid var(--border)",
                                    marginTop: "10px"
                                }}>
                                    Personalización
                                </div>

                                <button
                                    onClick={() => {
                                        setShowThemeModal(true);
                                        setIsOpen(false);
                                    }}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "14px",
                                        padding: "12px 14px",
                                        borderRadius: "14px",
                                        background: "transparent",
                                        border: "none",
                                        color: "var(--text-primary)",
                                        fontSize: "0.95rem",
                                        fontWeight: 500,
                                        cursor: "pointer",
                                        textAlign: "left"
                                    }}
                                >
                                    <Palette size={20} color="var(--text-secondary)" />
                                    <span>{t("changeTheme") || "Cambiar tema"}</span>
                                </button>

                                <button
                                    onClick={() => {
                                        setShowWallpaperModal(true);
                                        setIsOpen(false);
                                    }}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "14px",
                                        padding: "12px 14px",
                                        borderRadius: "14px",
                                        background: "transparent",
                                        border: "none",
                                        color: "var(--text-primary)",
                                        fontSize: "0.95rem",
                                        fontWeight: 500,
                                        cursor: "pointer",
                                        textAlign: "left"
                                    }}
                                >
                                    <ImageIcon size={20} color="var(--text-secondary)" />
                                    <span>Fondo de pantalla</span>
                                </button>
                            </div>

                            {/* Footer: Cerrar sesión */}
                            <div style={{
                                padding: "16px 20px",
                                borderTop: "1px solid var(--border)",
                                background: "var(--bg-secondary, rgba(255,255,255,0.02))"
                            }}>
                                <button
                                    onClick={() => signOut({ callbackUrl: "/login" })}
                                    style={{
                                        width: "100%",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "10px",
                                        padding: "12px",
                                        borderRadius: "14px",
                                        background: "rgba(239, 68, 68, 0.1)",
                                        border: "1px solid rgba(239, 68, 68, 0.25)",
                                        color: "#ef4444",
                                        fontSize: "0.95rem",
                                        fontWeight: 700,
                                        cursor: "pointer"
                                    }}
                                >
                                    <LogOut size={18} />
                                    <span>{t("logOut") || "Cerrar sesión"}</span>
                                </button>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {showThemeModal && <ThemeSelectorModal onClose={() => setShowThemeModal(false)} />}
            {showWallpaperModal && <WallpaperPickerModal onClose={() => setShowWallpaperModal(false)} />}
        </>
    );
}
