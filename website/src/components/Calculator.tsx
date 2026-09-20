"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { CashOutQuote, OperatorCode, RechargeQuote } from "@/lib/types";
import { formatBDT } from "@/lib/formatters";
import OperatorSelector from "./OperatorSelector";
import LiveQuoteCard from "./LiveQuoteCard";
import TrustNote from "./TrustNote";
import { useLanguage } from "@/i18n/LanguageContext";

interface CalculatorProps {
  defaultTab?: "CASHOUT" | "RECHARGE";
  activeTab?: "CASHOUT" | "RECHARGE";
  onTabChange?: (tab: "CASHOUT" | "RECHARGE") => void;
  inputRef?: React.RefObject<HTMLInputElement>;
  className?: string;
  id?: string;
}

export default function Calculator({
  defaultTab = "CASHOUT",
  activeTab: controlledTab,
  onTabChange,
  inputRef,
  className = "",
  id,
}: CalculatorProps) {
  const { isBn, tr } = useLanguage();
  const c = tr.home.calculator;

  const [internalTab, setInternalTab] = useState<"CASHOUT" | "RECHARGE">(defaultTab);
  const activeTab = controlledTab ?? internalTab;

  const handleTabChange = (tab: "CASHOUT" | "RECHARGE") => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };

  const [operator, setOperator] = useState<OperatorCode>("GP");
  const [amount, setAmount] = useState<string>("");

  const [cashoutQuote, setCashoutQuote] = useState<CashOutQuote | null>(null);
  const [rechargeQuote, setRechargeQuote] = useState<RechargeQuote | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuote = async () => {
    if (!amount || amount.trim() === "") {
      setCashoutQuote(null);
      setRechargeQuote(null);
      setError(null);
      return;
    }

    const num = parseFloat(amount);
    if (isNaN(num) || num < 50 || num > 50000) {
      setError(
        isBn
          ? "পরিমাণ অবশ্যই ৳৫০ থেকে ৳৫০,০০০-এর মধ্যে হতে হবে"
          : "Amount must be between ৳50 and ৳50,000"
      );
      setCashoutQuote(null);
      setRechargeQuote(null);
      return;
    }
    setError(null);
    setLoading(true);

    try {
      if (activeTab === "CASHOUT") {
        const quote = await api.getCashOutQuote(operator, amount);
        setCashoutQuote(quote);
      } else {
        const quote = await api.getRechargeQuote(operator, amount);
        setRechargeQuote(quote);
      }
    } catch {
      // Fallback calculation if offline
      if (activeTab === "CASHOUT") {
        const fee = num * 0.2;
        setCashoutQuote({
          operator_code: operator,
          source_amount_bdt: num.toFixed(2),
          source_amount_poisha: Math.round(num * 100),
          platform_fee_rate: "20.0",
          platform_fee_amount_bdt: fee.toFixed(2),
          platform_fee_amount_poisha: Math.round(fee * 100),
          payout_amount_bdt: (num - fee).toFixed(2),
          payout_amount_poisha: Math.round((num - fee) * 100),
          currency: "BDT",
          pricing_rule_version: 1,
        });
      } else {
        const discount = num * 0.05;
        setRechargeQuote({
          operator_code: operator,
          recharge_amount_bdt: num.toFixed(2),
          recharge_amount_poisha: Math.round(num * 100),
          discount_rate: "5.0",
          discount_amount_bdt: discount.toFixed(2),
          discount_amount_poisha: Math.round(discount * 100),
          customer_pay_amount_bdt: (num - discount).toFixed(2),
          customer_pay_amount_poisha: Math.round((num - discount) * 100),
          currency: "BDT",
          pricing_rule_version: 1,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuote();
  }, [activeTab, operator, amount]);

  const currentQuote = activeTab === "CASHOUT" ? cashoutQuote : rechargeQuote;
  const isQuoteReady = Boolean(currentQuote && !error && !loading);
  const langOpt = { lang: isBn ? ("bn" as const) : ("en" as const) };

  return (
    <div
      id={id}
      className={`card app-form-card ${className}`}
      style={{ maxWidth: "520px", margin: "0 auto", padding: "20px" }}
    >
      {/* 1. Service Selector (Cash Out | Discounted Recharge) */}
      <div
        role="tablist"
        aria-label="Service Selector"
        style={{
          display: "flex",
          backgroundColor: "var(--bg-subtle)",
          borderRadius: "var(--radius-md)",
          padding: "3px",
          marginBottom: "14px",
        }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "CASHOUT"}
          onClick={() => handleTabChange("CASHOUT")}
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: "var(--radius-sm)",
            border: "none",
            backgroundColor: activeTab === "CASHOUT" ? "#FFFFFF" : "transparent",
            color: activeTab === "CASHOUT" ? "var(--ft-green-active)" : "var(--text-secondary)",
            fontWeight: activeTab === "CASHOUT" ? "600" : "500",
            boxShadow: activeTab === "CASHOUT" ? "var(--shadow-sm)" : "none",
            cursor: "pointer",
            transition: "all 0.15s ease",
            fontSize: "0.8125rem",
          }}
        >
          {c.tabCashOut}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "RECHARGE"}
          onClick={() => handleTabChange("RECHARGE")}
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: "var(--radius-sm)",
            border: "none",
            backgroundColor: activeTab === "RECHARGE" ? "#FFFFFF" : "transparent",
            color: activeTab === "RECHARGE" ? "var(--ft-green-active)" : "var(--text-secondary)",
            fontWeight: activeTab === "RECHARGE" ? "600" : "500",
            boxShadow: activeTab === "RECHARGE" ? "var(--shadow-sm)" : "none",
            cursor: "pointer",
            transition: "all 0.15s ease",
            fontSize: "0.8125rem",
          }}
        >
          {c.tabRecharge}
        </button>
      </div>

      {/* 2. Compact Operator Selection */}
      <div style={{ marginBottom: "12px" }}>
        <label className="form-label" style={{ marginBottom: "4px", fontSize: "0.8125rem" }}>
          {c.selectOperator}
        </label>
        <OperatorSelector value={operator} onChange={setOperator} />
      </div>

      {/* 3. Amount Section */}
      <div style={{ marginBottom: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
          <label className="form-label" style={{ margin: 0, fontSize: "0.8125rem" }}>
            {activeTab === "CASHOUT"
              ? (isBn ? "ক্যাশ আউটের পরিমাণ" : "Amount to Cash Out")
              : (isBn ? "রিচার্জের পরিমাণ" : "Recharge Amount")}
          </label>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            {activeTab === "CASHOUT" ? c.limitsCashOut : c.limitsRecharge}
          </span>
        </div>

        <div style={{ position: "relative" }}>
          <input
            ref={inputRef}
            type="number"
            className="form-input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="50"
            max="50000"
            step="10"
            placeholder={isBn ? "পরিমাণ" : "Amount"}
            aria-label="Amount in Bangladeshi Taka"
            style={{ fontSize: "1.125rem", fontWeight: "600", paddingLeft: "32px", height: "42px" }}
          />
          <span
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              fontWeight: "500",
              color: "var(--text-muted)",
              fontSize: "1rem",
            }}
          >
            ৳
          </span>
        </div>
      </div>

      {/* 4. Live Calculation Summary */}
      <LiveQuoteCard
        mode={activeTab}
        quote={currentQuote}
        loading={loading}
        error={error}
      />

      {/* 5. Primary Action Button */}
      {activeTab === "CASHOUT" ? (
        <Link
          href={amount && isQuoteReady ? `/app/cashout?operator=${operator}&amount=${amount}` : `/app/cashout?operator=${operator}`}
          className="btn btn-primary btn-full"
          style={{ height: "50px", fontSize: "0.9375rem", fontWeight: "600" }}
        >
          <span>
            {cashoutQuote && isQuoteReady
              ? (isBn
                  ? `ক্যাশ আউট করুন ${formatBDT(cashoutQuote.payout_amount_bdt, langOpt)} →`
                  : `Cash Out ${formatBDT(cashoutQuote.payout_amount_bdt)} →`)
              : c.btnCashOut}
          </span>
        </Link>
      ) : (
        <Link
          href={amount && isQuoteReady ? `/app/recharge?operator=${operator}&amount=${amount}` : `/app/recharge?operator=${operator}`}
          className="btn btn-primary btn-full"
          style={{ height: "50px", fontSize: "0.9375rem", fontWeight: "600" }}
        >
          <span>
            {rechargeQuote && isQuoteReady
              ? (isBn
                  ? `রিচার্জ করুন ${formatBDT(rechargeQuote.customer_pay_amount_bdt, langOpt)} →`
                  : `Recharge for ${formatBDT(rechargeQuote.customer_pay_amount_bdt)} →`)
              : c.btnRecharge}
          </span>
        </Link>
      )}

      {/* 6. Standardized Short Reassurance */}
      <TrustNote />
    </div>
  );
}
