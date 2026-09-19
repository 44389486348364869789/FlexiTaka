import React from "react";
import Link from "next/link";
import { HelpCircle, ShieldCheck, ArrowRight } from "lucide-react";

export default function FAQPage() {
  const faqs = [
    {
      q: "What is FlexiTaka?",
      a: "FlexiTaka is an audited digital platform in Bangladesh that allows users to convert unused prepaid mobile airtime balance to cash (sent to bKash, Nagad, or Bank) and purchase discounted mobile airtime recharges across Grameenphone, Robi, and Banglalink."
    },
    {
      q: "Does FlexiTaka ever ask for my SIM PIN or operator password?",
      a: "NEVER. FlexiTaka strictly adheres to a Zero-Credential security policy. We never ask for your SIM PIN, MyGP/MyRobi/MyBL password, or telecom verification OTP. You execute balance transfers yourself using your operator's official USSD code or official mobile app."
    },
    {
      q: "What are the platform transaction limits?",
      a: "FlexiTaka supports transactions starting from a minimum of ৳50.00 up to a maximum of ৳50,000.00 per transaction."
    },
    {
      q: "What are the telecom operator balance transfer limits?",
      a: "Telecom operator balance transfer limits and any applicable network transfer charges are established independently by each mobile network provider (Grameenphone, Robi, Banglalink) in compliance with BTRC regulations. Please consult your network's official mobile application (MyGP, MyRobi, MyBL) or dial their balance transfer USSD code to verify the limits applicable to your specific SIM connection."
    },
    {
      q: "How fast do I receive my Cash Out payout?",
      a: "Once you submit your transfer reference/proof, our operations staff verifies the incoming balance on physical receiving handsets. Verification and payout dispatch via bKash, Nagad, or Bank typically takes only 5 to 15 minutes during active operational hours."
    },
    {
      q: "Is account registration or login required to use the service?",
      a: "No. Login/Create Account is completely OPTIONAL. Guest users can perform complete Cash Out and Recharge transactions. Every order automatically receives an authorized tracking token so you can track your status live on our website."
    },
    {
      q: "What happens if my transfer details are incorrect?",
      a: "If you input an incorrect transaction reference or if the transfer failed on your operator's network, our staff verifier will mark the order with a clear note. You can update your reference or open a direct support ticket linked to your Order ID from the tracking page."
    },
    {
      q: "What payment methods are supported for payouts and recharge?",
      a: "We support bKash Personal, Nagad Personal, and major Bangladesh commercial bank accounts for Cash Out payouts. For Discounted Recharge payments, you can pay using your bKash or Nagad wallet."
    }
  ];

  return (
    <div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh", paddingBottom: "80px" }}>
      {/* Header */}
      <div style={{ backgroundColor: "#FFFFFF", borderBottom: "1px solid var(--border-light)", padding: "48px 0" }}>
        <div className="container text-center">
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "4px 12px",
            background: "var(--ft-green-subtle)",
            color: "var(--ft-green-active)",
            borderRadius: "var(--radius-full)",
            fontSize: "0.8125rem",
            fontWeight: "700",
            marginBottom: "16px"
          }}>
            <HelpCircle size={16} />
            <span>Frequently Asked Questions</span>
          </div>
          <h1 style={{ fontSize: "2.5rem", fontWeight: "900", color: "var(--text-primary)", marginBottom: "12px" }}>
            Help & Platform Guidance
          </h1>
          <p style={{ fontSize: "1.125rem", color: "var(--text-secondary)", maxWidth: "600px", margin: "0 auto" }}>
            Got questions about transferring balance, limits, or security? Find transparent answers below.
          </p>
        </div>
      </div>

      <div className="container" style={{ paddingTop: "48px", maxWidth: "800px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {faqs.map((faq, idx) => (
            <div key={idx} className="card" style={{ padding: "28px" }}>
              <h3 style={{ fontSize: "1.1875rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "12px" }}>
                {faq.q}
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.6, margin: 0 }}>
                {faq.a}
              </p>
            </div>
          ))}
        </div>

        {/* Still have questions banner */}
        <div style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid var(--border-card)",
          borderRadius: "var(--radius-lg)",
          padding: "32px",
          marginTop: "40px",
          textAlign: "center"
        }}>
          <h3 style={{ fontSize: "1.25rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "8px" }}>
            Still have questions?
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", marginBottom: "20px" }}>
            Our customer support desk is available to assist you with any questions regarding orders or operator transfers.
          </p>
          <Link href="/support" className="btn btn-outline">
            <span>Contact Customer Support</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
