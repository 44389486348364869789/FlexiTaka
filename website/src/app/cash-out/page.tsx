import React from "react";
import Link from "next/link";
import Calculator from "@/components/Calculator";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";

export default function CashOutLandingPage() {
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
            <ShieldCheck size={16} />
            <span>Instant Mobile Wallet Payouts</span>
          </div>
          <h1 style={{ fontSize: "2.5rem", fontWeight: "900", color: "var(--text-primary)", marginBottom: "12px" }}>
            Convert SIM Balance to Cash
          </h1>
          <p style={{ fontSize: "1.125rem", color: "var(--text-secondary)", maxWidth: "600px", margin: "0 auto" }}>
            Have extra balance on your Grameenphone, Robi, or Banglalink prepaid connection? Cash out to bKash, Nagad, or Bank in minutes.
          </p>
        </div>
      </div>

      <div className="container" style={{ paddingTop: "48px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", alignItems: "flex-start" }} className="cashout-grid">
          {/* Left Details */}
          <div>
            <h2 style={{ fontSize: "1.75rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "16px" }}>
              Why Cash Out with FlexiTaka?
            </h2>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "28px" }}>
              Prepaid balance often gets trapped when you recharge in excess or receive promotional airtime. FlexiTaka provides a secure, audited gateway to convert that trapped balance into liquid funds for everyday expenses.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginBottom: "36px" }}>
              <div style={{ display: "flex", gap: "14px" }}>
                <CheckCircle2 size={22} color="var(--ft-green)" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <h4 style={{ fontSize: "1.0625rem", fontWeight: "700", marginBottom: "4px" }}>
                    Clear, Pre-Calculated Platform Fee
                  </h4>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.5 }}>
                    See the exact fee and payout before initiating any balance transfer. No hidden deductions or surprise charges.
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: "14px" }}>
                <CheckCircle2 size={22} color="var(--ft-green)" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <h4 style={{ fontSize: "1.0625rem", fontWeight: "700", marginBottom: "4px" }}>
                    Bank-Grade Security & Non-Custodial
                  </h4>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.5 }}>
                    You never share your SIM PIN or telecom login credentials. Transfers are authorized strictly from your own handset.
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: "14px" }}>
                <CheckCircle2 size={22} color="var(--ft-green)" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <h4 style={{ fontSize: "1.0625rem", fontWeight: "700", marginBottom: "4px" }}>
                    Multiple Payout Channels
                  </h4>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.5 }}>
                    Choose between bKash Personal, Nagad Personal, or direct Bangladesh bank account transfers.
                  </p>
                </div>
              </div>
            </div>

            <div className="card" style={{ background: "var(--bg-white)", padding: "20px" }}>
              <h4 style={{ fontSize: "0.9375rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "8px" }}>
                Platform Order Bounds
              </h4>
              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", margin: 0 }}>
                Orders are supported from a minimum of <strong>৳50.00</strong> up to <strong>৳50,000.00</strong> per transaction.
              </p>
            </div>
          </div>

          {/* Right Live Calculator */}
          <div>
            <div style={{ marginBottom: "16px", textAlign: "center" }}>
              <span style={{ fontSize: "0.875rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase" }}>
                Calculate Your Payout
              </span>
            </div>
            <Calculator />
          </div>
        </div>
      </div>
    </div>
  );
}
