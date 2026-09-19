"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api, getStoredAuthToken, getStoredGuestSessionId } from "@/lib/api";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Headphones,
  Home,
  ShieldCheck,
  User,
  Zap,
} from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [guestId, setGuestId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = getStoredAuthToken();
    setIsLoggedIn(!!token);
    const storedGuest = getStoredGuestSessionId();
    if (storedGuest) {
      setGuestId(storedGuest);
    } else {
      api.ensureGuestSession().then((id) => setGuestId(id)).catch(() => {});
    }
  }, [pathname]);

  const appNav = [
    { name: "Dashboard", href: "/app", icon: Home },
    { name: "Cash Out", href: "/app/cashout", icon: ArrowDownLeft },
    { name: "Recharge", href: "/app/recharge", icon: Zap },
    { name: "Orders", href: "/app/orders", icon: Clock },
    { name: "Support", href: "/app/support", icon: Headphones },
    { name: "Profile", href: "/app/profile", icon: User },
  ];

  return (
    <div style={{ backgroundColor: "var(--bg-main)", minHeight: "calc(100vh - var(--header-height))" }}>
      {/* App Sub-Navigation Bar */}
      <div style={{
        backgroundColor: "#FFFFFF",
        borderBottom: "1px solid var(--border-card)",
        position: "sticky",
        top: "var(--header-height)",
        zIndex: 90
      }}>
        <div className="container" style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          overflowX: "auto",
          whiteSpace: "nowrap"
        }}>
          {/* Navigation Links */}
          <div style={{ display: "flex", gap: "8px", padding: "10px 0" }}>
            {appNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 16px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "0.875rem",
                    fontWeight: isActive ? "700" : "500",
                    color: isActive ? "var(--ft-green-active)" : "var(--text-secondary)",
                    backgroundColor: isActive ? "var(--ft-green-subtle)" : "transparent",
                    transition: "all 0.15s ease",
                    textDecoration: "none"
                  }}
                >
                  <Icon size={16} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Active Session Status */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0, paddingLeft: "16px" }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              background: "var(--bg-subtle)",
              borderRadius: "var(--radius-full)",
              fontSize: "0.75rem",
              fontWeight: "600",
              color: "var(--text-secondary)"
            }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--ft-green)" }}></span>
              <span>{isLoggedIn ? "Account Active" : `Guest: ${guestId ? guestId.substring(0, 10) : "..."}`}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main App Page Content */}
      <div className="container" style={{ paddingTop: "32px", paddingBottom: "60px" }}>
        {children}
      </div>
    </div>
  );
}
