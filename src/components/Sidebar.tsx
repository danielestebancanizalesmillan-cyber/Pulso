"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "./ThemeProvider";
import { Avatar } from "./Avatar";
import { VerifiedBadge } from "./VerifiedBadge";
import { useState, useEffect } from "react";
import { NotificationBadge } from "./NotificationBadge";
import { MessageBadge } from "./MessageBadge";
import { useTranslation } from "@/lib/i18n";
import { ThemeSelectorModal } from "./ThemeSelectorModal";
import { WallpaperPickerModal } from "./WallpaperPickerModal";
import { motion, AnimatePresence } from "framer-motion";

export function Sidebar() {
    const { data: session, status, update } = useSession();
    const pathname = usePathname();
    const router = useRouter();
    const { theme } = useTheme();
    const { t, locale, toggleLocale } = useTranslation();
    const [showDropdown, setShowDropdown] = useState(false);
    const [showThemeModal, setShowThemeModal] = useState(false);
    const [showWallpaperModal, setShowWallpaperModal] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const user = session?.user as any;
    const username = user?.username || "";

    // Multi-account logic
    const [savedAccounts, setSavedAccounts] = useState<any[]>([]);

    useEffect(() => {
        const accounts = JSON.parse(localStorage.getItem("twtr_accounts") || "[]");
        setSavedAccounts(accounts);

        if (user?.id) {
            // First deduplicate and update existing
            let newAccs = accounts.filter((a: any) => a.email !== user.email && a.username !== user.username);
            const currentUserAcc = accounts.find((a: any) => a.email === user.email || a.username === user.username);
            
            const updatedCurrentAcc = { 
                id: user.id, 
                name: user.name, 
                username: user.username, 
                image: user.image, 
                email: user.email,
                switchToken: currentUserAcc?.switchToken 
            };
            
            newAccs.push(updatedCurrentAcc);

            // Async fetch token if not present
            if (!updatedCurrentAcc.switchToken) {
                fetch("/api/me/switch-token")
                    .then(res => res.ok ? res.json() : null)
                    .then(data => {
                        if (data?.token) {
                            updatedCurrentAcc.switchToken = data.token;
                            localStorage.setItem("twtr_accounts", JSON.stringify(newAccs));
                            setSavedAccounts(newAccs);
                        }
                    })
                    .catch(console.error);
            } else {
                localStorage.setItem("twtr_accounts", JSON.stringify(newAccs));
                setSavedAccounts(newAccs);
            }
        }
    }, [user?.id, user?.username, user?.email, user?.name, user?.image]);
    
    const removeAccount = (e: React.MouseEvent, accId: string) => {
        e.stopPropagation();
        const accounts = JSON.parse(localStorage.getItem("twtr_accounts") || "[]");
        const newAccs = accounts.filter((a: any) => a.id !== accId);
        localStorage.setItem("twtr_accounts", JSON.stringify(newAccs));
        setSavedAccounts(newAccs);
    };
    
    const switchAccount = async (acc: any) => {
        if (acc.switchToken) {
            // Attempt seamless switch
            const result = await import("next-auth/react").then(m => m.signIn("switch", {
                id: acc.id,
                token: acc.switchToken,
                redirect: false
            }));
            if (result?.ok && !result.error) {
                window.location.reload();
                return;
            }
        }
        // Fallback to manual login if token is missing or invalid
        const loginHint = acc.username || acc.email || "";
        signOut({ callbackUrl: `/login?login=${encodeURIComponent(loginHint)}` });
    };
    const links = [
        {
            href: "/home",
            label: t("home"),
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
                    <path d="M9 21V12h6v9" />
                </svg>
            ),
            mobile: true
        },
        {
            href: "/explore",
            label: t("explore"),
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                </svg>
            ),
            mobile: true
        },
        {
            href: "/messages",
            label: t("messages"),
            icon: (
                <div style={{ position: "relative" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                    </svg>
                    <MessageBadge />
                </div>
            ),
            mobile: true
        },
        {
            href: "/notifications",
            label: t("notifications"),
            icon: (
                <div style={{ position: "relative" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 01-3.46 0" />
                    </svg>
                    <NotificationBadge initialCount={0} />
                </div>
            ),
            mobile: true
        },
        {
            href: "/spaces",
            label: "Spaces",
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
            ),
            mobile: true
        },
        {
            href: "/communities",
            label: t("communities") || "Communities",
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 00-3-3.87" />
                    <path d="M16 3.13a4 4 0 010 7.75" />
                </svg>
            ),
        },
        {
            href: "/lists",
            label: t("lists") || "Lists",
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12h18M3 6h18M3 18h18" />
                </svg>
            ),
        },
        {
            href: "/bookmarks",
            label: t("bookmarks"),
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                </svg>
            ),
        },
        {
            href: "/ai",
            label: "PulsAI",
            badge: "Beta",
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3C12 3 12 8 7 8C12 8 12 13 12 13C12 13 12 8 17 8C12 8 12 3 12 3Z" />
                    <path d="M5 3L6 4" strokeWidth="1.5"/>
                    <path d="M5 21L6 20" strokeWidth="1.5"/>
                    <path d="M19 3L18 4" strokeWidth="1.5"/>
                    <path d="M19 21L18 20" strokeWidth="1.5"/>
                </svg>
            ),
            mobile: true
        },
        {
            href: "/analytics",
            label: "Analíticas",
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 20V10M12 20V4M6 20v-6" />
                </svg>
            ),
        },
        {
            href: `/${username}`,
            label: t("profile"),
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                </svg>
            ),
        },
        {
            href: "/settings",
            label: t("settings"),
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33 1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82 1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
                </svg>
            ),
        },
        {
            href: "/admin-dashboard",
            label: "Admin Panel",
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
            ),
            adminOnly: true
        }
    ].filter(l => !l.adminOnly || user?.role === "ADMIN");

    return (
        <nav className="sidebar">
            <Link href="/home" className="sidebar-logo" aria-label="Home">
                <img src="/pulso-logo.png" alt="Pulso" style={{ width: 34, height: 34, borderRadius: '50%' }} />
            </Link>

            {links.map((link) => {
                const isActive = pathname === link.href || (link.href !== "/home" && pathname.startsWith(link.href));
                // Skip profile link if username is not available yet to avoid linking to /
                if (link.label === t("profile") && !username) return null;
                
                return (
                    <Link
                        key={link.href}
                        href={link.href}
                        prefetch={link.href === "/ai" ? false : undefined}
                        className={`nav-link ${isActive ? "active" : ""} ${!link.mobile ? "hide-on-mobile" : ""}`}
                    >
                        {link.icon}
                        <span className="nav-label">{link.label}</span>
                        {(link as any).badge && (
                            <span className="nav-label" style={{ 
                                marginLeft: "8px", 
                                fontSize: "0.6rem", 
                                background: "var(--blue)", 
                                color: "white", 
                                padding: "2px 6px", 
                                borderRadius: "8px", 
                                fontWeight: 800,
                                textTransform: "uppercase",
                                letterSpacing: "0.5px"
                            }}>
                                {(link as any).badge}
                            </span>
                        )}
                    </Link>
                );
            })}

            {/* Mobile Menu Action Button (Bottom Nav) */}
            <button
                className="nav-link show-on-mobile-only"
                style={{ background: "none", border: "none", cursor: "pointer", display: "none" }}
                onClick={() => setMobileMenuOpen(true)}
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
                <span className="nav-label">Menú</span>
            </button>

            <button
                className="tweet-btn"
                onClick={() => {
                    if (!user?.id) {
                        router.push("/login");
                        return;
                    }
                    const event = new CustomEvent("open-compose");
                    window.dispatchEvent(event);
                }}
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                    <path d="M12 5v14M5 12h14" />
                </svg>
                <span className="nav-label">{t("tweet")}</span>
            </button>

            <div
                className="sidebar-user"
                onClick={() => user?.id ? setShowDropdown((v) => !v) : router.push("/login")}
                style={{ position: "relative" }}
            >
                <Avatar user={user} size="md" />
                <div className="sidebar-user-info nav-label">
                    <span className="sidebar-user-name" style={{ display: "flex", alignItems: "center", gap: 2 }}>
                        {user?.name || t("login")}
                        {user?.id && <VerifiedBadge type={user?.verificationType || (user?.isVerified ? "BLUE" : "NONE")} size={16} customBadges={user?.badges} />}
                    </span>
                    <span className="sidebar-user-handle">{user?.id ? `@${username}` : t("signInToAccount")}</span>
                </div>

                {showDropdown && user?.id && (
                    <div
                        className="dropdown"
                        style={{ bottom: "60px", left: 0, right: 0, padding: "8px 0", minWidth: 260 }}
                    >
                        {savedAccounts.filter(a => a.id !== user?.id).map(acc => (
                            <div key={acc.id} className="dropdown-item" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingRight: "12px" }}>
                                <button style={{ background: "none", border: "none", display: "flex", alignItems: "center", flex: 1, cursor: "pointer", textAlign: "left", padding: 0 }} onClick={() => switchAccount(acc)}>
                                    <Avatar user={acc} size="sm" />
                                    <div style={{ marginLeft: 12, flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{acc.name}</div>
                                        <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>@{acc.username}</div>
                                    </div>
                                </button>
                                <button 
                                    onClick={(e) => removeAccount(e, acc.id)}
                                    title="Remover cuenta"
                                    style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%" }}
                                    onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
                                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                                >
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                </button>
                            </div>
                        ))}

                        <Link href="/login" className="dropdown-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                                <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                                <circle cx="8.5" cy="7" r="4" />
                                <line x1="20" y1="8" x2="20" y2="14" />
                                <line x1="23" y1="11" x2="17" y2="11" />
                            </svg>
                            {t("addExistingAccount")}
                        </Link>

                        <div style={{ height: 1, background: "var(--border)", margin: "8px 0" }} />

                        <button className="dropdown-item" onClick={(e) => { e.stopPropagation(); setShowThemeModal(true); setShowDropdown(false); }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                            </svg>
                            {t("changeTheme")}
                        </button>

                        <button className="dropdown-item" onClick={(e) => { e.stopPropagation(); setShowWallpaperModal(true); setShowDropdown(false); }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                <circle cx="8.5" cy="8.5" r="1.5"/>
                                <polyline points="21 15 16 10 5 21"/>
                            </svg>
                            Fondo de pantalla
                        </button>

                        <div id="google_translate_element" style={{ padding: "8px 16px" }} onClick={(e) => e.stopPropagation()}></div>





                        <Link href={`/${username}/edit`} className="dropdown-item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            {t("editProfile")}
                        </Link>
                        <button
                            className="dropdown-item danger"
                            onClick={() => signOut({ callbackUrl: "/login" })}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                                <polyline points="16 17 21 12 16 7" />
                                <line x1="21" y1="12" x2="9" y2="12" />
                            </svg>
                            {t("logOut")} @{username}
                        </button>
                    </div>
                )}
            </div>

            {showThemeModal && <ThemeSelectorModal onClose={() => setShowThemeModal(false)} />}
            {showWallpaperModal && <WallpaperPickerModal onClose={() => setShowWallpaperModal(false)} />}

            {/* Mobile Sheet Drawer Overlay */}

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
                            initial={{ y: "100%" }}
                            animate={{ y: "0%" }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--bg-main)", borderTopLeftRadius: "20px", borderTopRightRadius: "20px", zIndex: 2000, padding: "20px", maxHeight: "75vh", overflowY: "auto", boxShadow: "0 -4px 16px rgba(0,0,0,0.15)" }}
                        >
                            <div style={{ width: 40, height: 4, background: "var(--border)", borderRadius: 2, margin: "0 auto 16px" }} />
                            
                            {/* Profile Info inside Drawer header */}
                            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                                <Avatar user={user} size="md" />
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{user?.name}</div>
                                    <div style={{ color: "var(--text-secondary)" }}>@{username}</div>
                                </div>
                            </div>

                            {/* Secondary Hidden Links lists inside drawer */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                {links.filter(l => !l.mobile).map(link => (
                                    <Link key={link.href} href={link.href} className="dropdown-item" onClick={() => setMobileMenuOpen(false)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px", borderRadius: "12px", width: "100%", textAlign: "left" }}>
                                        {link.icon}
                                        <span style={{ fontWeight: 600 }}>{link.label}</span>
                                    </Link>
                                ))}
                            </div>

                            <div style={{ height: 1, background: "var(--border)", margin: "16px 0" }} />
                            
                            {/* Actions from sidebar dropdown at the bottom of drawer */}
                            <button className="dropdown-item danger" style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px", borderRadius: "12px" }} onClick={() => signOut({ callbackUrl: "/login" })}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                    <polyline points="16 17 21 12 16 7" />
                                    <line x1="21" y1="12" x2="9" y2="12" />
                                </svg>
                                <span>{t("logOut")}</span>
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </nav>
    );
}
