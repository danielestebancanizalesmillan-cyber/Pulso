"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Locale = "en" | "es";

interface I18nContextProps {
    locale: Locale;
    t: (key: string) => string;
    toggleLocale: () => void;
}

const I18nContext = createContext<I18nContextProps>({
    locale: "en",
    t: (key: string) => key,
    toggleLocale: () => { },
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
    const [locale, setLocale] = useState<Locale>("en");
    const [translations, setTranslations] = useState<Record<string, string>>({});

    useEffect(() => {
        const stored = localStorage.getItem("locale") as Locale | null;
        if (stored === "en" || stored === "es") {
            setLocale(stored);
        }
    }, []);

    useEffect(() => {
        const loadTranslations = async () => {
            const res = await import(`../locales/${locale}.json`);
            setTranslations(res.default || res);
        };




        loadTranslations();
    }, [locale]);

    const toggleLocale = () => {
        const next = locale === "en" ? "es" : "en";
        setLocale(next);
        localStorage.setItem("locale", next);
    };

    const t = (key: string) => {
        return translations[key] || key;
    };

    return (
        <I18nContext.Provider value={{ locale, t, toggleLocale }}>
            {children}
        </I18nContext.Provider>
    );
}

export const useTranslation = () => useContext(I18nContext);
