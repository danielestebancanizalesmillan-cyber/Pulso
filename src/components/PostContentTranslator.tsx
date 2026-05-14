"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { translateText, detectLanguage } from "@/app/actions/translate";
import { useTranslation } from "@/lib/i18n";

export function PostContentTranslator({ content, className, alwaysShowButton = false }: { content: string, className?: string, alwaysShowButton?: boolean }) {
    const { t, locale } = useTranslation();
    const [translatedText, setTranslatedText] = useState<string | null>(null);
    const [isTranslating, setIsTranslating] = useState(false);
    const [contentLanguage, setContentLanguage] = useState<string | null>(null);
    const [showTranslationToggle, setShowTranslationToggle] = useState(true);

    useEffect(() => {
        const checkFeatures = () => {
            setShowTranslationToggle(localStorage.getItem("twtr_show_translation") !== "false");
        };
        checkFeatures();
        window.addEventListener("twtr_settings_changed", checkFeatures);
        return () => window.removeEventListener("twtr_settings_changed", checkFeatures);
    }, []);

    useEffect(() => {
        const checkLanguage = async () => {
            try {
                const lang = await detectLanguage(content);
                setContentLanguage(lang);
            } catch (error) {
                console.error("Language detection failed:", error);
                setContentLanguage("unknown");
            }
        };
        checkLanguage();
    }, [content]);

    const handleTranslate = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (translatedText) {
            setTranslatedText(null);
            return;
        }

        setIsTranslating(true);
        try {
            const result = await translateText(content, locale);
            setTranslatedText(result);
        } catch (error) {
            console.error("Translation failed:", error);
        } finally {
            setIsTranslating(false);
        }
    };

    const displayContent = translatedText || content;
    const isSameLanguage = contentLanguage === locale;

    // Don't show translate button if it's the same language or we haven't detected yet
    const shouldShowButton = showTranslationToggle && (alwaysShowButton || (!isSameLanguage && contentLanguage !== null));

    return (
        <div style={{ marginTop: 4, marginBottom: 12 }}>
            <p className={className || "tweet-focused-text"} style={{ margin: 0 }}>
                {(displayContent || "").split(/(#[a-zA-Z0-9_]+|@[a-zA-Z0-9_]+|https?:\/\/[^\s]+)/g).map((part: string, i: number) => {
                    if (!part) return null;
                    if (part.startsWith("#")) {
                        return (
                            <Link key={i} href={`/explore?q=${encodeURIComponent(part)}`} style={{ color: "var(--blue)", textDecoration: "none" }} onClick={(e) => e.stopPropagation()}>
                                {part}
                            </Link>
                        );
                    }
                    if (part.startsWith("@")) {
                        return (
                            <Link key={i} href={`/${part.substring(1)}`} style={{ color: "var(--blue)", textDecoration: "none" }} onClick={(e) => e.stopPropagation()}>
                                {part}
                            </Link>
                        );
                    }
                    if (part.startsWith("http://") || part.startsWith("https://")) {
                        return (
                            <a key={i} href={part} target="_blank" style={{ color: "var(--blue)", textDecoration: "none" }} onClick={(e) => e.stopPropagation()}>
                                {part}
                            </a>
                        );
                    }
                    return <span key={i}>{part}</span>;
                })}
            </p>
            {shouldShowButton && (
                <button 
                    onClick={handleTranslate} 
                    disabled={isTranslating}
                    style={{
                        background: "none",
                        border: "none",
                        color: "var(--blue)",
                        fontSize: "0.85rem",
                        padding: 0,
                        marginTop: 8,
                        cursor: "pointer",
                        display: "flex",
                        gap: "4px",
                        alignItems: "center"
                    }}
                    className="translate-btn"
                >
                    <img src="https://upload.wikimedia.org/wikipedia/commons/d/d7/Google_Translate_logo.svg" alt="GTranslate" style={{ width: 16, height: 16, objectFit: "contain" }} />
                    {isTranslating ? t("translating") : (translatedText ? t("seeOriginal") : t("translatePost"))}
                </button>

            )}
        </div>
    );
}
