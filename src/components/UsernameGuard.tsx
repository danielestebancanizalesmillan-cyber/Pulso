"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export function UsernameGuard({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (status === "authenticated") {
            const user = session?.user as any;
            if (!user?.username && pathname !== "/setup-username") {
                router.replace("/setup-username");
            }
            if (user?.username && pathname === "/setup-username") {
                router.replace("/home");
            }
        }
    }, [session, status, pathname, router]);

    if (status === "loading") return null;

    // If no username and not on setup page, don't show children yet to avoid flash of broken UI
    const user = session?.user as any;
    if (status === "authenticated" && !user?.username && pathname !== "/setup-username") {
        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg-main)" }}>
                <div className="spinner"></div>
            </div>
        );
    }

    return <>{children}</>;
}
