export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { RealtimeProvider } from "@/components/RealtimeProvider";
import Script from "next/script";

export async function generateMetadata() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("language")?.value || "en";
  
  if (locale === 'es') {
    return {
      title: "Pulso",
      description: "Una red social completa construida con Next.js",
      manifest: "/manifest.json",
    };
  }
  
  return {
    title: "Pulso",
    description: "A fully-featured social network built with Next.js",
    manifest: "/manifest.json",
  };
}

import { cookies } from "next/headers";

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
          {children}
          <RealtimeProvider />
        </Providers>
        <Script src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit" strategy="lazyOnload" />
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
