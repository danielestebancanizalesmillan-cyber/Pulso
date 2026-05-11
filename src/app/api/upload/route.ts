import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Cache breaker: 13:20:25
export async function POST(request: Request): Promise<NextResponse> {
    const body = (await request.json()) as HandleUploadBody;

    try {
        const jsonResponse = await handleUpload({
            body,
            request,
            onBeforeGenerateToken: async (pathname) => {
                // Authenticate the user
                const session = await auth();
                if (!session?.user?.id) {
                    throw new Error("Unauthorized");
                }

                return {
                    allowedContentTypes: [
                        "image/jpeg", 
                        "image/png", 
                        "image/gif", 
                        "image/webp",
                        "video/mp4",
                        "video/quicktime",
                        "video/webm",
                        "audio/mpeg",
                        "audio/wav",
                        "audio/webm",
                        "audio/ogg"
                    ],
                    tokenPayload: JSON.stringify({
                        userId: session.user.id,
                    }),
                };
            },
            onUploadCompleted: async ({ blob }) => {
                // Here we could log the upload to our database if needed
                console.log("Upload completed", blob.url);
            },
        });
        
        return NextResponse.json(jsonResponse);
    } catch (error) {
        console.error("Vercel Blob Upload Error:", error);
        return NextResponse.json(
            { error: (error as Error).message },
            { status: 400 }
        );
    }
}
