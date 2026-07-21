"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { translateText, detectLanguage } from "@/app/actions/translate";
import { useTranslation } from "@/lib/i18n";

const languageNames: Record<string, Record<string, string>> = {
    en: {
        en: "English",
        es: "Spanish",
        fr: "French",
        de: "German",
        it: "Italian",
        pt: "Portuguese",
        ja: "Japanese",
        zh: "Chinese",
        ru: "Russian",
        unknown: "Unknown language"
    },
    es: {
        en: "inglés",
        es: "español",
        fr: "francés",
        de: "alemán",
        it: "italiano",
        pt: "portugués",
        ja: "japonés",
        zh: "chino",
        ru: "ruso",
        unknown: "idioma desconocido"
    }
};

export function PostContentTranslator({ content, className, alwaysShowButton = false, type = "post" }: { content: string, className?: string, alwaysShowButton?: boolean, type?: "post" | "bio" }) {
    const { t, locale } = useTranslation();
    const [translatedText, setTranslatedText] = useState<string | null>(null);
    const [isTranslating, setIsTranslating] = useState(false);
    const [contentLanguage, setContentLanguage] = useState<string | null>(null);
    const [showTranslationToggle, setShowTranslationToggle] = useState(true);
    const [autoTranslateToggle, setAutoTranslateToggle] = useState(true);

    useEffect(() => {
        const checkFeatures = () => {
            setShowTranslationToggle(localStorage.getItem("twtr_show_translation") !== "false");
            setAutoTranslateToggle(localStorage.getItem("twtr_auto_translate") !== "false");
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

    useEffect(() => {
        if (
            showTranslationToggle &&
            autoTranslateToggle &&
            contentLanguage &&
            contentLanguage !== "unknown" &&
            contentLanguage !== locale &&
            !translatedText &&
            !isTranslating
        ) {
            setIsTranslating(true);
            translateText(content, locale)
                .then(result => {
                    setTranslatedText(result);
                })
                .catch(err => {
                    console.error("Auto-translation failed:", err);
                })
                .finally(() => {
                    setIsTranslating(false);
                });
        }
    }, [contentLanguage, locale, content, showTranslationToggle, autoTranslateToggle]);

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

    // Don't show translate button if it's the same language or we've translated already
    const shouldShowButton = showTranslationToggle && !translatedText && (alwaysShowButton || (!isSameLanguage && contentLanguage !== null));

    const getLangLabel = () => {
        if (!contentLanguage) return "";
        const mapping = languageNames[locale] || languageNames["en"];
        return mapping[contentLanguage] || contentLanguage;
    };

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
                    {isTranslating ? t("translating") : (type === "bio" ? (t("translateBio") || "Traducir descripción") : (t("translatePost") || "Traducir post"))}
                </button>
            )}

            {translatedText && showTranslationToggle && (
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginTop: 8,
                    fontSize: "0.82rem",
                    color: "var(--text-secondary)"
                }}>
                    <span>✨</span>
                    <span>
                        {t("translatedFrom").replace("{lang}", getLangLabel())}
                    </span>
                    <span>·</span>
                    <button
                        onClick={() => setTranslatedText(null)}
                        style={{
                            background: "none",
                            border: "none",
                            color: "var(--blue)",
                            fontSize: "0.82rem",
                            cursor: "pointer",
                            padding: 0,
                            fontWeight: 600
                        }}
                    >
                        {t("seeOriginal")}
                    </button>
                </div>
            )}
        </div>
    );
}
