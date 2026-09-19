import React from "react";

export default function TermsPage() {
  return (
    <div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh", paddingBottom: "80px" }}>
      <div style={{ backgroundColor: "#FFFFFF", borderBottom: "1px solid var(--border-light)", padding: "48px 0" }}>
        <div className="container text-center">
          <h1 style={{ fontSize: "2.5rem", fontWeight: "900", color: "var(--text-primary)", marginBottom: "12px" }}>
            Terms of Service
          </h1>
          <p style={{ fontSize: "1rem", color: "var(--text-secondary)" }}>
            Last Updated: September 2026 • Platform Version 1.0 (MVP Baseline)
          </p>
        </div>
      </div>

      <div className="container" style={{ paddingTop: "48px", maxWidth: "800px" }}>
        <div className="card" style={{ padding: "36px", lineHeight: 1.7, fontSize: "0.9375rem", color: "var(--text-secondary)" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "12px" }}>
            1. Platform Nature & Scope
          </h2>
          <p style={{ marginBottom: "20px" }}>
            FlexiTaka (https://flexitaka.com) provides an intermediary technological platform facilitating the voluntary exchange of eligible mobile telecom prepaid balance and discounted airtime recharge across recognized telecommunications networks in Bangladesh (Grameenphone, Robi, Banglalink).
          </p>

          <h2 style={{ fontSize: "1.25rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "12px" }}>
            2. Strict Non-Custodial Policy (Zero Telecom Credentials)
          </h2>
          <p style={{ marginBottom: "20px" }}>
            FlexiTaka does not solicit, collect, store, or process telecom account passwords, SIM PIN codes, or telecom operator SMS OTPs. All balance transfers are conducted exclusively by the user from their own mobile device utilizing the official USSD dialer or the official mobile application of their telecom service provider.
          </p>

          <h2 style={{ fontSize: "1.25rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "12px" }}>
            3. Transaction Limits & Pricing
          </h2>
          <p style={{ marginBottom: "20px" }}>
            The platform enforces a minimum order limit of ৳50.00 and a maximum order limit of ৳50,000.00 BDT per transaction. Platform fees and recharge discounts are quoted authoritatively by the FlexiTaka backend and locked into the order snapshot upon creation. Individual SIM balance transfer limits and any network operator transfer charges are governed strictly by the respective mobile operators under BTRC regulations.
          </p>

          <h2 style={{ fontSize: "1.25rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "12px" }}>
            4. Verification & Payout Terms
          </h2>
          <p style={{ marginBottom: "20px" }}>
            Orders placed for Cash Out require verification of incoming balance on our physical receiving SIM handsets prior to fund disbursement. Submitting fraudulent transaction references or invalid transaction proofs will result in immediate rejection.
          </p>

          <h2 style={{ fontSize: "1.25rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "12px" }}>
            5. Governing Law
          </h2>
          <p style={{ margin: 0 }}>
            These terms are governed by and construed in accordance with the laws of the People's Republic of Bangladesh.
          </p>
        </div>
      </div>
    </div>
  );
}
