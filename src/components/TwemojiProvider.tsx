"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Twemoji provides cross-platform emoji images (Twitter's open-source emoji set)
// This ensures emojis look the same on all devices regardless of OS support

declare global {
    interface Window {
        twemoji: {
            parse: (element: HTMLElement | string, options?: any) => string;
        };
    }
}

const TWEMOJI_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/twemoji@14.0.2/dist/twemoji.min.js";

function parsePage() {
    if (typeof window !== "undefined" && window.twemoji) {
        window.twemoji.parse(document.body, {
            folder: "svg",
            ext: ".svg",
            base: "https://cdn.jsdelivr.net/npm/twemoji@14.0.2/dist/",
            className: "twemoji",
        });
    }
}

export function TwemojiProvider() {
    const pathname = usePathname();

    useEffect(() => {
        // Load twemoji script once
        if (!document.querySelector(`script[src="${TWEMOJI_SCRIPT_URL}"]`)) {
            const script = document.createElement("script");
            script.src = TWEMOJI_SCRIPT_URL;
            script.crossOrigin = "anonymous";
            script.onload = () => {
                parsePage();
            };
            document.head.appendChild(script);
        } else {
            // Script already loaded
            parsePage();
        }
    }, [pathname]); // Re-parse on every route change

    return (
        <style>{`
            .twemoji {
                height: 1.2em;
                width: 1.2em;
                vertical-align: -0.2em;
                display: inline;
                margin: 0 0.05em;
            }
        `}</style>
    );
}
