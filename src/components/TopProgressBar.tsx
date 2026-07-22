"use client";

import { useEffect, useState } from "react";
import { usePosting } from "./PostingContext";

export function TopProgressBar() {
    const { status } = usePosting();
    const [progress, setProgress] = useState(0);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (status === "posting") {
            setVisible(true);
            setProgress(0);
            // Animate to ~80% while waiting
            const t1 = setTimeout(() => setProgress(30), 50);
            const t2 = setTimeout(() => setProgress(60), 300);
            const t3 = setTimeout(() => setProgress(80), 800);
            return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
        } else if (status === "success") {
            setProgress(100);
            const t = setTimeout(() => {
                setVisible(false);
                setProgress(0);
            }, 500);
            return () => clearTimeout(t);
        } else if (status === "error") {
            setProgress(100);
            const t = setTimeout(() => {
                setVisible(false);
                setProgress(0);
            }, 700);
            return () => clearTimeout(t);
        }
    }, [status]);

    if (!visible) return null;

    const color = status === "error" ? "#f4212e" : "#1d9bf0";
    const shadowColor = status === "error" ? "rgba(244,33,46,0.5)" : "rgba(29,155,240,0.5)";

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                zIndex: 99999,
                height: "3px",
                background: "transparent",
                pointerEvents: "none",
            }}
        >
            <div
                style={{
                    height: "100%",
                    width: `${progress}%`,
                    background: color,
                    boxShadow: `0 0 8px 1px ${shadowColor}`,
                    transition: progress === 0
                        ? "none"
                        : progress === 100
                        ? "width 0.25s ease-out"
                        : "width 0.6s ease-out",
                    borderRadius: "0 2px 2px 0",
                }}
            />
        </div>
    );
}
