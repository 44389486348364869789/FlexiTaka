"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Award, Lock, Users } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

export default function AboutPage() {
  const { isBn, tr } = useLanguage();
  const a = tr.about;

  return (
    <div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh", paddingBottom: "80px" }}>
      {/* Header */}
      <div style={{ backgroundColor: "#FFFFFF", borderBottom: "1px solid var(--border-light)", padding: "48px 0" }}>
        <div className="container text-center">
          <h1 style={{ fontSize: "2.5rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "12px" }}>
            {a.title}
          </h1>
          <p style={{ fontSize: "1.125rem", color: "var(--text-secondary)", maxWidth: "600px", margin: "0 auto" }}>
            {a.subtitle}
          </p>
        </div>
      </div>

      <div className="container" style={{ paddingTop: "48px", maxWidth: "800px" }}>
        <div className="card" style={{ padding: "36px", marginBottom: "32px" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "16px" }}>{a.missionTitle}</h2>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "20px" }}>
            {a.missionP1}
          </p>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "0" }}>
            {a.missionP2}
          </p>
        </div>

        <div className="grid grid-3" style={{ marginBottom: "32px" }}>
          <div className="card text-center" style={{ padding: "24px" }}>
            <Lock size={28} color="var(--ft-green)" style={{ margin: "0 auto 12px auto" }} />
            <h4 style={{ fontWeight: "600", marginBottom: "6px" }}>{a.pillar1Title}</h4>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
              {a.pillar1Desc}
            </p>
          </div>
          <div className="card text-center" style={{ padding: "24px" }}>
            <Award size={28} color="var(--ft-green)" style={{ margin: "0 auto 12px auto" }} />
            <h4 style={{ fontWeight: "600", marginBottom: "6px" }}>{a.pillar2Title}</h4>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
              {a.pillar2Desc}
            </p>
          </div>
          <div className="card text-center" style={{ padding: "24px" }}>
            <Users size={28} color="var(--ft-green)" style={{ margin: "0 auto 12px auto" }} />
            <h4 style={{ fontWeight: "600", marginBottom: "6px" }}>{a.pillar3Title}</h4>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
              {a.pillar3Desc}
            </p>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: "24px" }}>
          <Link href="/app/cashout" className="btn btn-primary">
            <span>{a.btnCta}</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
