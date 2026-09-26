"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api, getStoredAuthToken, getStoredGuestSessionId } from "@/lib/api";
import { ArrowRight, Menu, User, X } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

import LanguageSwitcher from "./LanguageSwitcher";

export default function Navbar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { tr, isBn } = useLanguage();
  const nav = tr.common.nav;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Automatically close drawer on route change
    setMobileMenuOpen(false);

    // Check session status
    const token = getStoredAuthToken();
    setIsLoggedIn(!!token);
    const gId = getStoredGuestSessionId();
    if (gId) {
      setGuestId(gId);
    } else {
      api.ensureGuestSession().then((id) => setGuestId(id)).catch(() => {});
    }
  }, [pathname]);

  // Lock body scroll and listen for Escape key when mobile menu drawer is open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };

    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);

  const navLinks = [
    { name: nav.howItWorks, href: "/how-it-works" },
    { name: nav.cashOut, href: "/cash-out" },
    { name: nav.recharge, href: "/recharge" },
    { name: nav.pricing, href: "/pricing" },
    { name: nav.faq, href: "/faq" },
    { name: nav.support, href: "/support" },
  ];

  return (
    <header className="header-glass">
      <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: "var(--header-height)" }}>
        {/* Brand Logo */}
        <Link href="/" className="brand-logo-link" style={{ display: "flex", alignItems: "center", textDecoration: "none", flexShrink: 0 }}>
          <img
            src="/images/flexitaka-logo.png"
            alt="FlexiTaka - SIM Balance to Cash"
            className="brand-logo-img"
          />
        </Link>

        {/* Desktop Navigation */}
        <nav style={{ display: "flex", alignItems: "center", gap: "28px" }} className="desktop-nav">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  fontSize: "0.9375rem",
                  fontWeight: isActive ? "600" : "500",
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
        <div className="header-actions-group" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Link
            href="/app"
            className="btn btn-outline btn-sm header-btn-account"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            title={isLoggedIn ? (isBn ? "অ্যাকাউন্ট" : "Account") : (isBn ? "ওয়েব অ্যাপ" : "Web App")}
            aria-label={isLoggedIn ? (isBn ? "অ্যাকাউন্ট" : "Account") : (isBn ? "ওয়েব অ্যাপ" : "Web App")}
          >
            <User size={15} />
            <span>{isLoggedIn ? (isBn ? "অ্যাকাউন্ট" : "Account") : (isBn ? "ওয়েব অ্যাপ" : "Web App")}</span>
          </Link>

          <Link
            href="/app/cashout"
            className="btn btn-primary btn-sm header-btn-cta"
            style={{ display: "inline-flex", alignItems: "center", gap: "5px", whiteSpace: "nowrap" }}
          >
            <span>{nav.startNow}</span>
            <ArrowRight size={14} />
          </Link>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            style={{
              display: "none",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "6px",
              color: "var(--text-primary)",
              lineHeight: 1,
            }}
            className="mobile-toggle"
            aria-label={nav.menu}
          >
            <Menu size={22} />
          </button>
        </div>
      </div>

      {/* Mobile Compact Right Drawer & Subtle Dark/Blur Overlay (Rendered into document.body via Portal) */}
      {mounted && mobileMenuOpen && createPortal(
        <>
          <div
            className="mobile-nav-backdrop"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="mobile-nav-panel" role="dialog" aria-modal="true" aria-label={nav.menu}>
            {/* Drawer Header */}
            <div className="mobile-drawer-header">
              <Link href="/" onClick={() => setMobileMenuOpen(false)} className="brand-logo-link" style={{ display: "flex", alignItems: "center" }}>
                <img
                  src="/images/flexitaka-logo.png"
                  alt="FlexiTaka"
                  style={{ height: "20px", width: "auto", display: "block" }}
                />
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="mobile-drawer-close-btn"
                aria-label={nav.close}
              >
                <X size={16} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="mobile-drawer-body">
              {/* Primary Service CTAs */}
              <div className="mobile-drawer-cta-grid">
                <Link
                  href="/app/cashout"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn btn-primary"
                  style={{
                    justifyContent: "center",
                    height: "38px",
                    fontSize: "0.8125rem",
                    fontWeight: "600",
                    borderRadius: "var(--radius-md)",
                    boxShadow: "none",
                    padding: "0 8px",
                  }}
                >
                  <span>{nav.cashOut}</span>
                  <ArrowRight size={13} />
                </Link>

                <Link
                  href="/app/recharge"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn btn-outline"
                  style={{
                    justifyContent: "center",
                    height: "38px",
                    fontSize: "0.8125rem",
                    fontWeight: "600",
                    borderRadius: "var(--radius-md)",
                    borderColor: "var(--border-light)",
                    color: "var(--text-primary)",
                    padding: "0 8px",
                  }}
                >
                  <span>{nav.recharge}</span>
                </Link>
              </div>

              {/* Navigation Links Group */}
              <div className="mobile-drawer-section">
                <div className="mobile-drawer-section-title">
                  {isBn ? "ন্যাভিগেশন" : "NAVIGATION"}
                </div>
                <div className="mobile-drawer-nav-list">
                  {navLinks.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`mobile-drawer-nav-item ${isActive ? "active" : ""}`}
                      >
                        <span>{link.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="mobile-drawer-divider" />

              {/* Account Group */}
              <div className="mobile-drawer-section">
                <div className="mobile-drawer-section-title">
                  {isBn ? "অ্যাকাউন্ট" : "ACCOUNT"}
                </div>
                <Link
                  href="/app"
                  onClick={() => setMobileMenuOpen(false)}
                  className="mobile-drawer-account-card"
                >
                  <div className="mobile-drawer-account-info">
                    <User size={16} color="var(--ft-green-active)" />
                    <span className="mobile-drawer-account-name">
                      {isLoggedIn
                        ? (isBn ? "আমার অ্যাকাউন্ট" : "My Account")
                        : (isBn ? "কাস্টমার ওয়েব অ্যাপ" : "Customer Web App")}
                    </span>
                  </div>
                  <span className="mobile-drawer-account-badge">
                    {isLoggedIn
                      ? (isBn ? "ভেরিফায়েড" : "Verified")
                      : (isBn ? `গেস্ট: ${guestId ? guestId.substring(0, 6) : "সক্রিয়"}` : `Guest: ${guestId ? guestId.substring(0, 6) : "Active"}`)}
                  </span>
                </Link>
              </div>

              {/* Language Switcher in Mobile Drawer */}
              <div className="mobile-drawer-section" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "12px", borderTop: "1px solid var(--border-light)" }}>
                <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", fontWeight: "500" }}>
                  {isBn ? "ভাষা পরিবর্তন করুন" : "Language"}
                </span>
                <LanguageSwitcher style={{ marginTop: 0 }} />
              </div>
            </div>
          </aside>
        </>,
        document.body
      )}
    </header>
  );
}
