"use client";

import { useSession } from "next-auth/react";
import { useState, useTransition } from "react";
import { resendVerification } from "@/app/actions/user";
import { useTranslation } from "@/lib/i18n";

export function VerificationBanner() {
    const { data: session, update } = useSession();
    const { t } = useTranslation();
    const [isPending, startTransition] = useTransition();
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

    if (!session?.user || (session.user as any).emailVerified) return null;

    const handleResend = () => {
        setStatus("idle");
        startTransition(async () => {
            try {
                await resendVerification();
                setStatus("success");
                setTimeout(() => setStatus("idle"), 5000);
            } catch (err) {
                setStatus("error");
            }
        });
    };

    return (
        <div style={{
            background: "var(--blue)",
            color: "white",
            padding: "8px 16px",
            textAlign: "center",
            fontSize: "0.9rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px"
        }}>
            <span>{t("verifyEmailBanner")}</span>
            <button
                onClick={handleResend}
                className="btn"
                disabled={isPending}
                style={{
                    background: "rgba(255,255,255,0.2)",
                    color: "white",
                    padding: "4px 12px",
                    fontSize: "0.8rem",
                    border: "1px solid rgba(255,255,255,0.3)"
                }}
            >
                {isPending ? t("sending") : status === "success" ? t("sent") : t("resendEmail")}
            </button>
            {status === "error" && <span style={{ color: "#ffb6b6", fontSize: "0.8rem" }}>{t("failedToSend")}</span>}
        </div>
    );
}
