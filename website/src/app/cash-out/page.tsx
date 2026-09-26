"use client";

import React from "react";
import Calculator from "@/components/Calculator";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

export default function CashOutLandingPage() {
  const { isBn } = useLanguage();

  return (
    <div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh", paddingBottom: "60px" }}>
      {/* 1. Page Header */}
      <div style={{ backgroundColor: "#FFFFFF", borderBottom: "1px solid var(--border-light)", padding: "32px 0" }}>
        <div className="container text-center">
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "3px 10px",
            background: "var(--ft-green-subtle)",
            color: "var(--ft-green-active)",
            borderRadius: "var(--radius-full)",
            fontSize: "0.75rem",
            fontWeight: "600",
            marginBottom: "10px"
          }}>
            <ShieldCheck size={14} />
            <span>{isBn ? "তাৎক্ষণিক মোবাইল ওয়ালেট পেআউট" : "Instant Mobile Wallet Payouts"}</span>
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "6px" }}>
            {isBn ? "ব্যালেন্স ক্যাশ আউট" : "Cash Out Balance"}
          </h1>
          <p style={{ fontSize: "1rem", color: "var(--text-secondary)", maxWidth: "540px", margin: "0 auto" }}>
            {isBn
              ? "পরিমাণ এবং পেআউট তথ্য নির্বাচন করে লাইভ হিসাব দেখুন।"
              : "Enter amount and payout details to view live calculations."}
          </p>
        </div>
      </div>

      <div className="container" style={{ paddingTop: "32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", alignItems: "flex-start" }} className="cashout-grid">
          {/* Left Details */}
          <div>
            <h2 style={{ fontSize: "1.375rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "12px" }}>
              {isBn ? "কেন FlexiTaka-তে ক্যাশ আউট করবেন?" : "Why Cash Out with FlexiTaka?"}
            </h2>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "20px", fontSize: "0.9375rem" }}>
              {isBn
                ? "FlexiTaka প্রিপেইড মোবাইল ব্যালেন্সকে নিরাপদ ও নিয়ন্ত্রিতভাবে ক্যাশ টাকায় রূপান্তরের নির্ভরযোগ্য গেটওয়ে প্রদান করে।"
                : "FlexiTaka provides a secure, audited gateway to convert excess prepaid airtime into liquid wallet funds for everyday expenses."}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "24px" }}>
              <div style={{ display: "flex", gap: "10px" }}>
                <CheckCircle2 size={18} color="var(--ft-green)" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <h4 style={{ fontSize: "0.9375rem", fontWeight: "600", marginBottom: "2px" }}>
                    {isBn ? "স্বচ্ছ ২০% প্ল্যাটফর্ম ফি" : "Clear 20% Platform Fee"}
                  </h4>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.4, margin: 0 }}>
                    {isBn
                      ? "ব্যালেন্স ট্রান্সফার করার পূর্বেই স্ক্রিনে নির্দিষ্ট ফি ও প্রাপ্ত টাকার পরিমাণ দেখুন। কোনো গোপন চার্জ নেই।"
                      : "See exact fee and payout before initiating any balance transfer. No hidden deductions."}
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <CheckCircle2 size={18} color="var(--ft-green)" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <h4 style={{ fontSize: "0.9375rem", fontWeight: "600", marginBottom: "2px" }}>
                    {isBn ? "কঠোর নন-কাস্টডিয়াল নিরাপত্তা" : "Strict Non-Custodial Security"}
                  </h4>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.4, margin: 0 }}>
                    {isBn
                      ? "আপনার SIM অ্যাকাউন্ট নিরাপদভাবে যাচাই করতে প্রয়োজনে FlexiTaka একবারের operator verification OTP চাইতে পারে। আমরা কখনো আপনার SIM PIN বা account password চাইব না।"
                      : "FlexiTaka may request a one-time operator verification OTP when required to securely authenticate your SIM account. We will never ask for your SIM PIN or account password."}
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <CheckCircle2 size={18} color="var(--ft-green)" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <h4 style={{ fontSize: "0.9375rem", fontWeight: "600", marginBottom: "2px" }}>
                    {isBn ? "দ্রুত ওয়ালেট পেআউট" : "Instant Wallet Payouts"}
                  </h4>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.4, margin: 0 }}>
                    {isBn
                      ? "ভেরিফিকেশন সম্পন্ন হওয়ার সাথে সাথে bKash, Nagad বা ব্যাংকে টাকা পৌঁছে যায়।"
                      : "Receive liquid funds directly to bKash, Nagad, or Bank account upon verification."}
                  </p>
                </div>
              </div>
            </div>

            <div className="card" style={{ background: "var(--bg-white)", padding: "14px 16px" }}>
              <div style={{ fontSize: "0.8125rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>
                {isBn ? "লেনদেন সীমা" : "Platform Order Bounds"}
              </div>
              <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", margin: 0 }}>
                {isBn
                  ? "প্রতি অর্ডারে সর্বনিম্ন ৳১০.০০ থেকে সর্বোচ্চ ৳৫০,০০০.০০ পর্যন্ত প্রযোজ্য।"
                  : "Orders are supported from a minimum of ৳10.00 up to ৳50,000.00 per transaction."}
              </p>
            </div>
          </div>

          {/* Right Live Calculator */}
          <div>
            <Calculator defaultTab="CASHOUT" />
          </div>
        </div>
      </div>
    </div>
  );
}
