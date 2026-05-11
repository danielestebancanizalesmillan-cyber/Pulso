import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AdminDashboard } from "./AdminDashboard";

export default async function AdminPage() {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true }
    });

    if (user?.role !== "ADMIN") {
        redirect("/home"); // Redirect unauthorized users
    }

    // Fetch Requests, Reports & Users
    const [reports, verificationRequests, users] = await Promise.all([
        prisma.report.findMany({
            where: { status: "PENDING" },
            include: { reporter: { select: { name: true, username: true } } },
            orderBy: { createdAt: "desc" }
        }),
        prisma.verificationRequest.findMany({
            where: { status: { in: ["PENDING", "pending"] } },
            include: { user: { select: { name: true, username: true, avatar: true } } },
            orderBy: { createdAt: "desc" }
        }),
        prisma.user.findMany({
            select: {
                id: true,
                name: true,
                username: true,
                avatar: true,
                role: true,
                isVerified: true,
                verificationType: true,
                createdAt: true
            },
            orderBy: { createdAt: "desc" }
        })
    ]);

    return (
        <AdminDashboard reports={reports} verifications={verificationRequests} users={users} />
    );
}
