"use client";

import React from "react";
import { Lock } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

interface TrustNoteProps {
  text?: string;
  align?: "center" | "left";
}

export default function TrustNote({
  text,
  align = "center",
}: TrustNoteProps) {
  const { isBn } = useLanguage();
  const defaultText = isBn
    ? "টেলিকম পাসওয়ার্ড বা OTP-এর প্রয়োজন নেই"
    : "No telecom password or OTP required";

  const displayText = text ?? defaultText;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: align === "left" ? "flex-start" : "center",
        gap: "5px",
        fontSize: "0.75rem",
        color: "var(--text-muted)",
        marginTop: "8px",
        userSelect: "none",
      }}
    >
      <Lock size={12} style={{ color: "var(--ft-green)", flexShrink: 0 }} />
      <span>{displayText}</span>
    </div>
  );
}
