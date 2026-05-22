import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { Shield, Users, Award, AlertTriangle, LayoutDashboard, ArrowLeft, Megaphone } from "lucide-react";
import AdminLoginPage from "./login/page"; // Importamos el componente de login para mostrarlo inline si está bloqueado

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true }
    });

    if (user?.role !== "ADMIN") {
        redirect("/home");
    }

    // Doble Seguridad: Verificar si el panel está desbloqueado con el PIN
    const cookieStore = await cookies();
    const isUnlocked = cookieStore.get("admin_unlocked")?.value === "true";

    // Si NO está desbloqueado, mostramos la pantalla de login en lugar del dashboard
    // Esto evita bucles de redirección infinitos.
    if (!isUnlocked) {
        return <AdminLoginPage />;
    }

    return (
        <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc", color: "#1e293b" }}>
            {/* Sidebar de Admin */}
            <aside style={{ width: "260px", background: "#ffffff", borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", position: "fixed", height: "100vh" }}>
                <div style={{ padding: "24px", display: "flex", alignItems: "center", gap: "12px", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ background: "var(--blue)", padding: "8px", borderRadius: "10px", color: "white" }}>
                        <Shield size={24} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0 }}>Pulso Admin</h1>
                        <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Panel de Control</span>
                    </div>
                </div>

                <nav style={{ padding: "20px 12px", flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                    <AdminNavLink href="/admin-dashboard" icon={<LayoutDashboard size={20} />} label="Dashboard" />
                    <AdminNavLink href="/admin-dashboard/users" icon={<Users size={20} />} label="Usuarios" />
                    <AdminNavLink href="/admin-dashboard/ads" icon={<Megaphone size={20} />} label="Anuncios" />
                    <AdminNavLink href="/admin-dashboard/verifications" icon={<Award size={20} />} label="Verificaciones" />
                    <AdminNavLink href="/admin-dashboard/badges" icon={<Shield size={20} />} label="Insignias" />
                    <AdminNavLink href="/admin-dashboard/reports" icon={<AlertTriangle size={20} />} label="Reportes" />
                </nav>

                <div style={{ padding: "16px", borderTop: "1px solid #f1f5f9" }}>
                    <Link href="/home" style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px", borderRadius: "8px", color: "#64748b", textDecoration: "none", fontSize: "0.9rem", transition: "all 0.2s" }} className="admin-nav-item">
                        <ArrowLeft size={18} />
                        Volver a la Red Social
                    </Link>
                </div>
            </aside>

            {/* Contenido Principal */}
            <main style={{ marginLeft: "260px", flex: 1, padding: "32px" }}>
                {children}
            </main>

            <style dangerouslySetInnerHTML={{ __html: `
                .admin-nav-item:hover {
                    background: #f1f5f9;
                    color: var(--blue) !important;
                }
                .admin-nav-item.active {
                    background: #eff6ff;
                    color: var(--blue) !important;
                }
            `}} />
        </div>
    );
}

function AdminNavLink({ href, icon, label }: { href: string, icon: React.ReactNode, label: string }) {
    return (
        <Link href={href} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderRadius: "8px", color: "#64748b", textDecoration: "none", fontWeight: 500, fontSize: "0.95rem", transition: "all 0.2s" }} className="admin-nav-item">
            {icon}
            {label}
        </Link>
    );
}
