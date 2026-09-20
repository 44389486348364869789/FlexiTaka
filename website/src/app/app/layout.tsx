"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api, getStoredAuthToken, getStoredGuestSessionId } from "@/lib/api";
import {
  ArrowDownLeft,
  Clock,
  Headphones,
  Home,
  User,
  Zap,
} from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [guestId, setGuestId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { isBn, tr } = useLanguage();
  const a = tr.app.layout;

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
    { name: isBn ? "ড্যাশবোর্ড" : "Dashboard", href: "/app", icon: Home },
    { name: a.navCashOut, href: "/app/cashout", icon: ArrowDownLeft },
    { name: a.navRecharge, href: "/app/recharge", icon: Zap },
    { name: a.navOrders, href: "/app/orders", icon: Clock },
    { name: a.navSupport, href: "/app/support", icon: Headphones },
    { name: isBn ? "প্রোফাইল" : "Profile", href: "/app/profile", icon: User },
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
        <div className="container">
          {/* Desktop Subnav Row */}
          <div className="subnav-desktop-row" style={{ padding: "10px 0" }}>
            {/* Navigation Links */}
            <div style={{ display: "flex", gap: "8px" }}>
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
                      fontWeight: isActive ? "600" : "500",
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

            {/* Active Session Status (Desktop) */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0, paddingLeft: "16px" }}>
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 10px",
                background: "var(--bg-subtle)",
                borderRadius: "var(--radius-full)",
                fontSize: "0.75rem",
                fontWeight: "500",
                color: "var(--text-secondary)"
              }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--ft-green)" }}></span>
                <span>
                  {isLoggedIn
                    ? (isBn ? "অ্যাকাউন্ট সক্রিয়" : "Account Active")
                    : (isBn ? `গেস্ট: ${guestId ? guestId.substring(0, 10) : "..."}` : `Guest: ${guestId ? guestId.substring(0, 10) : "..."}`)}
                </span>
              </div>
            </div>
          </div>

          {/* Mobile Service Navigation Bar */}
          <div className="subnav-mobile-bar">
            {/* Top Micro-Bar: Home / Profile & Session Indicator */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "4px 2px 6px 2px",
              borderBottom: "1px solid var(--border-light)",
              marginBottom: "6px",
              fontSize: "0.6875rem"
            }}>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <Link
                  href="/app"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    color: pathname === "/app" ? "var(--ft-green-active)" : "var(--text-secondary)",
                    fontWeight: pathname === "/app" ? "600" : "500",
                    textDecoration: "none"
                  }}
                >
                  <Home size={12} />
                  <span>{isBn ? "হোম" : "Dashboard"}</span>
                </Link>
                <span style={{ color: "var(--border-card)" }}>•</span>
                <Link
                  href="/app/profile"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    color: pathname === "/app/profile" ? "var(--ft-green-active)" : "var(--text-secondary)",
                    fontWeight: pathname === "/app/profile" ? "600" : "500",
                    textDecoration: "none"
                  }}
                >
                  <User size={12} />
                  <span>{isBn ? "প্রোফাইল" : "Profile"}</span>
                </Link>
              </div>

              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                color: "var(--text-muted)",
                fontSize: "0.6875rem"
              }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--ft-green)" }}></span>
                <span>
                  {isLoggedIn
                    ? (isBn ? "সক্রিয়" : "Active")
                    : (isBn ? `গেস্ট: ${guestId ? guestId.substring(0, 7) : "..."}` : `Guest: ${guestId ? guestId.substring(0, 7) : "..."}`)}
                </span>
              </div>
            </div>

            {/* Primary 4-Service Navigation Grid */}
            <div className="subnav-mobile-grid">
              {[
                { name: a.navCashOut, href: "/app/cashout", icon: ArrowDownLeft },
                { name: a.navRecharge, href: "/app/recharge", icon: Zap },
                { name: a.navOrders, href: "/app/orders", icon: Clock },
                { name: a.navSupport, href: "/app/support", icon: Headphones },
              ].map((svc) => {
                const Icon = svc.icon;
                const isActive = pathname === svc.href;
                return (
                  <Link
                    key={svc.name}
                    href={svc.href}
                    className="subnav-mobile-btn"
                    style={{
                      backgroundColor: isActive ? "var(--ft-green-subtle)" : "transparent",
                      color: isActive ? "var(--ft-green-active)" : "var(--text-secondary)",
                      border: isActive ? "1px solid #BBF7D0" : "1px solid transparent"
                    }}
                  >
                    <Icon size={15} color={isActive ? "var(--ft-green)" : "currentColor"} />
                    <span style={{ fontWeight: isActive ? "600" : "500" }}>{svc.name}</span>
                  </Link>
                );
              })}
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
