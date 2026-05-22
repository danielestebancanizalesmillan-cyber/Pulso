"use client";

import { useState, useEffect, useTransition, useOptimistic, useRef } from "react";
import { Avatar } from "./Avatar";
import { useSession } from "next-auth/react";
import { createTweet } from "@/app/actions/tweet";
import { useToast } from "./ToastProvider";
import { useTranslation } from "@/lib/i18n";
import { EmojiPicker } from "./EmojiPicker";
import { improveTweetWithAI } from "@/app/actions/ai";
import { GifPicker } from "./GifPicker";
import { MapPin, X } from "lucide-react";

// import { upload } from "@vercel/blob/client";

// Character limit moved inside component for dynamic calculation based on verification status

interface ComposeTweetProps {
    placeholder?: string;
    parentId?: string;
    quoteOfId?: string;
    onSuccess?: () => void;
    autoFocus?: boolean;
    communityId?: string;
}

export function ComposeTweet({ placeholder, parentId, quoteOfId, onSuccess, autoFocus, communityId: initialCommunityId }: ComposeTweetProps) {
    const { data: session } = useSession();
    const { addToast } = useToast();
    const { t } = useTranslation();
    const isVerified = (session?.user as any)?.isVerified;
    const MAX = isVerified ? 2000 : 280;
    const activePlaceholder = placeholder || t("whatsHappening");
    
    const [content, setContent] = useState("");
    const [mediaPayloads, setMediaPayloads] = useState<{ url: string, type: string }[]>([]);
    const [isPending, startTransition] = useTransition();

    // Autocomplete states
    const [suggestions, setSuggestions] = useState<{ users: any[], hashtags: any[] }>({ users: [], hashtags: [] });
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTrigger, setActiveTrigger] = useState<"@" | "#" | null>(null);
    const [error, setError] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [filesToUpload, setFilesToUpload] = useState<{ file: File, type: string }[]>([]);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showGifPicker, setShowGifPicker] = useState(false);
    const [links, setLinks] = useState<string[]>([]);
    
    // Poll state
    const [showPoll, setShowPoll] = useState(false);
    const [pollOptions, setPollOptions] = useState(["", ""]);
    const [pollDays, setPollDays] = useState(1);
    const [pollHours, setPollHours] = useState(0);
    const [pollMinutes, setPollMinutes] = useState(0);

    const [selectedCommunityId, setSelectedCommunityId] = useState(initialCommunityId || "");
    const [userCommunities, setUserCommunities] = useState<any[]>([]);
    const [isImproving, setIsImproving] = useState(false);
    const [isSensitive, setIsSensitive] = useState(false);
    const [location, setLocation] = useState<{ lat: number, lng: number, label: string } | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [undoTimer, setUndoTimer] = useState<number | null>(null);
    const undoRef = useRef<NodeJS.Timeout | null>(null);

    const handleAIEnhance = async () => {
        if (!content.trim() || isImproving) return;
        setIsImproving(true);
        try {
            const res = await improveTweetWithAI(content);
            if (res.enhancedText) {
                setContent(res.enhancedText);
                addToast("Pulso mejorado con IA ✦", "success");
            }
        } catch (e: any) {
             addToast(e.message || "Error al mejorar pulso", "error");
        } finally {
            setIsImproving(false);
        }
    };

    const applyFormat = (type: "bold" | "italic" | "list") => {
        const start = textareaRef.current?.selectionStart || 0;
        const end = textareaRef.current?.selectionEnd || 0;
        const selected = content.substring(start, end);
        
        let formatted = "";
        if (type === "bold") formatted = `**${selected}**`;
        else if (type === "italic") formatted = `*${selected}*`;
        else if (type === "list") formatted = `\n- ${selected}`;

        const newContent = content.substring(0, start) + formatted + content.substring(end);
        setContent(newContent);
        setTimeout(() => textareaRef.current?.focus(), 10);
    };

    useEffect(() => {
        if (session?.user?.id && !initialCommunityId) {
            // Fetch user communities for the selector
            fetch("/api/me/communities")
                .then(res => res.json())
                .then(data => setUserCommunities(data.communities || []))
                .catch(console.error);
        }
    }, [session?.user?.id, initialCommunityId]);

    useEffect(() => {
        if (autoFocus) textareaRef.current?.focus();
        
        // Load draft
        const draft = localStorage.getItem("tweet-draft");
        if (draft && !content) setContent(draft);
    }, [autoFocus]);

    useEffect(() => {
        // Save draft
        if (content) {
            localStorage.setItem("tweet-draft", content);
        } else {
            localStorage.removeItem("tweet-draft");
        }

        // Link detection
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const matches = content.match(urlRegex);
        setLinks(matches || []);
    }, [content]);

    useEffect(() => {
        if (!showSuggestions || !searchQuery) {
            setSuggestions({ users: [], hashtags: [] });
            return;
        }

        const delayDebounce = setTimeout(() => {
            fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
                .then(res => res.json())
                .then(data => {
                    setSuggestions({
                        users: data.users || [],
                        hashtags: data.hashtags || []
                    });
                })
                .catch(console.error);
        }, 200);

        return () => clearTimeout(delayDebounce);
    }, [searchQuery, showSuggestions]);

    const insertSuggestion = (suggestion: string) => {
        const cursor = textareaRef.current?.selectionStart || 0;
        const textBeforeCursor = content.substring(0, cursor);
        const textAfterCursor = content.substring(cursor);

        const words = textBeforeCursor.split(" ");
        if (words.length > 0) words[words.length - 1] = suggestion;
        
        const newText = words.join(" ") + textAfterCursor;
        setContent(newText);
        setShowSuggestions(false);
        setTimeout(() => textareaRef.current?.focus(), 10);
    };

    const handleLocation = async () => {
        if (location) {
            setLocation(null);
            return;
        }

        if (!navigator.geolocation) {
            addToast("Tu navegador no soporta geolocalización", "error");
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const { latitude, longitude } = pos.coords;
            try {
                // Reverse geocoding with Nominatim (OSM)
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
                const data = await res.json();
                const label = data.address.city || data.address.town || data.address.village || data.address.state || "Ubicación desconocida";
                setLocation({ lat: latitude, lng: longitude, label });
                addToast(`Ubicación fijada en ${label}`, "success");
            } catch (err) {
                console.error("Geocoding error:", err);
                setLocation({ lat: latitude, lng: longitude, label: "Ubicación detectada" });
            } finally {
                setIsLocating(false);
            }
        }, (err) => {
            console.error("Geolocation error:", err);
            addToast("No se pudo obtener tu ubicación", "error");
            setIsLocating(false);
        });
    };

    const remaining = MAX - content.length;
    const isPollValid = showPoll && pollOptions.every(opt => opt.trim().length > 0) && pollOptions.length >= 2;
    const canPost = (content.trim().length > 0 || mediaPayloads.length > 0 || (showPoll && isPollValid)) && content.length <= MAX;

    const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const newMedia = [...filesToUpload, ...files.map(f => ({ file: f, type: f.type.startsWith('video/') ? 'video' : f.type.startsWith('audio/') ? 'audio' : 'image' }))].slice(0, 4);

        const validMedia: { file: File, type: string }[] = [];

        let hasError = false;

        newMedia.forEach(item => {
            const limit = isVerified ? 1024 * 1024 * 1024 : 15 * 1024 * 1024; // 1GB for verified, 15MB for free
            if (item.file.size > limit) {
                setError(isVerified ? "El archivo supera el límite de 1GB" : t("fileSizeLimit"));
                hasError = true;
                return;
            }
            validMedia.push(item);
        });

        if (hasError) return;

        setFilesToUpload(validMedia);
        setError("");

        validMedia.forEach(item => {
            const objectUrl = URL.createObjectURL(item.file);
            setMediaPayloads(prev => {
                if (prev.some(p => p.url === objectUrl)) return prev;
                return [...prev, { url: objectUrl, type: item.type }].slice(0, 4);
            });
        });
    };

    const handleSubmit = async () => {
        if (!canPost || isPending) return;

        if (isVerified && !undoTimer) {
            setUndoTimer(5);
            undoRef.current = setInterval(() => {
                setUndoTimer(prev => {
                    if (prev !== null && prev <= 1) {
                        clearInterval(undoRef.current!);
                        undoRef.current = null;
                        setUndoTimer(null);
                        executeSubmit();
                        return null;
                    }
                    return prev !== null ? prev - 1 : null;
                });
            }, 1000);
            return;
        }

        executeSubmit();
    };

    const handleUndo = () => {
        if (undoRef.current) {
            clearInterval(undoRef.current);
            undoRef.current = null;
        }
        setUndoTimer(null);
        addToast("Envio cancelado", "info");
    };

    const executeSubmit = async () => {
        startTransition(async () => {
            try {
                let uploadedMedia: { url: string, type: string }[] = [];
                const hotlinkedMedia = mediaPayloads.filter((p: any) => p.isHotlinked).map(p => ({ url: p.url, type: p.type }));

                if (filesToUpload.length > 0) {
                    console.log(">> ComposeTweet: Starting upload of", filesToUpload.length, "files");
                    try {
                        const uploadPromises = filesToUpload.map(async (item, i) => {
                            // Sanitize filename: remove special characters and spaces
                            const sanitizedName = item.file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                            console.log(`>> ComposeTweet: Uploading file ${i+1}/${filesToUpload.length}: ${sanitizedName} (original: ${item.file.name})`);
                            const formData = new FormData();
                            formData.append("file", item.file);
                            
                            const uploadRes = await fetch('/api/upload', {
                                method: 'POST',
                                body: formData
                            });
                            
                            if (!uploadRes.ok) {
                                throw new Error("Upload failed");
                            }
                            
                            const newBlob = await uploadRes.json();
                            console.log(`>> ComposeTweet: File ${i+1} uploaded successfully:`, newBlob.url);
                            return { url: newBlob.url, type: item.type };
                        });
                        uploadedMedia = await Promise.all(uploadPromises);
                        console.log(">> ComposeTweet: All uploads completed. Media count:", uploadedMedia.length);
                    } catch (uploadErr: any) {
                        console.error("ComposeTweet: Vercel Blob Upload Error:", uploadErr);
                        throw new Error(t("uploadFailed"));
                    }
                }
                
                console.log(">> ComposeTweet: Sending tweet content:", content.trim());
                
                let pollData = undefined;
                if (showPoll && isPollValid) {
                    const expiresAt = new Date();
                    expiresAt.setHours(expiresAt.getHours() + (pollDays * 24) + pollHours);
                    expiresAt.setMinutes(expiresAt.getMinutes() + pollMinutes);
                    pollData = {
                        options: pollOptions.filter(o => o.trim().length > 0),
                        expiresAt: expiresAt.toISOString()
                    };
                }

                const finalCommunityId = initialCommunityId || selectedCommunityId;
                const res = await createTweet(content.trim(), parentId, [...uploadedMedia, ...hotlinkedMedia], quoteOfId, pollData, finalCommunityId, isSensitive, location || undefined);
                setContent("");
                mediaPayloads.forEach(p => {
                    if (p.url.startsWith('blob:')) URL.revokeObjectURL(p.url);
                });
                setMediaPayloads([]);
                setFilesToUpload([]);
                setShowPoll(false);
                setPollOptions(["", ""]);
                setIsSensitive(false);
                setError("");
                localStorage.removeItem("tweet-draft");
                if (fileInputRef.current) fileInputRef.current.value = "";
                onSuccess?.();
                addToast(t("tweetSent"), "success");
            } catch (e: any) {
                setError(e.message || t("failedToPost"));
                addToast(e.message || t("failedToPost"), "error");
            }
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canPost) {
            handleSubmit();
        }
    };

    return (
        <div className="compose-box">
            <Avatar user={session?.user} size="md" />
            <div className="compose-input-area">
                {!parentId && !quoteOfId && (
                    <div style={{ marginBottom: 12 }}>
                        {initialCommunityId ? (
                            <div 
                                style={{ 
                                    display: "inline-flex", 
                                    alignItems: "center", 
                                    gap: 6,
                                    background: "rgba(29, 155, 240, 0.1)", 
                                    border: "1px solid rgba(29, 155, 240, 0.3)", 
                                    color: "var(--blue)", 
                                    borderRadius: "var(--radius-full)", 
                                    padding: "4px 12px", 
                                    fontSize: "0.85rem",
                                    fontWeight: 700
                                }}
                            >
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                    <path d="M16.5 12c1.38 0 2.49-1.12 2.49-2.5S17.88 7 16.5 7C15.12 7 14 8.12 14 9.5s1.12 2.5 2.5 2.5zM9 11c1.66 0 2.99-1.34 2.99-3S10.66 5 9 5C7.34 5 6 6.34 6 8s1.34 3 3 3zm7.5 3c-1.83 0-5.5.92-5.5 2.75V19h11v-2.25c0-1.83-3.67-2.75-5.5-2.75zM9 13c-2.33 0-7 1.17-7 3.5V19h7v-2.25c0-.85.35-2.5 2.5-3.5-.83-.17-1.7-.25-2.5-.25z"/>
                                </svg>
                                <span>Publicando en Comunidad</span>
                            </div>
                        ) : (
                            <select 
                                value={selectedCommunityId} 
                                onChange={(e) => setSelectedCommunityId(e.target.value)}
                                style={{ 
                                    background: "transparent", 
                                    border: "1px solid var(--blue)", 
                                    color: "var(--blue)", 
                                    borderRadius: "var(--radius-full)", 
                                    padding: "2px 12px", 
                                    fontSize: "0.85rem",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    outline: "none"
                                }}
                            >
                                <option value="">{t("everyone") || "Everyone"}</option>
                                {userCommunities.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        )}
                    </div>
                )}
                <div style={{ position: "relative", width: "100%" }}>
                <textarea
                    ref={textareaRef}
                    className="compose-textarea"
                    placeholder={activePlaceholder}
                    value={content}
                    onChange={(e) => {
                        const val = e.target.value;
                        setContent(val);
                        
                        const cursor = e.target.selectionStart || 0;
                        const textBeforeCursor = val.substring(0, cursor);
                        const words = textBeforeCursor.split(" ");
                        const lastWord = words[words.length - 1];

                        if ((lastWord.startsWith("@") || lastWord.startsWith("#")) && lastWord.length > 1) {
                            setActiveTrigger(lastWord.startsWith("@") ? "@" : "#");
                            setSearchQuery(lastWord.substring(1));
                            setShowSuggestions(true);
                        } else {
                            setShowSuggestions(false);
                            setActiveTrigger(null);
                        }
                    }}
                    onKeyDown={handleKeyDown}
                    rows={3}
                    disabled={isPending}
                    style={{ width: "100%", background: "transparent", border: "none", outline: "none", resize: "none", fontSize: "1.15rem", color: "var(--text-primary)", fontFamily: "inherit", lineHeight: "1.5" }}
                />

                {showSuggestions && (suggestions.users.length > 0 || suggestions.hashtags.length > 0) && (
                    <div className="suggestions-list" style={{ position: "absolute", zIndex: 40, background: "var(--bg-main)", border: "1px solid var(--border)", borderRadius: "12px", boxShadow: "0 4px 16px rgba(0,0,0,0.2)", width: "260px", top: "100%", left: 0, overflowY: "auto", maxHeight: "200px", marginTop: "4px" }}>
                        {activeTrigger === "@" && suggestions.users.map(u => (
                            <div key={u.id} onClick={() => insertSuggestion(`@${u.username} `)} style={{ padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid var(--border)" }} onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                                <Avatar user={u} size="sm" />
                                <div style={{display: "flex", flexDirection: "column"}}>
                                    <span style={{fontWeight:600, fontSize: "0.9rem"}}>{u.name}</span>
                                    <span style={{color:"var(--text-secondary)", fontSize: "0.8rem"}}>@{u.username}</span>
                                </div>
                            </div>
                        ))}
                        {activeTrigger === "#" && suggestions.hashtags.map(h => (
                            <div key={h.text} onClick={() => insertSuggestion(`${h.text} `)} style={{ padding: "8px 12px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)" }} onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-hover)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                                <span style={{color: "var(--blue)", fontWeight: 600}}>{h.text}</span>
                                <span style={{fontSize: "0.75rem", color: "var(--text-secondary)"}}>{h._count?.tweets || 0} posts</span>
                            </div>
                        ))}
                    </div>
                )}
                </div>
                {mediaPayloads.length > 0 && (
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: mediaPayloads.length > 1 ? "1fr 1fr" : "1fr",
                        gap: 8,
                        marginBottom: 12
                    }}>
                        {mediaPayloads.map((payload, idx) => (
                            <div key={idx} style={{ position: "relative" }}>
                                {payload.type === 'video' ? (
                                    <video 
                                        src={payload.url} 
                                        autoPlay 
                                        loop 
                                        muted 
                                        playsInline
                                        style={{ width: "100%", height: mediaPayloads.length > 2 ? 150 : 300, objectFit: "contain", borderRadius: 16, background: "black" }} 
                                    />
                                ) : payload.type === 'audio' ? (
                                    <div style={{ width: "100%", padding: 12, background: "rgba(0,0,0,0.6)", borderRadius: 12, display: "flex", alignItems: "center", gap: 12 }}>
                                        <audio src={payload.url} crossOrigin="anonymous" controls style={{ width: "100%" }} />
                                    </div>
                                ) : (
                                    <img src={payload.url} alt={`Upload preview ${idx}`} style={{ width: "100%", height: mediaPayloads.length > 2 ? 150 : 300, objectFit: "cover", borderRadius: 16 }} />
                                )}
                                <button
                                    title="Remove media"
                                    type="button"
                                    onClick={() => {
                                        const payloadToRemove = mediaPayloads[idx];
                                        if (payloadToRemove.url.startsWith('blob:')) {
                                            URL.revokeObjectURL(payloadToRemove.url);
                                        }
                                        const newPayloads = [...mediaPayloads];
                                        newPayloads.splice(idx, 1);
                                        setMediaPayloads(newPayloads);
                                        const newFiles = [...filesToUpload];
                                        newFiles.splice(idx, 1);
                                        setFilesToUpload(newFiles);
                                        if (fileInputRef.current) fileInputRef.current.value = "";
                                    }}
                                    style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.7)", color: "white", padding: 6, borderRadius: "50%", border: "none", cursor: "pointer" }}
                                >
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {showPoll && (
                    <div className="poll-editor" style={{ 
                        margin: "12px 0", 
                        padding: "16px", 
                        border: "1px solid var(--border)", 
                        borderRadius: "16px",
                        background: "var(--bg-main)"
                    }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {pollOptions.map((opt, idx) => (
                                <div key={idx} style={{ position: "relative" }}>
                                    <input 
                                        type="text"
                                        placeholder={`Option ${idx + 1}${idx > 1 ? " (optional)" : ""}`}
                                        value={opt}
                                        onChange={(e) => {
                                            const newOpts = [...pollOptions];
                                            newOpts[idx] = e.target.value;
                                            setPollOptions(newOpts);
                                        }}
                                        maxLength={25}
                                        style={{ 
                                            width: "100%", 
                                            padding: "12px", 
                                            borderRadius: "8px", 
                                            border: "1px solid var(--border)",
                                            background: "transparent",
                                            color: "var(--text-primary)"
                                        }}
                                    />
                                    <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                                        {opt.length}/25
                                    </span>
                                </div>
                            ))}
                            {pollOptions.length < 4 && (
                                <button 
                                    onClick={() => setPollOptions([...pollOptions, ""])}
                                    style={{ background: "none", border: "none", color: "var(--blue)", cursor: "pointer", textAlign: "left", padding: "4px", fontSize: "0.95rem" }}
                                >
                                    + Add an option
                                </button>
                            )}
                        </div>

                        <div style={{ borderTop: "1px solid var(--border)", marginTop: "16px", paddingTop: "16px" }}>
                            <div style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "8px" }}>Poll length</div>
                            <div style={{ display: "flex", gap: "12px" }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)" }}>Days</label>
                                    <select value={pollDays} onChange={(e) => setPollDays(parseInt(e.target.value))} style={{ width: "100%", padding: "8px", background: "var(--bg-main)", color: "var(--text-primary)", border: "1px solid var(--border)", borderRadius: "8px" }}>
                                        {[0, 1, 2, 3, 4, 5, 6, 7].map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)" }}>Hours</label>
                                    <select value={pollHours} onChange={(e) => setPollHours(parseInt(e.target.value))} style={{ width: "100%", padding: "8px", background: "var(--bg-main)", color: "var(--text-primary)", border: "1px solid var(--border)", borderRadius: "8px" }}>
                                        {Array.from({ length: 24 }, (_, i) => i).map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)" }}>Minutes</label>
                                    <select value={pollMinutes} onChange={(e) => setPollMinutes(parseInt(e.target.value))} style={{ width: "100%", padding: "8px", background: "var(--bg-main)", color: "var(--text-primary)", border: "1px solid var(--border)", borderRadius: "8px" }}>
                                        {Array.from({ length: 60 }, (_, i) => i).map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={() => setShowPoll(false)}
                            style={{ 
                                marginTop: "12px", 
                                width: "100%", 
                                border: "none", 
                                color: "var(--red)", 
                                background: "rgba(244, 33, 46, 0.1)", 
                                padding: "8px", 
                                borderRadius: "var(--radius-full)",
                                cursor: "pointer",
                                fontWeight: 600
                            }}
                        >
                            Remove poll
                        </button>
                    </div>
                )}
                {error && <p className="form-error" style={{ marginBottom: 8 }}>{error}</p>}
                {links.length > 0 && (
                    <div className="link-preview" style={{ marginBottom: 12, padding: 12, border: "1px solid var(--border)", borderRadius: 16 }}>
                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                            <div style={{ width: 40, height: 40, background: "var(--bg-hover)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" strokeWidth="2">
                                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                </svg>
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>{t("linkDetected")}</div>
                                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", wordBreak: "break-all" }}>{links[0]}</div>
                            </div>
                        </div>
                    </div>
                )}
                {location && (
                    <div style={{ 
                        display: "inline-flex", 
                        alignItems: "center", 
                        gap: "6px", 
                        padding: "4px 10px", 
                        background: "rgba(29, 155, 240, 0.1)", 
                        color: "var(--blue)", 
                        borderRadius: "9999px", 
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        marginBottom: "12px"
                    }}>
                        <MapPin size={14} />
                        <span>{location.label}</span>
                        <button onClick={() => setLocation(null)} style={{ background: "none", border: "none", color: "var(--blue)", cursor: "pointer", display: "flex", padding: 0 }}>
                            <X size={14} />
                        </button>
                    </div>
                )}
                <div className="compose-divider" />
                <div className="compose-actions">
                    <div className="compose-tools">
                        <input type="file" accept="image/*,video/*" multiple ref={fileInputRef} style={{ display: "none" }} onChange={handleMediaSelect} />
                        <button className="icon-btn" title="Add media" onClick={() => fileInputRef.current?.click()}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <polyline points="21 15 16 10 5 21" />
                            </svg>
                        </button>
                        <div style={{ position: "relative" }}>
                            <button className="icon-btn" title="Add emoji" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                                    <line x1="9" y1="9" x2="9.01" y2="9" />
                                    <line x1="15" y1="9" x2="15.01" y2="9" />
                                </svg>
                            </button>
                            {showEmojiPicker && (
                                <EmojiPicker 
                                    onSelect={(emoji) => {
                                        setContent(prev => prev + emoji);
                                        setShowEmojiPicker(false);
                                        textareaRef.current?.focus();
                                    }}
                                    onClose={() => setShowEmojiPicker(false)}
                                />
                            )}
                        </div>
                        <div style={{ position: "relative" }}>
                            <button className={`icon-btn ${showGifPicker ? "active" : ""}`} title="Add GIF" onClick={() => setShowGifPicker(!showGifPicker)} disabled={showPoll}>
                                <span style={{ fontSize: "0.80rem", fontWeight: 700, border: "2px solid currentColor", borderRadius: "4px", padding: "1px 3px" }}>GIF</span>
                            </button>
                            {showGifPicker && (
                                <GifPicker 
                                    onSelect={(gifUrl) => {
                                        setMediaPayloads(prev => [...prev, { url: gifUrl, type: "image", isHotlinked: true }].slice(0, 4));
                                        setShowGifPicker(false);
                                    }}
                                    onClose={() => setShowGifPicker(false)}
                                />
                            )}
                        </div>
                        <button className={`icon-btn ${showPoll ? "active" : ""}`} title="Add poll" onClick={() => setShowPoll(!showPoll)} disabled={mediaPayloads.length > 0}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
                            </svg>
                        </button>
                        <button 
                            className={`icon-btn ${location ? "active" : ""}`} 
                            title="Añadir ubicación" 
                            onClick={handleLocation}
                            disabled={isLocating}
                        >
                            {isLocating ? (
                                <span className="spinner-small" style={{ width: '16px', height: '16px', border: '2px solid var(--blue)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                            ) : (
                                <MapPin size={20} />
                            )}
                        </button>
                        <button 
                            className="icon-btn" 
                            title="Mejorar con IA" 
                            onClick={handleAIEnhance}
                            disabled={!content.trim() || isImproving}
                        >
                            {isImproving ? (
                                <span className="spinner-small" style={{ width: '16px', height: '16px', border: '2px solid var(--blue)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                            ) : (
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--blue)" }}>
                                    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z"/>
                                </svg>
                            )}
                        </button>
                        <button 
                            className={`icon-btn ${isSensitive ? "active" : ""}`} 
                            title="Marcar como contenido sensible" 
                            onClick={() => setIsSensitive(!isSensitive)}
                            style={{ color: isSensitive ? "var(--red)" : "inherit" }}
                        >
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                        </button>

                        {/* Formatting Tools for Verified */}
                        {isVerified && (
                            <div style={{ display: "flex", gap: "2px", marginLeft: "4px", paddingLeft: "8px", borderLeft: "1px solid var(--border)" }}>
                                <button className="icon-btn" title="Bold" onClick={() => applyFormat("bold")}>
                                    <span style={{ fontWeight: 800, fontSize: "1.1rem" }}>B</span>
                                </button>
                                <button className="icon-btn" title="Italic" onClick={() => applyFormat("italic")}>
                                    <span style={{ fontStyle: "italic", fontSize: "1.1rem", fontFamily: "serif" }}>I</span>
                                </button>
                                <button className="icon-btn" title="List" onClick={() => applyFormat("list")}>
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="compose-right">
                        {content.length > 0 && (
                            <span className={`char-counter ${remaining < 20 ? (remaining < 0 ? "danger" : "warning") : ""}`}>
                                {remaining}
                            </span>
                        )}
                        {undoTimer !== null ? (
                            <button
                                className="post-btn"
                                onClick={handleUndo}
                                style={{ background: "var(--red)", width: "100px", position: "relative", overflow: "hidden" }}
                            >
                                <div style={{ 
                                    position: "absolute", 
                                    left: 0, 
                                    top: 0, 
                                    bottom: 0, 
                                    width: `${(undoTimer / 5) * 100}%`, 
                                    background: "rgba(0,0,0,0.2)", 
                                    transition: "width 1s linear" 
                                }} />
                                <span style={{ position: "relative", zIndex: 1 }}>Deshacer {undoTimer}s</span>
                            </button>
                        ) : (
                            <button
                                className="post-btn"
                                onClick={handleSubmit}
                                disabled={!canPost || isPending}
                            >
                                {isPending
                                    ? "..."
                                    : parentId 
                                        ? t("reply") 
                                        : t("tweet")
                                }
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
