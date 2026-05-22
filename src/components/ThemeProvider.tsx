"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "soft-dark" | "light" | "soft-light" | "yellow" | "brown";

export interface WallpaperConfig {
    type: "none" | "gradient" | "image";
    value: string; // gradient css string or image URL/dataURL
    blur?: number; // overlay blur in px (for image)
    opacity?: number; // overlay opacity 0-1
}

const defaultWallpaper: WallpaperConfig = { type: "none", value: "", blur: 4, opacity: 0.7 };

const ThemeContext = createContext<{ 
    theme: Theme; 
    setThemeString: (t: Theme) => void;
    wallpaper: WallpaperConfig;
    setWallpaper: (w: WallpaperConfig) => void;
}>({
    theme: "dark",
    setThemeString: () => { },
    wallpaper: defaultWallpaper,
    setWallpaper: () => { },
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>("dark");
    const [wallpaper, setWallpaperState] = useState<WallpaperConfig>(defaultWallpaper);

    useEffect(() => {
        const stored = localStorage.getItem("theme") as Theme | null;
        if (stored) {
            setTheme(stored);
            document.documentElement.setAttribute("data-theme", stored);
        }
        // Load wallpaper
        try {
            const storedWp = localStorage.getItem("wallpaper");
            if (storedWp) {
                const wp: WallpaperConfig = JSON.parse(storedWp);
                setWallpaperState(wp);
                applyWallpaperToDom(wp);
            }
        } catch (e) {}
    }, []);

    const setThemeString = (newTheme: Theme) => {
        setTheme(newTheme);
        localStorage.setItem("theme", newTheme);
        document.documentElement.setAttribute("data-theme", newTheme);
    };

    const setWallpaper = (wp: WallpaperConfig) => {
        setWallpaperState(wp);
        localStorage.setItem("wallpaper", JSON.stringify(wp));
        applyWallpaperToDom(wp);
    };

    return (
        <ThemeContext.Provider value={{ theme, setThemeString, wallpaper, setWallpaper }}>
            {children}
        </ThemeContext.Provider>
    );
}

function applyWallpaperToDom(wp: WallpaperConfig) {
    const existing = document.getElementById("pulso-wallpaper");
    if (existing) existing.remove();

    if (wp.type === "none") {
        document.documentElement.removeAttribute("data-wallpaper");
        return;
    }

    document.documentElement.setAttribute("data-wallpaper", "true");

    const el = document.createElement("div");
    el.id = "pulso-wallpaper";
    el.style.cssText = [
        "position:fixed",
        "inset:0",
        "z-index:-1",
        "pointer-events:none",
    ].join(";");

    if (wp.type === "gradient") {
        el.style.background = wp.value;
    } else if (wp.type === "image") {
        el.style.backgroundImage = `url(${wp.value})`;
        el.style.backgroundSize = "cover";
        el.style.backgroundPosition = "center";
        el.style.backgroundRepeat = "no-repeat";
        // Overlay for readability
        const overlay = document.createElement("div");
        overlay.style.cssText = [
            "position:absolute",
            "inset:0",
            `background:var(--bg-main)`,
            `opacity:${wp.opacity ?? 0.7}`,
            `backdrop-filter:blur(${wp.blur ?? 4}px)`,
        ].join(";");
        el.appendChild(overlay);
    }

    document.body.insertBefore(el, document.body.firstChild);
}

export const useTheme = () => useContext(ThemeContext);
