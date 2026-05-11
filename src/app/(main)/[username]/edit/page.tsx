"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/app/actions/user";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import { REGIONS } from "@/lib/constants";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

export default function EditProfilePage() {
    const { data: session, update } = useSession();
    const { t } = useTranslation();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const user = session?.user as any;

    const [form, setForm] = useState({
        name: user?.name || "",
        bio: user?.bio || "",
        location: user?.location || "",
        website: user?.website || "",
        countryCode: user?.countryCode || "GLOBAL",
    });

    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string>((user as any)?.avatar || user?.image || "");
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState<string>(user?.coverImage || "");
    const coverInputRef = useRef<HTMLInputElement>(null);
    const locationInputRef = useRef<HTMLInputElement>(null);

    const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((f) => ({ ...f, [k]: e.target.value }));

    useEffect(() => {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) return;

        setOptions({
            key: apiKey,
            v: "weekly"
        });

        importLibrary("places").then((places) => {
            if (!locationInputRef.current) return;
            const autocomplete = new places.Autocomplete(locationInputRef.current, {
                types: ["(cities)"]
            });

            autocomplete.addListener("place_changed", () => {
                const place = autocomplete.getPlace();
                if (!place.address_components) return;

                const countryComponent = place.address_components.find(
                    (c: any) => c.types.includes("country")
                );

                setForm(f => ({
                    ...f,
                    location: countryComponent ? countryComponent.long_name : f.location,
                    countryCode: countryComponent ? countryComponent.short_name : f.countryCode
                }));

            });
        });
    }, []);

    const handleDetectLocation = () => {
        if (!navigator.geolocation) return alert("Geolocation not supported");

        navigator.geolocation.getCurrentPosition((position) => {
            const { latitude, longitude } = position.coords;
            const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
            if (!apiKey) return;

            setOptions({ key: apiKey });

            Promise.all([importLibrary("geocoding"), importLibrary("places")]).then(([geocoding]) => {
                const geocoder = new geocoding.Geocoder();
                geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
                    if (status === "OK" && results?.[0]) {
                        const place = results[0];
                        const countryComponent = place.address_components.find(
                            (c: any) => c.types.includes("country")
                        );

                        setForm(f => ({
                            ...f,
                            location: countryComponent ? countryComponent.long_name : f.location,
                            countryCode: countryComponent ? countryComponent.short_name : f.countryCode
                        }));

                    }
                });
            });
        });
    };

    const handleFile = (type: 'avatar' | 'cover') => (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            setError(t("imageLimit").replace("{type}", t(type)));
            return;
        }

        const reader = new FileReader();
        reader.onload = (evt) => {
            if (type === 'avatar') {
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
                let avatarUrl = undefined;
                let coverUrl = undefined;

                const { upload } = await import('@vercel/blob/client');

                if (avatarFile) {
                    try {
                        const newBlob = await upload(avatarFile.name, avatarFile, {
                            access: 'public',
                            handleUploadUrl: '/api/upload',
                        });
                        avatarUrl = newBlob.url;
                    } catch (uploadErr: any) {
                        console.error("Avatar Upload Error:", uploadErr);
                        throw new Error(t("failedUploadAvatar"));
                    }
                }

                if (coverFile) {
                    try {
                        const newBlob = await upload(coverFile.name, coverFile, {
                            access: 'public',
                            handleUploadUrl: '/api/upload',
                        });
                        coverUrl = newBlob.url;
                    } catch (uploadErr: any) {
                        console.error("Cover Upload Error:", uploadErr);
                        throw new Error(t("failedUploadCover"));
                    }
                }

                await updateProfile({
                    name: form.name,
                    bio: form.bio,
                    location: form.location,
                    website: form.website,
                    countryCode: form.countryCode,
                    ...(avatarUrl ? { avatar: avatarUrl } : {}),
                    ...(coverUrl ? { coverImage: coverUrl } : {}),
                });

                await update();
                setSuccess(true);
                setTimeout(() => router.push(`/${user?.username}`), 1000);
            } catch (e: any) {
                setError(e.message || t("failedSaveProfile"));
            }
        });
    };

    return (
        <div style={{ paddingBottom: 100 }}>
            <div className="column-header">
                <Link href={`/${user?.username}`} className="back-btn" aria-label={t("back")}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </Link>
                <h1>{t("editProfile")}</h1>
                <button
                    className="btn btn-primary"
                    style={{ marginLeft: "auto" }}
                    onClick={handleSubmit}
                    disabled={isPending}
                >
                    {isPending ? t("saving") : t("save")}
                </button>
            </div>

            <form onSubmit={handleSubmit}>
                {/* Cover Upload */}
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
                    <input type="file" accept="image/*,image/gif" ref={coverInputRef} style={{ display: "none" }} onChange={handleFile('cover')} />
                </div>

                <div style={{ padding: "0 24px" }}>
                    {/* Avatar Upload */}
                    <div
                        className="avatar-placeholder avatar-2xl avatar-ring"
                        style={{ cursor: "pointer", position: "relative", marginTop: -60, background: "var(--bg-main)", overflow: "hidden" }}
                        onClick={() => avatarInputRef.current?.click()}
                    >
                        {avatarPreview ? (
                            <img src={avatarPreview} alt="Avatar preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                            <div style={{ fontSize: "2rem" }}>{user?.name?.[0]?.toUpperCase()}</div>
                        )}
                        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.3)", color: "white" }}>
                            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                                <circle cx="12" cy="13" r="4" />
                            </svg>
                        </div>
                        <input type="file" accept="image/*,image/gif" ref={avatarInputRef} style={{ display: "none" }} onChange={handleFile('avatar')} />
                    </div>

                    <div style={{ marginTop: 24 }}>
                        {success && (
                            <div style={{ background: "var(--green-faint)", color: "var(--green)", padding: "12px 16px", borderRadius: "var(--radius)", marginBottom: 16, fontSize: "0.9rem" }}>
                                ✓ {t("profileUpdated")}
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">{t("displayName")}</label>
                            <input className="form-input" type="text" value={form.name} onChange={set("name")} required maxLength={50} />
                        </div>

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

                        <div className="form-group">
                            <label className="form-label">{t("location")}</label>
                            <div style={{ display: "flex", gap: 8 }}>
                                <input 
                                    ref={locationInputRef}
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
                                    style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 4, height: "42px" }}
                                    title="Detectar Ubicación"
                                >
                                     📍
                                </button>
                            </div>
                        </div>


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
