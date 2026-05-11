"use client";

import { useSession, signOut } from "next-auth/react";
import { useTheme } from "./ThemeProvider";
import { useTranslation } from "@/lib/i18n";
import { Avatar } from "./Avatar";
import Link from "next/link";
import { useState, useEffect } from "react";
import styles from "./Settings.module.css";
import { getUserInterests, updateUserInterests } from "@/app/actions/interests";
import { getUserSettings, updateUserSetting } from "@/app/actions/settings";
import { generate2FASecret, enable2FA, disable2FA, get2FAStatus } from "@/app/actions/two-factor";
import { submitVerificationRequest, getVerificationStatus } from "@/app/actions/verification";
import { FollowRequestsModal } from "./FollowRequestsModal";
import { updateUserLabel, updateBirthDate, updateSensitiveToggle } from "@/app/actions/user";

const THEMES = [
    { id: "light", labelKey: "switchToLight", color: "#1d9bf0", bg: "#ffffff" },
    { id: "soft-light", labelKey: "switchToSoftLight", color: "#1d9bf0", bg: "#f5f8fa" },
    { id: "dark", labelKey: "switchToDark", color: "#1d9bf0", bg: "#000000" },
    { id: "soft-dark", labelKey: "switchToSoftDark", color: "#1d9bf0", bg: "#15202b" },
    { id: "yellow", labelKey: "switchToYellow", color: "#000000", bg: "#ffeb3b" },
    { id: "brown", labelKey: "switchToBrown", color: "#ffb74d", bg: "#3e2723" },
];

