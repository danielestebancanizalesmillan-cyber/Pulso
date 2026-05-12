"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { registerUser } from "@/app/actions/user";
import { useTranslation } from "@/lib/i18n";
import { auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";

export default function RegisterPage() {
    const router = useRouter();
    const { t } = useTranslation();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState("");
    const [emailStatus, setEmailStatus] = useState<{ exists: boolean; isDisposable: boolean } | null>(null);
    const [usernameStatus, setUsernameStatus] = useState<{ exists: boolean } | null>(null);
    const [form, setForm] = useState({ name: "", username: "", email: "", password: "" });
    const [isSuccess, setIsSuccess] = useState(false);

    const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((f) => ({ ...f, [k]: e.target.value }));

    // Real-time email check
    useEffect(() => {
        if (!form.email || !form.email.includes("@")) {
            setEmailStatus(null);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/user/check?email=${encodeURIComponent(form.email)}`);
                const data = await res.json();
                setEmailStatus(data);
            } catch (err) {
                console.error("Failed to check email", err);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [form.email]);

    // Real-time username check
    useEffect(() => {
        if (!form.username) {
            setUsernameStatus(null);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/user/check?username=${encodeURIComponent(form.username)}`);
                const data = await res.json();
                setUsernameStatus(data);
            } catch (err) {
                console.error("Failed to check username", err);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [form.username]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (emailStatus?.exists) {
            setError(t("emailAlreadyRegistered"));
            return;
        }
        if (usernameStatus?.exists) {
            setError(t("usernameAlreadyTaken"));
            return;
        }
        if (emailStatus?.isDisposable) {
            setError(t("usePermanentEmail"));
            return;
        }

        startTransition(async () => {
            try {
                // 1. Create User in Firebase
                const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password);
                const user = userCredential.user;

                // 2. Sync with Prisma & Send Verification (Handled in registerUser action)
                await registerUser({
                    name: form.name,
                    username: form.username,
                    email: form.email,
                    firebaseUid: user.uid,
                });
                
                setIsSuccess(true);
            } catch (e: any) {
                setError(e.message);
            }
        });
    };

    if (isSuccess) {
        return (
            <div className="auth-page">
                <div className="auth-card" style={{ textAlign: "center" }}>
                    <div className="auth-logo">
                        <img src="/pulso-logo.png" alt="Pulso" style={{ width: 50, height: 50, borderRadius: '25%' }} />
                    </div>
                    <h1 className="auth-title">{t("verifyEmail")}</h1>
                    <p className="auth-subtitle">{t("verificationSent").replace("{email}", form.email)}</p>
                    <Link href="/login" className="btn btn-primary" style={{ width: "100%", textDecoration: "none" }}>
                        {t("backToLogin")}
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-logo">
                    <img src="/pulso-logo.png" alt="Pulso" style={{ width: 50, height: 50, borderRadius: '25%' }} />
                </div>
                <h1 className="auth-title">{t("createAccount")}</h1>
                <p className="auth-subtitle">{t("joinConversation")}</p>

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
                        {t("signUpWithGoogle")}
                    </button>

                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                        <div style={{ flex: 1, height: "1px", background: "var(--border)" }}></div>
                        <span>{t("or")}</span>
                        <div style={{ flex: 1, height: "1px", background: "var(--border)" }}></div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">{t("name")}</label>
                        <input className="form-input" type="text" placeholder={t("name")} value={form.name} onChange={set("name")} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">{t("username")}</label>
                        <input className={`form-input ${usernameStatus?.exists ? "error" : ""}`} type="text" placeholder={t("username")} value={form.username} onChange={set("username")} required pattern="[a-zA-Z0-9_]+" title={t("lettersNumbersUnderscores")} />
                        {usernameStatus?.exists && <p className="form-error" style={{ fontSize: "0.8rem", marginTop: 4 }}>⚠ {t("usernameAlreadyTaken")}</p>}
                    </div>
                    <div className="form-group">
                        <label className="form-label">{t("email")}</label>
                        <input
                            className={`form-input ${(emailStatus?.exists || emailStatus?.isDisposable) ? "error" : ""}`}
                            type="email"
                            placeholder={t("email")}
                            value={form.email}
                            onChange={set("email")}
                            required
                        />
                        {emailStatus?.exists && <p className="form-error" style={{ fontSize: "0.8rem", marginTop: 4 }}>⚠ {t("emailAlreadyRegistered")}</p>}
                        {emailStatus?.isDisposable && <p className="form-error" style={{ fontSize: "0.8rem", marginTop: 4 }}>⚠ {t("usePermanentEmail")}</p>}
                    </div>
                    <div className="form-group">
                        <label className="form-label">{t("password")}</label>
                        <input className="form-input" type="password" placeholder={t("password")} value={form.password} onChange={set("password")} required minLength={8} />
                    </div>

                    {error && <p className="form-error">⚠ {error}</p>}

                    <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: 8 }} disabled={isPending || emailStatus?.exists || emailStatus?.isDisposable}>
                        {isPending ? t("creatingAccount") : t("createAccount")}
                    </button>
                </form>

                <p className="auth-link">
                    {t("alreadyHaveAccount")} <Link href="/login">{t("logIn")}</Link>
                </p>
            </div>
        </div>
    );
}
