import { NextRequest, NextResponse } from "next/server";
import { classifyContent } from "@/lib/ai-service";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const { content } = await req.json();
        if (!content) {
            return NextResponse.json({ classification: "SAFE" });
        }

        const classification = await classifyContent(content);
        return NextResponse.json({ classification });
    } catch (error) {
        console.error("Error in classification route:", error);
        return NextResponse.json({ classification: "SAFE" }, { status: 500 });
    }
}
