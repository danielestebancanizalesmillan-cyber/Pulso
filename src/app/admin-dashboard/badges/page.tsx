import BadgesClient from "./BadgesClient";
import { prisma } from "@/lib/prisma";

export default async function BadgesPage() {
    const badges = await prisma.badge.findMany({
        orderBy: { createdAt: "desc" }
    });

    return <BadgesClient initialBadges={badges} />;
}
