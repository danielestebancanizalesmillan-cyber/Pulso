"use client";

import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";

export function GifPicker({ onSelect, onClose }: { onSelect: (gifUrl: string) => void; onClose: () => void }) {
    const [search, setSearch] = useState("");
    const [gifs, setGifs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const API_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY || "dc6zaTOxFJmzC"; // Fallback to public key

    useEffect(() => {
        const loadTrending = async () => {
            setLoading(true);
            try {
                const res = await fetch(`https://api.giphy.com/v1/gifs/trending?api_key=${API_KEY}&limit=12`);
                if (res.status === 403) {
                    setError("Clave API de Giphy no válida. Añade NEXT_PUBLIC_GIPHY_API_KEY.");
                    setLoading(false);
                    return;
                }
                const data = await res.json();
                setGifs(data.data || []);
            } catch (err) {
                setError("Error al cargar GIFs");
            } finally {
                setLoading(false);
            }
        };
        loadTrending();
    }, []);

    useEffect(() => {
        if (!search) return;
        const delayDebounce = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${API_KEY}&q=${encodeURIComponent(search)}&limit=12`);
                const data = await res.json();
                setGifs(data.data || []);
            } catch (err) { }
            setLoading(false);
        }, 500);
        return () => clearTimeout(delayDebounce);
    }, [search]);

    return (
        <div style={{ position: "absolute", bottom: "45px", left: 0, zIndex: 9999, background: "var(--bg-main)", border: "1px solid var(--border)", borderRadius: "16px", boxShadow: "0 4px 24px rgba(0,0,0,0.25)", width: "300px", padding: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontWeight: 700 }}>Buscar GIF</span>
                <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
                    <X size={16} />
                </button>
            </div>
            <div style={{ position: "relative", marginBottom: "12px" }}>
                <input 
                    type="text" 
                    placeholder="Buscar en Giphy..." 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)} 
                    style={{ width: "100%", padding: "8px 12px 8px 32px", borderRadius: "20px", border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "0.9rem" }} 
                />
                <Search size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
            </div>

            {loading && <div style={{ textAlign: "center", fontSize: "0.85rem", padding: "12px" }}>Cargando...</div>}
            {error && <div style={{ color: "var(--red)", fontSize: "0.75rem", textAlign: "center", padding: "8px" }}>{error}</div>}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", maxHeight: "200px", overflowY: "auto" }}>
                {gifs.map(gif => (
                    <img 
                        key={gif.id} 
                        src={gif.images.fixed_height_small.url} 
                        alt={gif.title} 
                        onClick={() => {
                            onSelect(gif.images.fixed_height.url);
                            onClose();
                        }} 
                        style={{ width: "100%", height: "100px", objectFit: "cover", borderRadius: "8px", cursor: "pointer", transition: "transform 0.2s" }} 
                        onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.03)"}
                        onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                    />
                ))}
            </div>
        </div>
    );
}
