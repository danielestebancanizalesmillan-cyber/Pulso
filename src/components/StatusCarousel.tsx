"use client";

import { useEffect, useState } from "react";
import { getStatuses } from "@/app/actions/status";
import { Avatar } from "./Avatar";
import { useSession } from "next-auth/react";
import { CreateStatusModal } from "./CreateStatusModal";
import { StatusViewerModal } from "./StatusViewerModal";

export function StatusCarousel() {
    const { data: session } = useSession();
    const [groupedStatuses, setGroupedStatuses] = useState<any[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [activeViewer, setActiveViewer] = useState<{ userId: string, items: any[] } | null>(null);

    const fetchStatuses = async () => {
        const statuses = await getStatuses();
        
        // Group by userId
        const groups: { [key: string]: any } = {};
        statuses.forEach((s: any) => {
            if (!groups[s.userId]) {
                groups[s.userId] = {
                    userId: s.userId,
                    user: s.user,
                    items: []
                };
            }
            groups[s.userId].items.push(s);
        });

        // Convert to array, pushing current user to front if they have stories
        const arr = Object.values(groups);
        setGroupedStatuses(arr);
    };

    useEffect(() => {
        if (session?.user) {
            fetchStatuses();
        }
    }, [session?.user]);

    const myStatuses = groupedStatuses.find(g => g.userId === session?.user?.id);

    return (
        <div style={{ display: "flex", gap: "12px", padding: "12px", borderBottom: "1px solid var(--border)", overflowX: "auto", whiteSpace: "nowrap", background: "var(--bg-primary)" }} className="no-scrollbar">
            {/* My Status Trigger */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                <div style={{ position: "relative", width: "56px", height: "56px", borderRadius: "50%", padding: "2px", border: myStatuses ? "2px solid var(--blue)" : "2px dashed var(--text-secondary)", cursor: "pointer" }} onClick={() => myStatuses ? setActiveViewer(myStatuses) : setShowCreate(true)}>
                    <Avatar user={session?.user} size="lg" />
                    <div 
                        onClick={(e) => { e.stopPropagation(); setShowCreate(true); }} 
                        style={{ position: "absolute", bottom: -2, right: -2, background: "var(--blue)", color: "white", borderRadius: "50%", width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "bold", border: "2px solid var(--bg-primary)", cursor: "pointer" }}
                    >
                        +
                    </div>
                </div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-primary)", maxWidth: "64px", overflow: "hidden", textOverflow: "ellipsis" }}>Tu historia</span>
            </div>

            {/* Other Users Statuses */}
            {groupedStatuses.filter(g => g.userId !== session?.user?.id).map(group => {
                const allSeen = group.items.every((item: any) => item.views && item.views.length > 0);
                return (
                    <div key={group.userId} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", cursor: "pointer", flexShrink: 0 }} onClick={() => setActiveViewer(group)}>
                        <div style={{ 
                            width: "56px", height: "56px", borderRadius: "50%", padding: "2px", 
                            background: allSeen ? "var(--border)" : "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
                            animation: allSeen ? "none" : "rotate 2s linear infinite" 
                        }}>
                            <div style={{ background: "var(--bg-primary)", borderRadius: "50%", padding: "2px", width: "100%", height: "100%" }}>
                                <Avatar user={group.user} size="lg" />
                            </div>
                        </div>
                        <span style={{ fontSize: "0.75rem", color: allSeen ? "var(--text-secondary)" : "var(--text-primary)", maxWidth: "64px", overflow: "hidden", textOverflow: "ellipsis" }}>{group.user.name}</span>
                    </div>
                );
            })}

            {showCreate && <CreateStatusModal onClose={() => { setShowCreate(false); fetchStatuses(); }} />}
            {activeViewer && <StatusViewerModal group={activeViewer} onClose={() => { setActiveViewer(null); fetchStatuses(); }} />}
        </div>
    );
}
