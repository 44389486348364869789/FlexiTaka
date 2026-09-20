"use client";

import React from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Globe } from "lucide-react";

interface LanguageSwitcherProps {
  className?: string;
  style?: React.CSSProperties;
}

export default function LanguageSwitcher({
  className = "",
  style = {},
}: LanguageSwitcherProps) {
  const { language, toggleLanguage } = useLanguage();

  // In Bangla mode, show [ English ]
  // In English mode, show [ বাংলা ]
  const label = language === "bn" ? "English" : "বাংলা";
  const ariaLabel =
    language === "bn"
      ? "Switch website language to English"
      : "ওয়েবসাইটের ভাষা পরিবর্তন করে বাংলায় দেখুন";

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className={`footer-lang-btn ${className}`}
      aria-label={ariaLabel}
      title={ariaLabel}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 10px",
        fontSize: "0.75rem",
        fontWeight: "500",
        color: "var(--text-secondary)",
        backgroundColor: "var(--bg-main)",
        border: "1px solid var(--border-light)",
        borderRadius: "var(--radius-sm)",
        cursor: "pointer",
        transition: "all 0.15s ease",
        marginTop: "6px",
        userSelect: "none",
        lineHeight: 1.4,
        ...style,
      }}
    >
      <Globe size={13} color="var(--ft-green)" style={{ flexShrink: 0 }} />
      <span>{label}</span>
    </button>
  );
}
