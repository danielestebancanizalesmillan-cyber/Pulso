"use client";

import { useState, useTransition } from "react";
import { followUser } from "@/app/actions/user";

export function FollowButton({ 
    targetId, 
    isFollowing: initiallyFollowing,
    isPendingRequest: initiallyPendingRequest = false,
    isPrivate = false
}: { 
    targetId: string; 
    isFollowing: boolean;
    isPendingRequest?: boolean;
    isPrivate?: boolean;
}) {
    const [following, setFollowing] = useState(initiallyFollowing);
    const [pendingRequest, setPendingRequest] = useState(initiallyPendingRequest);
    const [hover, setHover] = useState(false);
    const [isPending, startTransition] = useTransition();

    const handleClick = () => {
        if (following) {
            setFollowing(false);
        } else if (pendingRequest) {
            setPendingRequest(false);
        } else if (isPrivate) {
            setPendingRequest(true);
        } else {
            setFollowing(true);
        }
        startTransition(() => followUser(targetId));
    };

    const getText = () => {
        if (following) return hover ? "Unfollow" : "Following";
        if (pendingRequest) return "Solicitado";
        return "Follow";
    };

    return (
        <button
            className={following ? "btn btn-following" : pendingRequest ? "btn btn-outline" : "btn btn-follow"}
            onClick={handleClick}
            disabled={isPending}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
        >
            {getText()}
        </button>
    );
}
