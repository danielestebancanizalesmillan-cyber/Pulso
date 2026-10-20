import { NextResponse } from "next/server";

// Caché en memoria del proceso Next.js
let cachedTunnelUrl: { url: string; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

/**
 * GET /api/ai/tunnel-url
 * Devuelve la URL activa del túnel PulsAI desde Vercel Blob.
 * Usado internamente por ai-service.ts con caché.
 */
export async function GET() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Blob token not configured" }, { status: 503 });
  }

  // Devolver caché si está fresca
  const now = Date.now();
  if (cachedTunnelUrl && now - cachedTunnelUrl.fetchedAt < CACHE_TTL_MS) {
    return NextResponse.json({ url: cachedTunnelUrl.url, cached: true });
  }

  try {
    const res = await fetch("https://blob.vercel-storage.com/pulsai-tunnel-url.json", {
      headers: { Authorization: `Bearer ${token}` },
      // Sin caché del fetch para tener datos frescos
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Blob not found (${res.status})` }, { status: 404 });
    }

    const data = await res.json();
    if (!data?.url) {
      return NextResponse.json({ error: "Invalid blob data" }, { status: 422 });
    }

    // Actualizar caché
    cachedTunnelUrl = { url: data.url, fetchedAt: now };

    return NextResponse.json({
      url: data.url,
      model: data.model,
      updatedAt: data.updatedAt,
      cached: false,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
