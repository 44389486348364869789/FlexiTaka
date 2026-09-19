import React from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export default function Footer() {
  return (
    <footer style={{
      backgroundColor: "#FFFFFF",
      borderTop: "1px solid var(--border-card)",
      paddingTop: "60px",
      paddingBottom: "40px",
      marginTop: "auto"
    }}>
      <div className="container">
        {/* Top Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr 1fr",
          gap: "40px",
          marginBottom: "48px"
        }} className="footer-grid">
          {/* Brand Info */}
          <div>
            <div style={{ marginBottom: "16px" }}>
              <Link href="/" style={{ textDecoration: "none", display: "inline-block" }}>
                <img
                  src="/images/flexitaka-logo.png"
                  alt="FlexiTaka - SIM Balance to Cash"
                  className="brand-logo"
                />
              </Link>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.6, maxWidth: "340px", marginBottom: "16px" }}>
              Your SIM balance, more value. Convert unused prepaid balance to mobile wallet cash or enjoy instant discounts on airtime top-ups.
            </p>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 12px",
              background: "var(--ft-green-subtle)",
              border: "1px solid #BBF7D0",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.8125rem",
              color: "#166534",
              fontWeight: "600"
            }}>
              <ShieldCheck size={16} />
              <span>Zero Telecom PIN/Password Policy</span>
            </div>
          </div>

          {/* Column 1: Services */}
          <div>
            <h4 style={{ fontSize: "0.875rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-primary)", marginBottom: "16px" }}>
              Services
            </h4>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.9375rem", color: "var(--text-secondary)" }}>
              <li><Link href="/cash-out" style={{ transition: "color 0.15s" }}>Cash Out Balance</Link></li>
              <li><Link href="/recharge" style={{ transition: "color 0.15s" }}>Discounted Recharge</Link></li>
              <li><Link href="/pricing" style={{ transition: "color 0.15s" }}>Live Pricing</Link></li>
              <li><Link href="/how-it-works" style={{ transition: "color 0.15s" }}>How It Works</Link></li>
            </ul>
          </div>

          {/* Column 2: Platform */}
          <div>
            <h4 style={{ fontSize: "0.875rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-primary)", marginBottom: "16px" }}>
              Web App
            </h4>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.9375rem", color: "var(--text-secondary)" }}>
              <li><Link href="/app">App Dashboard</Link></li>
              <li><Link href="/app/orders">Order Tracking</Link></li>
              <li><Link href="/app/support">Support Desk</Link></li>
              <li><Link href="/app/profile">User Account (Optional)</Link></li>
            </ul>
          </div>

          {/* Column 3: Legal & Help */}
          <div>
            <h4 style={{ fontSize: "0.875rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-primary)", marginBottom: "16px" }}>
              Trust & Legal
            </h4>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.9375rem", color: "var(--text-secondary)" }}>
              <li><Link href="/about">About FlexiTaka</Link></li>
              <li><Link href="/terms">Terms of Service</Link></li>
              <li><Link href="/privacy">Privacy Policy</Link></li>
              <li><Link href="/faq">FAQ & Guidance</Link></li>
            </ul>
          </div>
        </div>

        {/* Security & Regulatory Disclaimer */}
        <div style={{
          backgroundColor: "var(--bg-main)",
          border: "1px solid var(--border-light)",
          borderRadius: "var(--radius-md)",
          padding: "16px 20px",
          marginBottom: "32px",
          fontSize: "0.8125rem",
          color: "var(--text-muted)",
          lineHeight: 1.6
        }}>
          <strong style={{ color: "var(--text-secondary)" }}>Important Security & Regulatory Advisory:</strong> FlexiTaka will NEVER ask you for your SIM PIN, MyGP/MyRobi/MyBL account passwords, or telecom SMS verification OTPs. All balance transfers are executed strictly by you via official operator USSD dial codes or verified operator apps. Telecom balance transfer limits are set by each mobile network provider in compliance with BTRC guidelines.
        </div>

        {/* Bottom Bar */}
        <div style={{
          borderTop: "1px solid var(--border-light)",
          paddingTop: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "0.875rem",
          color: "var(--text-muted)",
          flexWrap: "wrap",
          gap: "12px"
        }}>
          <div>
            © {new Date().getFullYear()} FlexiTaka (https://flexitaka.com). All rights reserved.
          </div>
          <div style={{ display: "flex", gap: "20px" }}>
            <span>Backend Origin: https://flexitaka.online</span>
            <span>Made for Bangladesh 🇧🇩</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
