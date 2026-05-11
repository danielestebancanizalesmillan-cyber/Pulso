"use client";

import { useState } from "react";
import { NewMessageModal } from "./NewMessageModal";
import { useTranslation } from "@/lib/i18n";

export function NewMessageButton() {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button className="icon-btn" title={t("newMessage")} onClick={() => setIsOpen(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
            </button>
            {isOpen && <NewMessageModal onClose={() => setIsOpen(false)} />}
        </>
    );
}
