import type { NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export default {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
            checks: ['none'],
        }),
    ],
    callbacks: {
        async jwt({ token, user }: any) {
            if (user) {
                token.id = user.id;
                token.username = user.username;
                token.emailVerified = user.emailVerified;
                token.image = user.image;
                token.avatar = user.avatar;
                token.coverImage = user.coverImage;
                token.role = user.role;
                token.accountLabel = user.accountLabel;
                token.birthDate = user.birthDate;
                token.showSensitiveContent = user.showSensitiveContent;
                token.countryCode = user.countryCode;
            }
            return token;
        },
        async session({ session, token }: any) {
            if (token && session.user) {
                session.user.id = token.id;
                session.user.username = token.username;
                session.user.emailVerified = token.emailVerified;
                session.user.image = token.image;
                session.user.avatar = token.avatar;
                session.user.coverImage = token.coverImage;
                session.user.countryCode = token.countryCode;
                session.user.role = token.role;
                session.user.accountLabel = token.accountLabel;
                session.user.birthDate = token.birthDate;
                session.user.showSensitiveContent = token.showSensitiveContent;
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
    },
} satisfies NextAuthConfig;
