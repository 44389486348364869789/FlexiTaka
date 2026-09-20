"use client";

import React from "react";
import Link from "next/link";
import { Mail, ShieldAlert, ShieldCheck } from "lucide-react";
import BangladeshFlag from "./BangladeshFlag";
import LanguageSwitcher from "./LanguageSwitcher";
import { useLanguage } from "@/i18n/LanguageContext";

export default function Footer() {
  const { isBn } = useLanguage();

  return (
    <footer
      style={{
        backgroundColor: "#FFFFFF",
        borderTop: "1px solid var(--border-card)",
        paddingTop: "50px",
        paddingBottom: "32px",
        marginTop: "auto",
      }}
      className="site-footer"
    >
      <div className="container">
        {/* Top 4-Column Grid (1 Brand + 3 Category Columns) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr",
            gap: "36px",
            marginBottom: "36px",
          }}
          className="footer-grid"
        >
          {/* Brand Info Column */}
          <div className="footer-col-brand">
            <div style={{ marginBottom: "14px" }}>
              <Link href="/" style={{ textDecoration: "none", display: "inline-block" }}>
                <img
                  src="/images/flexitaka-logo.png"
                  alt="FlexiTaka - Your SIM Balance, More Value"
                  className="brand-logo"
                  style={{ height: "38px", width: "auto", display: "block" }}
                />
              </Link>
            </div>
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.875rem",
                lineHeight: 1.6,
                maxWidth: "340px",
                marginBottom: "14px",
              }}
            >
              {isBn
                ? "আপনার সিম ব্যালেন্স, আরও বেশি মূল্য। অব্যবহৃত প্রিপেইড ব্যালেন্সকে মোবাইল ওয়ালেট ক্যাশে রূপান্তর করুন অথবা এয়ারটাইম টপ-আপে নিশ্চিত ডিসকাউন্ট উপভোগ করুন।"
                : "Your SIM balance, more value. Convert unused prepaid balance to mobile wallet cash or enjoy instant discounts on airtime top-ups."}
            </p>

            {/* Zero Telecom PIN Policy Badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 12px",
                background: "var(--ft-green-subtle)",
                border: "1px solid #BBF7D0",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.8125rem",
                color: "#166534",
                fontWeight: "600",
                marginBottom: "14px",
              }}
            >
              <ShieldCheck size={16} style={{ flexShrink: 0 }} />
              <span>{isBn ? "জিরো টেলিকম পিন/পাসওয়ার্ড পলিসি" : "Zero Telecom PIN/Password Policy"}</span>
            </div>

            {/* Direct Contact Line */}
            <div
              style={{
                fontSize: "0.8125rem",
                color: "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: "14px",
              }}
            >
              <Mail size={14} color="var(--ft-green)" style={{ flexShrink: 0 }} />
              <span>{isBn ? "সরাসরি যোগাযোগ" : "Direct Contact"}: </span>
              <a
                href="mailto:Contact@flexitaka.com"
                style={{
                  color: "var(--ft-green-active)",
                  fontWeight: "600",
                  textDecoration: "none",
                  overflowWrap: "anywhere",
                }}
              >
                Contact@flexitaka.com
              </a>
            </div>

            {/* Social Links */}
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <a
                href="https://www.facebook.com/FlexiTaka0/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="FlexiTaka on Facebook"
                className="social-icon-btn"
                title="FlexiTaka on Facebook"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <span
                role="button"
                tabIndex={0}
                aria-label="FlexiTaka on Telegram"
                className="social-icon-btn social-icon-btn-prepared"
                title="Official Telegram channel"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                </svg>
              </span>
              <span
                role="button"
                tabIndex={0}
                aria-label="FlexiTaka on YouTube"
                className="social-icon-btn social-icon-btn-prepared"
                title="Official YouTube channel"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </span>
            </div>
          </div>

          {/* Column 1: Services */}
          <div className="footer-col">
            <h4
              style={{
                fontSize: "0.875rem",
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--text-primary)",
                marginBottom: "16px",
              }}
            >
              {isBn ? "সার্ভিসসমূহ" : "Services"}
            </h4>
            <ul
              style={{
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                fontSize: "0.875rem",
                color: "var(--text-secondary)",
                padding: 0,
                margin: 0,
              }}
            >
              <li>
                <Link href="/cash-out" className="footer-link">
                  {isBn ? "ক্যাশ আউট ব্যালেন্স" : "Cash Out Balance"}
                </Link>
              </li>
              <li>
                <Link href="/recharge" className="footer-link">
                  {isBn ? "ডিসকাউন্ট রিচার্জ" : "Discounted Recharge"}
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="footer-link">
                  {isBn ? "লাইভ প্রাইসিং" : "Live Pricing"}
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="footer-link">
                  {isBn ? "কীভাবে কাজ করে" : "How It Works"}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Web App */}
          <div className="footer-col">
            <h4
              style={{
                fontSize: "0.875rem",
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--text-primary)",
                marginBottom: "16px",
              }}
            >
              {isBn ? "ওয়েব অ্যাপ" : "Web App"}
            </h4>
            <ul
              style={{
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                fontSize: "0.875rem",
                color: "var(--text-secondary)",
                padding: 0,
                margin: 0,
              }}
            >
              <li>
                <Link href="/app" className="footer-link">
                  {isBn ? "অ্যাপ ড্যাশবোর্ড" : "App Dashboard"}
                </Link>
              </li>
              <li>
                <Link href="/app/orders" className="footer-link">
                  {isBn ? "অর্ডার ট্র্যাকিং" : "Order Tracking"}
                </Link>
              </li>
              <li>
                <Link href="/app/support" className="footer-link">
                  {isBn ? "সাপোর্ট ডেস্ক" : "Support Desk"}
                </Link>
              </li>
              <li>
                <Link href="/app/profile" className="footer-link">
                  {isBn ? "ইউজার অ্যাকাউন্ট (ঐচ্ছিক)" : "User Account (Optional)"}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Trust & Legal */}
          <div className="footer-col">
            <h4
              style={{
                fontSize: "0.875rem",
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--text-primary)",
                marginBottom: "16px",
              }}
            >
              {isBn ? "ট্রাস্ট ও লিগ্যাল" : "Trust & Legal"}
            </h4>
            <ul
              style={{
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                fontSize: "0.875rem",
                color: "var(--text-secondary)",
                padding: 0,
                margin: 0,
              }}
            >
              <li>
                <Link href="/about" className="footer-link">
                  {isBn ? "ফ্লেক্সিটাকা পরিচিতি" : "About FlexiTaka"}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="footer-link">
                  {isBn ? "শর্তাবলী ও নীতিমালা" : "Terms of Service"}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="footer-link">
                  {isBn ? "গোপনীয়তা নীতি" : "Privacy Policy"}
                </Link>
              </li>
              <li>
                <Link href="/faq" className="footer-link">
                  {isBn ? "প্রশ্নোত্তর ও নির্দেশিকা" : "FAQ & Guidance"}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Security & Regulatory Advisory Box */}
        <div
          style={{
            backgroundColor: "var(--bg-main)",
            border: "1px solid var(--border-light)",
            borderRadius: "var(--radius-sm)",
            padding: "14px 18px",
            marginBottom: "16px",
            fontSize: "0.8125rem",
            color: "var(--text-muted)",
            lineHeight: 1.6,
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
          }}
          className="footer-security-advisory"
        >
          <ShieldAlert size={16} color="var(--ft-green)" style={{ flexShrink: 0, marginTop: "2px" }} />
          <div>
            <strong style={{ color: "var(--text-secondary)", fontWeight: "600" }}>
              {isBn ? "নিরাপত্তা নির্দেশনা:" : "Important Security Advisory:"}
            </strong>{" "}
            {isBn
              ? "FlexiTaka কখনো আপনার SIM PIN, MyGP/MyRobi/MyBL অ্যাকাউন্টের পাসওয়ার্ড বা টেলিকম SMS verification OTP চাইবে না। সকল ব্যালেন্স ট্রান্সফার কেবলমাত্র আপনার নিজের ফোনের অফিশিয়াল USSD ডায়াল কোড বা অফিশিয়াল অপারেটর অ্যাপের মাধ্যমে সম্পন্ন হয়।"
              : "FlexiTaka will NEVER ask you for your SIM PIN, MyGP/MyRobi/MyBL account passwords, or telecom SMS verification OTPs. All balance transfers are executed strictly by you via official operator USSD dial codes or verified operator apps."}
          </div>
        </div>

        {/* Divider */}
        <hr className="footer-divider" />

        {/* Cohesive Footer Bottom Group (Order specified by user) */}
        <div className="footer-bottom-group">
          <div className="footer-copyright">
            © {isBn ? "২০২৬ FlexiTaka. সর্বস্বত্ব সংরক্ষিত।" : "2026 FlexiTaka. All rights reserved."}
          </div>
          <div className="footer-security-statement">
            {isBn ? "নিরাপদ ও নন-কাস্টডিয়াল • কোনো ক্রেডেনশিয়াল শেয়ারিং নয়" : "Secure & Non-Custodial • Zero Credential Sharing"}
          </div>
          <div className="footer-made-in">
            <span>{isBn ? "বাংলাদেশের জন্য তৈরি" : "Made for Bangladesh"}</span>
            <BangladeshFlag width={18} height={12} />
          </div>
          {/* Language Switcher directly below */}
          <LanguageSwitcher />
        </div>
      </div>
    </footer>
  );
}
