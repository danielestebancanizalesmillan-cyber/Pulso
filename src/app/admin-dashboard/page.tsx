import { prisma } from "@/lib/prisma";
import { Users, ShieldAlert, Award, TrendingUp, MessageSquare } from "lucide-react";

export default async function AdminDashboardPage() {
    const [userCount, reportCount, verificationCount, tweetCount] = await Promise.all([
        prisma.user.count(),
        prisma.report.count({ where: { status: "PENDING" } }),
        prisma.verificationRequest.count({ where: { status: "PENDING" } }),
        prisma.tweet.count(),
    ]);

    return (
        <div>
            <div style={{ marginBottom: "32px" }}>
                <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "#0f172a", marginBottom: "8px" }}>Bienvenido, Administrador</h1>
                <p style={{ color: "#64748b" }}>Aquí tienes un resumen de lo que está pasando en Pulso hoy.</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px", marginBottom: "40px" }}>
                <StatCard title="Total Usuarios" value={userCount} icon={<Users size={24} />} color="#3b82f6" />
                <StatCard title="Reportes Pendientes" value={reportCount} icon={<ShieldAlert size={24} />} color="#ef4444" />
                <StatCard title="Solicitudes Verificación" value={verificationCount} icon={<Award size={24} />} color="#f59e0b" />
                <StatCard title="Total Tweets" value={tweetCount} icon={<MessageSquare size={24} />} color="#10b981" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }}>
                <div style={{ background: "white", padding: "24px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                    <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
                        <TrendingUp size={20} color="#3b82f6" />
                        Actividad Reciente
                    </h2>
                    <div style={{ color: "#64748b", fontSize: "0.9rem", textAlign: "center", padding: "40px 0" }}>
                        Próximamente: Gráficas detalladas de crecimiento.
                    </div>
                </div>

                <div style={{ background: "white", padding: "24px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                    <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "20px" }}>Atención Inmediata</h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <QuickAction label="Resolver Reportes" count={reportCount} href="/admin-dashboard/reports" color="#fee2e2" textColor="#ef4444" />
                        <QuickAction label="Aprobar Verificaciones" count={verificationCount} href="/admin-dashboard/verifications" color="#fef3c7" textColor="#d97706" />
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, color }: any) {
    return (
        <div style={{ background: "white", padding: "24px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", display: "flex", alignItems: "center", gap: "20px" }}>
            <div style={{ background: `${color}15`, padding: "12px", borderRadius: "12px", color: color }}>
                {icon}
            </div>
            <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>{title}</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a" }}>{value}</div>
            </div>
        </div>
    );
}

function QuickAction({ label, count, href, color, textColor }: any) {
    return (
        <a href={href} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: "12px", background: color, textDecoration: "none", transition: "transform 0.2s" }} className="hover-lift">
            <span style={{ fontWeight: 600, color: textColor, fontSize: "0.9rem" }}>{label}</span>
            <span style={{ background: "white", padding: "2px 8px", borderRadius: "6px", fontWeight: 800, fontSize: "0.8rem", color: textColor }}>{count}</span>
        </a>
    );
}
