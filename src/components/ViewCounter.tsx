"use client";
import { useEffect } from "react";
import { incrementViewCount } from "@/app/actions/tweet";

export function ViewCounter({ tweetId }: { tweetId: string }) {
    useEffect(() => {
        // We call it once when the detail page mounts
        incrementViewCount(tweetId);
    }, [tweetId]);
    return null;
}
