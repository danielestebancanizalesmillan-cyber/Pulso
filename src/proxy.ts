import { NextRequest } from "next/server";
import NextAuth from "next-auth";
import authConfig from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export async function proxy(req: NextRequest) {
    return (auth as any)(req);
}

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login|register).*)"],
};
