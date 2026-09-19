"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api, getStoredAuthToken, getStoredGuestSessionId } from "@/lib/api";
import { ArrowRight, Menu, ShieldCheck, User, X } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check session
    const token = getStoredAuthToken();
    setIsLoggedIn(!!token);
    const gId = getStoredGuestSessionId();
    if (gId) {
      setGuestId(gId);
    } else {
      api.ensureGuestSession().then((id) => setGuestId(id)).catch(() => {});
    }
  }, [pathname]);

  const navLinks = [
    { name: "How It Works", href: "/how-it-works" },
    { name: "Cash Out", href: "/cash-out" },
    { name: "Recharge", href: "/recharge" },
    { name: "Pricing", href: "/pricing" },
    { name: "FAQ", href: "/faq" },
    { name: "Support", href: "/support" },
  ];

  return (
    <header className="header-glass">
      <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: "var(--header-height)" }}>
        {/* Brand Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
          <img
            src="/images/flexitaka-logo.png"
            alt="FlexiTaka - SIM Balance to Cash"
            className="brand-logo"
          />
        </Link>

        {/* Desktop Navigation */}
        <nav style={{ display: "flex", alignItems: "center", gap: "28px" }} className="desktop-nav">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                style={{
                  fontSize: "0.9375rem",
                  fontWeight: isActive ? "700" : "500",
                  color: isActive ? "var(--ft-green)" : "var(--text-secondary)",
                  transition: "color 0.15s ease",
                  textDecoration: "none",
                }}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Actions & Session Indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Link
            href="/app"
            className="btn btn-outline btn-sm"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <User size={15} />
            <span>{isLoggedIn ? "Account" : "Web App"}</span>
          </Link>

          <Link
            href="/app/cashout"
            className="btn btn-primary btn-sm"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <span>Start Now</span>
            <ArrowRight size={15} />
          </Link>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              display: "none",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "6px",
              color: "var(--text-primary)"
            }}
            className="mobile-toggle"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div style={{
          background: "#FFFFFF",
          borderTop: "1px solid var(--border-light)",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          boxShadow: "var(--shadow-md)"
        }}>
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              style={{
                fontSize: "1rem",
                fontWeight: "600",
                color: pathname === link.href ? "var(--ft-green)" : "var(--text-primary)",
                padding: "8px 0",
              }}
            >
              {link.name}
            </Link>
          ))}
          <div style={{ borderTop: "1px solid var(--border-card)", paddingTop: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <Link href="/app" onClick={() => setMobileMenuOpen(false)} className="btn btn-outline btn-full">
              Customer Web App
            </Link>
            <Link href="/app/cashout" onClick={() => setMobileMenuOpen(false)} className="btn btn-primary btn-full">
              Cash Out SIM Balance
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
