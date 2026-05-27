import { Sidebar } from "@/components/Sidebar";
import { RightPanel } from "@/components/RightPanel";
import { auth } from "@/lib/auth";
import { VerificationBanner } from "@/components/VerificationBanner";
import { GlobalCompose } from "@/components/GlobalCompose";
import { MobileTweetFAB } from "@/components/MobileTweetFAB";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { UsernameGuard } from "@/components/UsernameGuard";
import { GlobalAmbientPlayer } from "@/components/GlobalAmbientPlayer";
import { BottomNav } from "@/components/BottomNav";
import { PageTransition } from "@/components/PageTransition";
import { MobileTopBar } from "@/components/MobileTopBar";
import { OnboardingTutorial } from "@/components/OnboardingTutorial";

export const dynamic = "force-dynamic";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
    const session = await auth();

    return (
        <UsernameGuard>
            {session && <VerificationBanner />}
            <MobileTopBar />
            <div className="app-layout">
                <Sidebar />
                <main className="main-column">
                    <PageTransition>
                        {children}
                    </PageTransition>
                </main>

                <aside className="right-panel">
                    <RightPanel />
                </aside>
            </div>
            {session && <GlobalCompose />}
            {session && <MobileTweetFAB />}
            {session && <KeyboardShortcuts />}
            <GlobalAmbientPlayer />
            <OnboardingTutorial />
            <BottomNav />
        </UsernameGuard>
    );
}
