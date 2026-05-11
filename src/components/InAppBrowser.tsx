"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { X, RefreshCw, ArrowLeft, ArrowRight } from "lucide-react";

type InAppBrowserContextType = {
    openUrl: (url: string, title?: string) => void;
    close: () => void;
};

const InAppBrowserContext = createContext<InAppBrowserContextType | undefined>(undefined);

export function useInAppBrowser() {
    const context = useContext(InAppBrowserContext);
    if (!context) throw new Error("useInAppBrowser must be used within InAppBrowserProvider");
    return context;
}

export function InAppBrowserProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentUrl, setCurrentUrl] = useState("");
    const [currentTitle, setCurrentTitle] = useState("");

    const openUrl = (url: string, title?: string) => {
        setCurrentUrl(url);
        if (title) setCurrentTitle(title);
        setIsOpen(true);
    };

    const close = () => {
        setIsOpen(false);
        setCurrentUrl("");
        setCurrentTitle("");
    };

    // Auto-intercept links with target="_blank"
    useEffect(() => {
        const handleExternalLinks = (e: MouseEvent) => {
            if (isOpen) return; // Prevent stacked iframe inceptions!
            const target = e.target as HTMLElement;
            const anchor = target.closest("a");
            if (anchor && anchor.getAttribute("target") === "_blank") {
                e.preventDefault();
                openUrl(anchor.href, anchor.innerText.trim());
            }
        };
        document.addEventListener("click", handleExternalLinks);
        return () => document.removeEventListener("click", handleExternalLinks);
    }, [isOpen]);

    return (
        <InAppBrowserContext.Provider value={{ openUrl, close }}>
            {children}
            {isOpen && (
                <div style={{
                    position: "fixed",
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: "rgba(0,0,0,0.75)",
                    backdropFilter: "blur(8px)",
                    zIndex: 9999,
                    display: "flex",
                    flexDirection: "column",
                    padding: "20px",
                    boxSizing: "border-box"
                }}>
                    <div style={{
                        background: "var(--bg-primary)",
                        border: "1px solid var(--border)",
                        borderRadius: "16px",
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                        boxShadow: "0 10px 40px rgba(0,0,0,0.5)"
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: "12px 16px",
                            borderBottom: "1px solid var(--border)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            background: "var(--bg-secondary)"
                        }}>
                            <div style={{ display: "flex", gap: 8 }}>
                                <button className="icon-btn" onClick={() => { const ifr = document.getElementById("in-app-iframe") as HTMLIFrameElement; if (ifr && ifr.contentWindow) ifr.contentWindow.history.back(); }}><ArrowLeft size={18}/></button>
                                <button className="icon-btn" onClick={() => { const ifr = document.getElementById("in-app-iframe") as HTMLIFrameElement; if (ifr && ifr.contentWindow) ifr.contentWindow.history.forward(); }}><ArrowRight size={18}/></button>
                                <button className="icon-btn" onClick={() => { const ifr = document.getElementById("in-app-iframe") as HTMLIFrameElement; if (ifr) ifr.src = currentUrl; }}><RefreshCw size={18}/></button>
                            </div>
                            <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", maxWidth: "50%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {currentTitle || currentUrl}
                            </div>
                            <button className="icon-btn" onClick={close} style={{ color: "var(--red)" }}><X size={20}/></button>
                        </div>

                        {/* Iframe */}
                        <iframe 
                            id="in-app-iframe"
                            src={currentUrl}
                            style={{ flex: 1, border: "none", background: "white" }}
                            title={currentTitle}
                            onLoad={(e) => {
                                try {
                                    const ifr = e.target as HTMLIFrameElement;
                                    const path = ifr.contentWindow?.location.pathname;
                                    if (path === "/home" || path === "/") {
                                        close();
                                    }
                                } catch (err) {
                                    // Ignore Cross-Origin errors
                                }
                            }}
                        />
                    </div>
                </div>
            )}
        </InAppBrowserContext.Provider>
    );
}
