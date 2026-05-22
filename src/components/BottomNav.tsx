"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, Search, Bell, Mail, User } from "lucide-react";
import { useSession } from "next-auth/react";

export function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user as any;

  if (!user) return null;

  const links = [
    { href: "/home", icon: Home, label: "Inicio" },
    { href: "/explore", icon: Search, label: "Búsqueda" },
    { href: "/notifications", icon: Bell, label: "Notificaciones" },
    { href: "/messages", icon: Mail, label: "Mensajes" },
    { href: `/${user?.username || ''}`, icon: User, label: "Perfil" },
  ];

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
    </motion.div>
  );
}
