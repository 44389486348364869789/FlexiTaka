"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import Calculator from "@/components/Calculator";
import {
  CheckCircle2,
  HelpCircle,
  ShieldCheck,
} from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

export default function PricingPage() {
  const [calculatorTab, setCalculatorTab] = useState<"CASHOUT" | "RECHARGE">("CASHOUT");
  const calculatorInputRef = useRef<HTMLInputElement>(null);
  const { isBn, tr } = useLanguage();
  const p = tr.pricing;

  const handleCalculateClick = (tab: "CASHOUT" | "RECHARGE") => {
    setCalculatorTab(tab);
    const element = document.getElementById("pricing-calculator-section");
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setTimeout(() => {
      calculatorInputRef.current?.focus();
    }, 400);
  };

  return (
    <div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh", paddingBottom: "80px" }}>
      {/* 1. Page Hero Header */}
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
            <ShieldCheck size={16} />
            <span>{p.badge}</span>
          </div>
          <h1 style={{ fontSize: "2.25rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "12px", letterSpacing: "-0.02em" }}>
            {p.title}
          </h1>
          <p style={{ fontSize: "1.0625rem", color: "var(--text-secondary)", maxWidth: "600px", margin: "0 auto", lineHeight: 1.6, fontWeight: "400" }}>
            {p.subtitle}
          </p>
        </div>
      </div>

      <div className="container" style={{ paddingTop: "36px", maxWidth: "1040px" }}>
        {/* 2. Official Limits & Rate Overview Ribbon */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--border-card)",
            borderRadius: "var(--radius-lg)",
            padding: "16px 24px",
            marginBottom: "28px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.75rem",
                fontWeight: "600",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {isBn ? "লেনদেনের সীমা" : "TRANSACTION LIMITS"}
            </div>
            <div style={{ fontSize: "1.125rem", fontWeight: "600", color: "var(--text-primary)", marginTop: "2px" }}>
              {isBn ? "৳১০.০০ – ৳৫০,০০০.০০" : "৳10.00 – ৳50,000.00"}
            </div>
          </div>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "0.875rem", fontWeight: "500", color: "var(--text-secondary)" }}>
              {isBn ? "ক্যাশ আউট · " : "Cash Out · "}
              <span style={{ fontWeight: "600", color: "var(--text-primary)" }}>
                {isBn ? "২০% প্ল্যাটফর্ম ফি" : "20% platform fee"}
              </span>
            </span>
            <span style={{ color: "var(--border-card)", userSelect: "none" }}>•</span>
            <span style={{ fontSize: "0.875rem", fontWeight: "500", color: "var(--text-secondary)" }}>
              {isBn ? "রিচার্জ · " : "Recharge · "}
              <span style={{ fontWeight: "600", color: "var(--ft-green-active)" }}>
                {isBn ? "৫% নিশ্চিত ছাড়" : "5% discount"}
              </span>
            </span>
          </div>
        </div>

        {/* 3. Two Clean Pricing Cards (Cash Out & Recharge) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "24px",
            marginBottom: "36px",
          }}
          className="pricing-grid"
        >
          {/* Card 1: Cash Out */}
          <div
            className="card"
            style={{
              padding: "28px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              borderRadius: "var(--radius-lg)",
              borderTop: "3px solid var(--ft-green)",
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <span className="badge badge-approved" style={{ fontSize: "0.75rem", padding: "4px 10px" }}>
                  {p.cashOutCard.serviceTitle}
                </span>
              </div>

              <div style={{ marginBottom: "14px" }}>
                <div style={{ fontSize: "2rem", fontWeight: "700", color: "var(--text-primary)", lineHeight: 1.1, letterSpacing: "-0.02em" }}>
                  {p.cashOutCard.feeLabel}
                </div>
              </div>

              <p style={{ fontSize: "0.9375rem", color: "var(--text-secondary)", lineHeight: 1.55, marginBottom: "18px", fontWeight: "400" }}>
                {p.cashOutCard.explanation}
              </p>

              {/* Formula Block */}
              <div
                style={{
                  backgroundColor: "var(--bg-main)",
                  border: "1px solid var(--border-card)",
                  borderRadius: "var(--radius-md)",
                  padding: "12px 16px",
                  marginBottom: "20px",
                }}
              >
                <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                  {p.cashOutCard.formulaTitle}
                </div>
                <div style={{ fontSize: "0.9375rem", fontWeight: "600", color: "var(--ft-green-active)" }}>
                  {p.cashOutCard.formula}
                </div>
              </div>

              {/* Key Features List */}
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px 0", display: "flex", flexDirection: "column", gap: "10px" }}>
                <li style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                  <CheckCircle2 size={16} color="var(--ft-green)" style={{ flexShrink: 0 }} />
                  <span>{isBn ? "সরাসরি bKash, Nagad বা ব্যাংকে নিট ফান্ড জমা" : "Net funds deposited directly to bKash, Nagad, or Bank"}</span>
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                  <CheckCircle2 size={16} color="var(--ft-green)" style={{ flexShrink: 0 }} />
                  <span>{isBn ? "কোনো লুকানো বা অতিরিক্ত ওয়ালেট উত্তোলন চার্জ নেই" : "Zero extra wallet disbursement or withdrawal fees"}</span>
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                  <CheckCircle2 size={16} color="var(--ft-green)" style={{ flexShrink: 0 }} />
                  <span>{isBn ? "Grameenphone, Robi এবং Banglalink সাপোর্টেড" : "Supported for Grameenphone, Robi, and Banglalink"}</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => handleCalculateClick("CASHOUT")}
              className="btn btn-primary btn-full"
              style={{ height: "46px", fontSize: "0.875rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.03em" }}
            >
              <span>{p.cashOutCard.cta}</span>
            </button>
          </div>

          {/* Card 2: Recharge */}
          <div
            className="card"
            style={{
              padding: "28px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              borderRadius: "var(--radius-lg)",
              borderTop: "3px solid var(--ft-green-active)",
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <span className="badge badge-pending" style={{ fontSize: "0.75rem", padding: "4px 10px" }}>
                  {p.rechargeCard.serviceTitle}
                </span>
              </div>

              <div style={{ marginBottom: "14px" }}>
                <div style={{ fontSize: "2rem", fontWeight: "700", color: "var(--ft-green-active)", lineHeight: 1.1, letterSpacing: "-0.02em" }}>
                  {p.rechargeCard.discountLabel}
                </div>
              </div>

              <p style={{ fontSize: "0.9375rem", color: "var(--text-secondary)", lineHeight: 1.55, marginBottom: "18px", fontWeight: "400" }}>
                {p.rechargeCard.explanation}
              </p>

              {/* Formula Block */}
              <div
                style={{
                  backgroundColor: "var(--bg-main)",
                  border: "1px solid var(--border-card)",
                  borderRadius: "var(--radius-md)",
                  padding: "12px 16px",
                  marginBottom: "20px",
                }}
              >
                <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                  {p.rechargeCard.formulaTitle}
                </div>
                <div style={{ fontSize: "0.9375rem", fontWeight: "600", color: "var(--text-primary)" }}>
                  {p.rechargeCard.formula}
                </div>
              </div>

              {/* Key Features List */}
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px 0", display: "flex", flexDirection: "column", gap: "10px" }}>
                <li style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                  <CheckCircle2 size={16} color="var(--ft-green)" style={{ flexShrink: 0 }} />
                  <span>{isBn ? "আপনার প্রিপেইড সিমে সম্পূর্ণ ১০০% এয়ারটাইম গ্রহণ" : "Receive 100% full mobile airtime on your prepaid SIM"}</span>
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                  <CheckCircle2 size={16} color="var(--ft-green)" style={{ flexShrink: 0 }} />
                  <span>{isBn ? "প্রদেয় মূল্য থেকে ৫% সরাসরি স্বয়ংক্রিয় কর্তন" : "5% discount deducted automatically from your payable total"}</span>
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                  <CheckCircle2 size={16} color="var(--ft-green)" style={{ flexShrink: 0 }} />
                  <span>{isBn ? "দেশের শীর্ষ ৩টি অপারেটরে তাৎক্ষণিক ডেলিভারি" : "Instant automated dispatch across all major BD operators"}</span>
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                  <CheckCircle2 size={16} color="var(--ft-green)" style={{ flexShrink: 0 }} />
                  <span>{isBn ? "bKash, Nagad, Rocket ও Bangla QR পেমেন্ট সাপোর্টেড" : "Supported payments: bKash, Nagad, Rocket & Bangla QR"}</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => handleCalculateClick("RECHARGE")}
              className="btn btn-secondary btn-full"
              style={{ height: "46px", fontSize: "0.875rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.03em" }}
            >
              <span>{p.rechargeCard.cta}</span>
            </button>
          </div>
        </div>

        {/* 4. Trust Message Banner */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--border-card)",
            borderRadius: "var(--radius-lg)",
            padding: "24px 28px",
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "40px",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              backgroundColor: "var(--ft-green-subtle)",
              color: "var(--ft-green-active)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={24} />
          </div>
          <div>
            <div style={{ fontSize: "1.0625rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>
              {isBn ? "নিশ্চিত করার আগেই চূড়ান্ত টাকার পরিমাণ জানুন।" : "Know the exact amount before you confirm."}
            </div>
            <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.5, fontWeight: "400" }}>
              {isBn
                ? "কোনো গোপন চার্জ নেই। কোনো অপ্রত্যাশিত কর্তন নেই। কোটেশনে প্রদর্শিত প্রতিটি সংখ্যা চূড়ান্ত ও নির্দিষ্ট।"
                : "No hidden charges. No surprise deductions. Every figure displayed in the live quote is guaranteed and authoritative."}
            </div>
          </div>
        </div>

        {/* 5. Live Calculator Section */}
        <div id="pricing-calculator-section" style={{ scrollMarginTop: "24px", marginBottom: "48px" }}>
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: "600",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                display: "inline-block",
                marginBottom: "4px",
              }}
            >
              {isBn ? "লাইভ রেট ক্যালকুলেটর" : "LIVE PRICING CALCULATOR"}
            </span>
            <h2 style={{ fontSize: "1.625rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "6px" }}>
              {isBn ? "যেকোনো পরিমাণের লাইভ হিসাব দেখুন" : "Calculate Any Custom Amount"}
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", maxWidth: "540px", margin: "0 auto", fontWeight: "400" }}>
              {isBn
                ? "৳১০ থেকে ৳৫০,০০০-এর মধ্যে যেকোনো পরিমাণ লিখে তাৎক্ষণিক সার্ভার কোটেশন পান।"
                : "Enter any amount between ৳10 and ৳50,000 to see real-time authoritative quotes directly from our server."}
            </p>
          </div>

          <Calculator
            activeTab={calculatorTab}
            onTabChange={setCalculatorTab}
            inputRef={calculatorInputRef}
          />
        </div>

        {/* 6. How Pricing Works Section */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--border-card)",
            borderRadius: "var(--radius-lg)",
            padding: "36px 32px",
            marginBottom: "40px",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: "600",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                display: "inline-block",
                marginBottom: "4px",
              }}
            >
              {isBn ? "স্বচ্ছ পদ্ধতি" : "TRANSPARENT PROCESS"}
            </span>
            <h3 style={{ fontSize: "1.375rem", fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>
              {p.limitsSection.title}
            </h3>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "24px",
            }}
            className="pricing-grid"
          >
            {/* Step 1 */}
            <div style={{ textAlign: "left" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "36px",
                  height: "36px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--bg-subtle)",
                  color: "var(--text-primary)",
                  fontWeight: "700",
                  fontSize: "0.9375rem",
                  marginBottom: "14px",
                  border: "1px solid var(--border-card)",
                }}
              >
                {isBn ? "১" : "1"}
              </div>
              <h4 style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "6px" }}>
                {isBn ? "পরিমাণ ইনপুট করুন" : "Enter your amount"}
              </h4>
              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.55, margin: 0, fontWeight: "400" }}>
                {isBn
                  ? "ক্যাশ আউট বা রিচার্জের জন্য ৳১০ থেকে ৳৫০,০০০-এর মধ্যে যেকোনো পরিমাণ লিখুন।"
                  : "Input any balance or airtime value between ৳10 and ৳50,000 for your SIM balance cash out or airtime recharge."}
              </p>
            </div>

            {/* Step 2 */}
            <div style={{ textAlign: "left" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "36px",
                  height: "36px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--ft-green-subtle)",
                  color: "var(--ft-green-active)",
                  fontWeight: "700",
                  fontSize: "0.9375rem",
                  marginBottom: "14px",
                  border: "1px solid #BBF7D0",
                }}
              >
                {isBn ? "২" : "2"}
              </div>
              <h4 style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "6px" }}>
                {isBn ? "নির্দিষ্ট ফি/ডিসকাউন্ট দেখুন" : "See the exact fee/discount"}
              </h4>
              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.55, margin: 0, fontWeight: "400" }}>
                {isBn
                  ? "আমাদের সার্ভার তাত্ক্ষণিকভাবে ২০% প্ল্যাটফর্ম ফি বা ৫% ডিসকাউন্টের নিখুঁত হিসাব তৈরি করে।"
                  : "Our authoritative engine calculates the exact 20% platform fee or 5% discount instantly with zero estimation drift."}
              </p>
            </div>

            {/* Step 3 */}
            <div style={{ textAlign: "left" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "36px",
                  height: "36px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--bg-subtle)",
                  color: "var(--text-primary)",
                  fontWeight: "700",
                  fontSize: "0.9375rem",
                  marginBottom: "14px",
                  border: "1px solid var(--border-card)",
                }}
              >
                {isBn ? "৩" : "3"}
              </div>
              <h4 style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "6px" }}>
                {isBn ? "নিশ্চিত করে এগিয়ে যান" : "Confirm and continue"}
              </h4>
              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.55, margin: 0, fontWeight: "400" }}>
                {isBn
                  ? "চূড়ান্ত পেআউট বা প্রদেয় টাকা যাচাই করে নিশ্চিন্তে এগিয়ে যান। চেকআউটে কোনো অপ্রত্যাশিত পরিবর্তন হবে না।"
                  : "Review the exact net payout or payable amount with total certainty. No surprises or unexpected deductions at checkout."}
              </p>
            </div>
          </div>
        </div>

        {/* 7. Short FAQ Section */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--border-card)",
            borderRadius: "var(--radius-lg)",
            padding: "32px",
            marginBottom: "40px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "18px" }}>
            <HelpCircle size={20} color="var(--ft-green)" />
            <h3 style={{ fontSize: "1.125rem", fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>
              {p.faqSection.title}
            </h3>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }} className="pricing-grid">
            <div>
              <h4 style={{ fontSize: "0.9375rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>
                {p.faqSection.q1}
              </h4>
              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.55, margin: 0, fontWeight: "400" }}>
                {p.faqSection.a1}
              </p>
            </div>

            <div>
              <h4 style={{ fontSize: "0.9375rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>
                {p.faqSection.q2}
              </h4>
              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.55, margin: 0, fontWeight: "400" }}>
                {p.faqSection.a2}
              </p>
            </div>

            <div>
              <h4 style={{ fontSize: "0.9375rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>
                {p.faqSection.q3}
              </h4>
              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.55, margin: 0, fontWeight: "400" }}>
                {p.faqSection.a3}
              </p>
            </div>

            <div>
              <h4 style={{ fontSize: "0.9375rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>
                {isBn ? "দৈনিক ব্যালেন্স ট্রান্সফার সীমা কত?" : "What are the daily operator transfer limits?"}
              </h4>
              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.55, margin: 0, fontWeight: "400" }}>
                {p.limitsSection.note}
              </p>
            </div>
          </div>
        </div>

        {/* 8. Primary CTA Banner */}
        <div
          style={{
            backgroundColor: "var(--ft-green-subtle)",
            border: "1px solid #BBF7D0",
            borderRadius: "var(--radius-lg)",
            padding: "36px 32px",
            textAlign: "center",
          }}
        >
          <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "8px" }}>
            {isBn ? "ক্যাশ আউট বা রিচার্জ করতে প্রস্তুত?" : "Ready to convert or recharge?"}
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", maxWidth: "520px", margin: "0 auto 20px", fontWeight: "400" }}>
            {isBn
              ? "কোনো গোপন সিম পিন বা অ্যাকাউন্ট পাসওয়ার্ড শেয়ার না করেই পান নিশ্চিত সেবা ও স্বচ্ছ মূল্য।"
              : "Experience fast, audited balance exchange and guaranteed discounts without sharing your SIM PIN or password."}
          </p>
          <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/cash-out" className="btn btn-primary" style={{ height: "44px", padding: "0 24px", fontWeight: "600" }}>
              <span>{isBn ? "ব্যালেন্স ক্যাশ আউট →" : "Cash Out SIM Balance →"}</span>
            </Link>
            <Link href="/recharge" className="btn btn-secondary" style={{ height: "44px", padding: "0 24px", fontWeight: "600" }}>
              <span>{isBn ? "ডিসকাউন্টেড রিচার্জ →" : "Discounted Recharge →"}</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
