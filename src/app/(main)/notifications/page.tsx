import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { USER_SELECT } from "@/lib/constants";
import { redirect } from "next/navigation";
import { markNotificationsRead } from "@/app/actions/user";
import { NotificationsContent } from "@/components/NotificationsContent";
import { NotificationsHeader } from "@/components/NotificationsHeader";

export default async function NotificationsPage() {
    const session = await auth();
    if (!session?.user?.id) return redirect("/login");

    const notifications = await prisma.notification.findMany({
        where: { userId: session.user.id },
        include: {
            actor: { select: USER_SELECT },
            tweet: true,
        },
        orderBy: { createdAt: "desc" },
    });

    // Mark as read
    markNotificationsRead();

    return (
        <div style={{ paddingBottom: "80px" }}>
            <NotificationsHeader />
            <NotificationsContent notifications={notifications} />
        </div>
    );
}
