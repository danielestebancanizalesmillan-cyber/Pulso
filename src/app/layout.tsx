export const dynamic = "force-dynamic";

import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#1d9bf0",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};
import { Providers } from "./providers";
import { RealtimeProvider } from "@/components/RealtimeProvider";
import Script from "next/script";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("language")?.value || "en";
  const headersList = await headers();
  const host = headersList.get("host") || "pulso-tdch.vercel.app";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  if (locale === 'es') {
    return {
      metadataBase: new URL(baseUrl),
      title: "Pulso",
      description: "Una red social completa construida con Next.js",
      manifest: "/manifest.json",
      appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "Pulso",
      },
      formatDetection: {
        telephone: false,
      },
    };
  }

  return {
    metadataBase: new URL(baseUrl),
    title: "Pulso",
    description: "A fully-featured social network built with Next.js",
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "Pulso",
    },
    formatDetection: {
      telephone: false,
    },
  };
}

import { cookies, headers } from "next/headers";

import { CookieBanner } from "@/components/CookieBanner";
import { TwemojiProvider } from "@/components/TwemojiProvider";
import { PostingProvider } from "@/components/PostingContext";
import { TopProgressBar } from "@/components/TopProgressBar";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const locale = cookieStore.get("language")?.value || "en";

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={locale === 'es' ? 'lang-es' : 'lang-en'} suppressHydrationWarning>
        <Providers>
          <PostingProvider>
            <TopProgressBar />
            <TwemojiProvider />
            {children}
            <CookieBanner />
            <RealtimeProvider />
          </PostingProvider>
        </Providers>
        <Script src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit" strategy="lazyOnload" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossOrigin="" />
        <Script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossOrigin="" strategy="beforeInteractive" />
        <Script id="gt-init" strategy="lazyOnload">
          {`
            window.googleTranslateElementInit = function() {
                new window.google.translate.TranslateElement({
                    pageLanguage: 'en',
                    layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE
                }, 'google_translate_element');
            }
        `}
        </Script>
      </body>






    </html>
  );
}
