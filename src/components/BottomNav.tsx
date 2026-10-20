"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, Search, Bell, Mail, Settings, Users, Mic } from "lucide-react";
import { useSession } from "next-auth/react";

export function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user as any;

  if (!user) return null;

  const links = [
    { href: "/home", icon: Home, label: "Inicio" },
    { href: "/explore", icon: Search, label: "Buscar" },
    { href: "/spaces", icon: Mic, label: "Espacios" },
    { href: "/notifications", icon: Bell, label: "Avisos" },
    { href: "/messages", icon: Mail, label: "Mensajes" },
  ];

  const handleOpenDrawer = () => {
    window.dispatchEvent(new CustomEvent("open-mobile-drawer"));
  };

  return (
    <motion.div 
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="bottom-nav"
    >
      {links.map((link) => {
        const isActive = pathname === link.href;
        const Icon = link.icon;
        
        return (
          <Link key={link.href} href={link.href} className={`bottom-nav-item ${isActive ? "active" : ""}`}>
            <div style={{ position: "relative" }}>
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              {isActive && (
                <motion.div 
                  layoutId="bottom-nav-indicator"
                  className="bottom-nav-indicator"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </div>
            <span className="bottom-nav-label">{link.label}</span>
          </Link>
        );
      })}

      {/* Botón de Menú lateral derecho */}
      <button 
        onClick={handleOpenDrawer}
        className="bottom-nav-item"
        style={{ background: "none", border: "none", cursor: "pointer" }}
        aria-label="Abrir menú lateral"
      >
        <div style={{ position: "relative" }}>
          <Users size={24} strokeWidth={2} />
        </div>
        <span className="bottom-nav-label">Menú</span>
      </button>
    </motion.div>
  );
}
