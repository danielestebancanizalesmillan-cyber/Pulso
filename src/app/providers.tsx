"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/ToastProvider";
import { I18nProvider } from "@/lib/i18n";
import { InAppBrowserProvider } from "@/components/InAppBrowser";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <ToastProvider>
                <ThemeProvider>
                    <I18nProvider>
                        <InAppBrowserProvider>
                            {children}
                        </InAppBrowserProvider>
                    </I18nProvider>
                </ThemeProvider>
            </ToastProvider>
        </SessionProvider>
    );
}
