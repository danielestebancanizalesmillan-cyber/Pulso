import { Sidebar } from "@/components/Sidebar";
import { RightPanel } from "@/components/RightPanel";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { VerificationBanner } from "@/components/VerificationBanner";
import { GlobalCompose } from "@/components/GlobalCompose";
import { MobileTweetFAB } from "@/components/MobileTweetFAB";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { UsernameGuard } from "@/components/UsernameGuard";

export const dynamic = "force-dynamic";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
    const session = await auth();
    if (!session) redirect("/login");

    return (
        <UsernameGuard>
            <VerificationBanner />
            <div className="app-layout">
                <Sidebar />
                <main className="main-column">
                    {children}
                </main>

                <aside className="right-panel">
                    <RightPanel />
                </aside>
            </div>
            <GlobalCompose />
            <MobileTweetFAB />
            <KeyboardShortcuts />
        </UsernameGuard>
    );
}
