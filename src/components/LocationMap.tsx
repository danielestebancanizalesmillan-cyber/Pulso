"use client";

import { useEffect, useRef } from "react";
import { MapPin } from "lucide-react";

interface LocationMapProps {
    lat: number;
    lng: number;
    label: string;
}

export function LocationMap({ lat, lng, label }: LocationMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);

    useEffect(() => {
        if (!mapRef.current || typeof window === "undefined" || !window.L) return;

        if (!mapInstance.current) {
            mapInstance.current = window.L.map(mapRef.current, {
                center: [lat, lng],
                zoom: 13,
                zoomControl: false,
                attributionControl: false
            });

            window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstance.current);

            window.L.marker([lat, lng]).addTo(mapInstance.current);
        }

        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }
        };
    }, [lat, lng]);

    return (
        <div style={{ marginTop: "12px", borderRadius: "16px", overflow: "hidden", border: "1px solid var(--border)", position: "relative" }}>
            <div ref={mapRef} style={{ height: "180px", width: "100%" }} />
            <div style={{ 
                position: "absolute", 
                bottom: "8px", 
                left: "8px", 
                background: "rgba(0,0,0,0.6)", 
                backdropFilter: "blur(4px)",
                color: "white", 
                padding: "4px 8px", 
                borderRadius: "8px", 
                fontSize: "0.75rem",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                zIndex: 1000
            }}>
                <MapPin size={12} />
                {label}
            </div>
        </div>
    );
}

declare global {
    interface Window {
        L: any;
    }
}
