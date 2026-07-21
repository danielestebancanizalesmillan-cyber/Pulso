"use client";

import { useState } from "react";

const EMOJIS = [
    "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😮", "😯", "😲", "😳", "🤯", "🥱", "😴", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈", "👿", "👹", "👺", "🤡", "💩", "👻", "💀", "👽", "👾", "🤖", "🎃", "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾", "🤲", "👐", "🙌", "👏", "🤝", "👍", "👎", "👊", "✊", "🤛", "🤜", "🤞", "🤟", "🤘", "👌", "🤌", "🤏", "👈", "👉", "👆", "👇", "☝️", "✋", "🤚", "🖐", "🖖", "👋", "🤙", "💪", "🖕", "✍️", "🙏", "🦶", "🦵", "🦿", "🦾", "💄", "💋", "👄", "🦷", "👅", "👂", "🦻", "👃", "👣", "👁", "👀", "🧠", "🗣", "👤", "👥", "🫂"
];

interface EmojiPickerProps {
    onSelect: (emoji: string) => void;
    onClose: () => void;
}

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
    return (
        <div className="emoji-picker panel-card glass" style={{ position: "absolute", bottom: "100%", left: 0, zIndex: 1000, width: "300px", maxHeight: "400px", overflowY: "auto", padding: "12px", marginBottom: "8px", boxShadow: "var(--shadow-lg)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: "8px" }}>
                {EMOJIS.map((emoji) => (
                    <button
                        key={emoji}
                        onClick={() => { onSelect(emoji); }}
                        style={{ fontSize: "1.5rem", padding: "4px", borderRadius: "8px", transition: "background 0.2s" }}
                        className="emoji-btn"
                    >
                        {emoji}
                    </button>
                ))}
            </div>
            
            <style>{`
                .emoji-btn:hover {
                    background: var(--bg-hover);
                }
                .emoji-picker::-webkit-scrollbar {
                    width: 6px;
                }
                .emoji-picker::-webkit-scrollbar-thumb {
                    background: var(--border);
                    border-radius: 3px;
                }
            `}</style>
        </div>
    );
}
