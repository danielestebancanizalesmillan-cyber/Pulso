import NextAuth, { CredentialsSignin } from "next-auth";
import authConfig from "@/lib/auth.config";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { verify } from "otplib";
import { decrypt } from "@/lib/crypto";
import { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            username?: string | null;
            avatar?: string | null;
            birthDate?: Date | null;
            showSensitiveContent?: boolean;
            countryCode?: string | null;
            role?: string;
            accountLabel?: string | null;
        } & DefaultSession["user"]
    }

    interface User {
        id?: string;
        username?: string | null;
        avatar?: string | null;
        birthDate?: Date | null;
        showSensitiveContent?: boolean;
        countryCode?: string | null;
        role?: string;
        accountLabel?: string | null;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        username?: string | null;
        avatar?: string | null;
        birthDate?: Date | null;
        showSensitiveContent?: boolean;
        countryCode?: string | null;
        role?: string;
        accountLabel?: string | null;
    }
}

class TwoFactorRequiredError extends CredentialsSignin {
    code = "2fa_required";
}

class InvalidTwoFactorCodeError extends CredentialsSignin {
    code = "invalid_2fa_code";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: PrismaAdapter(prisma as any),
    session: { strategy: "jwt" },
    ...authConfig,
    providers: [
        ...authConfig.providers,
        CredentialsProvider({
            name: "credentials",
            credentials: {
                login: { label: "Username or Email", type: "text" },
                password: { label: "Password", type: "password" },
                code: { label: "2FA Code", type: "text" },
            },
            async authorize(credentials) {
                if (!credentials?.login || !credentials?.password) return null;

                const login = credentials.login as string;
                const password = credentials.password as string;
                const code = credentials.code as string | undefined;

                const user = await prisma.user.findFirst({
                    where: {
                        OR: [{ email: login }, { username: login }],
                    },
                });

                if (!user || !user.email) return null;

                let passwordMatch = false;

                // 1. Try local bcrypt password (for old users)
                if (user.password) {
                    passwordMatch = await bcrypt.compare(password, user.password);
                }

                // 2. Fallback to Firebase Auth REST API
                if (!passwordMatch) {
                    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
                    if (apiKey) {
                        try {
                            const res = await fetch(
                                `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
                                {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                        email: user.email,
                                        password: password,
                                        returnSecureToken: true,
                                    }),
                                }
                            );
                            const data = await res.json();
                            if (res.ok && data.localId) {
                                passwordMatch = true;

                                // Sync Firebase verification status to Prisma
                                if (data.idToken) {
                                    try {
                                        const lookupRes = await fetch(
                                            `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
                                            {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({ idToken: data.idToken }),
                                            }
                                        );
                                        const lookupData = await lookupRes.json();
                                        const firebaseUser = lookupData.users?.[0];
                                        
                                        if (firebaseUser?.emailVerified && !user.emailVerified) {
                                            await prisma.user.update({
                                                where: { id: user.id },
                                                data: { emailVerified: new Date() }
                                            });
                                            // Update local object for the current session
                                            (user as any).emailVerified = new Date();
                                        }
                                    } catch (e) {
                                        console.error("Firebase Sync Error:", e);
                                    }
                                }
                            }
                        } catch (e) {
                            console.error("Firebase Auth Error:", e);
                        }
                    }
                }

                if (!passwordMatch) return null;

                // 2FA Verification
                if (user.twoFactorEnabled) {
                    if (!user.twoFactorSecret) {
                        throw new Error("2FA enabled but no secret found");
                    }

                    if (!code) {
                        throw new TwoFactorRequiredError();
                    }

                    const rawSecret = decrypt(user.twoFactorSecret);

                    const isValid = await verify({
                        token: code,
                        secret: rawSecret
                    });

                    if (!isValid) {
                        // Check Backup Codes
                        const backupCodes = await prisma.backupCode.findMany({
                            where: { userId: user.id }
                        });

                        let backupMatch = false;
                        let matchedCodeId = "";

                        for (const bc of backupCodes) {
                            if (await bcrypt.compare(code, bc.codeHash)) {
                                backupMatch = true;
                                matchedCodeId = bc.id;
                                break;
                            }
                        }

                        if (backupMatch) {
                            // Delete single-use backup code
                            await prisma.backupCode.delete({
                                where: { id: matchedCodeId }
                            });
                        } else {
                            throw new InvalidTwoFactorCodeError();
                        }
                    }
                }

                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    username: user.username,
                    image: user.avatar || user.image,
                    avatar: user.avatar,
                    emailVerified: user.emailVerified,
                    countryCode: user.countryCode,
                    role: user.role,
                    accountLabel: user.accountLabel,
                    birthDate: user.birthDate,
                    showSensitiveContent: user.showSensitiveContent,
                } as any;
            },
        }),
    ],
    callbacks: {
        ...authConfig.callbacks,
        async jwt({ token, user, trigger }: { token: JWT, user?: any, trigger?: "signIn" | "signUp" | "update" }) {
            if (user) {
                token.id = user.id!;
                token.username = user.username;
                token.emailVerified = user.emailVerified;
                token.image = user.image;
                token.avatar = user.avatar;
                token.countryCode = user.countryCode;
                token.role = user.role;
                token.accountLabel = user.accountLabel;
                token.birthDate = user.birthDate;
                token.showSensitiveContent = user.showSensitiveContent;
            }
            if (trigger === "update" || !token.avatar) {
                try {
                    const dbUser = await prisma.user.findUnique({
                        where: { id: token.id as string },
                        select: { avatar: true, image: true, accountLabel: true, birthDate: true, showSensitiveContent: true, countryCode: true }
                    });
                    if (dbUser) {
                        token.avatar = (dbUser as any).avatar;
                        token.image = (dbUser as any).avatar || (dbUser as any).image;
                        token.accountLabel = (dbUser as any).accountLabel;
                        token.birthDate = (dbUser as any).birthDate;
                        token.showSensitiveContent = (dbUser as any).showSensitiveContent;
                        token.countryCode = (dbUser as any).countryCode;
                    }
                } catch (e) {
                    console.error("JWT sync error:", e);
                }
            }
            return token;
        }
    }
});

