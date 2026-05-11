"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { verifyEmail } from "@/app/actions/user";

export default function VerifyEmailPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const [isPending, startTransition] = useTransition();
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (!token) {
            setStatus("error");
            setMessage("Missing verification token.");
            return;
        }

        startTransition(async () => {
            try {
                const result = await verifyEmail(token);
                if (result.success) {
                    setStatus("success");
                    setMessage("Your email has been verified successfully!");
                }
            } catch (err: any) {
                setStatus("error");
                setMessage(err.message || "Something went wrong during verification.");
            }
        });
    }, [token]);

    return (
        <div className="auth-page">
            <div className="auth-card" style={{ textAlign: "center" }}>
                <div className="auth-logo">
                    <img src="/pulso-logo.png" alt="Pulso" style={{ width: 50, height: 50, borderRadius: '25%' }} />
                </div>

                {status === "loading" && (
                    <div style={{ padding: "20px" }}>
                        <div className="spinner" style={{ margin: "0 auto 16px" }}></div>
                        <p>Verifying your email...</p>
                    </div>
                )}

                {status === "success" && (
                    <div className="animate-fade">
                        <div style={{ color: "var(--green)", fontSize: "3rem", marginBottom: "16px" }}>✓</div>
                        <h1 className="auth-title">Email Verified!</h1>
                        <p className="auth-subtitle">{message}</p>
                        <Link href="/login" className="btn btn-primary" style={{ width: "100%", textDecoration: "none" }}>
                            Continue to Login
                        </Link>
                    </div>
                )}

                {status === "error" && (
                    <div className="animate-fade">
                        <div style={{ color: "var(--red)", fontSize: "3rem", marginBottom: "16px" }}>⚠</div>
                        <h1 className="auth-title">Verification Failed</h1>
                        <p className="auth-subtitle">{message}</p>
                        <Link href="/register" className="btn btn-outline" style={{ width: "100%", textDecoration: "none", marginBottom: "12px" }}>
                            Try Registering Again
                        </Link>
                        <Link href="/login" className="auth-link" style={{ display: "block" }}>
                            Go to Login
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
