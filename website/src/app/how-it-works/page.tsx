import React from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldAlert, Smartphone, Wallet, Zap } from "lucide-react";

export default function HowItWorksPage() {
  return (
    <div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh", paddingBottom: "80px" }}>
      {/* Page Header */}
      <div style={{ backgroundColor: "#FFFFFF", borderBottom: "1px solid var(--border-light)", padding: "48px 0" }}>
        <div className="container text-center">
          <h1 style={{ fontSize: "2.5rem", fontWeight: "900", color: "var(--text-primary)", marginBottom: "12px" }}>
            How FlexiTaka Works
          </h1>
          <p style={{ fontSize: "1.125rem", color: "var(--text-secondary)", maxWidth: "620px", margin: "0 auto" }}>
            A complete, transparent guide to converting your mobile airtime balance to cash or sending discounted airtime recharges in Bangladesh.
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
            fontWeight: "700",
            marginBottom: "16px"
          }}>
            WORKFLOW 1
          </div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "16px" }}>
            Cash Out SIM Balance to bKash / Nagad / Bank
          </h2>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "32px", maxWidth: "780px" }}>
            FlexiTaka enables you to liquidate eligible prepaid mobile balance using your operator's official balance transfer service. Here is the exact lifecycle of a Cash Out transaction:
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
                fontWeight: "700",
                flexShrink: 0
              }}>
                1
              </div>
              <div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: "700", marginBottom: "6px" }}>
                  Get Real-Time Server Quote
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.5 }}>
                  Select your operator (GP, Robi, or Banglalink), enter your source phone number, and input the amount (৳50 – ৳50,000). The FlexiTaka backend dynamically computes the fee and the exact payout amount you will receive.
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
                fontWeight: "700",
                flexShrink: 0
              }}>
                2
              </div>
              <div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: "700", marginBottom: "6px" }}>
                  Enter Payout Details & Receive Assigned Number
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.5 }}>
                  Provide your bKash, Nagad, or Bank account details. Upon order submission, our server automatically assigns an active, least-loaded FlexiTaka receiving SIM number matching your operator.
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
                fontWeight: "700",
                flexShrink: 0
              }}>
                3
              </div>
              <div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: "700", marginBottom: "6px" }}>
                  Perform Operator Balance Transfer on Your Device
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.5, marginBottom: "12px" }}>
                  Open your phone's dialer or official telecom app to transfer the balance to our assigned number:
                </p>
                <div style={{
                  background: "var(--bg-main)",
                  border: "1px solid var(--border-card)",
                  borderRadius: "var(--radius-sm)",
                  padding: "14px 18px",
                  fontSize: "0.9375rem",
                  lineHeight: 1.6
                }}>
                  Use your operator's official balance transfer option in <strong>MyGP</strong>, <strong>MyRobi</strong>, <strong>MyBL</strong>, or the operator's official USSD channel.
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
                fontWeight: "700",
                flexShrink: 0
              }}>
                4
              </div>
              <div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: "700", marginBottom: "6px" }}>
                  Submit Transaction Reference & Verification
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.5 }}>
                  Enter the confirmation SMS TrxID and optionally upload a screenshot. Our verifier checks the incoming balance on the receiving handset and approves the order.
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
                fontWeight: "700",
                flexShrink: 0
              }}>
                5
              </div>
              <div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: "700", marginBottom: "6px" }}>
                  Instant Mobile Wallet Payout
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.5 }}>
                  Finance dispatches the agreed net payout directly to your bKash, Nagad, or Bank account. The order is stamped COMPLETED on your live tracking page.
                </p>
              </div>
            </div>
          </div>

          <div style={{ marginTop: "32px" }}>
            <Link href="/app/cashout" className="btn btn-primary">
              <span>Start Cash Out Now</span>
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
            fontWeight: "700",
            marginBottom: "16px"
          }}>
            WORKFLOW 2
          </div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "16px" }}>
            Discounted Airtime Recharge
          </h2>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "32px", maxWidth: "780px" }}>
            Save money every time you top up your mobile phone or family members' phones across Bangladesh.
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
                fontWeight: "700",
                flexShrink: 0
              }}>
                1
              </div>
              <div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: "700", marginBottom: "6px" }}>
                  Select Operator & Recharge Amount
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.5 }}>
                  Enter the recipient mobile number and the desired airtime value. The system displays your instant cashback discount and the exact reduced amount you pay.
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
                fontWeight: "700",
                flexShrink: 0
              }}>
                2
              </div>
              <div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: "700", marginBottom: "6px" }}>
                  Pay via bKash or Nagad
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.5 }}>
                  Send the discounted payment to the official FlexiTaka merchant/agent account displayed on screen and enter your transaction ID (TrxID).
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
                fontWeight: "700",
                flexShrink: 0
              }}>
                3
              </div>
              <div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: "700", marginBottom: "6px" }}>
                  Automated / Staff Top-Up Dispatch
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.5 }}>
                  As soon as payment is confirmed, operations staff sends the full recharge value from our retail SIM pool straight to the destination mobile number.
                </p>
              </div>
            </div>
          </div>

          <div style={{ marginTop: "32px" }}>
            <Link href="/app/recharge" className="btn btn-secondary">
              <span>Start Discounted Recharge</span>
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
            <h4 style={{ fontSize: "1rem", fontWeight: "700", color: "#1E3A8A", marginBottom: "6px" }}>
              Compliance & Non-Custodial Integrity
            </h4>
            <p style={{ fontSize: "0.875rem", color: "#1E40AF", lineHeight: 1.6, margin: 0 }}>
              FlexiTaka does not access, control, or intercept your telecom account. All balance transfers are executed voluntarily by you using official telecom menus. We do not store, request, or verify telecom PINs. Operator transfer limits and charges are regulated by BTRC and the respective mobile operators.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
