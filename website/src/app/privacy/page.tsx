import React from "react";

export default function PrivacyPage() {
  return (
    <div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh", paddingBottom: "80px" }}>
      <div style={{ backgroundColor: "#FFFFFF", borderBottom: "1px solid var(--border-light)", padding: "48px 0" }}>
        <div className="container text-center">
          <h1 style={{ fontSize: "2.5rem", fontWeight: "900", color: "var(--text-primary)", marginBottom: "12px" }}>
            Privacy Policy
          </h1>
          <p style={{ fontSize: "1rem", color: "var(--text-secondary)" }}>
            Your privacy, data security, and confidentiality are our highest priorities.
          </p>
        </div>
      </div>

      <div className="container" style={{ paddingTop: "48px", maxWidth: "800px" }}>
        <div className="card" style={{ padding: "36px", lineHeight: 1.7, fontSize: "0.9375rem", color: "var(--text-secondary)" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "12px" }}>
            1. Information We Collect
          </h2>
          <p style={{ marginBottom: "20px" }}>
            To execute balance transfers and payouts, FlexiTaka collects only minimal necessary data: your mobile number, transaction references, payout destination account numbers (bKash/Nagad/Bank), and optional uploaded transfer screenshot proofs.
          </p>

          <h2 style={{ fontSize: "1.25rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "12px" }}>
            2. Private Proof Storage Protection
          </h2>
          <p style={{ marginBottom: "20px" }}>
            Transaction screenshot proofs uploaded by customers are stored in private, isolated file storage outside the public web server root. Proof files are never publicly indexable or accessible via guessable URLs. Access is protected by HMAC cryptographic signature validation and role-based staff authorization.
          </p>

          <h2 style={{ fontSize: "1.25rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "12px" }}>
            3. Optional Accounts & Guest Privacy
          </h2>
          <p style={{ marginBottom: "20px" }}>
            Account registration is optional. Guest sessions are identified using random UUIDs stored locally in your browser. We do not sell or monetize personal customer transaction data to third-party advertisers.
          </p>

          <h2 style={{ fontSize: "1.25rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "12px" }}>
            4. Data Retention & Auditing
          </h2>
          <p style={{ margin: 0 }}>
            Transaction records are retained in compliance with applicable financial audit regulations and anti-fraud auditing requirements.
          </p>
        </div>
      </div>
    </div>
  );
}
