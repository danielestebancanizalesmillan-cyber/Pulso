import React from 'react';

interface VerifiedBadgeProps {
  type?: "BLUE" | "GOLD" | "GREY" | "NONE" | string;
  isVerified?: boolean;
  size?: number;
  className?: string;
  animate?: boolean;
  customBadges?: any[];
}

export function VerifiedBadge({ type, isVerified, size = 18, className = "", animate = true, customBadges = [] }: VerifiedBadgeProps) {
  const computedType = isVerified && (!type || type === "NONE") ? "BLUE" : type || "NONE";

  const color = computedType === "GOLD" ? "#ffad00" : computedType === "GREY" ? "#829aab" : "#1d9bf0";
  
  const getTitle = () => {
    if (computedType === "GOLD") return "Cuenta oficial de empresa u organización";
    if (computedType === "GREY") return "Servidor Público o Institución gubernamental";
    return "Cuenta verificada";
  };

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', verticalAlign: 'text-bottom' }}>
      {computedType !== "NONE" && (
        <svg 
          viewBox="0 0 24 24" 
          width={size} 
          height={size} 
          fill={color} 
          className={`verified-badge ${animate ? 'verified-animated' : ''} ${className}`}
          style={{ flexShrink: 0, marginLeft: 4 }}
        >
          <title>{getTitle()}</title>
          <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.97-.81-4.01s-2.62-1.27-4.01-.81c-.67-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.39-.46-2.97-.2-4.01.81s-1.27 2.62-.81 4.01c-1.31.67-2.19 1.91-2.19 3.34s.88 2.67 2.19 3.34c-.46 1.39-.2 2.97.81 4.01s2.62 1.27 4.01.81c.67 1.31 1.91 2.19 3.33 2.19s2.67-.88 3.34-2.19c1.39.46 2.97.2 4.01-.81s1.27-2.62.81-4.01c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.35-6.2 6.78z" />
        </svg>
      )}
      
      {customBadges && customBadges.length > 0 && customBadges.map((ub: any) => ub.badge && (
        <img 
          key={ub.badge.id}
          src={ub.badge.imageUrl} 
          alt={ub.badge.name} 
          title={ub.badge.name}
          style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0, marginLeft: computedType === "NONE" ? 4 : 0 }} 
        />
      ))}
    </span>
  );
}
