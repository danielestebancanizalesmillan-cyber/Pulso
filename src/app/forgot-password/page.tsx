"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/app/actions/user";
import { useTranslation } from "@/lib/i18n";

export default function ForgotPasswordPage() {
    const { t } = useTranslation();
    const [email, setEmail] = useState("");
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess(false);

        if (!email.trim()) return;

        startTransition(async () => {
            try {
                await requestPasswordReset(email);
                setSuccess(true);
            } catch (err: any) {
                setError(err.message || "Error al enviar el correo");
            }
        });
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-logo">
                    <img src="/pulso-logo.png" alt="Pulso" style={{ width: 50, height: 50, borderRadius: '25%' }} />
                </div>
                <h1 className="auth-title">¿Olvidaste tu contraseña?</h1>
                <p className="auth-subtitle">Ingresa tu correo electrónico para recibir un enlace de recuperación.</p>

                {success ? (
                    <div style={{ textAlign: "center", padding: "20px 0" }}>
                        <p style={{ color: "var(--green)", fontWeight: 600, marginBottom: "16px" }}>
                            ✅ Se ha enviado un correo con instrucciones para restablecer tu contraseña.
                        </p>
                        <Link href="/login" className="btn btn-primary" style={{ display: "inline-block", textDecoration: "none" }}>
                            Volver al inicio de sesión
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Correo electrónico</label>
                            <input
                                className="form-input"
                                type="email"
                                placeholder="tu@correo.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>

                        {error && <p className="form-error">⚠ {error}</p>}

                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ width: "100%", marginTop: 12 }}
                            disabled={isPending}
                        >
                            {isPending ? "Enviando..." : "Enviar enlace"}
                        </button>

                        <p className="auth-link" style={{ marginTop: "16px" }}>
                            <Link href="/login">Volver al inicio de sesión</Link>
                        </p>
                    </form>
                )}
            </div>
        </div>
    );
}
