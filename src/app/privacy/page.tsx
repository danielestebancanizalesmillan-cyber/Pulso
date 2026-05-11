"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Shield, Fingerprint, Lock, EyeOff, Trash2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import styles from "../terms/Legal.module.css"; // Reuse shared module

export default function PrivacyPage() {
    const { t } = useTranslation();

    const containerVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: { 
            opacity: 1, 
            y: 0, 
            transition: { staggerChildren: 0.15, delayChildren: 0.2, type: "spring" as const, stiffness: 100 } 
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <div className={styles.container}>
            {/* Soft background glow */}
            <div className={styles.glow} style={{ background: "radial-gradient(circle, rgba(6, 182, 212, 0.08) 0%, transparent 70%)" }} />

            {/* Sticky Back Header */}
            <div className={styles.header}>
                <Link href="/home" className={styles.backBtn}>
                    <ArrowLeft size={24} />
                </Link>
                <div className={styles.headerTitle}>
                    <Shield size={16} /> {t("privacyTitle")}
                </div>
            </div>

            <motion.div 
                className={styles.contentBox}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Header Title */}
                <motion.div variants={itemVariants} className={styles.titleArea}>
                    <h1 className={styles.title} style={{ background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        {t("privacyTitle")}
                    </h1>
                    <p className={styles.subtitle}>{t("privacySubtitle")}</p>
                </motion.div>

                {/* Main Card */}
                <div className={styles.card}>
                    
                    <motion.section variants={itemVariants} className={styles.section}>
                        <div className={`${styles.iconWrapper} bg-cyan-500/10 text-cyan-400`} style={{ borderColor: 'rgba(6, 182, 212, 0.2)' }}>
                            <Fingerprint size={24} />
                        </div>
                        <div className={styles.sectionContent}>
                            <h2 className={styles.sectionTitle}>{t("privacySec1Title")}</h2>
                            <p className={styles.sectionText}>
                                De acuerdo con el <span className={styles.sectionTextStrong}>Artículo 15 de la Constitución Política de Colombia</span>, {t("privacySec1Text").split("De acuerdo con el Artículo 15 de la Constitución Política de Colombia, ")[1]}
                            </p>
                        </div>
                    </motion.section>

                    <hr className={styles.divider} />

                    <motion.section variants={itemVariants} className={styles.section}>
                        <div className={`${styles.iconWrapper} bg-indigo-500/10 text-indigo-400`} style={{ borderColor: 'rgba(99, 102, 241, 0.2)' }}>
                            <EyeOff size={24} />
                        </div>
                        <div className={styles.sectionContent}>
                            <h2 className={styles.sectionTitle}>{t("privacySec2Title")}</h2>
                            <p className={styles.sectionText}>
                                {t("privacySec2Text")}
                            </p>
                        </div>
                    </motion.section>

                    <hr className={styles.divider} />

                    <motion.section variants={itemVariants} className={styles.section}>
                        <div className={styles.iconWrapper}>
                            <Lock size={24} />
                        </div>
                        <div className={styles.sectionContent}>
                            <h2 className={styles.sectionTitle}>{t("privacySec3Title")}</h2>
                            <p className={styles.sectionText}>
                                {t("privacySec3Text")}
                            </p>
                        </div>
                    </motion.section>

                    <hr className={styles.divider} />

                    <motion.section variants={itemVariants} className={styles.section}>
                        <div className={`${styles.iconWrapper} bg-red-500/10 text-red-400`} style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                            <Trash2 size={24} />
                        </div>
                        <div className={styles.sectionContent}>
                            <h2 className={styles.sectionTitle}>{t("privacySec4Title")}</h2>
                            <p className={styles.sectionText}>
                                {t("privacySec4Text")}
                            </p>
                        </div>
                    </motion.section>

                </div>

                {/* Footer back button */}
                <motion.div variants={itemVariants} className={styles.footerBtnArea}>
                    <button 
                        onClick={() => {
                            if (typeof window !== "undefined") {
                                if (window.opener || window.history.length === 1) {
                                    window.close();
                                } else {
                                    window.location.href = "/home";
                                }
                            }
                        }} 
                        className={styles.homeBtn}
                        style={{ border: "none", cursor: "pointer", width: "100%", textAlign: "center", display: "inline-block" }}
                    >
                        {t("backToHome")}
                    </button>
                </motion.div>
            </motion.div>
        </div>
    );
}
