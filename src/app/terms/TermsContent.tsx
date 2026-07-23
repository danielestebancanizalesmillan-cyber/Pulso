"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n";

export default function TermsContent() {
    const { t } = useTranslation();
    return (
        <div style={{
            minHeight: "100vh",
            background: "var(--bg-primary)",
            color: "var(--text-primary)",
            padding: "40px 24px",
        }}>
            <div style={{ maxWidth: "720px", margin: "0 auto" }}>
                <Link href="/" style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    color: "var(--blue)",
                    textDecoration: "none",
                    marginBottom: "32px",
                    fontWeight: 600,
                }}>
                    ← {t("backToHome")}
                </Link>

                <h1 style={{ fontSize: "2.2rem", fontWeight: 900, marginBottom: "32px" }}>
                    {t("termsTitle")}
                </h1>

                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "32px" }}>
                    {t("termsSubtitle")}
                </p>

                <section style={{ marginBottom: "32px" }}>
                    <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "12px" }}>{t("termsSec1Title")}</h2>
                    <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "12px" }}>
                        {t("termsSec1Text")}
                    </p>
                    <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontStyle: "italic", opacity: 0.8 }}>
                        {t("termsSec1Muted")}
                    </p>
                </section>

                <section style={{ marginBottom: "32px" }}>
                    <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "12px" }}>{t("termsSec2Title")}</h2>
                    <p style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                        {t("termsSec2Text")}
                    </p>
                </section>

                <section style={{ marginBottom: "32px" }}>
                    <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "12px" }}>{t("termsSec3Title")}</h2>
                    <p style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                        {t("termsSec3Text")}
                    </p>
                </section>

                <section style={{ marginBottom: "32px" }}>
                    <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "12px" }}>{t("termsSec4Title")}</h2>
                    <p style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                        {t("termsSec4Text")}
                    </p>
                </section>

                <footer style={{
                    marginTop: "64px",
                    paddingTop: "24px",
                    borderTop: "1px solid var(--border)",
                    textAlign: "center",
                    color: "var(--text-secondary)",
                    fontSize: "0.85rem",
                }}>
                    © {new Date().getFullYear()} Pulso.
                </footer>
            </div>
        </div>
    );
}
