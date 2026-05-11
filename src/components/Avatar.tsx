interface AvatarProps {
    user?: { name?: string | null; image?: string | null; avatar?: string | null } | null;
    size?: "sm" | "md" | "lg" | "xl" | "2xl";
    className?: string;
}

const sizeMap = {
    sm: "avatar-sm",
    md: "avatar-md",
    lg: "avatar-lg",
    xl: "avatar-xl",
    "2xl": "avatar-2xl",
};

export function Avatar({ user, size = "md", className = "" }: AvatarProps) {
    const sizeClass = sizeMap[size];
    const src = (user as any)?.avatar || user?.image;
    const letter = (user?.name || "?")[0].toUpperCase();

    // Debugging (optional, remove in production)
    // console.log('Avatar debug:', { username: (user as any)?.username, src });

    if (src) {
        return (
            <img
                src={src}
                alt={user?.name || "Avatar"}
                className={`avatar ${sizeClass} ${className}`}
            />
        );
    }

    return (
        <div className={`avatar-placeholder ${sizeClass} ${className}`}>
            {letter}
        </div>
    );
}
