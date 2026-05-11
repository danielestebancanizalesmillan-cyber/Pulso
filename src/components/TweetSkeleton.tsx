"use client";

export function TweetSkeleton() {
    return (
        <div className="tweet-card" style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", opacity: 0.6 }}>
            <div style={{ display: "flex", gap: "12px" }}>
                {/* Avatar Skeleton */}
                <div className="skeleton" style={{ width: 48, height: 48, borderRadius: "50%", flexShrink: 0 }} />
                
                <div style={{ flex: 1 }}>
                    {/* Header Skeleton */}
                    <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                        <div className="skeleton" style={{ width: "100px", height: "14px", borderRadius: "4px" }} />
                        <div className="skeleton" style={{ width: "60px", height: "14px", borderRadius: "4px" }} />
                    </div>
                    
                    {/* Content Skeleton */}
                    <div className="skeleton" style={{ width: "90%", height: "14px", borderRadius: "4px", marginBottom: "6px" }} />
                    <div className="skeleton" style={{ width: "70%", height: "14px", borderRadius: "4px", marginBottom: "12px" }} />
                    
                    {/* Actions Skeleton */}
                    <div style={{ display: "flex", justifyContent: "space-between", maxWidth: "400px" }}>
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="skeleton" style={{ width: "20px", height: "20px", borderRadius: "4px" }} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function TrendingSkeleton() {
    return (
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-light, #eff3f4)" }}>
            <div className="skeleton" style={{ width: "40%", height: "12px", borderRadius: "4px", marginBottom: "8px" }} />
            <div className="skeleton" style={{ width: "70%", height: "16px", borderRadius: "4px", marginBottom: "8px" }} />
            <div className="skeleton" style={{ width: "30%", height: "12px", borderRadius: "4px" }} />
        </div>
    );
}
