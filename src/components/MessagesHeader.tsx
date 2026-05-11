"use client";

import { useTranslation } from "@/lib/i18n";
import { NewMessageButton } from "./NewMessageButton";
import { markAllMessagesAsRead } from "@/app/actions/message";

export function MessagesHeader() {
    const { t } = useTranslation();
    return (
        <div className="column-header">
            <h1>{t("messages")}</h1>
            <div style={{ marginLeft: "auto", display: "flex", gap: "12px", alignItems: "center" }}>
                <button 
                    onClick={async () => {
                        await markAllMessagesAsRead();
                    }} 
                    style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--blue)", fontSize: "0.9rem", padding: "4px 8px", borderRadius: "16px" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(29, 155, 240, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                    Leer todos
                </button>
                <NewMessageButton />
            </div>
        </div>
    );
}
