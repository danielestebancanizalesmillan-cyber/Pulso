import { prisma } from "@/lib/prisma";
import { ReportList } from "./ReportList";

export default async function AdminReportsPage() {
    const reports = await prisma.report.findMany({
        where: { status: "PENDING" },
        include: { 
            reporter: { select: { name: true, username: true } }
        },
        orderBy: { createdAt: "desc" }
    });

    return (
        <div>
            <div style={{ marginBottom: "24px" }}>
                <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a" }}>Gestión de Reportes</h1>
                <p style={{ color: "#64748b" }}>Modera el contenido de la comunidad revisando las denuncias enviadas por los usuarios.</p>
            </div>

            <ReportList initialReports={reports} />
        </div>
    );
}
