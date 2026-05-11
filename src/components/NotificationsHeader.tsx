"use client";

import { useTranslation } from "@/lib/i18n";

export function NotificationsHeader() {
    const { t } = useTranslation();
    return (
        <div className="column-header">
            <h1>{t("notifications")}</h1>
        </div>
    );
}
