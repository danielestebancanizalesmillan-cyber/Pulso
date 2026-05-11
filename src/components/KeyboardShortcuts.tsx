"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function KeyboardShortcuts() {
    const router = useRouter();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger if user is typing in an input or textarea
            const target = e.target as HTMLElement;
            if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
                return;
            }

            // Keyboard Shortcuts
            switch (e.key.toLowerCase()) {
                case "n":
                    // Open New Tweet Modal
                    window.dispatchEvent(new CustomEvent("open-compose"));
                    e.preventDefault();
                    break;
                case "/":
                    // Focus Search
                    const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
                    if (searchInput) {
                        searchInput.focus();
                        e.preventDefault();
                    }
                    break;
                case "g":
                    // Navigation shortcuts (G + ...)
                    const handleNav = (nextEvent: KeyboardEvent) => {
                        window.removeEventListener("keydown", handleNav);
                        switch (nextEvent.key.toLowerCase()) {
                            case "h": router.push("/home"); break;
                            case "m": router.push("/messages"); break;
                            case "n": router.push("/notifications"); break;
                            case "e": router.push("/explore"); break;
                            case "b": router.push("/bookmarks"); break;
                            case "p": router.push("/profile"); break;
                            case "s": router.push("/settings"); break;
                        }
                    };
                    window.addEventListener("keydown", handleNav);
                    // Cleanup timeout if no second key pressed
                    setTimeout(() => window.removeEventListener("keydown", handleNav), 1000);
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [router]);

    return null; // Side-effect only component
}
