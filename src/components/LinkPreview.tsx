"use client";

import { useEffect, useState } from "react";

interface LinkPreviewData {
    title: string;
    description: string;
    image: string;
    domain: string;
    url: string;
    error?: string;
}

export function LinkPreview({ url }: { url: string }) {
    const [preview, setPreview] = useState<LinkPreviewData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        setLoading(true);

        fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
            .then(res => res.json())
            .then(data => {
                if (active) {
                    if (data && !data.error && data.title) {
                        setPreview(data);
                    }
                    setLoading(false);
                }
            })
            .catch(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [url]);

    if (loading) {
        return (
            <div style={{
                height: "90px",
                border: "1px solid var(--border-light, rgba(255,255,255,0.08))",
                borderRadius: "16px",
                marginTop: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--bg-hover, rgba(255,255,255,0.02))"
            }}>
                <div className="spinner" style={{ width: "20px", height: "20px" }}></div>
            </div>
        );
    }

    if (!preview) return null;

    return (
        <a 
            href={preview.url} 
            target="_blank" 
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
                display: "flex",
                flexDirection: "row",
                border: "1px solid var(--border-light, rgba(255,255,255,0.08))",
                borderRadius: "16px",
                marginTop: "12px",
                overflow: "hidden",
                textDecoration: "none",
                color: "inherit",
                background: "var(--bg-card, rgba(25, 25, 28, 0.4))",
                backdropFilter: "blur(12px)",
                transition: "background 0.2s, border-color 0.2s",
                maxHeight: "130px"
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-hover, rgba(255, 255, 255, 0.04))";
                e.currentTarget.style.borderColor = "var(--border, rgba(255, 255, 255, 0.15))";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--bg-card, rgba(25, 25, 28, 0.4))";
                e.currentTarget.style.borderColor = "var(--border-light, rgba(255, 255, 255, 0.08))";
            }}
        >
            {preview.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                    src={preview.image} 
                    alt={preview.title}
                    style={{
                        width: "130px",
                        height: "130px",
                        objectFit: "cover",
                        borderRight: "1px solid var(--border-light, rgba(255,255,255,0.08))",
                        flexShrink: 0
                    }}
                />
            )}
            <div style={{
                padding: "12px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: "4px",
                overflow: "hidden"
            }}>
                <div style={{ 
                    fontSize: "0.85rem", 
                    color: "var(--text-secondary, #888)",
                    textTransform: "lowercase"
                }}>
                    {preview.domain}
                </div>
                <div style={{ 
                    fontWeight: 700, 
                    fontSize: "0.95rem", 
                    color: "var(--text-main, #fff)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                }}>
                    {preview.title}
                </div>
                {preview.description && (
                    <div style={{ 
                        fontSize: "0.85rem", 
                        color: "var(--text-secondary, #888)",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        lineHeight: "1.3"
                    }}>
                        {preview.description}
                    </div>
                )}
            </div>
        </a>
    );
}
