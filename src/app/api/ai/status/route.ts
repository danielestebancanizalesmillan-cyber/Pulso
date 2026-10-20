import { NextResponse } from "next/server";

const TIMEOUT_MS = 5000;

/**
 * GET /api/ai/status
 * Comprueba si el gateway de PulsAI está disponible.
 * El frontend lo llama cada 15s para mostrar el indicador de estado.
 * Usa la URL dinámica del túnel (desde Vercel Blob) con fallback a OLLAMA_HOST.
 */
export async function GET() {
    const token = process.env.PULSAI_GATEWAY_TOKEN || process.env.OLLAMA_AUTH_TOKEN || "";
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    const fallbackHost = process.env.OLLAMA_HOST || "http://127.0.0.1:11435";

    // 1. Resolver URL activa del gateway (Vercel Blob → fallback env)
    let gatewayUrl = fallbackHost;
    if (blobToken) {
        try {
            const listRes = await fetch("https://blob.vercel-storage.com?prefix=pulsai-tunnel-url&limit=1", {
                headers: { Authorization: `Bearer ${blobToken}` },
                cache: "no-store",
                signal: AbortSignal.timeout(3000),
            } as any);

            if (listRes.ok) {
                const listData = await listRes.json();
                const blobs: any[] = listData?.blobs || [];
                // Ordenar por fecha de subida descendente para tomar el más reciente
                blobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

                if (blobs.length > 0 && blobs[0].url) {
                    const blobRes = await fetch(blobs[0].url, {
                        cache: "no-store",
                        signal: AbortSignal.timeout(3000),
                    } as any);
                    if (blobRes.ok) {
                        const data = await blobRes.json();
                        if (data?.url && typeof data.url === "string" && data.url.startsWith("https://")) {
                            gatewayUrl = data.url;
                        }
                    }
                }
            }
        } catch {
            // Blob no disponible — usar fallback
        }
    }

    // 2. Consultar /api/health del gateway
    try {
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`${gatewayUrl}/api/health`, {
            headers,
            cache: "no-store",
            signal: AbortSignal.timeout(TIMEOUT_MS),
        } as any);

        if (!res.ok) {
            return NextResponse.json({ status: "offline", reason: `Gateway HTTP ${res.status}` }, { status: 200 });
        }

        const data = await res.json();
        if (data?.status === "online") {
            return NextResponse.json({ status: "online", model: data.model || "gemma4:e2b", gateway: gatewayUrl });
        }

        return NextResponse.json({ status: "offline", reason: data?.reason || "Gateway no disponible" });
    } catch (e: any) {
        return NextResponse.json(
            { status: "offline", reason: e.message || "No se puede conectar al gateway" },
            { status: 200 }
        );
    }
}
