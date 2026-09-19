"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { OperatorCode, PayoutMethod, RechargeOrderCreated, RechargeQuote } from "@/lib/types";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Zap,
} from "lucide-react";

function RechargeWizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Wizard state: 1 = Form & Quote, 2 = Order Placed & Payment Instructions
  const [step, setStep] = useState<1 | 2>(1);

  // Form inputs
  const [operator, setOperator] = useState<OperatorCode>(
    (searchParams.get("operator") as OperatorCode) || "GP"
  );
  const [destPhone, setDestPhone] = useState<string>("");
  const [amount, setAmount] = useState<string>(searchParams.get("amount") || "1000");
  const [paymentMethod, setPaymentMethod] = useState<PayoutMethod>("BKASH");
  const [payerAccount, setPayerAccount] = useState<string>("");
  const [paymentTrxId, setPaymentTrxId] = useState<string>("");

  // Live Server Discount Quote
  const [quote, setQuote] = useState<RechargeQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Order & Payment State
  const [createdOrder, setCreatedOrder] = useState<RechargeOrderCreated | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Fetch live recharge quote from backend
  const updateQuote = async () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num < 50 || num > 50000) {
      setQuoteError("Amount must be between ৳50 and ৳50,000");
      setQuote(null);
      return;
    }
    setQuoteError(null);
    setQuoteLoading(true);
    try {
      const q = await api.getRechargeQuote(operator, amount);
      setQuote(q);
    } catch (err: any) {
      setQuoteError(err.message || "Failed to calculate server discount quote");
      setQuote(null);
    } finally {
      setQuoteLoading(false);
    }
  };

  useEffect(() => {
    updateQuote();
  }, [operator, amount]);

  // Handle Order Creation
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    const cleanedPhone = destPhone.trim();
    if (!cleanedPhone.match(/^(?:\+88|88)?01[3-9]\d{8}$/)) {
      setActionError("Please enter a valid 11-digit Bangladesh mobile number (e.g. 01712345678)");
      return;
    }

    setSubmitting(true);
    try {
      await api.ensureGuestSession();
      const order = await api.createRechargeOrder({
        operator_code: operator,
        recharge_mobile_number: cleanedPhone,
        recharge_amount_bdt: amount,
      });
      setCreatedOrder(order);
      setStep(2);
    } catch (err: any) {
      setActionError(err.message || "Failed to create Recharge order");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Payment Submission
  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdOrder) return;
    if (!paymentTrxId.trim()) {
      setActionError("Please enter the payment transaction ID (TrxID) from your bKash or Nagad payment");
      return;
    }

    setSubmitting(true);
    setActionError(null);
    try {
      await api.submitPayment({
        order_id: createdOrder.order_id,
        method: paymentMethod,
        amount_bdt: createdOrder.customer_pay_amount_bdt,
        payer_reference: payerAccount.trim() || destPhone,
        transaction_reference: paymentTrxId.trim(),
      });

      // Redirect to Order Tracker
      const tokenQuery = createdOrder.tracking_token ? `?token=${encodeURIComponent(createdOrder.tracking_token)}` : "";
      router.push(`/app/order/${createdOrder.order_id}${tokenQuery}`);
    } catch (err: any) {
      setActionError(err.message || "Failed to record payment. Please check your transaction reference.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: "680px", margin: "0 auto" }}>
      {/* Wizard Header */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: "900", color: "var(--text-primary)", marginBottom: "6px" }}>
          Discounted Mobile Recharge
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", margin: 0 }}>
          {step === 1
            ? "Step 1 of 2: Enter recipient number and recharge value."
            : "Step 2 of 2: Complete payment to receive your top-up."}
        </p>
      </div>

      {actionError && (
        <div style={{
          backgroundColor: "#FEF2F2",
          border: "1px solid #FECACA",
          borderRadius: "var(--radius-md)",
          padding: "14px 18px",
          color: "#991B1B",
          fontSize: "0.875rem",
          marginBottom: "20px",
          display: "flex",
          gap: "10px",
          alignItems: "center"
        }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{actionError}</span>
        </div>
      )}

      {/* STEP 1: FORM & QUOTE */}
      {step === 1 && (
        <form onSubmit={handleCreateOrder} className="card" style={{ padding: "32px" }}>
          {/* Operator Selection */}
          <div className="form-group">
            <label className="form-label">1. Select Recipient Network</label>
            <div className="operator-grid" style={{ marginBottom: 0 }}>
              {(["GP", "ROBI", "BANGLALINK"] as OperatorCode[]).map((op) => (
                <button
                  key={op}
                  type="button"
                  className={`operator-card ${operator === op ? "selected" : ""}`}
                  onClick={() => setOperator(op)}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", padding: "12px 8px" }}
                >
                  <img
                    src={op === "GP" ? "/logos/gp.svg" : op === "ROBI" ? "/logos/robi.svg" : "/logos/banglalink.svg"}
                    alt={op}
                    style={{ height: op === "BANGLALINK" ? "16px" : "22px", width: "auto", objectFit: "contain", margin: "2px 0" }}
                  />
                  <span style={{ fontSize: "0.8125rem", fontWeight: "700" }}>{op === "GP" ? "Grameenphone" : op === "ROBI" ? "Robi" : "Banglalink"}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Destination Mobile Number */}
          <div className="form-group">
            <label className="form-label">2. Destination Mobile Number</label>
            <input
              type="tel"
              className="form-input"
              placeholder="e.g. 01712345678"
              value={destPhone}
              onChange={(e) => setDestPhone(e.target.value)}
              required
            />
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
              The 11-digit phone number that will receive the airtime top-up.
            </span>
          </div>

          {/* Recharge Value */}
          <div className="form-group">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <label className="form-label" style={{ margin: 0 }}>3. Airtime Recharge Value (৳)</label>
              <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>Bounds: ৳50 – ৳50,000</span>
            </div>
            <div style={{ position: "relative" }}>
              <input
                type="number"
                className="form-input"
                min="50"
                max="50000"
                step="10"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                style={{ fontSize: "1.125rem", fontWeight: "700", paddingLeft: "36px" }}
              />
              <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", fontWeight: "700", color: "var(--text-muted)" }}>
                ৳
              </span>
            </div>
          </div>

          {/* Real-Time Server Discount Quote Box */}
          <div style={{
            backgroundColor: "var(--bg-main)",
            border: "1.5px dashed var(--border-card)",
            borderRadius: "var(--radius-md)",
            padding: "20px",
            marginBottom: "28px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ fontSize: "0.8125rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase" }}>
                Server Discount Calculation
              </span>
              {quoteLoading && <RefreshCw size={14} className="animate-spin" style={{ color: "var(--ft-green)" }} />}
            </div>

            {quoteError && (
              <div style={{ color: "#991B1B", fontSize: "0.875rem" }}>{quoteError}</div>
            )}

            {quote && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.9375rem" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Airtime Value to be Delivered:</span>
                  <span style={{ fontWeight: "600" }}>৳{quote.recharge_amount_bdt}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", fontSize: "0.9375rem" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Guaranteed Discount ({quote.discount_rate}%):</span>
                  <span style={{ fontWeight: "600", color: "var(--ft-green)" }}>-৳{quote.discount_amount_bdt}</span>
                </div>
                <div style={{
                  borderTop: "1px solid var(--border-card)",
                  paddingTop: "12px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline"
                }}>
                  <span style={{ fontWeight: "800", fontSize: "1rem" }}>Total You Pay:</span>
                  <span style={{ fontWeight: "900", fontSize: "1.5rem", color: "var(--ft-green)" }}>৳{quote.customer_pay_amount_bdt}</span>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-secondary btn-full btn-lg"
            disabled={submitting || quoteLoading || !quote}
          >
            {submitting ? (
              <span>Preparing Recharge Order...</span>
            ) : (
              <>
                <span>Proceed to Payment (Pay ৳{quote ? quote.customer_pay_amount_bdt : "..."})</span>
                <Zap size={18} />
              </>
            )}
          </button>
        </form>
      )}

      {/* STEP 2: PAYMENT INSTRUCTIONS & TRXID */}
      {step === 2 && createdOrder && (
        <form onSubmit={handleConfirmPayment} className="card" style={{ padding: "32px" }}>
          {/* Order Banner */}
          <div style={{
            backgroundColor: "var(--ft-yellow-subtle)",
            border: "1px solid #FEF08A",
            borderRadius: "var(--radius-md)",
            padding: "16px 20px",
            marginBottom: "28px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#B45309", textTransform: "uppercase" }}>
                Recharge Order Placed
              </div>
              <div style={{ fontSize: "1.25rem", fontWeight: "800", color: "var(--text-primary)" }}>
                {createdOrder.order_id}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Payable Amount</div>
              <div style={{ fontSize: "1.25rem", fontWeight: "800", color: "var(--ft-green)" }}>
                ৳{createdOrder.customer_pay_amount_bdt}
              </div>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="form-group">
            <label className="form-label">Select Payment Wallet</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
              <button
                type="button"
                className={`operator-card ${paymentMethod === "BKASH" ? "selected" : ""}`}
                onClick={() => setPaymentMethod("BKASH")}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", padding: "14px" }}
              >
                <img src="/logos/bkash.svg" alt="bKash" style={{ height: "26px", width: "auto", objectFit: "contain" }} />
                <span style={{ fontSize: "0.875rem", fontWeight: "700" }}>bKash Payment</span>
              </button>
              <button
                type="button"
                className={`operator-card ${paymentMethod === "NAGAD" ? "selected" : ""}`}
                onClick={() => setPaymentMethod("NAGAD")}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", padding: "14px" }}
              >
                <img src="/logos/nagad.svg" alt="Nagad" style={{ height: "24px", width: "auto", objectFit: "contain" }} />
                <span style={{ fontSize: "0.875rem", fontWeight: "700" }}>Nagad Payment</span>
              </button>
            </div>
          </div>

          {/* FlexiTaka Payment Instructions Box */}
          <div style={{
            backgroundColor: "var(--bg-main)",
            border: "2px solid var(--border-card)",
            borderRadius: "var(--radius-md)",
            padding: "24px",
            marginBottom: "28px",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "0.8125rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "6px" }}>
              Send ৳{createdOrder.customer_pay_amount_bdt} To FlexiTaka Official Number
            </div>
            <div style={{
              fontSize: "1.75rem",
              fontWeight: "900",
              color: "var(--text-primary)",
              letterSpacing: "0.05em",
              marginBottom: "6px"
            }}>
              01711-000002
            </div>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", margin: 0 }}>
              Use your bKash or Nagad App to 'Send Money' or 'Make Payment' for <strong>৳{createdOrder.customer_pay_amount_bdt}</strong>.
            </p>
          </div>

          {/* Payer Account & TrxID Inputs */}
          <div className="form-group">
            <label className="form-label">Your Wallet Mobile Number</label>
            <input
              type="tel"
              className="form-input"
              placeholder="e.g. 01812345678"
              value={payerAccount}
              onChange={(e) => setPayerAccount(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Payment Transaction ID (TrxID) *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. 9H3K2L91OP"
              value={paymentTrxId}
              onChange={(e) => setPaymentTrxId(e.target.value)}
              required
            />
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
              Copy the transaction ID from your bKash or Nagad confirmation SMS.
            </span>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "12px", marginTop: "32px" }}>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn btn-outline"
              style={{ flex: 1 }}
              disabled={submitting}
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 2 }}
              disabled={submitting || !paymentTrxId.trim()}
            >
              {submitting ? (
                <span>Verifying Payment...</span>
              ) : (
                <>
                  <span>Submit Payment for Top-Up</span>
                  <CheckCircle2 size={18} />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function RechargeWizardPage() {
  return (
    <React.Suspense fallback={
      <div className="container text-center" style={{ padding: "60px 20px" }}>
        <img
          src="/images/flexitaka-logo.png"
          alt="FlexiTaka"
          style={{ height: "40px", width: "auto", margin: "0 auto 16px auto", display: "block" }}
        />
        <div style={{ color: "var(--text-secondary)", fontSize: "0.9375rem" }}>Loading Recharge Gateway...</div>
      </div>
    }>
      <RechargeWizardContent />
    </React.Suspense>
  );
}
