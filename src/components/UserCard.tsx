"use client";

import Link from "next/link";
import { FollowButton } from "./FollowButton";
import { Avatar } from "./Avatar";
import { useSession } from "next-auth/react";
import { VerifiedBadge } from "./VerifiedBadge";

interface UserCardProps {
    user: {
        id: string;
        name: string;
        username: string | null;
        bio: string | null;
        avatar: string | null;
        isVerified?: boolean;
        verificationType?: string;
    };
}

export function UserCard({ user }: UserCardProps) {
    const { data: session } = useSession();
    const currentUserId = session?.user?.id;
    const isOwn = currentUserId === user.id;

    return (
        <div className="user-card" style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", gap: "12px" }}>
            <Link href={`/${user.username}`} style={{ textDecoration: "none" }}>
                <Avatar user={user} size="md" />
            </Link>

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                    <Link href={`/${user.username}`} style={{ textDecoration: "none", color: "inherit", minWidth: 0, flex: 1 }}>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: "1rem", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</span>
                                <VerifiedBadge type={user.verificationType || (user.isVerified ? "BLUE" : "NONE")} size={16} />
                            </div>
                            <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>@{user.username}</div>
                        </div>
                    </Link>
                    {!isOwn && (
                        <div style={{ flexShrink: 0 }}>
                            <FollowButton targetId={user.id} isFollowing={false} />
                        </div>
                    )}
                </div>
                {user.bio && (
                    <p style={{ marginTop: "4px", fontSize: "0.9rem", color: "var(--text-main)" }}>
                        {user.bio}
                    </p>
                )}
            </div>
        </div>
    );
}
