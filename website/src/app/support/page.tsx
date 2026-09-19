import React from "react";
import Link from "next/link";
import { Headphones, Mail, MessageSquare, ShieldCheck, ArrowRight, HelpCircle } from "lucide-react";

export default function SupportPublicPage() {
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
            <Headphones size={16} />
            <span>Dedicated Customer Assistance</span>
          </div>
          <h1 style={{ fontSize: "2.5rem", fontWeight: "900", color: "var(--text-primary)", marginBottom: "12px" }}>
            Customer Support Hub
          </h1>
          <p style={{ fontSize: "1.125rem", color: "var(--text-secondary)", maxWidth: "600px", margin: "0 auto" }}>
            Need help with a transaction, balance transfer, or order tracking? We are here to help you promptly.
          </p>
        </div>
      </div>

      <div className="container" style={{ paddingTop: "48px", maxWidth: "900px" }}>
        {/* Support Cards */}
        <div className="grid grid-3" style={{ marginBottom: "48px" }}>
          <div className="card text-center" style={{ padding: "32px" }}>
            <div style={{ color: "var(--ft-green)", marginBottom: "16px" }}>
              <MessageSquare size={32} style={{ margin: "0 auto" }} />
            </div>
            <h3 style={{ fontSize: "1.125rem", fontWeight: "800", marginBottom: "8px" }}>
              Online Support Desk
            </h3>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "20px" }}>
              Open a direct support ticket linked to your Order ID or guest session for prioritized resolution.
            </p>
            <Link href="/app/support" className="btn btn-primary btn-sm btn-full">
              <span>Open Support Ticket</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="card text-center" style={{ padding: "32px" }}>
            <div style={{ color: "var(--ft-green)", marginBottom: "16px" }}>
              <Mail size={32} style={{ margin: "0 auto" }} />
            </div>
            <h3 style={{ fontSize: "1.125rem", fontWeight: "800", marginBottom: "8px" }}>
              Email Assistance
            </h3>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "20px" }}>
              Send inquiries, verification inquiries, or business questions to our operations team.
            </p>
            <a href="mailto:support@flexitaka.com" className="btn btn-outline btn-sm btn-full">
              support@flexitaka.com
            </a>
          </div>

          <div className="card text-center" style={{ padding: "32px" }}>
            <div style={{ color: "var(--ft-green)", marginBottom: "16px" }}>
              <HelpCircle size={32} style={{ margin: "0 auto" }} />
            </div>
            <h3 style={{ fontSize: "1.125rem", fontWeight: "800", marginBottom: "8px" }}>
              Instant Answers
            </h3>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "20px" }}>
              Review our comprehensive knowledge base covering transfer limits, payout speeds, and operator USSD codes.
            </p>
            <Link href="/faq" className="btn btn-outline btn-sm btn-full">
              <span>Browse FAQ</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Order Tracking Quick Search Box */}
        <div className="card" style={{ padding: "36px", textAlign: "center" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "800", marginBottom: "8px" }}>
            Already Have an Order ID?
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", marginBottom: "24px" }}>
            Track the real-time status of your Cash Out or Recharge transaction directly in the Web App.
          </p>
          <Link href="/app/orders" className="btn btn-primary">
            <span>Go to Order Tracking</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
