"use client";

import React from "react";
import Link from "next/link";
import {
  BookOpen,
  Mail,
  Shield,
} from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

export default function PrivacyPage() {
  const { isBn, tr } = useLanguage();
  const p = tr.privacy;

  return (
    <div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh", paddingBottom: "80px" }}>
      {/* 1. Header Banner */}
      <div style={{ backgroundColor: "#FFFFFF", borderBottom: "1px solid var(--border-light)", padding: "48px 0" }}>
        <div className="container text-center">
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "4px 12px",
              background: "var(--ft-green-subtle)",
              color: "var(--ft-green-active)",
              borderRadius: "var(--radius-full)",
              fontSize: "0.8125rem",
              fontWeight: "600",
              marginBottom: "16px",
            }}
          >
            <Shield size={15} />
            <span>{p.badge}</span>
          </div>
          <h1 style={{ fontSize: "2.375rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "12px", letterSpacing: "-0.02em" }}>
            {p.title}
          </h1>
          <p style={{ fontSize: "1rem", color: "var(--text-secondary)", maxWidth: "620px", margin: "0 auto 12px auto", lineHeight: 1.6 }}>
            {p.subtitle}
          </p>
          <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)", fontWeight: "500" }}>
            {p.lastUpdated}
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingTop: "40px", maxWidth: "1020px" }}>
        <div className="legal-layout" style={{ display: "flex", gap: "32px", alignItems: "flex-start" }}>
          
          {/* 2. Desktop Sticky Sidebar Table of Contents */}
          <aside className="legal-sidebar" style={{ width: "280px", flexShrink: 0, position: "sticky", top: "90px" }}>
            <div className="card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px", paddingBottom: "10px", borderBottom: "1px solid var(--border-light)" }}>
                <BookOpen size={16} color="var(--ft-green)" />
                <span style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-primary)" }}>
                  {isBn ? "সূচিপত্র" : "Contents"}
                </span>
              </div>
              <nav style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "calc(100vh - 160px)", overflowY: "auto", paddingRight: "4px" }}>
                {p.sections.map((sec) => (
                  <a
                    key={sec.id}
                    href={`#${sec.id}`}
                    style={{
                      fontSize: "0.8125rem",
                      color: "var(--text-secondary)",
                      textDecoration: "none",
                      padding: "4px 8px",
                      borderRadius: "var(--radius-sm)",
                      transition: "all 0.15s ease",
                      lineHeight: 1.35,
                    }}
                    className="legal-nav-link"
                  >
                    {sec.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* 3. Main Document Body */}
          <main style={{ flex: 1, minWidth: 0 }}>
            {/* Mobile Collapsible TOC */}
            <div className="legal-mobile-toc" style={{ marginBottom: "20px" }}>
              <details className="card" style={{ padding: "14px" }}>
                <summary style={{ cursor: "pointer", fontWeight: "600", fontSize: "0.875rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                  <BookOpen size={16} color="var(--ft-green)" />
                  <span>{p.tocTitle}</span>
                </summary>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px", paddingTop: "10px", borderTop: "1px solid var(--border-light)" }}>
                  {p.sections.map((sec) => (
                    <a
                      key={sec.id}
                      href={`#${sec.id}`}
                      style={{ fontSize: "0.8125rem", color: "var(--ft-green-active)", textDecoration: "none" }}
                    >
                      {sec.title}
                    </a>
                  ))}
                </div>
              </details>
            </div>

            <div className="card" style={{ padding: "36px", display: "flex", flexDirection: "column", gap: "36px" }}>
              {p.sections.map((sec) => (
                <section key={sec.id} id={sec.id} style={{ scrollMarginTop: "100px" }}>
                  <h2 style={{ fontSize: "1.25rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "14px", borderBottom: "1px solid var(--border-light)", paddingBottom: "8px" }}>
                    {sec.title}
                  </h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.7 }}>
                    {sec.content.map((para, idx) => (
                      <p key={idx} style={{ margin: 0 }}>{para}</p>
                    ))}
                  </div>
                </section>
              ))}

              {/* Contact Footer */}
              <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: "24px", marginTop: "12px", display: "flex", alignItems: "center", gap: "12px" }}>
                <Mail size={18} color="var(--ft-green)" />
                <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                  {p.supportPrompt}{" "}
                  <a href="mailto:Contact@flexitaka.com" style={{ color: "var(--ft-green-active)", fontWeight: "600", textDecoration: "none" }}>
                    Contact@flexitaka.com
                  </a>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
