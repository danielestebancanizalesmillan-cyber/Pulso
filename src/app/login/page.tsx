"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useTranslation } from "@/lib/i18n";

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useTranslation();
    const loginHint = searchParams.get("login") || "";
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState("");
    const [form, setForm] = useState({ login: loginHint, password: "" });
    const [show2FA, setShow2FA] = useState(false);
    const [code, setCode] = useState("");

    const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((f) => ({ ...f, [k]: e.target.value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        startTransition(async () => {
            const result = await signIn("credentials", {
                login: form.login,
                password: form.password,
                code: show2FA ? code : undefined,
                redirect: false,
            });
            if (result?.error) {
                if (result.error === "2fa_required" || result.error.includes("2fa_required")) {
                    setShow2FA(true);
                    return;
                }
                if (result.error === "invalid_2fa_code" || result.error.includes("invalid_2fa_code")) {
                    setError("Código 2FA inválido");
                    return;
                }
                setError(t("invalidLogin"));
                return;
            }
            router.push("/home");
        });
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-logo">
                    <img src="/pulso-logo.png" alt="Pulso" style={{ width: 50, height: 50, borderRadius: '25%' }} />
                </div>
                <h1 className="auth-title">{t("welcomeBack")}</h1>
                <p className="auth-subtitle">{loginHint ? t("signInAs").replace("{username}", loginHint) : t("signInToAccount")}</p>

                <form onSubmit={handleSubmit}>
                    <button
                        type="button"
                        onClick={() => signIn("google", { callbackUrl: "/home" })}
                        className="btn btn-outline"
                        style={{ width: "100%", marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "white", color: "black", borderColor: "#ddd" }}
                    >
                        <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        {t("signInWithGoogle")}
                    </button>

                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                        <div style={{ flex: 1, height: "1px", background: "var(--border)" }}></div>
                        <span>{t("or")}</span>
                        <div style={{ flex: 1, height: "1px", background: "var(--border)" }}></div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">{t("usernameOrEmail")}</label>
                        <input
                            id="login-field"
                            className="form-input"
                            type="text"
                            placeholder={t("usernameOrEmail")}
                            value={form.login}
                            onChange={set("login")}
                            required
                            autoFocus
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">{t("password")}</label>
                        <input
                            id="password-field"
                            className="form-input"
                            type="password"
                            placeholder={t("password")}
                            value={form.password}
                            onChange={set("password")}
                            required
                        />
                        <div style={{ textAlign: "right", marginTop: "4px" }}>
                            <Link href="/forgot-password" style={{ fontSize: "0.85rem", color: "var(--blue)", textDecoration: "none" }}>
                                ¿Olvidaste tu contraseña?
                            </Link>
                        </div>
                    </div>

                    {show2FA && (
                        <div className="form-group" style={{ marginTop: "12px" }}>
                            <label className="form-label" style={{ fontWeight: 600 }}>Código de Verificación (2FA)</label>
                            <input
                                id="code-field"
                                className="form-input"
                                type="text"
                                placeholder="000000"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                required
                                maxLength={6}
                                autoFocus
                                style={{ letterSpacing: "4px", textAlign: "center", fontSize: "1.2rem" }}
                            />
                        </div>
                    )}

                    {error && <p className="form-error">⚠ {error}</p>}

                    <button
                        type="submit"
                        id="login-btn"
                        className="btn btn-primary"
                        style={{ width: "100%", marginTop: 8 }}
                        disabled={isPending}
                    >
                        {isPending ? t("loggingIn") : t("logIn")}
                    </button>
                </form>

                <p className="auth-link">
                    {t("dontHaveAccount")} <Link href="/register">{t("signUp")}</Link>
                </p>
            </div>
        </div>
    );
}
