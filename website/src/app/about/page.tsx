import React from "react";
import Link from "next/link";
import { ShieldCheck, ArrowRight, Award, Lock, Users } from "lucide-react";

export default function AboutPage() {
  return (
    <div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh", paddingBottom: "80px" }}>
      {/* Header */}
      <div style={{ backgroundColor: "#FFFFFF", borderBottom: "1px solid var(--border-light)", padding: "48px 0" }}>
        <div className="container text-center">
          <h1 style={{ fontSize: "2.5rem", fontWeight: "900", color: "var(--text-primary)", marginBottom: "12px" }}>
            About FlexiTaka
          </h1>
          <p style={{ fontSize: "1.125rem", color: "var(--text-secondary)", maxWidth: "600px", margin: "0 auto" }}>
            Pioneering transparent, audited telecom utility exchange and smart airtime solutions in Bangladesh.
          </p>
        </div>
      </div>

      <div className="container" style={{ paddingTop: "48px", maxWidth: "800px" }}>
        <div className="card" style={{ padding: "36px", marginBottom: "32px" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "800", marginBottom: "16px" }}>Our Mission</h2>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "20px" }}>
            In Bangladesh, millions of citizens carry unused prepaid airtime balance trapped in their SIM cards due to bundle purchases, recharge bonuses, or everyday telecom operations. Simultaneously, millions require discounted mobile top-ups for communication.
          </p>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "0" }}>
            FlexiTaka was built to bridge this gap through a secure, non-custodial, and fully audited fintech architecture. We ensure that consumers retain complete control over their mobile balance while enjoying clear, fair, and transparent conversion to spendable cash.
          </p>
        </div>

        <div className="grid grid-3" style={{ marginBottom: "32px" }}>
          <div className="card text-center" style={{ padding: "24px" }}>
            <Lock size={28} color="var(--ft-green)" style={{ margin: "0 auto 12px auto" }} />
            <h4 style={{ fontWeight: "700", marginBottom: "6px" }}>Non-Custodial</h4>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
              We never touch or ask for your telecom account passwords or PINs.
            </p>
          </div>
          <div className="card text-center" style={{ padding: "24px" }}>
            <Award size={28} color="var(--ft-green)" style={{ margin: "0 auto 12px auto" }} />
            <h4 style={{ fontWeight: "700", marginBottom: "6px" }}>Authoritative</h4>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
              Exact financial arithmetic with zero floating-point approximation.
            </p>
          </div>
          <div className="card text-center" style={{ padding: "24px" }}>
            <Users size={28} color="var(--ft-green)" style={{ margin: "0 auto 12px auto" }} />
            <h4 style={{ fontWeight: "700", marginBottom: "6px" }}>Customer First</h4>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
              Optional login with fast, frictionless guest transaction support.
            </p>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: "24px" }}>
          <Link href="/app/cashout" className="btn btn-primary">
            <span>Try FlexiTaka Today</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
