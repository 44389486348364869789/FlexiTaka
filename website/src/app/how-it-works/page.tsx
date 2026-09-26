"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, ShieldAlert, Zap } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

export default function HowItWorksPage() {
  const { isBn } = useLanguage();

  return (
    <div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh", paddingBottom: "80px" }}>
      {/* Page Header */}
      <div style={{ backgroundColor: "#FFFFFF", borderBottom: "1px solid var(--border-light)", padding: "48px 0" }}>
        <div className="container text-center">
          <h1 style={{ fontSize: "2.5rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "12px" }}>
            {isBn ? "কীভাবে FlexiTaka কাজ করে" : "How FlexiTaka Works"}
          </h1>
          <p style={{ fontSize: "1.125rem", color: "var(--text-secondary)", maxWidth: "620px", margin: "0 auto" }}>
            {isBn
              ? "বাংলাদেশে মোবাইল এয়ারটাইম ব্যালেন্স ক্যাশ আউট ও সাশ্রয়ী রিচার্জের সম্পূর্ণ ও স্বচ্ছ গাইডলাইন।"
              : "A complete, transparent guide to converting your mobile airtime balance to cash or sending discounted airtime recharges in Bangladesh."}
          </p>
        </div>
      </div>

      <div className="container" style={{ paddingTop: "48px" }}>
        {/* Cash Out Deep Dive */}
        <div className="card" style={{ marginBottom: "40px", padding: "36px" }}>
          <div style={{
            display: "inline-flex",
            padding: "6px 14px",
            background: "var(--ft-green-subtle)",
            color: "var(--ft-green-active)",
            borderRadius: "var(--radius-sm)",
            fontSize: "0.8125rem",
            fontWeight: "600",
            marginBottom: "16px"
          }}>
            {isBn ? "ওয়ার্কফ্লো ১" : "WORKFLOW 1"}
          </div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "16px" }}>
            {isBn ? "সিম ব্যালেন্স ক্যাশ আউট (bKash / Nagad / ব্যাংক)" : "Cash Out SIM Balance to bKash / Nagad / Bank"}
          </h2>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "32px", maxWidth: "780px" }}>
            {isBn
              ? "অপারেটরের নিজস্ব অফিশিয়াল ব্যালেন্স ট্রান্সফার সেবার মাধ্যমে আপনার অতিরিক্ত প্রিপেইড ব্যালেন্স ক্যাশ করার সম্পূর্ণ ধাপসমূহ:"
              : "FlexiTaka enables you to liquidate eligible prepaid mobile balance using your operator's official balance transfer service. Here is the exact lifecycle of a Cash Out transaction:"}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{ display: "flex", gap: "20px" }}>
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "var(--ft-green)",
                color: "#FFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "600",
                flexShrink: 0
              }}>
                {isBn ? "১" : "1"}
              </div>
              <div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "6px" }}>
                  {isBn ? "লাইভ সার্ভার কোটেশন পান" : "Get Real-Time Server Quote"}
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.5 }}>
                  {isBn
                    ? "আপনার অপারেটর (GP, Robi বা Banglalink) নির্বাচন করুন, মোবাইল নম্বর ও পরিমাণ দিন (৳১০ – ৳৫০,০০০)। স্ক্রিনে তৎক্ষণাৎ নির্দিষ্ট ফি ও প্রাপ্ত টাকার পরিমাণ প্রদর্শিত হবে।"
                    : "Select your operator (GP, Robi, or Banglalink), enter your source phone number, and input the amount (৳10 – ৳50,000). FlexiTaka securely computes the fee and the exact payout amount you will receive in real time."}
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "20px" }}>
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "var(--ft-green)",
                color: "#FFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "600",
                flexShrink: 0
              }}>
                {isBn ? "২" : "2"}
              </div>
              <div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "6px" }}>
                  {isBn ? "পেআউট তথ্য দিন ও রিসিভিং নম্বর পান" : "Enter Payout Details & Receive Assigned Number"}
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.5 }}>
                  {isBn
                    ? "আপনার bKash, Nagad বা ব্যাংক অ্যাকাউন্ট নম্বর দিন। অর্ডার প্লেস করার সাথে সাথে আমাদের সিস্টেম আপনার অপারেটরের একটি সক্রিয় রিসিভিং নম্বর নির্ধারণ করবে।"
                    : "Provide your bKash, Nagad, or Bank account details. Upon order submission, our server automatically assigns an active, least-loaded FlexiTaka receiving SIM number matching your operator."}
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "20px" }}>
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "var(--ft-green)",
                color: "#FFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "600",
                flexShrink: 0
              }}>
                {isBn ? "৩" : "3"}
              </div>
              <div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "6px" }}>
                  {isBn ? "হ্যান্ডসেট থেকে ব্যালেন্স ট্রান্সফার করুন" : "Perform Operator Balance Transfer on Your Device"}
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.5, marginBottom: "12px" }}>
                  {isBn
                    ? "আপনার মোবাইল থেকে নির্ধারিত রিসিভিং নম্বরে ব্যালেন্স পাঠান:"
                    : "Open your phone's dialer or official telecom app to transfer the balance to our assigned number:"}
                </p>
                <div style={{
                  background: "var(--bg-main)",
                  border: "1px solid var(--border-card)",
                  borderRadius: "var(--radius-sm)",
                  padding: "14px 18px",
                  fontSize: "0.9375rem",
                  lineHeight: 1.6
                }}>
                  {isBn
                    ? "সাপোর্টেড অপারেটরে একবারের SMS OTP দিয়ে সরাসরি যাচাই করুন, অথবা অপারেটরের অফিশিয়াল চ্যানেলের মাধ্যমে ট্রান্সফার সম্পন্ন করুন।"
                    : "Verify directly via one-time SMS OTP on supported operators, or complete transfer through official operator channels."}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "20px" }}>
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "var(--ft-green)",
                color: "#FFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "600",
                flexShrink: 0
              }}>
                {isBn ? "৪" : "4"}
              </div>
              <div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "6px" }}>
                  {isBn ? "TrxID প্রমাণ জমা ও দ্রুত যাচাই" : "Submit Transaction Reference & Verification"}
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.5 }}>
                  {isBn
                    ? "অপারেটরের প্রাপ্ত কনফার্মেশন SMS TrxID লিখুন এবং চাইলে একটি স্ক্রিনশট আপলোড করুন। আমাদের টিম রিসিভিং সিম চেক করে তাৎক্ষণিক অনুমোদন দেবে।"
                    : "Enter the confirmation SMS TrxID and optionally upload a screenshot. Our verifier checks the incoming balance on the receiving handset and approves the order."}
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "20px" }}>
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "var(--ft-green)",
                color: "#FFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "600",
                flexShrink: 0
              }}>
                {isBn ? "৫" : "5"}
              </div>
              <div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "6px" }}>
                  {isBn ? "তাৎক্ষণিক মোবাইল ওয়ালেট পেআউট" : "Instant Mobile Wallet Payout"}
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.5 }}>
                  {isBn
                    ? "যাচাই সম্পন্ন হওয়ার সাথে সাথে আপনার bKash, Nagad বা ব্যাংক অ্যাকাউন্টে নির্দিষ্ট টাকা পাঠিয়ে দেওয়া হবে।"
                    : "Finance dispatches the agreed net payout directly to your bKash, Nagad, or Bank account. The order is stamped COMPLETED on your live tracking page."}
                </p>
              </div>
            </div>
          </div>

          <div style={{ marginTop: "32px" }}>
            <Link href="/app/cashout" className="btn btn-primary">
              <span>{isBn ? "ক্যাশ আউট শুরু করুন" : "Start Cash Out Now"}</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* Recharge Deep Dive */}
        <div className="card" style={{ marginBottom: "40px", padding: "36px" }}>
          <div style={{
            display: "inline-flex",
            padding: "6px 14px",
            background: "var(--ft-yellow-subtle)",
            color: "#B45309",
            borderRadius: "var(--radius-sm)",
            fontSize: "0.8125rem",
            fontWeight: "600",
            marginBottom: "16px"
          }}>
            {isBn ? "ওয়ার্কফ্লো ২" : "WORKFLOW 2"}
          </div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "16px" }}>
            {isBn ? "ডিসকাউন্টেড এয়ারটাইম রিচার্জ" : "Discounted Airtime Recharge"}
          </h2>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "32px", maxWidth: "780px" }}>
            {isBn
              ? "বাংলাদেশে যেকোনো মোবাইল নম্বরে এয়ারটাইম রিচার্জে প্রতিটি লেনদেনে সরাসরি ৫% সাশ্রয় করুন।"
              : "Save money every time you top up your mobile phone or family members' phones across Bangladesh."}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{ display: "flex", gap: "20px" }}>
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "var(--ft-yellow)",
                color: "#78350F",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "600",
                flexShrink: 0
              }}>
                {isBn ? "১" : "1"}
              </div>
              <div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "6px" }}>
                  {isBn ? "অপারেটর ও রিচার্জের পরিমাণ দিন" : "Select Operator & Recharge Amount"}
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.5 }}>
                  {isBn
                    ? "কাঙ্ক্ষিত মোবাইল নম্বর ও রিচার্জের পরিমাণ লিখুন। সাথে সাথে আপনার ৫% ছাড় এবং মোট প্রদেয় টাকার হিসাব দেখতে পাবেন।"
                    : "Enter the recipient mobile number and the desired airtime value. The system displays your instant cashback discount and the exact reduced amount you pay."}
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "20px" }}>
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "var(--ft-yellow)",
                color: "#78350F",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "600",
                flexShrink: 0
              }}>
                {isBn ? "২" : "2"}
              </div>
              <div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "6px" }}>
                  {isBn ? "bKash, Nagad, Rocket বা বাংলা কিউআর-এ পেমেন্ট করুন" : "Pay via bKash, Nagad, Rocket, or Bangla QR"}
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.5 }}>
                  {isBn
                    ? "স্ক্রিনে প্রদর্শিত FlexiTaka নির্ধারিত অ্যাকাউন্টে অর্ডার রেফারেন্স সহ পেমেন্ট করুন। পেমেন্ট SMS আসার সাথে সাথে স্বয়ংক্রিয়ভাবে যাচাই সম্পন্ন হয়।"
                    : "Send payment to the FlexiTaka account displayed on screen with your Order ID in Reference. Payment is automatically verified upon incoming SMS receipt."}
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "20px" }}>
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "var(--ft-yellow)",
                color: "#78350F",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "600",
                flexShrink: 0
              }}>
                {isBn ? "৩" : "3"}
              </div>
              <div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "6px" }}>
                  {isBn ? "স্বয়ংক্রিয় এয়ারটাইম রিচার্জ ডেলিভারি" : "Automatic Airtime Recharge Delivery"}
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.5 }}>
                  {isBn
                    ? "পেমেন্ট SMS নিশ্চিত হওয়ার সাথে সাথে আমাদের স্বয়ংক্রিয় ইঞ্জিন তাৎক্ষণিকভাবে নির্দিষ্ট নম্বরে এয়ারটাইম ট্রান্সফার সম্পন্ন করে।"
                    : "As soon as payment SMS is verified, our automated transfer engine immediately dispatches the airtime top-up directly to the recipient number."}
                </p>
              </div>
            </div>

          </div>

          <div style={{ marginTop: "32px" }}>
            <Link href="/app/recharge" className="btn btn-secondary">
              <span>{isBn ? "ডিসকাউন্টেড রিচার্জ শুরু করুন" : "Start Discounted Recharge"}</span>
              <Zap size={16} />
            </Link>
          </div>
        </div>

        {/* Regulatory & Security Notice Card */}
        <div style={{
          backgroundColor: "#EFF6FF",
          border: "1px solid #BFDBFE",
          borderRadius: "var(--radius-md)",
          padding: "24px",
          display: "flex",
          gap: "16px",
          alignItems: "flex-start"
        }}>
          <ShieldAlert size={24} color="#1D4D8F" style={{ flexShrink: 0, marginTop: "2px" }} />
          <div>
            <h4 style={{ fontSize: "1rem", fontWeight: "600", color: "#1E3A8A", marginBottom: "6px" }}>
              {isBn ? "কমপ্লায়েন্স ও নন-কাস্টডিয়াল নিশ্চয়তা" : "Compliance & Non-Custodial Integrity"}
            </h4>
            <p style={{ fontSize: "0.875rem", color: "#1E40AF", lineHeight: 1.6, margin: 0 }}>
              {isBn
                ? "FlexiTaka কখনোই আপনার সিম পিন (SIM PIN) বা অ্যাকাউন্ট পাসওয়ার্ড চাইবে না। প্রয়োজনে আপনার SIM অ্যাকাউন্ট নিরাপদভাবে যাচাই করতে FlexiTaka একবারের operator verification OTP চাইতে পারে। ব্যালেন্স ট্রান্সফারের দৈনিক সীমা BTRC ও সংশ্লিষ্ট মোবাইল অপারেটর কর্তৃক নির্ধারিত হয়।"
                : "FlexiTaka will never ask for your SIM PIN or account password. An operator verification OTP may be requested when needed to securely authenticate your SIM account. Operator transfer limits and charges are regulated by BTRC and the respective mobile operators."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
