import React from "react";
import Link from "next/link";
import Calculator from "@/components/Calculator";
import { ArrowRight, CheckCircle2, Zap } from "lucide-react";

export default function RechargeLandingPage() {
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
            background: "var(--ft-yellow-subtle)",
            color: "#B45309",
            borderRadius: "var(--radius-full)",
            fontSize: "0.8125rem",
            fontWeight: "700",
            marginBottom: "16px"
          }}>
            <Zap size={16} />
            <span>Guaranteed Instant Airtime Savings</span>
          </div>
          <h1 style={{ fontSize: "2.5rem", fontWeight: "900", color: "var(--text-primary)", marginBottom: "12px" }}>
            Discounted Mobile Recharge
          </h1>
          <p style={{ fontSize: "1.125rem", color: "var(--text-secondary)", maxWidth: "600px", margin: "0 auto" }}>
            Recharge any prepaid Grameenphone, Robi, or Banglalink number in Bangladesh and pay less than face value every single time.
          </p>
        </div>
      </div>

      <div className="container" style={{ paddingTop: "48px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", alignItems: "flex-start" }} className="recharge-grid">
          {/* Left Details */}
          <div>
            <h2 style={{ fontSize: "1.75rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "16px" }}>
              How Discounted Recharge Works
            </h2>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "28px" }}>
              By sourcing balance through balanced platform liquidity, FlexiTaka passes real savings directly to consumers. Instead of paying full face value at standard retail shops, you enjoy verified instant discounts.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginBottom: "36px" }}>
              <div style={{ display: "flex", gap: "14px" }}>
                <CheckCircle2 size={22} color="var(--ft-green)" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <h4 style={{ fontSize: "1.0625rem", fontWeight: "700", marginBottom: "4px" }}>
                    Pay Less, Receive Full Airtime
                  </h4>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.5 }}>
                    Your destination number receives 100% of the requested airtime balance, while you pay a discounted rate.
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: "14px" }}>
                <CheckCircle2 size={22} color="var(--ft-green)" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <h4 style={{ fontSize: "1.0625rem", fontWeight: "700", marginBottom: "4px" }}>
                    Convenient bKash & Nagad Payments
                  </h4>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.5 }}>
                    Pay simply using your personal mobile financial service wallet without requiring debit or credit cards.
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: "14px" }}>
                <CheckCircle2 size={22} color="var(--ft-green)" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <h4 style={{ fontSize: "1.0625rem", fontWeight: "700", marginBottom: "4px" }}>
                    Recharge for Yourself or Family
                  </h4>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.5 }}>
                    Top up any valid Bangladeshi prepaid SIM number across GP, Robi, and Banglalink anytime, anywhere.
                  </p>
                </div>
              </div>
            </div>

            <div className="card" style={{ background: "var(--bg-white)", padding: "20px" }}>
              <h4 style={{ fontSize: "0.9375rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "8px" }}>
                Supported Limits
              </h4>
              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", margin: 0 }}>
                Available for recharges from <strong>৳50.00</strong> to <strong>৳50,000.00</strong> per transaction.
              </p>
            </div>
          </div>

          {/* Right Live Calculator */}
          <div>
            <div style={{ marginBottom: "16px", textAlign: "center" }}>
              <span style={{ fontSize: "0.875rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase" }}>
                Calculate Your Savings
              </span>
            </div>
            <Calculator />
          </div>
        </div>
      </div>
    </div>
  );
}
