import { prisma } from "@/lib/prisma";
import { VerificationManager } from "./VerificationManager";

export default async function AdminVerificationsPage() {
    const requests = await prisma.verificationRequest.findMany({
        where: { status: "PENDING" },
        include: { user: { select: { name: true, username: true, avatar: true } } },
        orderBy: { createdAt: "desc" }
    });

    return (
        <div>
            <div style={{ marginBottom: "24px" }}>
                <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a" }}>Solicitudes de Verificación</h1>
                <p style={{ color: "#64748b" }}>Revisa y aprueba las identidades de los usuarios que buscan el sello de autenticidad.</p>
            </div>

            <VerificationManager initialRequests={requests} />
        </div>
    );
}
