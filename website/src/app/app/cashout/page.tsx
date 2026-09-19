"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { CashOutOrderCreated, CashOutQuote, OperatorCode, PayoutMethod } from "@/lib/types";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Lock,
  RefreshCw,
  ShieldCheck,
  Upload,
} from "lucide-react";

function CashOutWizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Wizard state: 1 = Form & Quote, 2 = Order Placed & USSD Instructions, 3 = Completed
  const [step, setStep] = useState<1 | 2>(1);

  // Form inputs
  const [operator, setOperator] = useState<OperatorCode>(
    (searchParams.get("operator") as OperatorCode) || "GP"
  );
  const [sourcePhone, setSourcePhone] = useState<string>("");
  const [amount, setAmount] = useState<string>(searchParams.get("amount") || "1000");
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>("BKASH");
  const [payoutAccount, setPayoutAccount] = useState<string>("");

  // Live Server Quote
  const [quote, setQuote] = useState<CashOutQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Order & Verification State
  const [createdOrder, setCreatedOrder] = useState<CashOutOrderCreated | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [trxReference, setTrxReference] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Fetch live quote from backend
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
      const q = await api.getCashOutQuote(operator, amount);
      setQuote(q);
    } catch (err: any) {
      setQuoteError(err.message || "Failed to calculate server quote");
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

    // Basic BD Phone validation
    const cleanedPhone = sourcePhone.trim();
    if (!cleanedPhone.match(/^(?:\+88|88)?01[3-9]\d{8}$/)) {
      setActionError("Please enter a valid 11-digit Bangladesh mobile number (e.g. 01712345678)");
      return;
    }

    if (!payoutAccount.trim()) {
      setActionError("Please enter your payout account number (bKash/Nagad/Bank)");
      return;
    }

    setSubmitting(true);
    try {
      await api.ensureGuestSession();
      const order = await api.createCashOutOrder({
        operator_code: operator,
        source_mobile_number: cleanedPhone,
        amount_bdt: amount,
        payout_method: payoutMethod,
        payout_account: payoutAccount.trim(),
      });
      setCreatedOrder(order);
      setStep(2);
    } catch (err: any) {
      setActionError(err.message || "Failed to create Cash Out order");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Confirmation of USSD Transfer and Proof Upload
  const handleConfirmTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdOrder) return;
    if (!trxReference.trim()) {
      setActionError("Please provide the transaction reference ID from your telecom transfer SMS");
      return;
    }

    setSubmitting(true);
    setActionError(null);
    try {
      // 1. Upload proof file if provided
      if (proofFile) {
        await api.uploadTransferProof(createdOrder.order_id, proofFile);
      }

      // 2. Confirm transfer reference
      await api.confirmCashOutTransfer(createdOrder.order_id, trxReference.trim());

      // Redirect to Order Detail Tracker
      const tokenQuery = createdOrder.tracking_token ? `?token=${encodeURIComponent(createdOrder.tracking_token)}` : "";
      router.push(`/app/order/${createdOrder.order_id}${tokenQuery}`);
    } catch (err: any) {
      setActionError(err.message || "Failed to confirm transfer. Please verify your reference.");
    } finally {
      setSubmitting(false);
    }
  };

  const getUSSDInstructions = () => {
    switch (operator) {
      case "GP":
        return {
          code: "*121*1500#",
          app: "MyGP App → Menu → Balance Transfer",
          notes: "Follow on-screen USSD prompts, enter the assigned number, amount, and your GP PIN.",
        };
      case "ROBI":
        return {
          code: "*123*4#",
          app: "MyRobi App → Balance Transfer",
          notes: "Dial code, select Balance Transfer, input assigned number and amount.",
        };
      case "BANGLALINK":
        return {
          code: "*1000#",
          app: "MyBL App → Balance Transfer",
          notes: "Dial code or navigate via MyBL App to send balance to the assigned number.",
        };
    }
  };

  return (
    <div style={{ maxWidth: "680px", margin: "0 auto" }}>
      {/* Wizard Header */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: "900", color: "var(--text-primary)", marginBottom: "6px" }}>
          Cash Out SIM Balance
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", margin: 0 }}>
          {step === 1
            ? "Step 1 of 2: Enter transfer amount and your payout destination."
            : "Step 2 of 2: Complete the balance transfer using official operator instructions."}
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
            <label className="form-label">1. Select Telecom Network</label>
            <div className="operator-grid" style={{ marginBottom: 0 }}>
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

          {/* Source Mobile Number */}
          <div className="form-group">
            <label className="form-label">2. Your SIM Mobile Number</label>
            <input
              type="tel"
              className="form-input"
              placeholder="e.g. 01712345678"
              value={sourcePhone}
              onChange={(e) => setSourcePhone(e.target.value)}
              required
            />
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
              The 11-digit phone number holding the balance.
            </span>
          </div>

          {/* Balance Amount */}
          <div className="form-group">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <label className="form-label" style={{ margin: 0 }}>3. SIM Balance Amount to Cash Out (৳)</label>
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

          {/* Real-Time Server Quote Box */}
          <div style={{
            backgroundColor: "var(--bg-main)",
            border: "1.5px dashed var(--border-card)",
            borderRadius: "var(--radius-md)",
            padding: "20px",
            marginBottom: "24px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ fontSize: "0.8125rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase" }}>
                Server Pricing Calculation
              </span>
              {quoteLoading && <RefreshCw size={14} className="animate-spin" style={{ color: "var(--ft-green)" }} />}
            </div>

            {quoteError && (
              <div style={{ color: "#991B1B", fontSize: "0.875rem" }}>{quoteError}</div>
            )}

            {quote && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.9375rem" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Balance to Transfer:</span>
                  <span style={{ fontWeight: "600" }}>৳{quote.source_amount_bdt}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", fontSize: "0.9375rem" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Platform Fee ({quote.platform_fee_rate}%):</span>
                  <span style={{ fontWeight: "600", color: "#DC2626" }}>-৳{quote.platform_fee_amount_bdt}</span>
                </div>
                <div style={{
                  borderTop: "1px solid var(--border-card)",
                  paddingTop: "12px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline"
                }}>
                  <span style={{ fontWeight: "800", fontSize: "1rem" }}>Net Payout to You:</span>
                  <span style={{ fontWeight: "900", fontSize: "1.5rem", color: "var(--ft-green)" }}>৳{quote.payout_amount_bdt}</span>
                </div>
              </div>
            )}
          </div>

          {/* Payout Destination */}
          <div className="form-group">
            <label className="form-label">4. Select Payout Method</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "12px" }}>
              {(["BKASH", "NAGAD", "BANK"] as PayoutMethod[]).map((method) => (
                <button
                  key={method}
                  type="button"
                  className={`operator-card ${payoutMethod === method ? "selected" : ""}`}
                  onClick={() => setPayoutMethod(method)}
                  style={{ padding: "12px 8px" }}
                >
                  <span>{method === "BKASH" ? "bKash" : method === "NAGAD" ? "Nagad" : "Bank"}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">5. Payout Account Number</label>
            <input
              type="text"
              className="form-input"
              placeholder={payoutMethod === "BANK" ? "Bank Name, Branch, Account Number, Routing" : "e.g. 019XXXXXXXX (Personal Wallet)"}
              value={payoutAccount}
              onChange={(e) => setPayoutAccount(e.target.value)}
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={submitting || quoteLoading || !quote}
          >
            {submitting ? (
              <span>Assigning Receiving SIM...</span>
            ) : (
              <>
                <span>Continue to Transfer (৳{quote ? quote.payout_amount_bdt : "..."} Payout)</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      )}

      {/* STEP 2: USSD INSTRUCTIONS & PROOF CONFIRMATION */}
      {step === 2 && createdOrder && (
        <form onSubmit={handleConfirmTransfer} className="card" style={{ padding: "32px" }}>
          {/* Order Banner */}
          <div style={{
            backgroundColor: "var(--ft-green-subtle)",
            border: "1px solid #BBF7D0",
            borderRadius: "var(--radius-md)",
            padding: "16px 20px",
            marginBottom: "28px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#166534", textTransform: "uppercase" }}>
                Order Created
              </div>
              <div style={{ fontSize: "1.25rem", fontWeight: "800", color: "var(--text-primary)" }}>
                {createdOrder.order_id}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Payout Promised</div>
              <div style={{ fontSize: "1.125rem", fontWeight: "800", color: "var(--ft-green)" }}>
                ৳{createdOrder.payout_amount_bdt}
              </div>
            </div>
          </div>

          {/* Assigned Receiving SIM Box */}
          <div style={{
            backgroundColor: "#FFFFFF",
            border: "2px solid var(--ft-green)",
            borderRadius: "var(--radius-md)",
            padding: "24px",
            marginBottom: "28px",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "0.8125rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "6px" }}>
              Send Balance To This Official FlexiTaka SIM
            </div>
            <div style={{
              fontSize: "1.875rem",
              fontWeight: "900",
              color: "var(--text-primary)",
              letterSpacing: "0.05em",
              marginBottom: "8px"
            }}>
              {createdOrder.receiving_mobile_number}
            </div>
            <div style={{ fontSize: "0.875rem", color: "var(--ft-green-active)", fontWeight: "600" }}>
              {createdOrder.receiving_sim_label}
            </div>
          </div>

          {/* Official Telecom Instructions */}
          <div style={{ marginBottom: "28px" }}>
            <h3 style={{ fontSize: "1.0625rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "12px" }}>
              How to Transfer on {operator === "GP" ? "Grameenphone" : operator === "ROBI" ? "Robi" : "Banglalink"}:
            </h3>
            <div style={{
              backgroundColor: "var(--bg-main)",
              border: "1px solid var(--border-card)",
              borderRadius: "var(--radius-md)",
              padding: "16px 20px",
              fontSize: "0.875rem",
              lineHeight: 1.6
            }}>
              <p style={{ marginBottom: "8px" }}>
                <strong>Option A (USSD Code):</strong> Dial <span style={{ background: "#E2E8F0", padding: "2px 6px", borderRadius: "4px", fontWeight: "700" }}>{getUSSDInstructions().code}</span> from your SIM card.
              </p>
              <p style={{ marginBottom: "8px" }}>
                <strong>Option B (Official App):</strong> Use {getUSSDInstructions().app}.
              </p>
              <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.8125rem" }}>
                {getUSSDInstructions().notes}
              </p>
            </div>
          </div>

          {/* Zero Credential Warning */}
          <div style={{
            display: "flex",
            gap: "12px",
            backgroundColor: "#FEFCE8",
            border: "1px solid #FEF08A",
            borderRadius: "var(--radius-sm)",
            padding: "12px 16px",
            fontSize: "0.8125rem",
            color: "#854D0E",
            marginBottom: "28px"
          }}>
            <Lock size={18} style={{ flexShrink: 0, marginTop: "1px" }} />
            <span>
              <strong>Security Rule:</strong> Do NOT share your SIM PIN with anyone. FlexiTaka will NEVER ask for your SIM PIN or password.
            </span>
          </div>

          {/* Confirmation Form Inputs */}
          <div className="form-group">
            <label className="form-label">
              Telecom Confirmation SMS Transaction ID (TrxID) *
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. TRX12345678 or SMS Reference"
              value={trxReference}
              onChange={(e) => setTrxReference(e.target.value)}
              required
            />
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
              Copy the transaction reference from the operator confirmation SMS you received.
            </span>
          </div>

          {/* Screenshot Upload (Optional) */}
          <div className="form-group">
            <label className="form-label">
              Upload Transfer Screenshot (Optional, Accelerates Verification)
            </label>
            <div style={{
              border: "1.5px dashed var(--border-card)",
              borderRadius: "var(--radius-md)",
              padding: "18px",
              textAlign: "center",
              cursor: "pointer",
              backgroundColor: "var(--bg-main)"
            }}>
              <input
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={(e) => setProofFile(e.target.files ? e.target.files[0] : null)}
                style={{ display: "none" }}
                id="proof-upload-input"
              />
              <label htmlFor="proof-upload-input" style={{ cursor: "pointer", display: "block" }}>
                <Upload size={24} color="var(--text-muted)" style={{ margin: "0 auto 8px auto" }} />
                <span style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--ft-green)" }}>
                  {proofFile ? proofFile.name : "Click to select screenshot (PNG/JPEG)"}
                </span>
                <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                  Stored in private VPS storage, never publicly indexed
                </span>
              </label>
            </div>
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
              disabled={submitting || !trxReference.trim()}
            >
              {submitting ? (
                <span>Submitting for Verification...</span>
              ) : (
                <>
                  <span>Confirm & Submit for Verification</span>
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

export default function CashOutWizardPage() {
  return (
    <React.Suspense fallback={<div className="container" style={{ padding: "40px", textAlign: "center" }}>Loading Cash Out...</div>}>
      <CashOutWizardContent />
    </React.Suspense>
  );
}
