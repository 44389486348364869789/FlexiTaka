"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, HelpCircle, RefreshCw, Zap } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

export default function NotFound() {
  const { isBn } = useLanguage();

  return (
    <div
      style={{
        backgroundColor: "var(--bg-main, #f8fafc)",
        minHeight: "75vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 20px",
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: "540px",
          width: "100%",
          padding: "48px 32px",
          textAlign: "center",
          boxShadow: "var(--shadow-lg)",
          borderRadius: "var(--radius-lg, 14px)",
        }}
      >
        <div style={{ marginBottom: "20px" }}>
          <img
            src="/images/flexitaka-logo.png"
            alt="FlexiTaka"
            style={{
              height: "44px",
              width: "auto",
              objectFit: "contain",
              margin: "0 auto",
              display: "block",
            }}
          />
        </div>

        <div
          style={{
            display: "inline-block",
            padding: "4px 14px",
            background: "var(--ft-green-subtle)",
            color: "var(--ft-green-active)",
            borderRadius: "var(--radius-full)",
            fontSize: "0.875rem",
            fontWeight: 600,
            marginBottom: "16px",
          }}
        >
          {isBn ? "৪০৪ — পেজটি পাওয়া যায়নি" : "404 — Page Not Found"}
        </div>

        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: "12px",
            letterSpacing: "-0.02em",
          }}
        >
          {isBn ? "রাস্তা হারিয়ে ফেলেছেন?" : "Lost Your Way?"}
        </h1>

        <p
          style={{
            fontSize: "0.9375rem",
            color: "var(--text-secondary)",
            lineHeight: 1.6,
            marginBottom: "32px",
          }}
        >
          {isBn
            ? "আপনার অনুরোধকৃত পেজ বা লিঙ্কটি বিদ্যমান নেই অথবা সরানো হয়েছে। মূল পাতায় ফিরে যেতে নিচের অপশনগুলো দেখুন:"
            : "The page or transaction URL you requested does not exist or has moved. Explore our core services below to get back on track:"}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "28px" }}>
          <Link
            href="/"
            className="btn btn-primary btn-full"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
          >
            <ArrowLeft size={16} />
            <span>{isBn ? "হোম পেজে ফিরে যান" : "Return to FlexiTaka Home"}</span>
          </Link>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <Link
              href="/cash-out"
              className="btn btn-outline"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
            >
              <RefreshCw size={14} />
              <span>{isBn ? "ক্যাশ আউট" : "Cash Out"}</span>
            </Link>
            <Link
              href="/recharge"
              className="btn btn-outline"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
            >
              <Zap size={14} />
              <span>{isBn ? "রিচার্জ" : "Recharge"}</span>
            </Link>
          </div>
        </div>

        <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: "20px" }}>
          <Link
            href="/support"
            style={{
              fontSize: "0.875rem",
              color: "var(--text-muted)",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <HelpCircle size={14} />
            <span>{isBn ? "সহায়তা প্রয়োজন? কাস্টমার সাপোর্টে যোগাযোগ করুন" : "Need assistance? Contact 24/7 Support"}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
