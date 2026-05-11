import { DefaultSession } from "next-auth"

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
    emailVerified?: Date | null;
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
    emailVerified?: Date | null;
  }
}
