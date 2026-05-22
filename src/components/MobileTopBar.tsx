"use client";

import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { Avatar } from "./Avatar";
import { ThemeSelectorModal } from "./ThemeSelectorModal";
import { WallpaperPickerModal } from "./WallpaperPickerModal";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import "./MobileTopBar.css";

export function MobileTopBar() {
    const { data: session } = useSession();
    const user = session?.user as any;
    const username = user?.username || "";
    const { t } = useTranslation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showThemeModal, setShowThemeModal] = useState(false);
    const [showWallpaperModal, setShowWallpaperModal] = useState(false);

    if (!user) return null;

    return (
        <div className="mobile-top-bar">
            <div className="mobile-top-bar-content">
                <button onClick={() => setMobileMenuOpen(true)} className="mobile-avatar-btn">
                    <Avatar user={user} size="sm" />
                </button>
                <Link href="/home" className="mobile-logo-btn">
                    <img src="/pulso-logo.png" alt="Pulso" style={{ width: 28, height: 28, borderRadius: '50%' }} />
                </Link>
                <div style={{ width: 32 }} /> {/* Spacer to center logo */}
            </div>

            <AnimatePresence>
                {mobileMenuOpen && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.5 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMobileMenuOpen(false)}
                            style={{ position: "fixed", inset: 0, background: "black", zIndex: 1999 }}
                        />
                        <motion.div 
                            initial={{ x: "-100%" }}
                            animate={{ x: "0%" }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="mobile-drawer"
                        >
                            <div className="mobile-drawer-header">
                                <Avatar user={user} size="md" />
                                <div style={{ marginTop: 12 }}>
                                    <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{user?.name}</div>
                                    <div style={{ color: "var(--text-secondary)" }}>@{username}</div>
                                </div>
                            </div>

                            <div className="mobile-drawer-links">
                                <Link href={`/${username}`} onClick={() => setMobileMenuOpen(false)} className="drawer-link">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
                                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                                        <circle cx="12" cy="7" r="4" />
                                    </svg>
                                    <span>{t("profile")}</span>
                                </Link>

                                <button onClick={() => { setShowThemeModal(true); setMobileMenuOpen(false); }} className="drawer-link">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
                                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                                    </svg>
                                    <span>{t("changeTheme")}</span>
                                </button>

                                <button onClick={() => { setShowWallpaperModal(true); setMobileMenuOpen(false); }} className="drawer-link">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                        <circle cx="8.5" cy="8.5" r="1.5"/>
                                        <polyline points="21 15 16 10 5 21"/>
                                    </svg>
                                    <span>Fondo de pantalla</span>
                                </button>
                                
                                {user.role === "ADMIN" && (
                                    <Link href="/admin-dashboard" onClick={() => setMobileMenuOpen(false)} className="drawer-link">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
                                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                        </svg>
                                        <span>Admin Panel</span>
                                    </Link>
                                )}

                                <div style={{ height: 1, background: "var(--border)", margin: "16px 0" }} />

                                <button onClick={() => signOut({ callbackUrl: "/login" })} className="drawer-link danger">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
                                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                        <polyline points="16 17 21 12 16 7" />
                                        <line x1="21" y1="12" x2="9" y2="12" />
                                    </svg>
                                    <span>{t("logOut")}</span>
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {showThemeModal && <ThemeSelectorModal onClose={() => setShowThemeModal(false)} />}
            {showWallpaperModal && <WallpaperPickerModal onClose={() => setShowWallpaperModal(false)} />}
        </div>
    );
}
