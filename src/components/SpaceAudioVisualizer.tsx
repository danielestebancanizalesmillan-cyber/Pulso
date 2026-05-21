"use client";

import { useEffect, useRef } from "react";

interface SpaceAudioVisualizerProps {
  stream: MediaStream | null;
  size?: number;
  color?: string;
  active?: boolean;
}

export function SpaceAudioVisualizer({ stream, size = 60, color = "#7c3aed", active = true }: SpaceAudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const contextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!stream || !active) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    const audioCtx = new AudioContext();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);
    contextRef.current = audioCtx;
    analyserRef.current = analyser;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const avg = dataArray.slice(0, 8).reduce((a, b) => a + b, 0) / 8;
      const scale = 1 + (avg / 255) * 0.4;
      const alpha = 0.15 + (avg / 255) * 0.35;

      // Outer glow ring
      const cx = w / 2;
      const cy = h / 2;
      const r = (size / 2) * scale;

      const gradient = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 1.2);
      gradient.addColorStop(0, `${color}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`);
      gradient.addColorStop(1, `${color}00`);

      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.2, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    };

    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
      audioCtx.close();
    };
  }, [stream, active, size, color]);

  return (
    <canvas
      ref={canvasRef}
      width={size * 2.5}
      height={size * 2.5}
      style={{
        position: "absolute",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
      }}
    />
  );
}

// Simple CSS-based pulse for when we don't have the actual stream
export function SpeakingPulse({ speaking, color = "#7c3aed", size = 60 }: { speaking: boolean; color?: string; size?: number }) {
  return (
    <div style={{
      position: "absolute", inset: -6,
      borderRadius: "50%",
      border: `2.5px solid ${color}`,
      opacity: speaking ? 1 : 0,
      animation: speaking ? "speakPulse 1.2s ease-in-out infinite" : "none",
      transition: "opacity 0.3s",
      pointerEvents: "none",
    }} />
  );
}
