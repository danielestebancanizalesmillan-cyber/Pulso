"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setupUsername } from "@/app/actions/user";
import { useSession } from "next-auth/react";
import { useTranslation } from "@/lib/i18n";

export default function SetupUsernamePage() {
    const { update } = useSession();
    const { t } = useTranslation();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [username, setUsername] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (username.length < 4) {
            setError(t("usernameTooShort") || "El nombre de usuario debe tener al menos 4 caracteres");
            return;
        }

        startTransition(async () => {
            try {
                await setupUsername(username);
                await update(); // Refresh session
                window.location.href = "/home";
            } catch (err: any) {
                setError(err.message || "Algo salió mal");
            }
        });
    };

    return (
        <div className="auth-page">
            <div className="auth-card" style={{ maxWidth: 400, margin: "100px auto", textAlign: "center" }}>
                <div className="auth-logo">
                    <img src="/pulso-logo.png" alt="Pulso" style={{ width: 60, height: 60, borderRadius: '25%' }} />
                </div>
                <h1 className="auth-title">Bienvenido a Pulso</h1>
                <p className="auth-subtitle">Elige un nombre de usuario único para empezar.</p>

                <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
                    <div className="form-group">
                        <div style={{ position: "relative" }}>
                            <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }}>@</span>
                            <input 
                                className="form-input" 
                                type="text" 
                                placeholder="usuario" 
                                value={username} 
                                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                                style={{ paddingLeft: 32 }}
                                required 
                                minLength={4}
                                maxLength={15}
                            />
                        </div>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 8, textAlign: "left" }}>
                            Solo letras, números y guiones bajos. Entre 4 y 15 caracteres.
                        </p>
                    </div>

                    {error && <p className="form-error" style={{ marginBottom: 16 }}>⚠ {error}</p>}

                    <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={isPending}>
                        {isPending ? "Configurando..." : "Continuar a Pulso"}
                    </button>
                </form>
            </div>
        </div>
    );
}
