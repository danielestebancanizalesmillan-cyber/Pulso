"use client";

import { useTranslation } from "@/lib/i18n";
import { usePathname } from "next/navigation";

export function MobileTweetFAB() {
    const { t } = useTranslation();
    const pathname = usePathname();

    const handleOpenCompose = () => {
        const event = new CustomEvent("open-compose");
        window.dispatchEvent(event);
    };

    if (pathname?.startsWith("/messages")) return null;

    return (
        <button
            className="mobile-fab"
            onClick={handleOpenCompose}
            aria-label={t("tweet")}
        >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
        </button>
    );
}
