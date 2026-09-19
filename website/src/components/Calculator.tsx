"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { CashOutQuote, OperatorCode, RechargeQuote } from "@/lib/types";
import { ArrowRight, Calculator as CalcIcon, CheckCircle, RefreshCw, Zap } from "lucide-react";

export default function Calculator() {
  const [activeTab, setActiveTab] = useState<"CASHOUT" | "RECHARGE">("CASHOUT");
  const [operator, setOperator] = useState<OperatorCode>("GP");
  const [amount, setAmount] = useState<string>("1000");
  
  const [cashoutQuote, setCashoutQuote] = useState<CashOutQuote | null>(null);
  const [rechargeQuote, setRechargeQuote] = useState<RechargeQuote | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const quickAmounts = ["100", "500", "1000", "2000", "5000"];

  const fetchQuote = async () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num < 50 || num > 50000) {
      setError("Amount must be between ৳50 and ৳50,000");
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
    } catch (err: any) {
      setError(err.message || "Failed to load live server quote");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuote();
  }, [activeTab, operator, amount]);

  return (
    <div className="card" style={{ maxWidth: "540px", margin: "0 auto", padding: "28px" }}>
      {/* Header Tabs */}
      <div style={{
        display: "flex",
        backgroundColor: "var(--bg-subtle)",
        borderRadius: "var(--radius-md)",
        padding: "4px",
        marginBottom: "24px"
      }}>
        <button
          onClick={() => setActiveTab("CASHOUT")}
          style={{
            flex: 1,
            padding: "10px 16px",
            borderRadius: "var(--radius-sm)",
            border: "none",
            backgroundColor: activeTab === "CASHOUT" ? "#FFFFFF" : "transparent",
            color: activeTab === "CASHOUT" ? "var(--ft-green-active)" : "var(--text-secondary)",
            fontWeight: activeTab === "CASHOUT" ? "700" : "500",
            boxShadow: activeTab === "CASHOUT" ? "var(--shadow-sm)" : "none",
            cursor: "pointer",
            transition: "all 0.15s ease",
            fontSize: "0.9375rem"
          }}
        >
          Cash Out Balance
        </button>
        <button
          onClick={() => setActiveTab("RECHARGE")}
          style={{
            flex: 1,
            padding: "10px 16px",
            borderRadius: "var(--radius-sm)",
            border: "none",
            backgroundColor: activeTab === "RECHARGE" ? "#FFFFFF" : "transparent",
            color: activeTab === "RECHARGE" ? "var(--ft-green-active)" : "var(--text-secondary)",
            fontWeight: activeTab === "RECHARGE" ? "700" : "500",
            boxShadow: activeTab === "RECHARGE" ? "var(--shadow-sm)" : "none",
            cursor: "pointer",
            transition: "all 0.15s ease",
            fontSize: "0.9375rem"
          }}
        >
          Discounted Recharge
        </button>
      </div>

      {/* Operator Selection */}
      <div style={{ marginBottom: "20px" }}>
        <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Select Operator</span>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "normal" }}>Official BD Telecoms</span>
        </label>
        <div className="operator-grid" style={{ marginBottom: "0" }}>
          {(["GP", "ROBI", "BANGLALINK"] as OperatorCode[]).map((op) => (
            <button
              key={op}
              type="button"
              className={`operator-card ${operator === op ? "selected" : ""}`}
              onClick={() => setOperator(op)}
            >
              <span>{op === "GP" ? "Grameenphone" : op === "ROBI" ? "Robi" : "Banglalink"}</span>
              <span style={{ fontSize: "0.75rem", color: operator === op ? "var(--ft-green)" : "var(--text-muted)" }}>
                {op}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Amount Input */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <label className="form-label" style={{ margin: 0 }}>
            {activeTab === "CASHOUT" ? "SIM Balance Amount (৳)" : "Recharge Value (৳)"}
          </label>
          <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
            Limits: ৳50 – ৳50,000
          </span>
        </div>
        <div style={{ position: "relative" }}>
          <input
            type="number"
            className="form-input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="50"
            max="50000"
            step="10"
            placeholder="1000"
            style={{ fontSize: "1.25rem", fontWeight: "700", paddingLeft: "36px" }}
          />
          <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", fontWeight: "700", color: "var(--text-muted)", fontSize: "1.125rem" }}>
            ৳
          </span>
        </div>

        {/* Quick Amount Pills */}
        <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
          {quickAmounts.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setAmount(q)}
              style={{
                background: amount === q ? "var(--ft-green-subtle)" : "var(--bg-subtle)",
                border: amount === q ? "1px solid var(--ft-green)" : "1px solid var(--border-light)",
                borderRadius: "var(--radius-sm)",
                padding: "4px 10px",
                fontSize: "0.8125rem",
                fontWeight: "600",
                color: amount === q ? "var(--ft-green-active)" : "var(--text-secondary)",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              ৳{q}
            </button>
          ))}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div style={{
          backgroundColor: "#FEF2F2",
          border: "1px solid #FECACA",
          borderRadius: "var(--radius-sm)",
          padding: "10px 14px",
          color: "#991B1B",
          fontSize: "0.875rem",
          marginBottom: "16px"
        }}>
          {error}
        </div>
      )}

      {/* Server Quote Display Box */}
      <div style={{
        backgroundColor: "var(--bg-main)",
        border: "1.5px dashed var(--border-card)",
        borderRadius: "var(--radius-md)",
        padding: "18px 20px",
        marginBottom: "24px"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <span style={{ fontSize: "0.8125rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Authoritative Server Quote
          </span>
          {loading && <RefreshCw size={14} className="animate-spin" style={{ color: "var(--ft-green)" }} />}
        </div>

        {activeTab === "CASHOUT" && cashoutQuote && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.9375rem" }}>
              <span style={{ color: "var(--text-secondary)" }}>SIM Balance to Transfer:</span>
              <span style={{ fontWeight: "600", color: "var(--text-primary)" }}>৳{cashoutQuote.source_amount_bdt}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", fontSize: "0.9375rem" }}>
              <span style={{ color: "var(--text-secondary)" }}>Platform Fee ({cashoutQuote.platform_fee_rate}%):</span>
              <span style={{ fontWeight: "600", color: "#DC2626" }}>-৳{cashoutQuote.platform_fee_amount_bdt}</span>
            </div>
            <div style={{
              borderTop: "1px solid var(--border-card)",
              paddingTop: "12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline"
            }}>
              <span style={{ fontWeight: "700", fontSize: "1rem", color: "var(--text-primary)" }}>You Receive in Wallet:</span>
              <span style={{ fontWeight: "800", fontSize: "1.5rem", color: "var(--ft-green)" }}>৳{cashoutQuote.payout_amount_bdt}</span>
            </div>
          </div>
        )}

        {activeTab === "RECHARGE" && rechargeQuote && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.9375rem" }}>
              <span style={{ color: "var(--text-secondary)" }}>Airtime Value:</span>
              <span style={{ fontWeight: "600", color: "var(--text-primary)" }}>৳{rechargeQuote.recharge_amount_bdt}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", fontSize: "0.9375rem" }}>
              <span style={{ color: "var(--text-secondary)" }}>Instant Discount ({rechargeQuote.discount_rate}%):</span>
              <span style={{ fontWeight: "600", color: "var(--ft-green)" }}>-৳{rechargeQuote.discount_amount_bdt}</span>
            </div>
            <div style={{
              borderTop: "1px solid var(--border-card)",
              paddingTop: "12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline"
            }}>
              <span style={{ fontWeight: "700", fontSize: "1rem", color: "var(--text-primary)" }}>You Pay:</span>
              <span style={{ fontWeight: "800", fontSize: "1.5rem", color: "var(--ft-green)" }}>৳{rechargeQuote.customer_pay_amount_bdt}</span>
            </div>
          </div>
        )}
      </div>

      {/* CTA Button */}
      {activeTab === "CASHOUT" ? (
        <Link
          href={`/app/cashout?operator=${operator}&amount=${amount}`}
          className="btn btn-primary btn-full btn-lg"
        >
          <span>Cash Out {cashoutQuote ? `৳${cashoutQuote.payout_amount_bdt}` : "Now"}</span>
          <ArrowRight size={18} />
        </Link>
      ) : (
        <Link
          href={`/app/recharge?operator=${operator}&amount=${amount}`}
          className="btn btn-primary btn-full btn-lg"
        >
          <span>Recharge for {rechargeQuote ? `৳${rechargeQuote.customer_pay_amount_bdt}` : "Now"}</span>
          <Zap size={18} />
        </Link>
      )}

      {/* Trust Subtext */}
      <p style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "14px" }}>
        ✓ Zero telecom password required • Verified bKash, Nagad & Bank payouts
      </p>
    </div>
  );
}
