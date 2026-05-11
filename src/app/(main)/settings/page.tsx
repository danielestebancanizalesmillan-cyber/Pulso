"use client";

import { SettingsClient } from "@/components/SettingsClient";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";

export default function SettingsPage() {
    const { t } = useTranslation();

    return (
        <>
            <div className="column-header">
                <Link href="/home" className="back-btn" aria-label="Back">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </Link>
                <h1>{t("settings")}</h1>
            </div>
            
            <SettingsClient />
        </>
    );
}
