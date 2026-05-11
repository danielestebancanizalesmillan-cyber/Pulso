"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "soft-dark" | "light" | "soft-light" | "yellow" | "brown";

const ThemeContext = createContext<{ theme: Theme; setThemeString: (t: Theme) => void }>({
    theme: "dark",
    setThemeString: () => { },
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>("dark");

    useEffect(() => {
        const stored = localStorage.getItem("theme") as Theme | null;
        if (stored) {
            setTheme(stored);
            document.documentElement.setAttribute("data-theme", stored);
        }
    }, []);

    const setThemeString = (newTheme: Theme) => {
        setTheme(newTheme);
        localStorage.setItem("theme", newTheme);
        document.documentElement.setAttribute("data-theme", newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, setThemeString }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
