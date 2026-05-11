"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n";

export function HomeTabs({ tab, geo = "local" }: { tab: string, geo?: string }) {
    const { t } = useTranslation();

    return (
        <div className="home-tabs" style={{ display: "flex", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, background: "var(--bg-primary)", backdropFilter: "blur(12px)", zIndex: 50 }}>
            <Link href={`/home?tab=for-you&geo=${geo}`} className={`profile-tab ${tab === "for-you" ? "active" : ""}`} style={{ flex: 1, textAlign: "center", textDecoration: "none" }}>
                <span>{t("forYou")}</span>
            </Link>
            <Link href={`/home?tab=following&geo=${geo}`} className={`profile-tab ${tab === "following" ? "active" : ""}`} style={{ flex: 1, textAlign: "center", textDecoration: "none" }}>
                <span>{t("timeline")}</span>
            </Link>
        </div>
    );
}
