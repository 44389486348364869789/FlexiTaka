"use client";

import React from "react";
import { CashOutQuote, RechargeQuote } from "@/lib/types";
import { formatBDT } from "@/lib/formatters";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

interface LiveQuoteCardProps {
  mode: "CASHOUT" | "RECHARGE";
  quote: CashOutQuote | RechargeQuote | null;
  loading?: boolean;
  error?: string | null;
  placeholderText?: string;
}

export default function LiveQuoteCard({
  mode,
  quote,
  loading = false,
  error = null,
  placeholderText,
}: LiveQuoteCardProps) {
  const { isBn, toBnDigits } = useLanguage();

  const defaultPlaceholder =
    mode === "CASHOUT"
      ? (isBn ? "পেআউট দেখতে পরিমাণ লিখুন।" : "Enter amount to see payout.")
      : (isBn ? "ডিসকাউন্টের হিসাব দেখতে পরিমাণ লিখুন।" : "Enter amount to see discounted total.");
  
  const displayPlaceholder = placeholderText ?? defaultPlaceholder;
  const cashout = mode === "CASHOUT" ? (quote as CashOutQuote | null) : null;
  const recharge = mode === "RECHARGE" ? (quote as RechargeQuote | null) : null;
  const langOpt = { lang: isBn ? ("bn" as const) : ("en" as const) };

  return (
    <div
      aria-live="polite"
      style={{
        backgroundColor: "var(--bg-main)",
        border: "1px solid var(--border-card)",
        borderRadius: "var(--radius-md)",
        padding: "10px 14px",
        marginBottom: "12px",
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
        }}
      >
        <span
          style={{
            fontSize: "0.75rem",
            fontWeight: "600",
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {mode === "CASHOUT"
            ? (isBn ? "আর্থিক সারসংক্ষেপ" : "Financial Summary")
            : (isBn ? "ডিসকাউন্ট সারসংক্ষেপ" : "Discount Summary")}
        </span>
        {loading && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.6875rem", color: "var(--ft-green)" }}>
            <RefreshCw size={11} className="animate-spin" />
            <span>{isBn ? "আপডেট হচ্ছে..." : "Updating..."}</span>
          </span>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            color: "#B91C1C",
            fontSize: "0.75rem",
            padding: "4px 0",
          }}
        >
          <AlertCircle size={14} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Cash Out Calculation */}
      {mode === "CASHOUT" && cashout && !error && (
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem" }}>
            <span style={{ color: "var(--text-secondary)" }}>{isBn ? "পরিমাণ" : "Amount"}</span>
            <span style={{ fontWeight: "600", color: "var(--text-primary)" }}>
              {formatBDT(cashout.source_amount_bdt, langOpt)}
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem" }}>
            <span style={{ color: "var(--text-secondary)" }}>
              {isBn
                ? `প্ল্যাটফর্ম ফি (${toBnDigits(cashout.platform_fee_rate)}%)`
                : `Platform Fee (${cashout.platform_fee_rate}%)`}
            </span>
            <span style={{ fontWeight: "500", color: "#DC2626" }}>
              {formatBDT(cashout.platform_fee_amount_bdt, { ...langOpt, isDeduction: true })}
            </span>
          </div>

          <div
            style={{
              borderTop: "1px solid var(--border-card)",
              paddingTop: "8px",
              marginTop: "2px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
            }}
          >
            <span style={{ fontWeight: "600", fontSize: "0.875rem", color: "var(--text-primary)" }}>
              {isBn ? "আপনি পাবেন" : "You Receive"}
            </span>
            <span
              style={{
                fontWeight: "700",
                fontSize: "1.25rem",
                color: "var(--ft-green)",
                letterSpacing: "-0.02em",
              }}
            >
              {formatBDT(cashout.payout_amount_bdt, langOpt)}
            </span>
          </div>
        </div>
      )}

      {/* Recharge Calculation */}
      {mode === "RECHARGE" && recharge && !error && (
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem" }}>
            <span style={{ color: "var(--text-secondary)" }}>{isBn ? "রিচার্জের পরিমাণ" : "Recharge Amount"}</span>
            <span style={{ fontWeight: "600", color: "var(--text-primary)" }}>
              {formatBDT(recharge.recharge_amount_bdt, langOpt)}
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem" }}>
            <span style={{ color: "var(--text-secondary)" }}>
              {isBn
                ? `ছাড় (${toBnDigits(recharge.discount_rate)}%)`
                : `Discount (${recharge.discount_rate}%)`}
            </span>
            <span style={{ fontWeight: "500", color: "var(--ft-green)" }}>
              {formatBDT(recharge.discount_amount_bdt, { ...langOpt, isDeduction: true })}
            </span>
          </div>

          <div
            style={{
              borderTop: "1px solid var(--border-card)",
              paddingTop: "8px",
              marginTop: "2px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
            }}
          >
            <span style={{ fontWeight: "600", fontSize: "0.875rem", color: "var(--text-primary)" }}>
              {isBn ? "আপনাকে দিতে হবে" : "You Pay"}
            </span>
            <span
              style={{
                fontWeight: "700",
                fontSize: "1.25rem",
                color: "var(--ft-green)",
                letterSpacing: "-0.02em",
              }}
            >
              {formatBDT(recharge.customer_pay_amount_bdt, langOpt)}
            </span>
          </div>
        </div>
      )}

      {/* Placeholder state */}
      {!quote && !error && !loading && (
        <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", textAlign: "center", padding: "6px 0" }}>
          {displayPlaceholder}
        </div>
      )}
    </div>
  );
}