export function SettingsClient() {
    const { data: session } = useSession();
    const { theme, setThemeString } = useTheme();
    const { t, locale, toggleLocale } = useTranslation();
    const [mounted, setMounted] = useState(false);
    
    // Expanded Feature toggles state
    const [features, setFeatures] = useState({
        showViews: true,
        showTrends: true,
        showTranslation: true,
        autoplayVideos: true,
        protectedTweets: false,
        sensitiveSearch: false,
        reduceMotion: false,
        highContrast: false,
        twoFactorAuth: false,
    });
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
    const [savingInterests, setSavingInterests] = useState(false);
    
    // 2FA State
    const [is2FAEnabled, setIs2FAEnabled] = useState(false);
    const [show2FAModal, setShow2FAModal] = useState(false);
    const [qrCodeUrl, setQrCodeUrl] = useState("");
    const [verificationCode, setVerificationCode] = useState("");
    const [twoFactorError, setTwoFactorError] = useState("");
    const [loading2FA, setLoading2FA] = useState(false);

    // Accent & Verification
    const [accentColor, setAccentColor] = useState("blue");
    const [verificationStatus, setVerificationStatus] = useState<string>("none");
    const [loadingVerification, setLoadingVerification] = useState(false);

    // Backup Codes
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [showBackupCodes, setShowBackupCodes] = useState(false);

    // Follow Requests
    const [showFollowRequests, setShowFollowRequests] = useState(false);
    const [accountLabel, setAccountLabel] = useState<string | null>(null);
    const [birthDate, setBirthDate] = useState<string>("");
    const [showSensitiveContent, setShowSensitiveContent] = useState(false);

    useEffect(() => {
        setMounted(true);

        if (typeof window !== "undefined") {
            const savedAccent = localStorage.getItem("accent") || "blue";
            setAccentColor(savedAccent);
            document.body.setAttribute('data-accent', savedAccent);
        }

        getVerificationStatus().then(res => {
            setVerificationStatus(res.status);
        });

        // Load from localStorage
        const savedFeatures = {
            showViews: localStorage.getItem("twtr_show_views") !== "false",
            showTrends: localStorage.getItem("twtr_show_trends") !== "false",
            showTranslation: localStorage.getItem("twtr_show_translation") !== "false",
            autoplayVideos: localStorage.getItem("twtr_autoplay_videos") !== "false",
            protectedTweets: localStorage.getItem("twtr_protected_tweets") === "true",
            sensitiveSearch: localStorage.getItem("twtr_sensitive_search") === "true",
            reduceMotion: localStorage.getItem("twtr_reduce_motion") === "true",
            highContrast: localStorage.getItem("twtr_high_contrast") === "true",
            twoFactorAuth: localStorage.getItem("twtr_two_factor_auth") === "true",
        };
        setFeatures(savedFeatures);

        // Apply accessibility settings
        document.body.classList.toggle("reduce-motion", savedFeatures.reduceMotion);
        document.body.classList.toggle("high-contrast", savedFeatures.highContrast);

        // Load from DB
        getUserSettings().then(dbSettings => {
            if (dbSettings) {
                setFeatures(prev => {
                    const merged = { ...prev };
                    if (dbSettings.showViews !== undefined) { merged.showViews = dbSettings.showViews === "true"; localStorage.setItem("twtr_show_views", dbSettings.showViews); }
                    if (dbSettings.showTrends !== undefined) { merged.showTrends = dbSettings.showTrends === "true"; localStorage.setItem("twtr_show_trends", dbSettings.showTrends); }
                    if (dbSettings.showTranslation !== undefined) { merged.showTranslation = dbSettings.showTranslation === "true"; localStorage.setItem("twtr_show_translation", dbSettings.showTranslation); }
                    if (dbSettings.autoplayVideos !== undefined) { merged.autoplayVideos = dbSettings.autoplayVideos === "true"; localStorage.setItem("twtr_autoplay_videos", dbSettings.autoplayVideos); }
                    if (dbSettings.protectedTweets !== undefined) { merged.protectedTweets = dbSettings.protectedTweets === "true"; localStorage.setItem("twtr_protected_tweets", dbSettings.protectedTweets); }
                    if (dbSettings.sensitiveSearch !== undefined) { merged.sensitiveSearch = dbSettings.sensitiveSearch === "true"; localStorage.setItem("twtr_sensitive_search", dbSettings.sensitiveSearch); }
                    if (dbSettings.reduceMotion !== undefined) { merged.reduceMotion = dbSettings.reduceMotion === "true"; localStorage.setItem("twtr_reduce_motion", dbSettings.reduceMotion); }
                    if (dbSettings.highContrast !== undefined) { merged.highContrast = dbSettings.highContrast === "true"; localStorage.setItem("twtr_high_contrast", dbSettings.highContrast); }
                    if (dbSettings.twoFactorAuth !== undefined) { merged.twoFactorAuth = dbSettings.twoFactorAuth === "true"; localStorage.setItem("twtr_two_factor_auth", dbSettings.twoFactorAuth); }

                    document.body.classList.toggle("reduce-motion", merged.reduceMotion);
                    document.body.classList.toggle("high-contrast", merged.highContrast);

                    setTimeout(() => {
                        window.dispatchEvent(new Event("twtr_settings_changed"));
                    }, 0);
                    return merged;
                });
            }
        });

        // Load interests from DB
        getUserInterests().then(setSelectedInterests);
        get2FAStatus().then(res => setIs2FAEnabled(res.enabled));
    }, []);

    const user = session?.user as any;

    useEffect(() => {
        if (user?.accountLabel !== undefined) {
             setAccountLabel(user?.accountLabel);
        }
        if (user?.birthDate) {
            setBirthDate(new Date(user.birthDate).toISOString().split('T')[0]);
        }
        if (user?.showSensitiveContent !== undefined) {
            setShowSensitiveContent(user.showSensitiveContent);
        }
    }, [user]);

    const handle2FAClick = async () => {
        setTwoFactorError("");
        setVerificationCode("");
        if (is2FAEnabled) {
            setShow2FAModal(true);
        } else {
            setLoading2FA(true);
            try {
                const res = await generate2FASecret();
                setQrCodeUrl(res.qrCodeDataUrl);
                setShow2FAModal(true);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading2FA(false);
            }
        }
    };

    const handleEnable2FA = async () => {
        setTwoFactorError("");
        try {
            const res = await enable2FA(verificationCode);
            setIs2FAEnabled(true);
            if (res.backupCodes) {
                setBackupCodes(res.backupCodes);
                setShowBackupCodes(true);
            } else {
                setShow2FAModal(false);
            }
            setVerificationCode("");
        } catch (e: any) {
            setTwoFactorError(e.message || "Error al activar 2FA");
        }
    };

    const handleDisable2FA = async () => {
        setTwoFactorError("");
        try {
            await disable2FA(verificationCode);
            setIs2FAEnabled(false);
            setShow2FAModal(false);
            setVerificationCode("");
        } catch (e: any) {
            setTwoFactorError(e.message || "Error al desactivar 2FA");
        }
    };

    const handleAccentChange = (color: string) => {
        setAccentColor(color);
        document.body.setAttribute('data-accent', color);
        if (typeof window !== "undefined") {
            localStorage.setItem("accent", color);
        }
    };

    const handleVerifySubmit = async () => {
        setLoadingVerification(true);
        try {
            await submitVerificationRequest();
            setVerificationStatus("pending");
        } catch (e: any) {
             alert(e.message || "Error al enviar solicitud");
        } finally {
            setLoadingVerification(false);
        }
    };

    const toggleFeature = (key: keyof typeof features) => {
        const newValue = !features[key];
        const newFeatures = { ...features, [key]: newValue };
        setFeatures(newFeatures);
        localStorage.setItem(`twtr_${key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)}`, String(newValue));
        
        // Save to DB
        updateUserSetting(key, String(newValue));

        // Apply immediate effect
        if (key === "reduceMotion") document.body.classList.toggle("reduce-motion", newValue);
        if (key === "highContrast") document.body.classList.toggle("high-contrast", newValue);

        // Dispatch custom event to notify other components
        setTimeout(() => {
            window.dispatchEvent(new Event("twtr_settings_changed"));
        }, 0);
    };

    const toggleInterest = async (cat: string) => {
        const newInterests = selectedInterests.includes(cat)
            ? selectedInterests.filter(i => i !== cat)
            : [...selectedInterests, cat];
        setSelectedInterests(newInterests);
        
        await updateUserInterests(newInterests);
    };

    // const user = session?.user as any;

    if (!mounted || !session) return <div className={`${styles.settingsContainer} skeleton-container`} style={{ padding: 20 }}>{t("loading")}</div>;

    return (
        <div className={styles.settingsContainer}>
            {/* Account Section */}
            <section className={styles.settingsSection}>
                <div className={styles.sectionHeader}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                    <h2 className={styles.settingsSectionTitle}>{t("account")}</h2>
                </div>
                <div className={`${styles.settingsCard} ${styles.premiumCard}`}>
                    <Link href={`/${user?.username}/edit`} className={styles.settingsRow}>
                        <div className={styles.profileRowInfo}>
                            <Avatar user={user} size="lg" />
                            <div className={styles.userDetails}>
                                <span className={styles.userName}>{user?.name}</span>
                                <span className={styles.userHandle}>@{user?.username}</span>
                            </div>
                        </div>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="arrow-icon">
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    </Link>
                    <div className={styles.divider} />
                    <div className={styles.settingsRow} style={{ padding: "16px" }}>
                        <div className={styles.rowContent}>
                            <span className={styles.rowLabel}>Etiqueta de Cuenta</span>
                            <span className={styles.rowDesc}>Identifica tu cuenta (Parodia, Automatizado).</span>
                        </div>
                        <select 
                            value={accountLabel || ""} 
                            onChange={async (e) => {
                                const val = e.target.value || null;
                                setAccountLabel(val);
                                try {
                                    await updateUserLabel(val);
                                } catch (e: any) {
                                    alert(e.message || "Error al actualizar label");
                                }
                            }}
                            className={styles.selectionPill}
                            style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text)", padding: "4px 8px", borderRadius: "12px", outline: "none" }}
                        >
                            <option value="">Ninguna</option>
                            <option value="PARODIA">Parodia</option>
                            <option value="BOT">Automatizado</option>
                        </select>
                    </div>
                    <div className={styles.divider} />
                    <div className={styles.settingsRow} style={{ padding: "16px" }}>
                        <div className={styles.rowContent}>
                            <span className={styles.rowLabel}>Fecha de Nacimiento</span>
                            <span className={styles.rowDesc}>Usada para la moderación de contenido.</span>
                        </div>
                        <input 
                            type="date"
                            value={birthDate}
                            onChange={async (e) => {
                                const val = e.target.value;
                                setBirthDate(val);
                                try {
                                    await updateBirthDate(val ? new Date(val) : null);
                                } catch (err: any) {
                                    alert(err.message || "Error updating birth date");
                                }
                            }}
                            style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text)", padding: "4px 8px", borderRadius: "12px", outline: "none" }}
                        />
                    </div>
                </div>
            </section>

            {/* Security Section */}
            <section className={styles.settingsSection}>
                <div className={styles.sectionHeader}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                    <h2 className={styles.settingsSectionTitle}>{t("security")}</h2>
                </div>
                <div className={styles.settingsCard}>
                    <div className={styles.settingsRow} onClick={handle2FAClick} style={{ cursor: "pointer" }}>
                        <div className={styles.rowContent}>
                            <span className={styles.rowLabel}>{t("twoFactorAuth")}</span>
                            <span className={styles.rowDesc}>{t("extraSecurity")}</span>
                        </div>
                        <span className={styles.statusBadge} style={{ background: is2FAEnabled ? "var(--green)" : "var(--bg-hover)", color: is2FAEnabled ? "#fff" : "var(--text-secondary)" }}>
                            {is2FAEnabled ? (t("enabled") || "Activado") : t("disabled")}
                            {loading2FA && <span className="spinner-small" style={{ marginLeft: "6px" }} />}
                        </span>
                    </div>

                    <div className={styles.divider} />
                    <div className={styles.settingsRow} onClick={verificationStatus === "none" ? handleVerifySubmit : undefined} style={{ cursor: verificationStatus === "none" ? "pointer" : "default" }}>
                        <div className={styles.rowContent}>
                            <span className={styles.rowLabel}>Solicitar Verificación</span>
                            <span className={styles.rowDesc}>Envía una solicitud para obtener la insignia de verificado.</span>
                        </div>
                        <span className={styles.statusBadge} style={{ 
                            background: verificationStatus === "pending" ? "#ff9900" : verificationStatus === "approved" ? "var(--green)" : "var(--bg-hover)", 
                            color: verificationStatus === "none" ? "var(--text-secondary)" : "#fff",
                            padding: "4px 10px", borderRadius: "12px", fontSize: "0.8rem"
                        }}>
                            {verificationStatus === "pending" ? "Pendiente" : verificationStatus === "approved" ? "Verificado" : verificationStatus === "rejected" ? "Rechazado" : "Solicitar"}
                            {loadingVerification && <span className="spinner-small" style={{ marginLeft: "6px" }} />}
                        </span>
                    </div>
                </div>
            </section>

            {/* Display & Language */}
            <section className={styles.settingsSection}>
                <div className={styles.sectionHeader}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                    <h2 className={styles.settingsSectionTitle}>{t("displayAndLanguage")}</h2>
                </div>
                <div className={styles.settingsCard}>
                    <div className={styles.themeSelectorWrap}>
                        <p className={styles.subHeader}>{t("selectTheme")}</p>
                        <div className={styles.themesGrid}>
                            {THEMES.map((tItem) => {
                                const isActive = theme === tItem.id;
                                return (
                                    <button
                                        key={tItem.id}
                                        onClick={() => setThemeString(tItem.id as any)}
                                        className={`${styles.themePill} ${isActive ? styles.active : ''}`}
                                        style={{
                                            background: tItem.bg,
                                            color: tItem.id.includes("light") || tItem.id === "yellow" ? "#000" : "#fff",
                                        }}
                                    >
                                        <div className={styles.themeDot} style={{ background: tItem.color }} />
                                        <span>{t(tItem.labelKey)}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className={styles.divider} />

                    <div style={{ padding: "16px" }}>
                        <p className={styles.subHeader}>Color de Acento</p>
                        <div style={{ display: "flex", gap: "16px", marginTop: "12px" }}>
                            {["blue", "green", "pink", "yellow"].map((color) => (
                                <button
                                    key={color}
                                    onClick={() => handleAccentChange(color)}
                                    style={{
                                        width: "32px", height: "32px", borderRadius: "50%",
                                        background: color === "blue" ? "#1d9bf0" : color === "green" ? "#00ba7c" : color === "pink" ? "#f91880" : "#ffd400",
                                        border: accentColor === color ? "3px solid var(--text-primary)" : "none",
                                        cursor: "pointer", transform: "scale(1.1)"
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    <div className={styles.divider} />

                    <button className={styles.settingsRow} onClick={toggleLocale}>
                        <div className={styles.rowContent}>
                            <span className={styles.rowLabel}>{t("language")}</span>
                            <span className={styles.rowDesc}>{t("appLanguageDesc")}</span>
                        </div>
                        <div className={styles.selectionPill}>
                            {locale === "en" ? "English" : "Español"}
                        </div>
                    </button>
                </div>
            </section>

            {/* Privacy & Safety */}
            <section className={styles.settingsSection}>
                <div className={styles.sectionHeader}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                    <h2 className={styles.settingsSectionTitle}>{t("privacyAndSafety")}</h2>
                </div>
                <div className={styles.settingsCard}>
                    <div className={styles.settingsRow} onClick={() => toggleFeature("protectedTweets")}>
                        <div className={styles.rowContent}>
                            <span className={styles.rowLabel}>{t("protectedTweets")}</span>
                            <span className={styles.rowDesc}>{t("onlyFollowersSee")}</span>
                        </div>
                        <div className={`${styles.switch} ${features.protectedTweets ? styles.on : ''}`} />
                    </div>
                    <div className={styles.divider} />
                    <div className={styles.settingsRow} onClick={() => setShowFollowRequests(true)} style={{ cursor: "pointer" }}>
                        <div className={styles.rowContent}>
                            <span className={styles.rowLabel}>Solicitudes de Seguimiento</span>
                            <span className={styles.rowDesc}>Ver y aprobar personas que desean seguirte.</span>
                        </div>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ width: 16, height: 16, color: "var(--text-secondary)" }}>
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    </div>
                    <div className={styles.settingsRow} onClick={() => toggleFeature("sensitiveSearch")}>
                        <div className={styles.rowContent}>
                            <span className={styles.rowLabel}>{t("sensitiveSearch")}</span>
                            <span className={styles.rowDesc}>{t("hideSensitiveContent")}</span>
                        </div>
                        <div className={`${styles.switch} ${features.sensitiveSearch ? styles.on : ''}`} />
                    </div>
                    <div className={styles.divider} />
                    <div className={styles.settingsRow} onClick={async () => {
                        const newVal = !showSensitiveContent;
                        setShowSensitiveContent(newVal);
                        try {
                            await updateSensitiveToggle(newVal);
                        } catch (err: any) {
                            alert(err.message || "Error updating sensitive toggle");
                        }
                    }}>
                        <div className={styles.rowContent}>
                            <span className={styles.rowLabel}>Mostrar contenido sensible</span>
                            <span className={styles.rowDesc}>Permite ver contenido marcado como sensible sin advertencias (solo adultos).</span>
                        </div>
                        <div className={`${styles.switch} ${showSensitiveContent ? styles.on : ''}`} />
                    </div>
                </div>
            </section>

            {/* Intereses y Contenido */}
            <section className={styles.settingsSection}>
                <div className={styles.sectionHeader}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                    <h2 className={styles.settingsSectionTitle}>Intereses y Contenido</h2>
                </div>
                <div className={styles.settingsCard} style={{ padding: "16px" }}>
                    <p className={styles.rowDesc} style={{ marginBottom: "12px", color: "var(--text-secondary)" }}>
                        Selecciona los temas que quieres ver en tu feed principal:
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                        {["Tecnología", "Deportes", "Entretenimiento", "Política", "Finanzas", "Gaming", "Música", "Cine"].map((cat) => {
                            const isSelected = selectedInterests.includes(cat);
                            return (
                                <button
                                    key={cat}
                                    onClick={() => toggleInterest(cat)}
                                    className={`${styles.themePill} ${isSelected ? styles.active : ''}`}
                                    style={{
                                        background: isSelected ? "var(--blue)" : "var(--bg-hover)",
                                        color: isSelected ? "#fff" : "var(--text)",
                                        border: "1px solid var(--border)",
                                        padding: "8px 16px",
                                        borderRadius: "20px",
                                        cursor: "pointer",
                                        fontSize: "0.85rem",
                                        fontWeight: 600,
                                        transition: "all 0.2s"
                                    }}
                                >
                                    {cat}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Features (Personalization) */}
            <section className={styles.settingsSection}>
                <div className={styles.sectionHeader}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                    <h2 className={styles.settingsSectionTitle}>{t("personalization")}</h2>
                </div>
                <div className={styles.settingsCard}>
                    <div className={styles.settingsRow} onClick={() => toggleFeature("showViews")}>
                        <div className={styles.rowContent}>
                            <span className={styles.rowLabel}>{t("showViews")}</span>
                        </div>
                        <div className={`${styles.switch} ${features.showViews ? styles.on : ''}`} />
                    </div>
                    <div className={styles.settingsRow} onClick={() => toggleFeature("showTrends")}>
                        <div className={styles.rowContent}>
                            <span className={styles.rowLabel}>{t("showTrends")}</span>
                        </div>
                        <div className={`${styles.switch} ${features.showTrends ? styles.on : ''}`} />
                    </div>
                    <div className={styles.settingsRow} onClick={() => toggleFeature("showTranslation")}>
                        <div className={styles.rowContent}>
                            <span className={styles.rowLabel}>{t("showTranslation")}</span>
                        </div>
                        <div className={`${styles.switch} ${features.showTranslation ? styles.on : ''}`} />
                    </div>
                    <div className={styles.settingsRow} onClick={() => toggleFeature("autoplayVideos")}>
                        <div className={styles.rowContent}>
                            <span className={styles.rowLabel}>{t("autoplayVideos")}</span>
                        </div>
                        <div className={`${styles.switch} ${features.autoplayVideos ? styles.on : ''}`} />
                    </div>
                </div>
            </section>

            {/* Accessibility Section */}
            <section className={styles.settingsSection}>
                <div className={styles.sectionHeader}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
                    <h2 className={styles.settingsSectionTitle}>{t("accessibility")}</h2>
                </div>
                <div className={styles.settingsCard}>
                    <div className={styles.settingsRow} onClick={() => toggleFeature("reduceMotion")}>
                        <div className={styles.rowContent}>
                            <span className={styles.rowLabel}>{t("reduceMotion")}</span>
                        </div>
                        <div className={`${styles.switch} ${features.reduceMotion ? styles.on : ''}`} />
                    </div>
                    <div className={styles.settingsRow} onClick={() => toggleFeature("highContrast")}>
                        <div className={styles.rowContent}>
                            <span className={styles.rowLabel}>{t("highContrast")}</span>
                        </div>
                        <div className={`${styles.switch} ${features.highContrast ? styles.on : ''}`} />
                    </div>
                </div>
            </section>

            <div className={styles.settingsFooter}>
                <button 
                    className={styles.logoutBtnPremium} 
                    onClick={() => signOut({ callbackUrl: "/login" })}
                >
                    {t("logOut")} @{user?.username}
                </button>
            </div>
            {show2FAModal && (
                <div style={{
                    position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
                    background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
                    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
                }}>
                    <div style={{
                        background: "var(--bg)", padding: "24px", borderRadius: "16px",
                        width: "100%", maxWidth: "400px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                        border: "1px solid var(--border)", color: "var(--text)"
                    }}>
                        <h3 style={{ marginBottom: "12px", fontSize: "1.2rem", fontWeight: 700 }}>
                            {showBackupCodes ? "Códigos de Respaldo" : (is2FAEnabled ? "Desactivar 2FA" : "Configurar 2FA")}
                        </h3>

                        {showBackupCodes ? (
                            <div>
                                <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "12px" }}>
                                    Guarda estos códigos en un lugar seguro. Solo se mostrarán esta vez. Úsalos si pierdes tu dispositivo.
                                </p>
                                <div style={{ 
                                    display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", 
                                    background: "var(--bg-hover)", padding: "12px", borderRadius: "8px",
                                    marginBottom: "16px", fontFamily: "monospace", textAlign: "center"
                                }}>
                                    {backupCodes.map((c, i) => <div key={i}>{c}</div>)}
                                </div>
                                <button 
                                    className="btn btn-primary" 
                                    style={{ width: "100%" }}
                                    onClick={() => {
                                        setShow2FAModal(false);
                                        setShowBackupCodes(false);
                                    }}
                                >
                                    Entendido, guardar
                                </button>
                            </div>
                        ) : (
                            <>
                                {!is2FAEnabled && qrCodeUrl && (
                                    <div style={{ textAlign: "center", marginBottom: "16px" }}>
                                        <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "12px" }}>
                                            Escanea el QR con tu app de autenticación.
                                        </p>
                                        <img src={qrCodeUrl} alt="QR 2FA" style={{ margin: "10px auto", borderRadius: "8px", border: "4px solid white" }} />
                                    </div>
                                )}

                                <div className="form-group" style={{ marginBottom: "16px" }}>
                                    <label className="form-label">{is2FAEnabled ? "Introduce un código para desactivar" : "Introduce el código para activar"}</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="000000"
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value)}
                                        maxLength={6}
                                        style={{ letterSpacing: "2px", textAlign: "center" }}
                                    />
                                </div>

                                {twoFactorError && <p style={{ color: "var(--red)", fontSize: "0.85rem", marginBottom: "12px" }}>⚠ {twoFactorError}</p>}

                                <div style={{ display: "flex", gap: "12px" }}>
                                    <button 
                                        className="btn btn-outline" 
                                        style={{ flex: 1 }}
                                        onClick={() => setShow2FAModal(false)}
                                    >
                                        {t("cancel") || "Cancelar"}
                                    </button>
                                    <button 
                                        className="btn btn-primary" 
                                        style={{ flex: 1 }}
                                        onClick={is2FAEnabled ? handleDisable2FA : handleEnable2FA}
                                        disabled={verificationCode.length !== 6}
                                    >
                                        {is2FAEnabled ? "Desactivar" : "Activar"}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
            {showFollowRequests && <FollowRequestsModal onClose={() => setShowFollowRequests(false)} />}
        </div>
    );
}
