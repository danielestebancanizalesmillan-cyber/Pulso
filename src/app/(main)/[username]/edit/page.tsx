"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { updateProfile, getProfileData } from "@/app/actions/user";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import { REGIONS } from "@/lib/constants";
import { MapPin, Globe, Loader2 } from "lucide-react";

export default function EditProfilePage() {
    const { data: session, update } = useSession();
    const { t } = useTranslation();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const user = session?.user as any;

    const [form, setForm] = useState({
        name: user?.name || "",
        username: user?.username || "",
        bio: user?.bio || "",
        location: user?.location || "",
        website: user?.website || "",
        countryCode: user?.countryCode || "GLOBAL",
        profileAudioUrl: user?.profileAudioUrl || "",
        profileAudioTitle: user?.profileAudioTitle || "",
        profileAudioStart: user?.profileAudioStart || 0,
    });

    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string>((user as any)?.avatar || user?.image || "");
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState<string>(user?.coverImage || "");
    const coverInputRef = useRef<HTMLInputElement>(null);

    const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((f) => ({ ...f, [k]: e.target.value }));

    // Fetch full profile data
    useEffect(() => {
        getProfileData().then((data) => {
            if (data) {
                setForm(f => ({
                    ...f,
                    name: data.name || "",
                    username: data.username || "",
                    bio: data.bio || "",
                    location: data.location || "",
                    website: data.website || "",
                    countryCode: data.countryCode || "GLOBAL",
                    profileAudioUrl: data.profileAudioUrl || "",
                    profileAudioTitle: data.profileAudioTitle || "",
                    profileAudioStart: data.profileAudioStart || 0,
                }));
                if (data.avatar) setAvatarPreview(data.avatar);
                if (data.coverImage) setCoverPreview(data.coverImage);
            }
        }).catch(console.error);
    }, []);

    // Map ISO 3166-1 alpha-2 to REGIONS codes
    const isoToRegion = (iso: string): string => {
        const map: Record<string, string> = {
            ES: "ES", MX: "MX", AR: "AR", CO: "CO", US: "US",
        };
        return map[iso.toUpperCase()] ?? "GLOBAL";
    };

    const handleDetectLocation = () => {
        if (!navigator.geolocation) return alert("Geolocation not supported");
        setIsLocating(true);

        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
                );
                const data = await res.json();

                const country = data.address.country || "";
                const city = data.address.city || data.address.town || data.address.village || "";
                const isoCode = data.address.country_code?.toUpperCase() || "GLOBAL";
                const regionCode = isoToRegion(isoCode);

                setForm(f => ({
                    ...f,
                    location: city ? `${city}, ${country}` : country,
                    countryCode: regionCode,
                }));
            } catch (err) {
                console.error("Geocoding error:", err);
                alert("No se pudo obtener la ubicación");
            } finally {
                setIsLocating(false);
            }
        }, () => {
            alert("No se pudo acceder a la ubicación");
            setIsLocating(false);
        });
    };

    const handleFile = (type: "avatar" | "cover") => (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            setError(t("imageLimit").replace("{type}", t(type)));
            return;
        }
        const reader = new FileReader();
        reader.onload = (evt) => {
            if (type === "avatar") {
                setAvatarFile(file);
                setAvatarPreview(evt.target?.result as string);
            } else {
                setCoverFile(file);
                setCoverPreview(evt.target?.result as string);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess(false);

        startTransition(async () => {
            try {
                let avatarUrl: string | undefined;
                let coverUrl: string | undefined;
                const { upload } = await import("@vercel/blob/client");

                if (avatarFile) {
                    const blob = await upload(avatarFile.name, avatarFile, { access: "public", handleUploadUrl: "/api/upload" });
                    avatarUrl = blob.url;
                }
                if (coverFile) {
                    const blob = await upload(coverFile.name, coverFile, { access: "public", handleUploadUrl: "/api/upload" });
                    coverUrl = blob.url;
                }

                await updateProfile({
                    name: form.name,
                    username: form.username,
                    bio: form.bio,
                    location: form.location,
                    website: form.website,
                    countryCode: form.countryCode,
                    profileAudioUrl: form.profileAudioUrl,
                    profileAudioTitle: form.profileAudioTitle,
                    profileAudioStart: parseInt(form.profileAudioStart as any) || 0,
                    ...(avatarUrl ? { avatar: avatarUrl } : {}),
                    ...(coverUrl ? { coverImage: coverUrl } : {}),
                });

                await update();
                router.refresh();
                setSuccess(true);
                setTimeout(() => router.push(`/${form.username || user?.username}`), 1200);
            } catch (e: any) {
                setError(e.message || t("failedSaveProfile"));
            }
        });
    };

    const currentRegion = REGIONS.find(r => r.code === form.countryCode);

    return (
        <div style={{ paddingBottom: 100 }}>
            <div className="column-header">
                <Link href={`/${user?.username}`} className="back-btn" aria-label={t("back")}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </Link>
                <h1>{t("editProfile")}</h1>
                <button className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={handleSubmit} disabled={isPending}>
                    {isPending ? t("saving") : t("save")}
                </button>
            </div>

            <form onSubmit={handleSubmit}>
                {/* Cover */}
                <div
                    className="profile-cover edit-mode"
                    style={{ cursor: "pointer", position: "relative", background: "var(--bg-hover)", height: 200 }}
                    onClick={() => coverInputRef.current?.click()}
                >
                    {coverPreview && <img src={coverPreview} className="profile-cover-img" alt="Cover preview" />}
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.3)", color: "white" }}>
                        <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                            <circle cx="12" cy="13" r="4" />
                        </svg>
                    </div>
                    <input type="file" accept="image/*,image/gif" ref={coverInputRef} style={{ display: "none" }} onChange={handleFile("cover")} />
                </div>

                <div style={{ padding: "0 24px" }}>
                    {/* Avatar */}
                    <div
                        className="avatar-placeholder avatar-2xl avatar-ring"
                        style={{ cursor: "pointer", position: "relative", marginTop: -60, background: "var(--bg-main)", overflow: "hidden" }}
                        onClick={() => avatarInputRef.current?.click()}
                    >
                        {avatarPreview ? (
                            <img src={avatarPreview} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                            <div style={{ fontSize: "2rem" }}>{user?.name?.[0]?.toUpperCase()}</div>
                        )}
                        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.3)", color: "white" }}>
                            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                                <circle cx="12" cy="13" r="4" />
                            </svg>
                        </div>
                        <input type="file" accept="image/*,image/gif" ref={avatarInputRef} style={{ display: "none" }} onChange={handleFile("avatar")} />
                    </div>

                    <div style={{ marginTop: 24 }}>
                        {success && (
                            <div style={{ background: "var(--green-faint)", color: "var(--green)", padding: "12px 16px", borderRadius: "var(--radius)", marginBottom: 16, fontSize: "0.9rem" }}>
                                ✓ {t("profileUpdated")}
                            </div>
                        )}

                        {/* Nombre */}
                        <div className="form-group">
                            <label className="form-label">{t("displayName")}</label>
                            <input className="form-input" type="text" value={form.name} onChange={set("name")} required maxLength={50} />
                        </div>

                        {/* Username */}
                        <div className="form-group">
                            <label className="form-label">Nombre de usuario (@)</label>
                            <div style={{ position: "relative" }}>
                                <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }}>@</span>
                                <input
                                    className="form-input"
                                    type="text"
                                    value={form.username}
                                    onChange={(e) => setForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") }))}
                                    required minLength={4} maxLength={15}
                                    style={{ paddingLeft: 32 }}
                                />
                            </div>
                        </div>
                        {/* Música del Perfil */}
                        <div className="form-group" style={{ marginTop: 32 }}>
                            <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "1rem", fontWeight: 800 }}>
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                                Música del perfil
                            </label>
                            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 12 }}>
                                Elige una canción para que suene cuando alguien visite tu perfil.
                            </p>
                            
                            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                <div>
                                    <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginLeft: 4 }}>URL de la canción (YouTube o MP3)</label>
                                    <input 
                                        className="form-input" 
                                        type="text" 
                                        value={form.profileAudioUrl} 
                                        onChange={set("profileAudioUrl")} 
                                        placeholder="Ej: https://youtube.com/watch?v=..." 
                                    />
                                </div>
                                
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 12 }}>
                                    <div>
                                        <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginLeft: 4 }}>Título de la canción</label>
                                        <input 
                                            className="form-input" 
                                            type="text" 
                                            value={form.profileAudioTitle} 
                                            onChange={set("profileAudioTitle")} 
                                            placeholder="Ej: Starboy - The Weeknd" 
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginLeft: 4 }}>Inicio (seg)</label>
                                        <input 
                                            className="form-input" 
                                            type="number" 
                                            value={form.profileAudioStart} 
                                            onChange={set("profileAudioStart")} 
                                            placeholder="0" 
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bio */}
                        <div className="form-group">
                            <label className="form-label">{t("bio")}</label>
                            <textarea
                                className="form-input"
                                value={form.bio}
                                onChange={set("bio") as any}
                                maxLength={160}
                                rows={4}
                                placeholder={t("tellWorld")}
                                style={{ resize: "vertical" }}
                            />
                            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: 4, textAlign: "right" }}>
                                {form.bio.length}/160
                            </div>
                        </div>

                        {/* Ubicación + Región del feed */}
                        <div className="form-group">
                            <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <MapPin size={14} />
                                Ubicación y región del feed
                            </label>

                            {/* Campo de texto libre */}
                            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                                <input
                                    className="form-input"
                                    type="text"
                                    value={form.location}
                                    onChange={set("location")}
                                    maxLength={100}
                                    placeholder={t("whereAreYou")}
                                    style={{ flex: 1 }}
                                />
                                <button
                                    type="button"
                                    onClick={handleDetectLocation}
                                    className="btn btn-secondary"
                                    disabled={isLocating}
                                    style={{ padding: "8px 14px", display: "flex", alignItems: "center", gap: 6, height: "42px", whiteSpace: "nowrap" }}
                                    title="Detectar con GPS"
                                >
                                    {isLocating
                                        ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                                        : <MapPin size={16} />}
                                    {isLocating ? "Detectando..." : "Detectar"}
                                </button>
                            </div>

                            {/* Selector de región — conectado al filtro global/local del inicio */}
                            <div style={{
                                background: "var(--bg-secondary)",
                                borderRadius: 12,
                                padding: "14px",
                                border: "1px solid var(--border)"
                            }}>
                                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                                    <Globe size={13} />
                                    <span>
                                        Región del feed — define qué ves al elegir{" "}
                                        <strong style={{ color: "var(--blue)" }}>📍 Local</strong>{" "}
                                        en el inicio
                                    </span>
                                </div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                    {REGIONS.map(region => {
                                        const isSelected = form.countryCode === region.code;
                                        return (
                                            <button
                                                key={region.code}
                                                type="button"
                                                onClick={() => setForm(f => ({ ...f, countryCode: region.code }))}
                                                style={{
                                                    padding: "6px 16px",
                                                    borderRadius: "20px",
                                                    border: isSelected ? "2px solid var(--blue)" : "1px solid var(--border)",
                                                    background: isSelected ? "rgba(29,155,240,0.12)" : "var(--bg-main)",
                                                    color: isSelected ? "var(--blue)" : "var(--text-secondary)",
                                                    fontWeight: isSelected ? 700 : 400,
                                                    cursor: "pointer",
                                                    fontSize: "0.85rem",
                                                    transition: "all 0.15s ease",
                                                }}
                                            >
                                                {region.code === "GLOBAL" ? "🌐" : "📍"} {region.name}
                                            </button>
                                        );
                                    })}
                                </div>
                                {currentRegion && (
                                    <p style={{ marginTop: 10, fontSize: "0.78rem", color: "var(--text-secondary)", margin: "10px 0 0" }}>
                                        {form.countryCode === "GLOBAL"
                                            ? "Verás publicaciones de todo el mundo al seleccionar Local."
                                            : `Verás publicaciones de ${currentRegion.name} al seleccionar 📍 Local en el inicio.`}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Website */}
                        <div className="form-group">
                            <label className="form-label">{t("website")}</label>
                            <input className="form-input" type="url" value={form.website} onChange={set("website")} maxLength={100} placeholder="https://example.com" />
                        </div>

                        {error && <p className="form-error">⚠ {error}</p>}
                    </div>
                </div>
            </form>
        </div>
    );
}
