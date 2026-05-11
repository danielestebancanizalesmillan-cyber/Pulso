"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Scale, FileText, ShieldAlert, AlertTriangle } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import styles from "./Legal.module.css";

export default function TermsPage() {
    const { t, locale } = useTranslation();

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
            <div className={styles.glow} />

            {/* Sticky Back Header */}
            <div className={styles.header}>
                <Link href="/home" className={styles.backBtn}>
                    <ArrowLeft size={24} />
                </Link>
                <div className={styles.headerTitle}>
                    <Scale size={16} /> {t("termsTitle")}
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
                    <h1 className={styles.title}>
                        {t("termsTitle")}
                    </h1>
                    <p className={styles.subtitle}>{t("termsSubtitle")}</p>
                </motion.div>

                {/* Main Card */}
                <div className={styles.card}>
                    
                    <motion.section variants={itemVariants} className={styles.section}>
                        <div className={styles.iconWrapper}>
                            <Scale size={24} />
                        </div>
                        <div className={styles.sectionContent}>
                            <h2 className={styles.sectionTitle}>{t("termsSec1Title")}</h2>
                            <p className={styles.sectionText}>
                                {locale === "es" ? (
                                    <>De acuerdo con el <span className={styles.sectionTextStrong}>Artículo 20 de la Constitución Política de Colombia</span>, Pulso garantiza la libertad de expresar y difundir tu pensamiento y opiniones. Sin embargo, eres el único responsable del contenido que publiques.</>
                                ) : (
                                    <>In accordance with <span className={styles.sectionTextStrong}>Article 20 of the Political Constitution of Colombia</span>, Pulso guarantees the freedom to express and disseminate your thoughts and opinions. However, you are solely responsible for the content you publish.</>
                                )}
                            </p>
                            <p className={styles.sectionTextMuted}>
                                {t("termsSec1Muted")}
                            </p>
                        </div>
                    </motion.section>

                    <hr className={styles.divider} />

                    <motion.section variants={itemVariants} className={styles.section}>
                        <div className={`${styles.iconWrapper} bg-purple-500/10 text-purple-400`} style={{ borderColor: 'rgba(168, 85, 247, 0.2)' }}>
                            <FileText size={24} />
                        </div>
                        <div className={styles.sectionContent}>
                            <h2 className={styles.sectionTitle}>{t("termsSec2Title")}</h2>
                            <p className={styles.sectionText}>
                                {t("termsSec2Text")}
                            </p>
                        </div>
                    </motion.section>

                    <hr className={styles.divider} />

                    <motion.section variants={itemVariants} className={styles.section}>
                        <div className={`${styles.iconWrapper} bg-amber-500/10 text-amber-400`} style={{ borderColor: 'rgba(245, 158, 11, 0.2)' }}>
                            <ShieldAlert size={24} />
                        </div>
                        <div className={styles.sectionContent}>
                            <h2 className={styles.sectionTitle}>{t("termsSec3Title")}</h2>
                            <p className={styles.sectionText}>
                                {t("termsSec3Text")}
                            </p>
                        </div>
                    </motion.section>

                    <hr className={styles.divider} />

                    <motion.section variants={itemVariants} className={styles.section}>
                        <div className={`${styles.iconWrapper} bg-red-500/10 text-red-400`} style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                            <AlertTriangle size={24} />
                        </div>
                        <div className={styles.sectionContent}>
                            <h2 className={styles.sectionTitle}>{t("termsSec4Title")}</h2>
                            <p className={styles.sectionText}>
                                {t("termsSec4Text")}
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
