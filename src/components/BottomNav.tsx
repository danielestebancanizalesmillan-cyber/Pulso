"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Search, Bell, Mail, Settings } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { ThemeSelectorModal } from "./ThemeSelectorModal";
import { WallpaperPickerModal } from "./WallpaperPickerModal";
import { Avatar } from "./Avatar";

export function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user as any;
  const username = user?.username || "";
  
  const { t } = useTranslation();
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showWallpaperModal, setShowWallpaperModal] = useState(false);

  if (!user) return null;

  const links = [
    { href: "/home", icon: Home, label: "Inicio" },
    { href: "/explore", icon: Search, label: "Búsqueda" },
    { href: "/notifications", icon: Bell, label: "Notificaciones" },
    { href: "/messages", icon: Mail, label: "Mensajes" },
    { action: "settings", icon: Settings, label: "Ajustes" },
  ];

  return (
    <>
      <motion.div 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="bottom-nav"
      >
        {links.map((link, idx) => {
          const isActive = link.href ? pathname === link.href : showSettingsDrawer && link.action === "settings";
          const Icon = link.icon;
          
          if (link.action === "settings") {
            return (
              <button 
                key="settings" 
                onClick={() => setShowSettingsDrawer(true)} 
                className={`bottom-nav-item ${isActive ? "active" : ""}`}
                style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
              >
                <div style={{ position: "relative" }}>
                  <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                  {isActive && (
                    <motion.div 
                      layoutId="bottom-nav-indicator"
                      className="bottom-nav-indicator"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </div>
                <span className="bottom-nav-label">{link.label}</span>
              </button>
            );
          }
          
          return (
            <Link key={link.href} href={link.href!} className={`bottom-nav-item ${isActive ? "active" : ""}`}>
              <div style={{ position: "relative" }}>
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                {isActive && (
                  <motion.div 
                    layoutId="bottom-nav-indicator"
                    className="bottom-nav-indicator"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </div>
              <span className="bottom-nav-label">{link.label}</span>
            </Link>
          );
        })}
      </motion.div>

      <AnimatePresence>
        {showSettingsDrawer && (
            <>
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.5 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowSettingsDrawer(false)}
                    style={{ position: "fixed", inset: 0, background: "black", zIndex: 1999 }}
                />
                <motion.div 
                    initial={{ y: "100%" }}
                    animate={{ y: "0%" }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--bg-main)", borderTopLeftRadius: "20px", borderTopRightRadius: "20px", zIndex: 2000, padding: "20px", maxHeight: "75vh", overflowY: "auto", boxShadow: "0 -4px 16px rgba(0,0,0,0.15)" }}
                >
                    <div style={{ width: 40, height: 4, background: "var(--border)", borderRadius: 2, margin: "0 auto 16px" }} />
                    
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                        <Avatar user={user} size="md" />
                        <div>
                            <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{user?.name}</div>
                            <div style={{ color: "var(--text-secondary)" }}>@{username}</div>
                        </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <button onClick={() => { setShowThemeModal(true); setShowSettingsDrawer(false); }} className="dropdown-item" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px", borderRadius: "12px", width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", color: "var(--text-primary)" }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
                                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                            </svg>
                            <span style={{ fontWeight: 600 }}>{t("changeTheme")}</span>
                        </button>

                        <button onClick={() => { setShowWallpaperModal(true); setShowSettingsDrawer(false); }} className="dropdown-item" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px", borderRadius: "12px", width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", color: "var(--text-primary)" }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                <circle cx="8.5" cy="8.5" r="1.5"/>
                                <polyline points="21 15 16 10 5 21"/>
                            </svg>
                            <span style={{ fontWeight: 600 }}>Fondo de pantalla</span>
                        </button>
                        
                        {user.role === "ADMIN" && (
                            <Link href="/admin-dashboard" onClick={() => setShowSettingsDrawer(false)} className="dropdown-item" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px", borderRadius: "12px", width: "100%", textAlign: "left", color: "var(--text-primary)", textDecoration: "none" }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                </svg>
                                <span style={{ fontWeight: 600 }}>Admin Panel</span>
                            </Link>
                        )}
                    </div>

                    <div style={{ height: 1, background: "var(--border)", margin: "16px 0" }} />
                    
                    <button className="dropdown-item danger" style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px", borderRadius: "12px", background: "none", border: "none", cursor: "pointer", color: "var(--red)" }} onClick={() => signOut({ callbackUrl: "/login" })}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        <span style={{ fontWeight: 600 }}>{t("logOut")}</span>
                    </button>
                </motion.div>
            </>
        )}
      </AnimatePresence>

      {showThemeModal && <ThemeSelectorModal onClose={() => setShowThemeModal(false)} />}
      {showWallpaperModal && <WallpaperPickerModal onClose={() => setShowWallpaperModal(false)} />}
    </>
  );
}
