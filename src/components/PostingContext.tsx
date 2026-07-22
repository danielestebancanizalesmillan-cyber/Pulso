"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface PostingState {
    isPosting: boolean;
    status: "idle" | "posting" | "success" | "error";
}

interface PostingContextType extends PostingState {
    startPosting: () => void;
    finishPosting: (success: boolean) => void;
}

const PostingContext = createContext<PostingContextType>({
    isPosting: false,
    status: "idle",
    startPosting: () => {},
    finishPosting: () => {},
});

export function PostingProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<PostingState>({ isPosting: false, status: "idle" });

    const startPosting = useCallback(() => {
        setState({ isPosting: true, status: "posting" });
    }, []);

    const finishPosting = useCallback((success: boolean) => {
        setState({ isPosting: false, status: success ? "success" : "error" });
        // Reset to idle after animation completes
        setTimeout(() => {
            setState({ isPosting: false, status: "idle" });
        }, 1800);
    }, []);

    return (
        <PostingContext.Provider value={{ ...state, startPosting, finishPosting }}>
            {children}
        </PostingContext.Provider>
    );
}

export function usePosting() {
    return useContext(PostingContext);
}
