"use client";

import { useEffect, useRef, useState } from "react";

const EMOJIS = [
    "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😮", "😯", "😲", "😳", "🤯", "🥱", "😴", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈", "👿", "👹", "👺", "🤡", "💩", "👻", "💀", "👽", "👾", "🤖", "🎃", "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾",
    "🤲", "👐", "🙌", "👏", "🤝", "👍", "👎", "👊", "✊", "🤛", "🤜", "🤞", "🤟", "🤘", "👌", "🤌", "🤏", "👈", "👉", "👆", "👇", "☝️", "✋", "🤚", "🖐", "🖖", "👋", "🤙", "💪", "✍️", "🙏",
    "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❤️‍🔥", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟",
    "🔥", "⚡", "💫", "⭐", "🌟", "✨", "🎉", "🎊", "🎈", "🎶", "🎵", "🎤", "🎸", "🏆", "🥇", "👑", "💎", "🚀", "🌈", "🌊",
    "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐸", "🐵", "🦋", "🐝", "🌸", "🌺", "🌻", "🌹",
    "🍕", "🍔", "🌮", "🍜", "🍣", "🍰", "🎂", "🍩", "🍪", "☕", "🍵", "🥂", "🍺", "🥃",
    "😂", "💀", "🫡", "🫠", "🥹", "🫶", "🫂", "🤷", "🙄", "😤", "🤬", "😱", "🤩", "🥲", "😶‍🌫️"
];

const CATEGORIES = [
    { label: "Caras", start: 0, end: 38 },
    { label: "Manos", start: 38, end: 55 },
    { label: "Corazones", start: 55, end: 74 },
    { label: "Varios", start: 74, end: 94 },
    { label: "Animales", start: 94, end: 113 },
    { label: "Comida", start: 113, end: 127 },
    { label: "Trending", start: 127 },
];

interface EmojiPickerProps {
    onSelect: (emoji: string) => void;
    onClose: () => void;
    triggerRef?: React.RefObject<HTMLElement>;
}

export function EmojiPicker({ onSelect, onClose, triggerRef }: EmojiPickerProps) {
    const [search, setSearch] = useState("");
    const [activeCategory, setActiveCategory] = useState(0);
    const pickerRef = useRef<HTMLDivElement>(null);

    // Smart positioning: detect if picker would go off-screen and flip accordingly
    const [position, setPosition] = useState<React.CSSProperties>({
        position: "absolute",
        bottom: "calc(100% + 8px)",
        left: 0,
        zIndex: 10001,
    });

    useEffect(() => {
        if (!pickerRef.current) return;
        const rect = pickerRef.current.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        let newStyle: React.CSSProperties = {
            position: "absolute",
            zIndex: 10001,
        };

        // Vertical: open upward by default; if not enough space, open downward
        if (rect.top < 8) {
            newStyle.top = "calc(100% + 8px)";
            newStyle.bottom = "unset";
        } else {
            newStyle.bottom = "calc(100% + 8px)";
            newStyle.top = "unset";
        }

        // Horizontal: if goes off right edge, align to right
        if (rect.right > vw - 8) {
            newStyle.right = 0;
            newStyle.left = "unset";
        } else {
            newStyle.left = 0;
            newStyle.right = "unset";
        }

        setPosition(newStyle);
    }, []);

    const filtered = search
        ? EMOJIS.filter(e => e.includes(search))
        : (activeCategory < CATEGORIES.length
            ? EMOJIS.slice(CATEGORIES[activeCategory].start, CATEGORIES[activeCategory].end)
            : EMOJIS);

    const displayed = search ? EMOJIS.filter(() => true) : filtered;
    const searchFiltered = search ? EMOJIS : displayed;

    return (
        <div
            ref={pickerRef}
            className="emoji-picker panel-card glass"
            style={{
                ...position,
                width: "320px",
                maxHeight: "380px",
                display: "flex",
                flexDirection: "column",
                padding: "12px",
                boxShadow: "var(--shadow-lg)",
                borderRadius: "16px",
                animation: "fadeIn 0.15s ease",
            }}
        >
            {/* Search */}
            <input
                type="text"
                placeholder="Buscar emoji..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
                style={{
                    width: "100%",
                    padding: "6px 12px",
                    borderRadius: "20px",
                    border: "1px solid var(--border)",
                    background: "var(--bg-hover)",
                    color: "var(--text-primary)",
                    fontSize: "0.88rem",
                    marginBottom: "8px",
                    outline: "none",
                    boxSizing: "border-box",
                }}
            />

            {/* Category tabs */}
            {!search && (
                <div style={{ display: "flex", gap: "4px", marginBottom: "8px", flexWrap: "wrap" }}>
                    {CATEGORIES.map((cat, i) => (
                        <button
                            key={cat.label}
                            onClick={() => setActiveCategory(i)}
                            style={{
                                fontSize: "0.72rem",
                                padding: "2px 8px",
                                borderRadius: "12px",
                                border: "none",
                                cursor: "pointer",
                                fontWeight: activeCategory === i ? 700 : 400,
                                background: activeCategory === i ? "var(--blue)" : "var(--bg-hover)",
                                color: activeCategory === i ? "white" : "var(--text-secondary)",
                                transition: "all 0.15s",
                            }}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: "6px", overflowY: "auto", flex: 1 }}>
                {(search ? EMOJIS.filter(e => e.includes(search)) : filtered).map((emoji) => (
                    <button
                        key={emoji}
                        onClick={() => { onSelect(emoji); }}
                        style={{ fontSize: "1.4rem", padding: "4px", borderRadius: "8px", transition: "background 0.15s", lineHeight: 1.2 }}
                        className="emoji-btn"
                    >
                        {emoji}
                    </button>
                ))}
            </div>

            <style>{`
                .emoji-btn { background: transparent; border: none; cursor: pointer; }
                .emoji-btn:hover { background: var(--bg-hover); }
                .emoji-picker::-webkit-scrollbar { width: 4px; }
                .emoji-picker::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
            `}</style>
        </div>
    );
}
