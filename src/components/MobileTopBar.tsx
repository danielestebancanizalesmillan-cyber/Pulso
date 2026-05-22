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

    return (
        <div className="mobile-top-bar">
            <div className="mobile-top-bar-content">
                <Link href={`/${username}`} className="mobile-avatar-btn">
                    <Avatar user={user} size="sm" />
                </Link>
                <Link href="/home" className="mobile-logo-btn">
                    <img src="/pulso-logo.png" alt="Pulso" style={{ width: 28, height: 28, borderRadius: '50%' }} />
                </Link>
                <div style={{ width: 32 }} /> {/* Spacer to center logo */}
            </div>
        </div>
    );
}
