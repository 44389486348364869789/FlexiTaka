"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { CashOutQuote, RechargeQuote } from "@/lib/types";
import Calculator from "@/components/Calculator";
import { ArrowRight, CheckCircle2, RefreshCw, ShieldCheck, Zap } from "lucide-react";

export default function PricingPage() {
  const [cashoutSamples, setCashoutSamples] = useState<CashOutQuote[]>([]);
  const [rechargeSamples, setRechargeSamples] = useState<RechargeQuote[]>([]);
  const [loading, setLoading] = useState(true);

  const sampleAmounts = ["100", "500", "1000", "5000"];

  useEffect(() => {
    async function loadQuotes() {
      setLoading(true);
      try {
        const coPromises = sampleAmounts.map((amt) => api.getCashOutQuote("GP", amt));
        const recPromises = sampleAmounts.map((amt) => api.getRechargeQuote("GP", amt));
        
        const [coResults, recResults] = await Promise.all([
          Promise.all(coPromises),
          Promise.all(recPromises),
        ]);

        setCashoutSamples(coResults);
        setRechargeSamples(recResults);
      } catch (err) {
        console.error("Failed to fetch live quotes from backend", err);
      } finally {
        setLoading(false);
      }
    }
    loadQuotes();
  }, []);

  return (
    <div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh", paddingBottom: "80px" }}>
      {/* Page Header */}
      <div style={{ backgroundColor: "#FFFFFF", borderBottom: "1px solid var(--border-light)", padding: "48px 0" }}>
        <div className="container text-center">
          <h1 style={{ fontSize: "2.5rem", fontWeight: "900", color: "var(--text-primary)", marginBottom: "12px" }}>
            Transparent, Live Pricing
          </h1>
          <p style={{ fontSize: "1.0625rem", color: "var(--text-secondary)", maxWidth: "680px", margin: "0 auto", lineHeight: 1.6 }}>
            All fees, discounts, and payouts are authoritative, calculated in real-time by the FlexiTaka backend via <code style={{ background: "var(--bg-subtle)", padding: "2px 6px", borderRadius: "4px", fontSize: "0.875rem" }}>POST /api/v1/pricing/cashout-quote</code> and <code style={{ background: "var(--bg-subtle)", padding: "2px 6px", borderRadius: "4px", fontSize: "0.875rem" }}>POST /api/v1/pricing/recharge-quote</code>. What you see is exactly what you get.
          </p>
        </div>
      </div>

      <div className="container" style={{ paddingTop: "48px" }}>
        {/* Bounds & Guarantees Banner */}
        <div style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid var(--border-card)",
          borderRadius: "var(--radius-lg)",
          padding: "24px 32px",
          marginBottom: "40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "20px"
        }}>
          <div>
            <div style={{ fontSize: "0.8125rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Official Transaction Bounds
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: "800", color: "var(--text-primary)", marginTop: "4px" }}>
              ৳50.00 Minimum — ৳50,000.00 Maximum
            </div>
          </div>
          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.875rem", fontWeight: "600", color: "var(--text-secondary)" }}>
              <ShieldCheck size={18} color="var(--ft-green)" />
              <span>No Hidden Charges</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.875rem", fontWeight: "600", color: "var(--text-secondary)" }}>
              <CheckCircle2 size={18} color="var(--ft-green)" />
              <span>Zero Payout Fees</span>
            </div>
          </div>
        </div>

        {/* Live Quotes Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", marginBottom: "48px" }} className="pricing-grid">
          {/* Cash Out Pricing Table */}
          <div className="card" style={{ padding: "32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <span className="badge badge-approved">Cash Out Service</span>
              {loading && <RefreshCw size={14} className="animate-spin" style={{ color: "var(--ft-green)" }} />}
            </div>
            <h3 style={{ fontSize: "1.375rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "8px" }}>
              SIM Balance Payout Schedule
            </h3>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "24px" }}>
              Live server quotes showing transfer amount, platform fee deduction, and net wallet cash deposited.
            </p>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9375rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--border-card)", textAlign: "left" }}>
                    <th style={{ padding: "10px 8px", color: "var(--text-muted)", fontWeight: "700" }}>Transfer</th>
                    <th style={{ padding: "10px 8px", color: "var(--text-muted)", fontWeight: "700" }}>Platform Fee</th>
                    <th style={{ padding: "10px 8px", color: "var(--ft-green)", fontWeight: "800", textAlign: "right" }}>You Receive</th>
                  </tr>
                </thead>
                <tbody>
                  {cashoutSamples.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid var(--border-light)" }}>
                      <td style={{ padding: "12px 8px", fontWeight: "600" }}>৳{item.source_amount_bdt}</td>
                      <td style={{ padding: "12px 8px", color: "#DC2626" }}>
                        -৳{item.platform_fee_amount_bdt} ({item.platform_fee_rate}%)
                      </td>
                      <td style={{ padding: "12px 8px", fontWeight: "800", color: "var(--ft-green)", textAlign: "right" }}>
                        ৳{item.payout_amount_bdt}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: "24px" }}>
              <Link href="/app/cashout" className="btn btn-primary btn-full">
                <span>Start Cash Out</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          {/* Recharge Pricing Table */}
          <div className="card" style={{ padding: "32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <span className="badge badge-pending">Recharge Service</span>
              {loading && <RefreshCw size={14} className="animate-spin" style={{ color: "var(--ft-green)" }} />}
            </div>
            <h3 style={{ fontSize: "1.375rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "8px" }}>
              Discounted Airtime Schedule
            </h3>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "24px" }}>
              Live server quotes showing recharge value, your instant discount, and the discounted payment due.
            </p>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9375rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--border-card)", textAlign: "left" }}>
                    <th style={{ padding: "10px 8px", color: "var(--text-muted)", fontWeight: "700" }}>Airtime</th>
                    <th style={{ padding: "10px 8px", color: "var(--text-muted)", fontWeight: "700" }}>You Save</th>
                    <th style={{ padding: "10px 8px", color: "var(--ft-green)", fontWeight: "800", textAlign: "right" }}>You Pay</th>
                  </tr>
                </thead>
                <tbody>
                  {rechargeSamples.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid var(--border-light)" }}>
                      <td style={{ padding: "12px 8px", fontWeight: "600" }}>৳{item.recharge_amount_bdt}</td>
                      <td style={{ padding: "12px 8px", color: "var(--ft-green)", fontWeight: "600" }}>
                        -৳{item.discount_amount_bdt} ({item.discount_rate}%)
                      </td>
                      <td style={{ padding: "12px 8px", fontWeight: "800", color: "var(--text-primary)", textAlign: "right" }}>
                        ৳{item.customer_pay_amount_bdt}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: "24px" }}>
              <Link href="/app/recharge" className="btn btn-secondary btn-full">
                <span>Start Recharge</span>
                <Zap size={16} />
              </Link>
            </div>
          </div>
        </div>

        {/* Custom Calculator Test */}
        <div style={{ marginTop: "32px", textAlign: "center" }}>
          <h3 style={{ fontSize: "1.5rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "8px" }}>
            Test Any Custom Amount
          </h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>
            Use our interactive quote calculator below to test any amount between ৳50 and ৳50,000 in real-time.
          </p>
          <Calculator />
        </div>
      </div>
    </div>
  );
}
