"use client";

import React from "react";
import Link from "next/link";
import { Headphones, Mail, MessageSquare, ArrowRight, HelpCircle, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

export default function SupportPublicPage() {
  const { isBn } = useLanguage();

  return (
    <div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh", paddingBottom: "80px" }}>
      {/* Header */}
      <div style={{ backgroundColor: "#FFFFFF", borderBottom: "1px solid var(--border-light)", padding: "48px 0" }}>
        <div className="container text-center">
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "4px 12px",
              background: "var(--ft-green-subtle)",
              color: "var(--ft-green-active)",
              borderRadius: "var(--radius-full)",
              fontSize: "0.8125rem",
              fontWeight: "600",
              marginBottom: "16px",
            }}
          >
            <Headphones size={16} />
            <span>{isBn ? "সার্বক্ষণিক কাস্টমার সহায়তা" : "Dedicated Customer Assistance"}</span>
          </div>
          <h1 style={{ fontSize: "2.375rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "12px" }}>
            {isBn ? "কাস্টমার সাপোর্ট ডেস্ক" : "Customer Support Hub"}
          </h1>
          <p style={{ fontSize: "1.0625rem", color: "var(--text-secondary)", maxWidth: "600px", margin: "0 auto", lineHeight: 1.6 }}>
            {isBn
              ? "লেনদেন, ব্যালেন্স ট্রান্সফার বা অর্ডার সংক্রান্ত যেকোনো সহায়তায় আমাদের টিম সর্বদা প্রস্তুত।"
              : "Need help with a transaction, balance transfer, or order tracking? We are here to assist you promptly."}
          </p>
        </div>
      </div>

      <div className="container" style={{ paddingTop: "48px", maxWidth: "920px" }}>
        {/* Support Cards Grid */}
        <div className="grid grid-3" style={{ marginBottom: "40px", gap: "24px" }}>
          {/* 1. Online Desk */}
          <div
            className="card text-center"
            style={{
              padding: "32px 24px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              borderRadius: "var(--radius-lg)",
            }}
          >
            <div>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--ft-green-subtle)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 18px",
                  color: "var(--ft-green-active)",
                }}
              >
                <MessageSquare size={28} />
              </div>
              <h3 style={{ fontSize: "1.125rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "8px" }}>
                {isBn ? "অনলাইন সাপোর্ট টিকিট" : "Online Support Desk"}
              </h3>
              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.55, marginBottom: "20px" }}>
                {isBn
                  ? "আপনার অর্ডার আইডি বা সেশনের সাথে সরাসরি যুক্ত করে দ্রুত সমাধানের জন্য টিকিট খুলুন।"
                  : "Open a direct support ticket linked to your Order ID or active session for prioritized resolution."}
              </p>
            </div>
            <Link href="/app/support" className="btn btn-primary btn-sm btn-full" style={{ height: "40px" }}>
              <span>{isBn ? "সাপোর্ট টিকিট খুলুন" : "Open Support Ticket"}</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* 2. Email Assistance */}
          <div
            className="card text-center"
            style={{
              padding: "32px 24px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              borderRadius: "var(--radius-lg)",
              border: "1.5px solid var(--ft-green)",
              boxShadow: "0 4px 14px rgba(0, 168, 89, 0.08)",
            }}
          >
            <div>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--ft-green-subtle)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 18px",
                  color: "var(--ft-green-active)",
                }}
              >
                <Mail size={28} />
              </div>
              <h3 style={{ fontSize: "1.125rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "8px" }}>
                {isBn ? "অফিশিয়াল ইমেইল সহায়তা" : "Email Assistance"}
              </h3>
              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.55, marginBottom: "20px" }}>
                {isBn
                  ? "অর্ডার যাচাই, অনুসন্ধান এবং সাধারণ নির্দেশনার জন্য আমাদের অফিশিয়াল ইমেইলে লিখুন।"
                  : "Official customer assistance inbox for order queries, verification reviews, and general inquiries."}
              </p>
            </div>
            <div>
              <a
                href="mailto:Contact@flexitaka.com"
                className="btn btn-outline btn-sm btn-full"
                style={{
                  height: "40px",
                  fontWeight: "600",
                  fontSize: "0.875rem",
                  color: "var(--ft-green-active)",
                  borderColor: "var(--ft-green)",
                  backgroundColor: "var(--ft-green-subtle)",
                }}
              >
                Contact@flexitaka.com
              </a>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "8px" }}>
                {isBn ? "সরাসরি ইমেইল পাঠাতে ক্লিক করুন" : "Click to send email directly"}
              </div>
            </div>
          </div>

          {/* 3. Instant Answers */}
          <div
            className="card text-center"
            style={{
              padding: "32px 24px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              borderRadius: "var(--radius-lg)",
            }}
          >
            <div>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--bg-subtle)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 18px",
                  color: "var(--text-secondary)",
                }}
              >
                <HelpCircle size={28} />
              </div>
              <h3 style={{ fontSize: "1.125rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "8px" }}>
                {isBn ? "জিজ্ঞাসিত প্রশ্নাবলী (FAQ)" : "Instant Answers"}
              </h3>
              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.55, marginBottom: "20px" }}>
                {isBn
                  ? "USSD ডায়াল কোড, লেনদেন সীমা এবং নিরাপত্তা সংক্রান্ত প্রশ্নের উত্তর দেখুন।"
                  : "Review our comprehensive FAQ covering transfer codes, limits, payout methods, and security."}
              </p>
            </div>
            <Link href="/faq" className="btn btn-outline btn-sm btn-full" style={{ height: "40px" }}>
              <span>{isBn ? "FAQ দেখুন" : "Browse FAQ"}</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Order Tracking Quick Callout */}
        <div
          className="card"
          style={{
            padding: "32px",
            textAlign: "center",
            borderRadius: "var(--radius-lg)",
            backgroundColor: "#FFFFFF",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.75rem",
              fontWeight: "500",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--text-muted)",
              marginBottom: "8px",
            }}
          >
            <ShieldCheck size={14} color="var(--ft-green)" />
            <span>{isBn ? "স্বয়ংক্রিয় সেলফ-সার্ভিস ট্র্যাকিং" : "Fast Self-Service Tracking"}</span>
          </div>
          <h2 style={{ fontSize: "1.375rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "8px" }}>
            {isBn ? "অর্ডারের স্ট্যাটাস পরীক্ষা করতে চান?" : "Looking to check your order status?"}
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", maxWidth: "560px", margin: "0 auto 20px" }}>
            {isBn
              ? "আপনার অর্ডার আইডি বা গেস্ট সেশন দিয়ে সরাসরি রিয়েল-টাইমে ক্যাশ আউট বা রিচার্জ ট্র্যাকিং করুন।"
              : "Track the real-time status of your Cash Out transfer or Recharge delivery directly in the Web App using your Order ID or guest session."}
          </p>
          <Link href="/app/orders" className="btn btn-primary" style={{ height: "42px", padding: "0 24px" }}>
            <span>{isBn ? "অর্ডার ট্র্যাকিং পেজে যান →" : "Go to Order Tracking →"}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
