"use client";

import { useEffect, useRef, useState } from "react";

declare global {
    interface Window {
        YT?: any;
        onYouTubeIframeAPIReady?: () => void;
        __globalAudioState?: {
            isPlaying: boolean;
            url: string | null;
            userId: string | null;
            title: string | null;
        };
    }
}

function getYouTubeId(url?: string | null) {
    if (!url) return null;
    const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
    if (match && match[2].length === 11) {
        return match[2];
    }
    if (url.includes("youtu.be/")) {
        const parts = url.split("youtu.be/");
        const id = parts[1]?.split(/[?#&]/)[0];
        if (id && id.length === 11) return id;
    }
    if (url.includes("v=")) {
        const parts = url.split("v=");
        const id = parts[1]?.split(/[?#&]/)[0];
        if (id && id.length === 11) return id;
    }
    return null;
}

function loadYouTubeApi() {
    return new Promise<void>((resolve) => {
        if (window.YT?.Player) {
            resolve();
            return;
        }

        const previousReady = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
            previousReady?.();
            resolve();
        };

        const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
        if (!existing) {
            const tag = document.createElement("script");
            tag.src = "https://www.youtube.com/iframe_api";
            document.head.appendChild(tag);
        } else {
            const interval = setInterval(() => {
                if (window.YT?.Player) {
                    clearInterval(interval);
                    resolve();
                }
            }, 100);
            setTimeout(() => {
                clearInterval(interval);
                resolve();
            }, 5000);
        }
    });
}

export function GlobalAmbientPlayer() {
    const audioRef = useRef<HTMLAudioElement>(null);
    const ytPlayerRef = useRef<any>(null);
    const ytContainerId = useRef(`global-yt-player`);
    const [ytId, setYtId] = useState<string | null>(null);

    useEffect(() => {
        window.__globalAudioState = {
            isPlaying: false,
            url: null,
            userId: null,
            title: null,
        };

        const updateState = (isPlaying: boolean, url: string | null, userId: string | null, title: string | null) => {
            window.__globalAudioState = { isPlaying, url, userId, title };
            window.dispatchEvent(new CustomEvent("global-audio-state-change"));
        };

        const handlePlay = async (e: Event) => {
            const customEvent = e as CustomEvent;
            const { url, title, start, userId } = customEvent.detail;

            // Stop current native playback
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = "";
            }
            // Stop current YouTube playback
            if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === "function") {
                try { ytPlayerRef.current.pauseVideo(); } catch {}
            }

            const isYt = getYouTubeId(url);
            if (isYt) {
                setYtId(isYt);
                updateState(true, url, userId, title);

                try {
                    await loadYouTubeApi();
                    if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === "function") {
                        ytPlayerRef.current.loadVideoById({
                            videoId: isYt,
                            startSeconds: start || 0,
                        });
                        ytPlayerRef.current.playVideo();
                    } else {
                        ytPlayerRef.current = new window.YT.Player(ytContainerId.current, {
                            height: "200",
                            width: "300",
                            videoId: isYt,
                            host: "https://www.youtube.com",
                            playerVars: {
                                autoplay: 1,
                                controls: 0,
                                disablekb: 1,
                                enablejsapi: 1,
                                origin: window.location.origin,
                                playsinline: 1,
                                start: start || 0,
                            },
                            events: {
                                onReady: (event: any) => {
                                    try {
                                        event.target.setVolume(50);
                                        event.target.unMute?.();
                                        event.target.playVideo();
                                    } catch {}
                                },
                                onStateChange: (event: any) => {
                                    const playing = event.data === window.YT.PlayerState.PLAYING;
                                    updateState(playing, url, userId, title);
                                }
                            }
                        });
                    }
                } catch (error) {
                    console.error("Global YouTube setup failed:", error);
                    updateState(false, null, null, null);
                }
            } else {
                setYtId(null);
                if (audioRef.current) {
                    // Set src and defer seek/play until metadata loads successfully
                    audioRef.current.src = url;
                    audioRef.current.volume = 0.4;
                    
                    audioRef.current.onloadedmetadata = () => {
                        if (audioRef.current) {
                            audioRef.current.currentTime = start || 0;
                            audioRef.current.play()
                                .then(() => {
                                    updateState(true, url, userId, title);
                                })
                                .catch((err) => {
                                    console.error("Global native playback failed:", err);
                                    updateState(false, null, null, null);
                                });
                        }
                    };
                    
                    audioRef.current.load();
                }
            }
        };

        const handlePause = () => {
            if (audioRef.current) {
                audioRef.current.pause();
            }
            if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === "function") {
                try { ytPlayerRef.current.pauseVideo(); } catch {}
            }
            const current = window.__globalAudioState;
            updateState(false, current?.url || null, current?.userId || null, current?.title || null);
        };

        const handleResume = () => {
            const current = window.__globalAudioState;
            if (!current?.url) return;

            const isYt = getYouTubeId(current.url);
            if (isYt) {
                if (ytPlayerRef.current && typeof ytPlayerRef.current.playVideo === "function") {
                    ytPlayerRef.current.playVideo();
                    updateState(true, current.url, current.userId, current.title);
                }
            } else {
                if (audioRef.current) {
                    audioRef.current.play()
                        .then(() => {
                            updateState(true, current.url, current.userId, current.title);
                        })
                        .catch(() => {
                            updateState(false, null, null, null);
                        });
                }
            }
        };

        window.addEventListener("play-global-audio", handlePlay);
        window.addEventListener("pause-global-audio", handlePause);
        window.addEventListener("resume-global-audio", handleResume);

        return () => {
            window.removeEventListener("play-global-audio", handlePlay);
            window.removeEventListener("pause-global-audio", handlePause);
            window.removeEventListener("resume-global-audio", handleResume);
        };
    }, []);

    return (
        <>
            <div id={ytContainerId.current} style={{ position: "fixed", top: "-1000px", left: "-1000px", width: "300px", height: "200px", zIndex: -9999, pointerEvents: "none" }} />
            <audio ref={audioRef} loop style={{ display: "none" }} />
        </>
    );
}
