import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://127.0.0.1:11435";
const OLLAMA_AUTH_TOKEN = process.env.OLLAMA_AUTH_TOKEN || process.env.PULSAI_GATEWAY_TOKEN || "";
const TIMEOUT_MS = 5000; // 5 segundos max para no bloquear la UI

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

        const headers: Record<string, string> = {
            "Content-Type": "application/json"
        };
        if (OLLAMA_AUTH_TOKEN) {
            headers["Authorization"] = `Bearer ${OLLAMA_AUTH_TOKEN}`;
        }

        const res = await fetch(`${OLLAMA_HOST}/api/health`, {
            method: "GET",
            headers,
            signal: controller.signal
        });

        clearTimeout(timer);

        if (!res.ok) {
            return NextResponse.json({ status: "offline" });
        }

        const data = await res.json().catch(() => ({}));
        if (data.status === "online") {
            return NextResponse.json({ status: "online" });
        }

        return NextResponse.json({ status: "offline" });
    } catch {
        return NextResponse.json({ status: "offline" });
    }
}
