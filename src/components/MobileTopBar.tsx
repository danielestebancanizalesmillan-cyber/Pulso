"use client";

import { useSession } from "next-auth/react";
import { Avatar } from "./Avatar";
import Link from "next/link";
import "./MobileTopBar.css";

export function MobileTopBar() {
    const { data: session } = useSession();
    const user = session?.user as any;
    const username = user?.username || "";

    if (!user) return null;

    const handleOpenDrawer = () => {
        window.dispatchEvent(new CustomEvent("open-mobile-drawer"));
    };

    return (
        <div className="mobile-top-bar">
            <div className="mobile-top-bar-content">
                <Link href={`/${username}`} className="mobile-avatar-btn">
                    <Avatar user={user} size="sm" />
                </Link>
                <Link href="/home" className="mobile-logo-btn">
                    <img src="/pulso-logo.png" alt="Pulso" style={{ width: 28, height: 28, borderRadius: '50%' }} />
                </Link>
                <button 
                    onClick={handleOpenDrawer}
                    className="mobile-menu-btn"
                    aria-label="Abrir menú de navegación"
                    style={{
                        background: "none",
                        border: "none",
                        padding: "6px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--text-primary)"
                    }}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}>
                        <line x1="4" y1="6" x2="20" y2="6" />
                        <line x1="4" y1="12" x2="20" y2="12" />
                        <line x1="4" y1="18" x2="20" y2="18" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
