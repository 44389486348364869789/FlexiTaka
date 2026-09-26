"use client";

import React from "react";
import Calculator from "@/components/Calculator";
import { CheckCircle2, Zap } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

export default function RechargeLandingPage() {
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
            background: "var(--ft-yellow-subtle)",
            color: "#B45309",
            borderRadius: "var(--radius-full)",
            fontSize: "0.75rem",
            fontWeight: "600",
            marginBottom: "10px"
          }}>
            <Zap size={14} />
            <span>{isBn ? "নিশ্চিত এয়ারটাইম সঞ্চয়" : "Guaranteed Instant Airtime Savings"}</span>
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "6px" }}>
            {isBn ? "ডিসকাউন্টেড মোবাইল রিচার্জ" : "Discounted Mobile Recharge"}
          </h1>
          <p style={{ fontSize: "1rem", color: "var(--text-secondary)", maxWidth: "540px", margin: "0 auto" }}>
            {isBn
              ? "প্রাপকের মোবাইল নম্বর ও রিচার্জের পরিমাণ লিখে লাইভ হিসাব দেখুন।"
              : "Enter recipient number and recharge amount to view live calculations."}
          </p>
        </div>
      </div>

      <div className="container" style={{ paddingTop: "32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", alignItems: "flex-start" }} className="recharge-grid">
          {/* Left Details */}
          <div>
            <h2 style={{ fontSize: "1.375rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "12px" }}>
              {isBn ? "ডিসকাউন্টেড রিচার্জ কীভাবে কাজ করে?" : "How Discounted Recharge Works"}
            </h2>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "20px", fontSize: "0.9375rem" }}>
              {isBn
                ? "FlexiTaka প্ল্যাটফর্মের এয়ারটাইম লিকুইডিটির মাধ্যমে ব্যবহারকারীদের প্রতিটি মোবাইল রিচার্জে সরাসরি সঞ্চয়ের সুযোগ করে দেয়।"
                : "FlexiTaka connects platform telecom balance liquidity directly to mobile users, unlocking instant savings on everyday top-ups."}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "24px" }}>
              <div style={{ display: "flex", gap: "10px" }}>
                <CheckCircle2 size={18} color="var(--ft-green)" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <h4 style={{ fontSize: "0.9375rem", fontWeight: "600", marginBottom: "2px" }}>
                    {isBn ? "৯৫% পেমেন্ট, পুরো ১০০% এয়ারটাইম" : "Pay 95%, Get 100% Airtime"}
                  </h4>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.4, margin: 0 }}>
                    {isBn
                      ? "প্রাপকের সিমে পুরো রিচার্জ ব্যালেন্স চলে যাবে, আর আপনি প্রতি রিচার্জে ৫% কম পেমেন্ট করবেন।"
                      : "Recipient phone receives full airtime balance, while you save 5% instantly on every recharge."}
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <CheckCircle2 size={18} color="var(--ft-green)" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <h4 style={{ fontSize: "0.9375rem", fontWeight: "600", marginBottom: "2px" }}>
                    {isBn ? "সহজ bKash ও Nagad পেমেন্ট" : "Simple bKash & Nagad Payment"}
                  </h4>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.4, margin: 0 }}>
                    {isBn
                      ? "কোনো ব্যাংক কার্ডের ঝামেলা নেই। আপনার ব্যক্তিগত মোবাইল ওয়ালেট দিয়ে সহজে টাকা পাঠান।"
                      : "Pay easily using your mobile wallet without needing bank cards."}
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <CheckCircle2 size={18} color="var(--ft-green)" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <h4 style={{ fontSize: "0.9375rem", fontWeight: "600", marginBottom: "2px" }}>
                    {isBn ? "শীর্ষস্থানীয় সকল মোবাইল নেটওয়ার্ক" : "All Major Telecom Networks"}
                  </h4>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.4, margin: 0 }}>
                    {isBn
                      ? "Grameenphone, Robi এবং Banglalink-এর যেকোনো বৈধ প্রিপেইড সিমে রিচার্জ পাঠানো যায়।"
                      : "Top up any valid prepaid number across Grameenphone, Robi, and Banglalink."}
                  </p>
                </div>
              </div>
            </div>

            <div className="card" style={{ background: "var(--bg-white)", padding: "14px 16px" }}>
              <div style={{ fontSize: "0.8125rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>
                {isBn ? "প্রযোজ্য সীমা" : "Supported Limits"}
              </div>
              <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", margin: 0 }}>
                {isBn
                  ? "প্রতি অর্ডারে সর্বনিম্ন ৳১০.০০ থেকে সর্বোচ্চ ৳৫০,০০০.০০ পর্যন্ত রিচার্জ গ্রহণযোগ্য।"
                  : "Available for recharges from ৳10.00 to ৳50,000.00 per transaction."}
              </p>
            </div>
          </div>

          {/* Right Live Calculator */}
          <div>
            <Calculator defaultTab="RECHARGE" />
          </div>
        </div>
      </div>
    </div>
  );
}
