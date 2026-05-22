import { prisma } from "@/lib/prisma";
import { UsersList } from "./UsersList";

export default async function AdminUsersPage() {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            role: true,
            isVerified: true,
            verificationType: true,
            createdAt: true,
            badges: { include: { badge: true } }
        },
        orderBy: { createdAt: "desc" }
    });

    const availableBadges = await prisma.badge.findMany({
        orderBy: { name: "asc" }
    });

    return (
        <div>
            <div style={{ marginBottom: "24px" }}>
                <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a" }}>Gestión de Usuarios</h1>
                <p style={{ color: "#64748b" }}>Administra los roles y estados de verificación de todos los miembros de Pulso.</p>
            </div>

            <div style={{ background: "white", borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <UsersList initialUsers={users} availableBadges={availableBadges} />
            </div>
        </div>
    );
}
