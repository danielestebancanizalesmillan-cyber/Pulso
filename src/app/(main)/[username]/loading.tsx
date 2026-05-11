"use client";

import { useTranslation } from "@/lib/i18n";

export default function ProfileLoading() {
    const { t } = useTranslation();

    return (
        <>
            <div className="column-header">
                <div className="back-btn" style={{ cursor: "default", opacity: 0.5 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </div>
                <div style={{ height: 24, width: 120, background: "var(--bg-hover)", borderRadius: 4 }} />
            </div>

            <div className="profile-cover" style={{ background: "var(--bg-hover)" }} />

            <div className="profile-info-section">
                <div className="profile-avatar-row">
                    <div className="avatar-ring" style={{ 
                        width: 134, 
                        height: 134, 
                        borderRadius: "50%", 
                        background: "var(--bg-hover)", 
                        border: "4px solid var(--bg)",
                        marginTop: -67
                    }} />
                </div>

                <div style={{ marginTop: 16 }}>
                    <div style={{ height: 28, width: 200, background: "var(--bg-hover)", borderRadius: 4, marginBottom: 8 }} />
                    <div style={{ height: 16, width: 120, background: "var(--bg-hover)", borderRadius: 4, marginBottom: 16 }} />
                    
                    <div style={{ height: 16, width: "90%", background: "var(--bg-hover)", borderRadius: 4, marginBottom: 8 }} />
                    <div style={{ height: 16, width: "70%", background: "var(--bg-hover)", borderRadius: 4, marginBottom: 24 }} />

                    <div style={{ display: "flex", gap: 16 }}>
                        <div style={{ height: 16, width: 80, background: "var(--bg-hover)", borderRadius: 4 }} />
                        <div style={{ height: 16, width: 80, background: "var(--bg-hover)", borderRadius: 4 }} />
                    </div>
                </div>
            </div>

            <div className="profile-tabs" style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "0 16px" }}>
                <div style={{ flex: 1, height: 53, borderBottom: "4px solid var(--blue)", opacity: 0.3 }} />
                <div style={{ flex: 1, height: 53 }} />
                <div style={{ flex: 1, height: 53 }} />
                <div style={{ flex: 1, height: 53 }} />
            </div>

            <div style={{ padding: 16 }}>
                {[1, 2, 3].map(i => (
                    <div key={i} style={{ display: "flex", gap: 12, marginBottom: 24 }}>
                        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--bg-hover)", flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                                <div style={{ height: 14, width: 100, background: "var(--bg-hover)", borderRadius: 4 }} />
                                <div style={{ height: 14, width: 60, background: "var(--bg-hover)", borderRadius: 4 }} />
                            </div>
                            <div style={{ height: 14, width: "100%", background: "var(--bg-hover)", borderRadius: 4, marginBottom: 8 }} />
                            <div style={{ height: 14, width: "80%", background: "var(--bg-hover)", borderRadius: 4 }} />
                        </div>
                    </div>
                ))}
            </div>

            <style jsx>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: .5; }
                }
                div {
                    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
            `}</style>
        </>
    );
}
