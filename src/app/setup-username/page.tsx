"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setupUsername } from "@/app/actions/user";

export default function SetupUsernamePage() {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState("");
    const [username, setUsername] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        startTransition(async () => {
            try {
                await setupUsername(username);
                // After setting the username, we need to refresh the session or just redirect.
                // NextAuth session refresh is tricky but a full reload works.
                window.location.href = "/home";
            } catch (err: any) {
                setError(err.message || "Failed to set username");
            }
        });
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-logo">
                    <img src="/pulso-logo.png" alt="Pulso" style={{ width: 50, height: 50, borderRadius: '25%' }} />
                </div>
                <h1 className="auth-title">Choose your username</h1>
                <p className="auth-subtitle">Welcome! Before you start, please pick a unique handle.</p>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Username</label>
                        <div style={{ position: "relative" }}>
                            <span style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }}>@</span>
                            <input
                                className="form-input"
                                style={{ paddingLeft: "36px" }}
                                type="text"
                                placeholder="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                                required
                                minLength={3}
                                maxLength={15}
                            />
                        </div>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                            Letters, numbers, and underscores only.
                        </p>
                    </div>

                    {error && <p className="form-error">⚠ {error}</p>}

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: "100%", marginTop: 16 }}
                        disabled={isPending || username.length < 3}
                    >
                        {isPending ? "Setting up..." : "Finish setup"}
                    </button>
                </form>
            </div>
        </div>
    );
}
