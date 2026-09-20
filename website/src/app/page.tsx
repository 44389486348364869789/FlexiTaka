"use client";

import React from "react";
import Link from "next/link";
import Calculator from "@/components/Calculator";
import NetworkWalletMarquee from "@/components/NetworkWalletMarquee";
import {
  ArrowRight,
  CheckCircle2,
  Lock,
  Smartphone,
  Zap,
  Clock,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

export default function HomePage() {
  const { isBn } = useLanguage();

  return (
    <div>
      {/* Hero Section */}
      <section
        style={{
          paddingTop: "60px",
          paddingBottom: "80px",
          background: "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)",
          borderBottom: "1px solid var(--border-light)",
        }}
        className="hero-section"
      >
        <div className="container">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.1fr 0.9fr",
              gap: "48px",
              alignItems: "center",
            }}
            className="hero-grid"
          >
            {/* Hero Left Copy */}
            <div>
              <div className="hero-logo" style={{ marginBottom: "20px" }}>
                <img
                  src="/images/flexitaka-logo.png"
                  alt="FlexiTaka - SIM Balance to Cash"
                  style={{
                    height: "44px",
                    width: "auto",
                    objectFit: "contain",
                    display: "block",
                  }}
                />
              </div>

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 14px",
                  background: "var(--ft-green-subtle)",
                  border: "1px solid #BBF7D0",
                  borderRadius: "var(--radius-full)",
                  fontSize: "0.8125rem",
                  fontWeight: "700",
                  color: "#166534",
                  marginBottom: "20px",
                  maxWidth: "100%",
                  lineHeight: 1.3,
                }}
                className="hero-badge"
              >
                <ShieldCheck size={16} style={{ flexShrink: 0 }} />
                <span>
                  {isBn
                    ? "বাংলাদেশের ১ম বিশ্বস্ত টেলিকম ব্যালেন্স এক্সচেঞ্জ"
                    : "Bangladesh's First Compliant Telecom Balance Exchange"}
                </span>
              </div>

              <h1
                style={{
                  fontSize: "3.25rem",
                  fontWeight: "700",
                  lineHeight: 1.15,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.03em",
                  marginBottom: "20px",
                }}
                className="hero-title"
              >
                {isBn ? "আপনার সিম ব্যালেন্স," : "YOUR SIM BALANCE,"}
                <br />
                <span style={{ color: "var(--ft-green)" }}>
                  {isBn ? "আরও বেশি মূল্য।" : "MORE VALUE."}
                </span>
              </h1>

              <p
                style={{
                  fontSize: "1.1875rem",
                  color: "var(--text-secondary)",
                  lineHeight: 1.6,
                  marginBottom: "32px",
                  maxWidth: "520px",
                }}
                className="hero-desc"
              >
                {isBn
                  ? "অব্যবহৃত প্রিপেইড মোবাইল ব্যালেন্সকে তাৎক্ষণিক bKash, Nagad বা ব্যাংকে ক্যাশ করুন অথবা যেকোনো নম্বরে নিশ্চিত ডিসকাউন্টে মোবাইল রিচার্জ পান।"
                  : "Convert unused prepaid mobile balance into real cash deposited straight to your bKash, Nagad, or Bank account, or recharge any phone with instant guaranteed discounts."}
              </p>

              {/* Action Buttons */}
              <div
                style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "40px" }}
                className="hero-cta-group"
              >
                <Link href="/app/cashout" className="btn btn-primary btn-lg">
                  <span>{isBn ? "ক্যাশ আউট ব্যালেন্স" : "Cash Out Balance"}</span>
                  <ArrowRight size={18} />
                </Link>
                <Link href="/app/recharge" className="btn btn-outline btn-lg">
                  <span>{isBn ? "ডিসকাউন্ট রিচার্জ" : "Discounted Recharge"}</span>
                  <Zap size={18} color="#D97706" />
                </Link>
              </div>

              {/* Trust Indicators */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "28px",
                  borderTop: "1px solid var(--border-light)",
                  paddingTop: "24px",
                  flexWrap: "wrap",
                }}
                className="hero-trust-strip"
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }} className="hero-trust-item">
                  <CheckCircle2 size={18} color="var(--ft-green)" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-secondary)" }}>
                    {isBn ? "টেলিকম পাসওয়ার্ড প্রয়োজন নেই" : "No Telecom Password Needed"}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }} className="hero-trust-item">
                  <CheckCircle2 size={18} color="var(--ft-green)" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-secondary)" }}>
                    {isBn ? "তাৎক্ষণিক bKash ও Nagad পে-আউট" : "Instant bKash & Nagad Payouts"}
                  </span>
                </div>
              </div>
            </div>

            {/* Hero Right Calculator */}
            <div>
              <Calculator />
            </div>
          </div>
        </div>
      </section>

      {/* Supported Telecom Networks & Available Wallets Marquee */}
      <NetworkWalletMarquee />

      {/* How It Works (4 Clean Steps) */}
      <section className="section" style={{ backgroundColor: "var(--bg-main)" }}>
        <div className="container">
          <div className="text-center" style={{ marginBottom: "48px" }}>
            <h2 className="section-title">
              {isBn ? "কীভাবে FlexiTaka কাজ করে" : "How FlexiTaka Works"}
            </h2>
            <p className="section-subtitle">
              {isBn
                ? "সহজ, নিরাপদ এবং ৪টি ধাপে সম্পূর্ণ স্বচ্ছ নন-কাস্টডিয়াল লেনদেন প্রক্রিয়া।"
                : "Simple, transparent, four-step process for converting SIM balance or sending discounted recharges."}
            </p>
          </div>

          <div className="grid grid-4">
            <div className="card" style={{ position: "relative" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  backgroundColor: "var(--ft-green-subtle)",
                  color: "var(--ft-green)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "700",
                  fontSize: "1.125rem",
                  marginBottom: "20px",
                }}
              >
                {isBn ? "১" : "1"}
              </div>
              <h3 style={{ fontSize: "1.125rem", fontWeight: "700", marginBottom: "8px" }}>
                {isBn ? "অনুরোধ জমা দিন" : "Submit Request"}
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.5 }}>
                {isBn
                  ? "অপারেটর নির্বাচন করুন, নম্বর এবং কাঙ্ক্ষিত পরিমাণ দিন। তাৎক্ষণিক নিখুঁত লাইভ কোটেশন পাবেন।"
                  : "Select your operator, enter your number and desired amount. Instantly receive an authoritative live server quote."}
              </p>
            </div>

            <div className="card" style={{ position: "relative" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  backgroundColor: "var(--ft-green-subtle)",
                  color: "var(--ft-green)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "700",
                  fontSize: "1.125rem",
                  marginBottom: "20px",
                }}
              >
                {isBn ? "২" : "2"}
              </div>
              <h3 style={{ fontSize: "1.125rem", fontWeight: "700", marginBottom: "8px" }}>
                {isBn ? "ব্যালেন্স ট্রান্সফার করুন" : "Complete Transfer"}
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.5 }}>
                {isBn
                  ? "আপনার অপারেটরের অফিশিয়াল ইউএসএসডি কোড বা অ্যাপের মাধ্যমে নির্ধারিত নম্বরে ব্যালেন্স ট্রান্সফার করুন।"
                  : "Dial your operator's official USSD code or use their mobile app to transfer the balance to our assigned receiving SIM."}
              </p>
            </div>

            <div className="card" style={{ position: "relative" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  backgroundColor: "var(--ft-green-subtle)",
                  color: "var(--ft-green)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "700",
                  fontSize: "1.125rem",
                  marginBottom: "20px",
                }}
              >
                {isBn ? "৩" : "3"}
              </div>
              <h3 style={{ fontSize: "1.125rem", fontWeight: "700", marginBottom: "8px" }}>
                {isBn ? "স্টাফ ভেরিফিকেশন" : "Staff Verification"}
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.5 }}>
                {isBn
                  ? "SMS ট্রানজ্যাকশন রেফারেন্স জমা দিন। আমাদের অপারেশন টিম ফিজিক্যাল হ্যান্ডসেটে ব্যালেন্স সরাসরি যাচাই করে।"
                  : "Submit your SMS transaction reference. Our operations staff verifies the incoming balance on physical telecom handsets."}
              </p>
            </div>

            <div className="card" style={{ position: "relative" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  backgroundColor: "var(--ft-green-subtle)",
                  color: "var(--ft-green)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "700",
                  fontSize: "1.125rem",
                  marginBottom: "20px",
                }}
              >
                {isBn ? "৪" : "4"}
              </div>
              <h3 style={{ fontSize: "1.125rem", fontWeight: "700", marginBottom: "8px" }}>
                {isBn ? "টাকা বা রিচার্জ বুঝে নিন" : "Receive Cash / Top-Up"}
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.5 }}>
                {isBn
                  ? "যাচাই সম্পন্ন হওয়ার সাথে সাথে bKash, Nagad বা ব্যাংকে আপনার টাকা অথবা কাঙ্ক্ষিত রিচার্জ পৌঁছে যাবে।"
                  : "Upon verification, finance dispatches your funds directly to your bKash, Nagad, or Bank account immediately."}
              </p>
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: "36px" }}>
            <Link
              href="/how-it-works"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                color: "var(--ft-green)",
                fontWeight: "600",
                fontSize: "0.9375rem",
              }}
            >
              <span>{isBn ? "সকল অপারেটরের বিস্তারিত নির্দেশিকা পড়ুন" : "Read detailed visual instructions for all operators"}</span>
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Two Flagship Services Section */}
      <section className="section" style={{ backgroundColor: "#FFFFFF" }}>
        <div className="container">
          <div className="text-center" style={{ marginBottom: "48px" }}>
            <h2 className="section-title">
              {isBn ? "দুটি মূল সেবা। একটি বিশ্বস্ত প্ল্যাটফর্ম।" : "Two Core Services. One Trusted Platform."}
            </h2>
            <p className="section-subtitle">
              {isBn
                ? "বাংলাদেশে দৈনন্দিন মোবাইল এয়ারটাইম ও ডিজিটাল ক্যাশ ব্যবস্থাপনার নির্ভরযোগ্য সমাধান।"
                : "Built for seamless everyday telecom and mobile money utility in Bangladesh."}
            </p>
          </div>

          <div className="grid grid-2">
            {/* Service 1 */}
            <div className="card" style={{ padding: "36px" }}>
              <div
                style={{
                  display: "inline-flex",
                  padding: "8px 14px",
                  background: "var(--ft-green-subtle)",
                  color: "var(--ft-green-active)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.8125rem",
                  fontWeight: "700",
                  marginBottom: "20px",
                }}
              >
                {isBn ? "সার্ভিস ১" : "SERVICE 1"}
              </div>
              <h3 style={{ fontSize: "1.75rem", fontWeight: "700", marginBottom: "12px", color: "var(--text-primary)" }}>
                {isBn ? "সিম ব্যালেন্স → মোবাইল ক্যাশ" : "SIM Balance → Mobile Cash"}
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "1rem", lineHeight: 1.6, marginBottom: "24px" }}>
                {isBn
                  ? "আপনার প্রিপেইড গ্রামীণফোন, রবি বা বাংলালিংক সিমে অতিরিক্ত ব্যালেন্স আছে? কোনো জটিল প্রক্রিয়া ছাড়াই তা আসল ক্যাশ টাকায় রূপান্তর করুন।"
                  : "Have excess mobile balance on your prepaid Grameenphone, Robi, or Banglalink SIM? Liquidate it into spendable mobile wallet money without complex procedures."}
              </p>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "12px", marginBottom: "32px", fontSize: "0.9375rem" }}>
                <li style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <CheckCircle2 size={18} color="var(--ft-green)" />
                  <span>{isBn ? "ট্রান্সফারের আগেই স্ক্রিনে নিশ্চিত স্বচ্ছ ফি প্রদর্শিত" : "Transparent fee confirmed on screen before you transfer"}</span>
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <CheckCircle2 size={18} color="var(--ft-green)" />
                  <span>{isBn ? "সরাসরি bKash, Nagad বা ব্যাংকে ৮০% নেট পে-আউট গ্রহণ করুন" : "Receive 80% net payout directly to bKash, Nagad, or Bank"}</span>
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <CheckCircle2 size={18} color="var(--ft-green)" />
                  <span>{isBn ? "লাইভ স্ট্যাটাস আপডেট সহ রিয়েল-টাইম অর্ডার ট্র্যাকিং" : "Live tracking timeline with real-time status updates"}</span>
                </li>
              </ul>
              <Link href="/app/cashout" className="btn btn-primary btn-full">
                <span>{isBn ? "ক্যাশ আউট শুরু করুন" : "Start Cash Out"}</span>
                <ArrowRight size={18} />
              </Link>
            </div>

            {/* Service 2 */}
            <div className="card" style={{ padding: "36px" }}>
              <div
                style={{
                  display: "inline-flex",
                  padding: "8px 14px",
                  background: "var(--ft-yellow-subtle)",
                  color: "#B45309",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.8125rem",
                  fontWeight: "700",
                  marginBottom: "20px",
                }}
              >
                {isBn ? "সার্ভিস ২" : "SERVICE 2"}
              </div>
              <h3 style={{ fontSize: "1.75rem", fontWeight: "700", marginBottom: "12px", color: "var(--text-primary)" }}>
                {isBn ? "ডিসকাউন্ট এয়ারটাইম রিচার্জ" : "Discounted Airtime Recharge"}
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "1rem", lineHeight: 1.6, marginBottom: "24px" }}>
                {isBn
                  ? "মোবাইল রিচার্জে আর কখনোই ১০০% পে করবেন না। বাংলাদেশের যেকোনো অপারেটরে রিচার্জে পান তাৎক্ষণিক ৫% নিশ্চিত ক্যাশব্যাক।"
                  : "Never pay 100% for mobile recharge again. Enjoy instant 5% cashback discounts on all prepaid airtime recharges across all major Bangladesh telecom operators."}
              </p>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "12px", marginBottom: "32px", fontSize: "0.9375rem" }}>
                <li style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <CheckCircle2 size={18} color="var(--ft-green)" />
                  <span>{isBn ? "রিচার্জের পরিমাণের মাত্র ৯৫% পরিশোধ করুন" : "Pay only 95% of the recharge amount"}</span>
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <CheckCircle2 size={18} color="var(--ft-green)" />
                  <span>{isBn ? "আপনার ব্যক্তিগত bKash বা Nagad ওয়ালেট থেকে সহজে পেমেন্ট করুন" : "Pay conveniently using your personal bKash or Nagad wallet"}</span>
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <CheckCircle2 size={18} color="var(--ft-green)" />
                  <span>{isBn ? "গন্তব্য ফোন নম্বরে সরাসরি দ্রুত এয়ারটাইম টপ-আপ প্রদান" : "Airtime top-up dispatched directly to your destination phone"}</span>
                </li>
              </ul>
              <Link href="/app/recharge" className="btn btn-secondary btn-full">
                <span>{isBn ? "রিচার্জ শুরু করুন" : "Start Recharge"}</span>
                <Zap size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Invariant Guarantee Section */}
      <section className="section" style={{ backgroundColor: "var(--bg-main)" }}>
        <div className="container">
          <div className="text-center" style={{ marginBottom: "40px" }}>
            <h2 className="section-title">
              {isBn ? "ফিনটেক নিরাপত্তা ও নির্ভরযোগ্যতা" : "Built with FinTech Integrity"}
            </h2>
            <p className="section-subtitle">
              {isBn
                ? "আমরা কঠোর নন-কাস্টডিয়াল নিরাপত্তা নীতি ও ১০০% স্বচ্ছতা মেনে চলি।"
                : "We uphold strict non-custodial security principles and full transparency."}
            </p>
          </div>

          <div className="grid grid-3">
            <div className="card">
              <div style={{ color: "var(--ft-green)", marginBottom: "16px" }}>
                <Lock size={28} />
              </div>
              <h4 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "8px" }}>
                {isBn ? "জিরো ক্রেডেনশিয়াল কালেকশন" : "Zero Credential Collection"}
              </h4>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.6 }}>
                {isBn
                  ? "আমরা কখনোই আপনার সিম পিন, মাইজিপি/মাইরবি/মাইবিএল পাসওয়ার্ড বা টেলিকম ওটিপি চাই না। ব্যালেন্স ট্রান্সফার সম্পন্ন হয় সরাসরি আপনার হ্যান্ডসেট থেকে।"
                  : "We never ask for your SIM PIN, MyGP/MyRobi/MyBL account password, or operator OTP. All balance transfers are executed directly on your phone's official dialer or app."}
              </p>
            </div>

            <div className="card">
              <div style={{ color: "var(--ft-green)", marginBottom: "16px" }}>
                <Smartphone size={28} />
              </div>
              <h4 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "8px" }}>
                {isBn ? "ঐচ্ছিক অ্যাকাউন্ট ও গেস্ট সেশন" : "Optional Account Creation"}
              </h4>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.6 }}>
                {isBn
                  ? "কোনো বাধ্যতামূলক পাসওয়ার্ড রেজিস্ট্রেশন নেই। সরাসরি গেস্ট হিসেবে লেনদেন করুন। প্রতিটি অর্ডারে ক্রিপ্টোগ্রাফিক ট্র্যাকিং টোকেন তৈরি হয়।"
                  : "No mandatory password registration. Start transactions immediately as a guest. All orders generate secure signed cryptographic tracking tokens for instant tracking."}
              </p>
            </div>

            <div className="card">
              <div style={{ color: "var(--ft-green)", marginBottom: "16px" }}>
                <Clock size={28} />
              </div>
              <h4 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "8px" }}>
                {isBn ? "অপরিবর্তনীয় অডিট ট্রেইল" : "Immutable Audit Trails"}
              </h4>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.6 }}>
                {isBn
                  ? "প্রতিটি লেনদেনের ধাপ ও ব্যালেন্স মুভমেন্ট কঠোরভাবে যাচাই করা হয়, যা কোনো ডুপ্লিকেট পেমেন্টের ঝুঁকি রাখে না।"
                  : "Every transaction event, staff approval, and balance movement is logged to an immutable ledger with double-payout concurrency locks preventing accidental duplicates."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section
        style={{
          padding: "64px 0",
          background: "linear-gradient(135deg, #00A859 0%, #008746 100%)",
          color: "#FFFFFF",
          textAlign: "center",
        }}
      >
        <div className="container">
          <h2 style={{ fontSize: "2.25rem", fontWeight: "700", marginBottom: "16px" }}>
            {isBn ? "আপনার সিম ব্যালেন্সকে আজই কাজে লাগান" : "Ready to Unlock Value from Your SIM?"}
          </h2>
          <p style={{ fontSize: "1.125rem", maxWidth: "600px", margin: "0 auto 32px auto", opacity: 0.9 }}>
            {isBn
              ? "দ্রুত ও ভেরিফায়েড ব্যালেন্স ক্যাশ আউট এবং সাশ্রয়ী রিচার্জের জন্য বাংলাদেশের হাজারো সন্তুষ্ট গ্রাহকের সাথে যোগ দিন।"
              : "Join thousands of satisfied customers across Bangladesh using FlexiTaka for rapid, verified balance cash outs and discounted recharges."}
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "16px", flexWrap: "wrap" }}>
            <Link href="/app/cashout" className="btn btn-secondary btn-lg" style={{ color: "#78350F" }}>
              <span>{isBn ? "ক্যাশ আউট শুরু করুন" : "Start Cash Out"}</span>
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/how-it-works"
              className="btn btn-outline btn-lg"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.15)",
                color: "#FFFFFF",
                borderColor: "rgba(255, 255, 255, 0.3)",
              }}
            >
              <span>{isBn ? "বিস্তারিত জানুন" : "Learn More"}</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
