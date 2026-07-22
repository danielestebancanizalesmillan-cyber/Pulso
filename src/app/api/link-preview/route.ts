import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");

    if (!url) {
        return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; PulsoBot/1.0; +https://pulso-tdch.vercel.app)"
            },
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            return NextResponse.json({ error: "Failed to fetch URL" }, { status: 400 });
        }

        const html = await response.text();

        // Extract metadata using regex
        const ogTitle = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) || html.match(/<meta\s+name=["']twitter:title["']\s+content=["']([^"']+)["']/i);
        const titleMatch = ogTitle ? ogTitle : html.match(/<title>([^<]+)<\/title>/i);
        
        const ogDesc = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) || html.match(/<meta\s+name=["']twitter:description["']\s+content=["']([^"']+)["']/i);
        const descMatch = ogDesc ? ogDesc : html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
        
        const imageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) || html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i);

        const title = titleMatch ? titleMatch[1].trim() : "";
        const description = descMatch ? descMatch[1].trim() : "";
        const image = imageMatch ? imageMatch[1].trim() : "";

        // Get domain name
        const domain = new URL(url).hostname;

        return NextResponse.json({ title, description, image, domain, url });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Failed to parse link metadata" }, { status: 200 }); // Return status 200 with error so client can handle it gracefully
    }
}
