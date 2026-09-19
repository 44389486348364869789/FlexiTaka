import React from "react";
import Link from "next/link";
import Calculator from "@/components/Calculator";
import {
  ArrowRight,
  CheckCircle2,
  Lock,
  Smartphone,
  Zap,
  TrendingDown,
  Clock,
  ShieldCheck,
  ChevronRight,
  HelpCircle
} from "lucide-react";

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section style={{
        paddingTop: "60px",
        paddingBottom: "80px",
        background: "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)",
        borderBottom: "1px solid var(--border-light)"
      }}>
        <div className="container">
          <div style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 0.9fr",
            gap: "48px",
            alignItems: "center"
          }} className="hero-grid">
            {/* Hero Left Copy */}
            <div>
              <div style={{ marginBottom: "20px" }}>
                <img
                  src="/images/flexitaka-logo.png"
                  alt="FlexiTaka - SIM Balance to Cash"
                  style={{
                    height: "44px",
                    width: "auto",
                    objectFit: "contain",
                    display: "block"
                  }}
                />
              </div>

              <div style={{
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
                marginBottom: "20px"
              }}>
                <ShieldCheck size={16} />
                <span>Bangladesh's First Compliant Telecom Balance Exchange</span>
              </div>

              <h1 style={{
                fontSize: "3.25rem",
                fontWeight: "900",
                lineHeight: 1.15,
                color: "var(--text-primary)",
                letterSpacing: "-0.03em",
                marginBottom: "20px"
              }} className="hero-title">
                YOUR SIM BALANCE,<br />
                <span style={{ color: "var(--ft-green)" }}>MORE VALUE.</span>
              </h1>

              <p style={{
                fontSize: "1.1875rem",
                color: "var(--text-secondary)",
                lineHeight: 1.6,
                marginBottom: "32px",
                maxWidth: "520px"
              }}>
                Convert unused prepaid mobile balance into real cash deposited straight to your bKash, Nagad, or Bank account, or recharge any phone with instant guaranteed discounts.
              </p>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "40px" }}>
                <Link href="/app/cashout" className="btn btn-primary btn-lg">
                  <span>Cash Out Balance</span>
                  <ArrowRight size={18} />
                </Link>
                <Link href="/app/recharge" className="btn btn-outline btn-lg">
                  <span>Discounted Recharge</span>
                  <Zap size={18} color="#D97706" />
                </Link>
              </div>

              {/* Trust Indicators */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "28px",
                borderTop: "1px solid var(--border-light)",
                paddingTop: "24px",
                flexWrap: "wrap"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <CheckCircle2 size={18} color="var(--ft-green)" />
                  <span style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-secondary)" }}>
                    No Telecom Password Needed
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <CheckCircle2 size={18} color="var(--ft-green)" />
                  <span style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-secondary)" }}>
                    Instant bKash & Nagad Payouts
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

      {/* Supported Telecom Networks & Available Wallets Bar */}
      <section style={{ backgroundColor: "#FFFFFF", padding: "32px 0", borderBottom: "1px solid var(--border-light)" }}>
        <div className="container" style={{ textAlign: "center" }}>
          <div style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "36px",
            flexWrap: "wrap"
          }}>
            {/* Supported Telecom Networks */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
              <span style={{ fontSize: "0.8125rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
                Supported Telecom Networks:
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {/* Grameenphone */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 14px", background: "var(--bg-main)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-light)" }}>
                  <img src="/logos/gp.svg" alt="Grameenphone" style={{ height: "22px", width: "auto", display: "block" }} />
                  <span style={{ fontWeight: "700", fontSize: "0.875rem", color: "#0F172A" }}>Grameenphone</span>
                </div>

                {/* Robi */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 14px", background: "var(--bg-main)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-light)" }}>
                  <img src="/logos/robi.svg" alt="Robi" style={{ height: "22px", width: "auto", display: "block" }} />
                  <span style={{ fontWeight: "700", fontSize: "0.875rem", color: "#0F172A" }}>Robi</span>
                </div>

                {/* Banglalink */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px", background: "var(--bg-main)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-light)" }}>
                  <img src="/logos/banglalink.svg" alt="Banglalink" style={{ height: "18px", width: "auto", display: "block" }} />
                </div>
              </div>
            </div>

            <div style={{ height: "24px", width: "1px", backgroundColor: "var(--border-card)" }} className="divider-desktop"></div>

            {/* Available Wallets */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
              <span style={{ fontSize: "0.8125rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
                Available Wallets:
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {/* bKash */}
                <div style={{ display: "flex", alignItems: "center", padding: "6px 14px", background: "var(--bg-main)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-light)" }}>
                  <img src="/logos/bkash.svg" alt="bKash" style={{ height: "22px", width: "auto", display: "block" }} />
                </div>

                {/* Nagad */}
                <div style={{ display: "flex", alignItems: "center", padding: "6px 14px", background: "var(--bg-main)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-light)" }}>
                  <img src="/logos/nagad.svg" alt="Nagad" style={{ height: "22px", width: "auto", display: "block" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works (4 Clean Steps) */}
      <section className="section" style={{ backgroundColor: "var(--bg-main)" }}>
        <div className="container">
          <div className="text-center" style={{ marginBottom: "48px" }}>
            <h2 className="section-title">How FlexiTaka Works</h2>
            <p className="section-subtitle">
              Simple, transparent, four-step process for converting SIM balance or sending discounted recharges.
            </p>
          </div>

          <div className="grid grid-4">
            <div className="card" style={{ position: "relative" }}>
              <div style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                backgroundColor: "var(--ft-green-subtle)",
                color: "var(--ft-green)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "800",
                fontSize: "1.125rem",
                marginBottom: "20px"
              }}>
                1
              </div>
              <h3 style={{ fontSize: "1.125rem", fontWeight: "700", marginBottom: "8px" }}>
                Submit Request
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.5 }}>
                Select your operator, enter your number and desired amount. Instantly receive an authoritative live server quote.
              </p>
            </div>

            <div className="card" style={{ position: "relative" }}>
              <div style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                backgroundColor: "var(--ft-green-subtle)",
                color: "var(--ft-green)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "800",
                fontSize: "1.125rem",
                marginBottom: "20px"
              }}>
                2
              </div>
              <h3 style={{ fontSize: "1.125rem", fontWeight: "700", marginBottom: "8px" }}>
                Complete Transfer
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.5 }}>
                Dial your operator's official USSD code or use their mobile app to transfer the balance to our assigned receiving SIM.
              </p>
            </div>

            <div className="card" style={{ position: "relative" }}>
              <div style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                backgroundColor: "var(--ft-green-subtle)",
                color: "var(--ft-green)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "800",
                fontSize: "1.125rem",
                marginBottom: "20px"
              }}>
                3
              </div>
              <h3 style={{ fontSize: "1.125rem", fontWeight: "700", marginBottom: "8px" }}>
                Staff Verification
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.5 }}>
                Submit your SMS transaction reference. Our operations staff verifies the incoming balance on physical telecom handsets.
              </p>
            </div>

            <div className="card" style={{ position: "relative" }}>
              <div style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                backgroundColor: "var(--ft-green-subtle)",
                color: "var(--ft-green)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "800",
                fontSize: "1.125rem",
                marginBottom: "20px"
              }}>
                4
              </div>
              <h3 style={{ fontSize: "1.125rem", fontWeight: "700", marginBottom: "8px" }}>
                Receive Cash / Top-Up
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.5 }}>
                Upon verification, finance dispatches your funds directly to your bKash, Nagad, or Bank account immediately.
              </p>
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: "36px" }}>
            <Link href="/how-it-works" style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              color: "var(--ft-green)",
              fontWeight: "700",
              fontSize: "0.9375rem"
            }}>
              <span>Read detailed visual instructions for all operators</span>
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Two Flagship Services Section */}
      <section className="section" style={{ backgroundColor: "#FFFFFF" }}>
        <div className="container">
          <div className="text-center" style={{ marginBottom: "48px" }}>
            <h2 className="section-title">Two Core Services. One Trusted Platform.</h2>
            <p className="section-subtitle">
              Built for seamless everyday telecom and mobile money utility in Bangladesh.
            </p>
          </div>

          <div className="grid grid-2">
            {/* Service 1 */}
            <div className="card" style={{ padding: "36px" }}>
              <div style={{
                display: "inline-flex",
                padding: "8px 14px",
                background: "var(--ft-green-subtle)",
                color: "var(--ft-green-active)",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.8125rem",
                fontWeight: "700",
                marginBottom: "20px"
              }}>
                SERVICE 1
              </div>
              <h3 style={{ fontSize: "1.75rem", fontWeight: "800", marginBottom: "12px", color: "var(--text-primary)" }}>
                SIM Balance → Mobile Cash
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "1rem", lineHeight: 1.6, marginBottom: "24px" }}>
                Have excess mobile balance on your prepaid Grameenphone, Robi, or Banglalink SIM? Liquidate it into spendable mobile wallet money without complex procedures.
              </p>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "12px", marginBottom: "32px", fontSize: "0.9375rem" }}>
                <li style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <CheckCircle2 size={18} color="var(--ft-green)" />
                  <span>Transparent fee confirmed on screen before you transfer</span>
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <CheckCircle2 size={18} color="var(--ft-green)" />
                  <span>Receive 80% net payout directly to bKash, Nagad, or Bank</span>
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <CheckCircle2 size={18} color="var(--ft-green)" />
                  <span>Live tracking timeline with real-time status updates</span>
                </li>
              </ul>
              <Link href="/app/cashout" className="btn btn-primary btn-full">
                <span>Start Cash Out</span>
                <ArrowRight size={18} />
              </Link>
            </div>

            {/* Service 2 */}
            <div className="card" style={{ padding: "36px" }}>
              <div style={{
                display: "inline-flex",
                padding: "8px 14px",
                background: "var(--ft-yellow-subtle)",
                color: "#B45309",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.8125rem",
                fontWeight: "700",
                marginBottom: "20px"
              }}>
                SERVICE 2
              </div>
              <h3 style={{ fontSize: "1.75rem", fontWeight: "800", marginBottom: "12px", color: "var(--text-primary)" }}>
                Discounted Airtime Recharge
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "1rem", lineHeight: 1.6, marginBottom: "24px" }}>
                Never pay 100% for mobile recharge again. Enjoy instant 5% cashback discounts on all prepaid airtime recharges across all major Bangladesh telecom operators.
              </p>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "12px", marginBottom: "32px", fontSize: "0.9375rem" }}>
                <li style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <CheckCircle2 size={18} color="var(--ft-green)" />
                  <span>Pay only 95% of the recharge amount</span>
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <CheckCircle2 size={18} color="var(--ft-green)" />
                  <span>Pay conveniently using your personal bKash or Nagad wallet</span>
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <CheckCircle2 size={18} color="var(--ft-green)" />
                  <span>Airtime top-up dispatched directly to your destination phone</span>
                </li>
              </ul>
              <Link href="/app/recharge" className="btn btn-secondary btn-full">
                <span>Start Recharge</span>
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
            <h2 className="section-title">Built with FinTech Integrity</h2>
            <p className="section-subtitle">
              We uphold strict non-custodial security principles and full transparency.
            </p>
          </div>

          <div className="grid grid-3">
            <div className="card">
              <div style={{ color: "var(--ft-green)", marginBottom: "16px" }}>
                <Lock size={28} />
              </div>
              <h4 style={{ fontSize: "1.125rem", fontWeight: "700", marginBottom: "8px" }}>
                Zero Credential Collection
              </h4>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.6 }}>
                We never ask for your SIM PIN, MyGP/MyRobi/MyBL account password, or operator OTP. All balance transfers are executed directly on your phone's official dialer or app.
              </p>
            </div>

            <div className="card">
              <div style={{ color: "var(--ft-green)", marginBottom: "16px" }}>
                <Smartphone size={28} />
              </div>
              <h4 style={{ fontSize: "1.125rem", fontWeight: "700", marginBottom: "8px" }}>
                Optional Account Creation
              </h4>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.6 }}>
                No mandatory password registration. Start transactions immediately as a guest. All orders generate secure signed cryptographic tracking tokens for instant tracking.
              </p>
            </div>

            <div className="card">
              <div style={{ color: "var(--ft-green)", marginBottom: "16px" }}>
                <Clock size={28} />
              </div>
              <h4 style={{ fontSize: "1.125rem", fontWeight: "700", marginBottom: "8px" }}>
                Immutable Audit Trails
              </h4>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.6 }}>
                Every transaction event, staff approval, and balance movement is logged to an immutable ledger with double-payout concurrency locks preventing accidental duplicates.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section style={{
        padding: "64px 0",
        background: "linear-gradient(135deg, #00A859 0%, #008746 100%)",
        color: "#FFFFFF",
        textAlign: "center"
      }}>
        <div className="container">
          <h2 style={{ fontSize: "2.25rem", fontWeight: "900", marginBottom: "16px" }}>
            Ready to Unlock Value from Your SIM?
          </h2>
          <p style={{ fontSize: "1.125rem", maxWidth: "600px", margin: "0 auto 32px auto", opacity: 0.9 }}>
            Join thousands of satisfied customers across Bangladesh using FlexiTaka for rapid, verified balance cash outs and discounted recharges.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "16px", flexWrap: "wrap" }}>
            <Link href="/app/cashout" className="btn btn-secondary btn-lg" style={{ color: "#78350F" }}>
              <span>Start Cash Out</span>
              <ArrowRight size={18} />
            </Link>
            <Link href="/how-it-works" className="btn btn-outline btn-lg" style={{ backgroundColor: "rgba(255, 255, 255, 0.15)", color: "#FFFFFF", borderColor: "rgba(255, 255, 255, 0.3)" }}>
              <span>Learn More</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
