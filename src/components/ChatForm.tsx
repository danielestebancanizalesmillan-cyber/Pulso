"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { sendMessage } from "@/app/actions/message";
import { sendTypingStatus } from "@/app/actions/typing";
import { useTranslation } from "@/lib/i18n";
import { upload } from "@vercel/blob/client";

import { encryptContent } from "@/lib/e2ee";

export function ChatForm({ conversationId, userId, recipientPublicKey }: { conversationId: string, userId: string, recipientPublicKey?: string }) {
    const { t } = useTranslation();
    const [content, setContent] = useState("");

    const [isPending, startTransition] = useTransition();
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [isSendingTyping, setIsSendingTyping] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleTyping = () => {
        if (!isSendingTyping) {
            setIsSendingTyping(true);
            sendTypingStatus(conversationId, userId, true).catch(console.error);
        }

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        typingTimeoutRef.current = setTimeout(() => {
            setIsSendingTyping(false);
            sendTypingStatus(conversationId, userId, false).catch(console.error);
        }, 2000);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Verify it is image or video
        const isImage = file.type.startsWith("image/");
        const isVideo = file.type.startsWith("video/");
        
        if (!isImage && !isVideo) {
            alert("Sólo se admiten imágenes y videos");
            return;
        }

        const fileType = isImage ? "image" : "video";

        startTransition(async () => {
            try {
                const fileName = `${fileType}-${Date.now()}-${file.name}`;
                const newBlob = await upload(fileName, file, {
                    access: 'public',
                    handleUploadUrl: '/api/upload',
                });
                await sendMessage(conversationId, "", fileType, newBlob.url);
            } catch (error) {
                console.error("Error uploading file:", error);
            }
        });
    };

    useEffect(() => {
        inputRef.current?.focus();
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
                if (audioBlob.size > 0) {
                    await handleSendAudio(audioBlob);
                }
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Could not access microphone");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const handleSendAudio = async (blob: Blob) => {
        startTransition(async () => {
            try {
                const fileName = `audio-${Date.now()}.webm`;
                const newBlob = await upload(fileName, blob, {
                    access: 'public',
                    handleUploadUrl: '/api/upload',
                });
                await sendMessage(conversationId, "", "audio", newBlob.url);
            } catch (error) {
                console.error("Error uploading audio:", error);
            }
        });
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() || isPending) return;

        const text = content.trim();
        setContent("");

        startTransition(async () => {
            try {
                let finalContent = text;
                let isEncrypted = false;
                
                if (recipientPublicKey) {
                    const myPublicKey = localStorage.getItem("e2ee_public_key");
                    const encTo = await encryptContent(text, recipientPublicKey);
                    let encFrom = "";
                    if (myPublicKey) {
                        encFrom = await encryptContent(text, myPublicKey);
                    }
                    finalContent = JSON.stringify({ to: encTo, from: encFrom });
                    isEncrypted = true;
                }
                await sendMessage(conversationId, finalContent, "text", undefined, isEncrypted);
            } catch (err: any) {
                console.error("SendMessage Error:", err);
                alert(err && err.message ? err.message : "Error al enviar mensaje (cooldown o límite)");
                setContent(text); // Restore content
            }
        });
    };


    return (
        <div className="chat-form-container" style={{ position: "sticky", bottom: 0, background: "var(--bg-main)", borderTop: "1px solid var(--border)", zIndex: 10 }}>
            <form onSubmit={handleSubmit} className="chat-form" style={{ padding: "12px 16px", display: "flex", gap: "12px", alignItems: "center" }}>
                {!isRecording ? (
                    <>
                        <input 
                            type="file" 
                            accept="image/*,video/*" 
                            ref={fileInputRef} 
                            style={{ display: "none" }} 
                            onChange={handleFileChange} 
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isPending}
                            style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center", padding: "8px" }}
                            title="Attach Media"
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 22, height: 22 }}>
                                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                            </svg>
                        </button>

                        <div style={{ flex: 1, display: "flex", alignItems: "center", background: "var(--bg-hover)", borderRadius: "var(--radius-full)", padding: "4px 16px" }}>
                            <input
                                ref={inputRef}
                                value={content}
                                onChange={(e) => {
                                    setContent(e.target.value);
                                    handleTyping();
                                }}
                                placeholder={t("startNewMessage")}
                                disabled={isPending}
                                style={{ background: "transparent", border: "none", outline: "none", width: "100%", padding: "12px 0", color: "var(--text-primary)", fontSize: "1rem" }}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={startRecording}
                            disabled={isPending}
                            style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center", padding: "8px" }}
                            title="Record Audio"
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 22, height: 22 }}>
                                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                            </svg>
                        </button>
                        <button
                            type="submit"
                            disabled={!content.trim() || isPending}
                            style={{ background: "transparent", border: "none", cursor: content.trim() ? "pointer" : "default", color: content.trim() ? "var(--blue)" : "var(--blue-faint)", display: "flex", alignItems: "center", justifyContent: "center" }}
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 24, height: 24 }}>
                                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                            </svg>
                        </button>
                    </>
                ) : (
                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "12px", background: "rgba(29, 155, 240, 0.1)", borderRadius: "var(--radius-full)", padding: "8px 16px" }}>
                        <div className="recording-dot" style={{ width: 10, height: 10, background: "var(--red, #f4212e)", borderRadius: "50%" }} />
                        <span style={{ color: "var(--text-primary)", fontWeight: 600, minWidth: "40px" }}>{formatTime(recordingTime)}</span>
                        <span style={{ color: "var(--text-secondary)", flex: 1 }}>Recording...</span>
                        <button
                            type="button"
                            onClick={stopRecording}
                            style={{ background: "var(--blue)", color: "white", border: "none", borderRadius: "var(--radius-full)", padding: "6px 16px", cursor: "pointer", fontWeight: 700 }}
                        >
                            Stop & Send
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (mediaRecorderRef.current) mediaRecorderRef.current.onstop = () => { };
                                stopRecording();
                            }}
                            style={{ background: "transparent", color: "var(--red)", border: "none", cursor: "pointer" }}
                        >
                            Cancel
                        </button>
                    </div>
                )}
            </form>
        </div>
    );
}
