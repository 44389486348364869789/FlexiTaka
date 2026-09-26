"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, detectOperatorFromPhone, getStoredAuthToken, isTerminalStatus, normalizeBdPhone11 } from "@/lib/api";
import { LinkedSim, OperatorCode, PaymentAccount, PayoutMethod, RechargeOrderCreated, RechargeQuote } from "@/lib/types";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  RefreshCw,
  Smartphone,
} from "lucide-react";
import OperatorSelector from "@/components/OperatorSelector";
import LiveQuoteCard from "@/components/LiveQuoteCard";
import StepIndicator from "@/components/StepIndicator";
import TrustNote from "@/components/TrustNote";
import WalletSelector from "@/components/WalletSelector";
import { formatBDT, formatApiErrorMessage } from "@/lib/formatters";
import { useLanguage } from "@/i18n/LanguageContext";

function RechargeWizardContent() {
  const { lang, tr, toBnDigits } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Wizard state: 1 = Form & Quote, 2 = Order Placed & Payment Instructions
  const [step, setStep] = useState<1 | 2>(1);

  // Form inputs
  const initialOp = searchParams.get("operator") as OperatorCode | null;
  const [operator, setOperator] = useState<OperatorCode | "">(
    initialOp && ["GP", "ROBI", "BANGLALINK"].includes(initialOp) ? initialOp : ""
  );
  const [destPhone, setDestPhone] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("BKASH");
  const [payerAccount, setPayerAccount] = useState<string>("");
  const [paymentTrxId, setPaymentTrxId] = useState<string>("");

  // Saved Linked SIMs State
  const [linkedSims, setLinkedSims] = useState<LinkedSim[]>([]);
  const [selectedSimId, setSelectedSimId] = useState<string | null>(null);

  // Live Server Discount Quote
  const [quote, setQuote] = useState<RechargeQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Authoritative DB Payment Accounts (bKash, Nagad, Rocket, Bangla QR)
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);

  // Order state
  const [createdOrder, setCreatedOrder] = useState<RechargeOrderCreated | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Input refs for smooth progressive focus
  const phoneRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  // Validation helpers
  const isOperatorSelected = Boolean(operator);
  const cleanedPhone = normalizeBdPhone11(destPhone);
  const isPhoneValid = Boolean(cleanedPhone.match(/^01[3-9]\d{8}$/));

  const detectedOp = detectOperatorFromPhone(cleanedPhone);
  const isOperatorMismatch = Boolean(operator && detectedOp && operator !== detectedOp);

  const numAmount = parseFloat(amount);
  const isAmountValid = !isNaN(numAmount) && numAmount >= 10 && numAmount <= 50000;

  // Fetch Authoritative Payment Accounts from DB on load
  useEffect(() => {
    api.getPaymentAccounts()
      .then((accounts) => {
        if (accounts && accounts.length > 0) {
          setPaymentAccounts(accounts);
        }
      })
      .catch(() => {});
  }, []);

  // Compute current step for the top step indicator: 1 Operator -> 2 Number -> 3 Amount -> 4 Review
  let currentStep: 1 | 2 | 3 | 4 = 1;
  if (!isOperatorSelected) {
    currentStep = 1;
  } else if (!isPhoneValid) {
    currentStep = 2;
  } else if (!isAmountValid) {
    currentStep = 3;
  } else {
    currentStep = 4;
  }

  // Fetch Authoritative Linked SIMs for logged-in user
  useEffect(() => {
    const token = getStoredAuthToken();
    if (token) {
      api.getLinkedSims()
        .then((sims) => {
          if (Array.isArray(sims)) {
            setLinkedSims(sims);
          }
        })
        .catch(() => {});
    }
  }, []);

  const verifiedSims = linkedSims.filter((s) => s.status === "VERIFIED");

  const handleSelectLinkedSim = (sim: LinkedSim) => {
    setSelectedSimId(sim.sim_id);
    setDestPhone(sim.phone);
    setOperator(sim.operator_code as OperatorCode);
    setActionError(null);
    amountRef.current?.focus();
  };

  const handleClearSelectedSim = () => {
    setSelectedSimId(null);
    setDestPhone("");
    phoneRef.current?.focus();
  };

  // Smooth auto-focus when next step reveals
  useEffect(() => {
    if (isOperatorSelected && !destPhone) {
      phoneRef.current?.focus();
    }
  }, [isOperatorSelected]);

  useEffect(() => {
    if (isPhoneValid && !amount) {
      amountRef.current?.focus();
    }
  }, [isPhoneValid]);

  // Fetch live recharge quote from backend strictly when inputs are valid
  const updateQuote = async () => {
    if (!operator || !isAmountValid || isOperatorMismatch) {
      setQuote(null);
      setQuoteLoading(false);
      setQuoteError(null);
      return;
    }

    setQuoteError(null);
    setQuoteLoading(true);
    try {
      const q = await api.getRechargeQuote(operator as OperatorCode, amount, cleanedPhone);
      setQuote(q);
    } catch {
      // Fallback discount calculation if offline
      const discount = numAmount * 0.05;
      setQuote({
        operator_code: operator as OperatorCode,
        recharge_amount_bdt: numAmount.toFixed(2),
        recharge_amount_poisha: Math.round(numAmount * 100),
        discount_rate: "5.0",
        discount_amount_bdt: discount.toFixed(2),
        discount_amount_poisha: Math.round(discount * 100),
        customer_pay_amount_bdt: (numAmount - discount).toFixed(2),
        customer_pay_amount_poisha: Math.round((numAmount - discount) * 100),
        currency: "BDT",
        pricing_rule_version: 1,
      });
    } finally {
      setQuoteLoading(false);
    }
  };

  useEffect(() => {
    if (operator && isAmountValid && !isOperatorMismatch) {
      updateQuote();
    } else {
      setQuote(null);
      setQuoteLoading(false);
      if (amount.trim() !== "" && !isAmountValid) {
        setQuoteError(lang === "bn" ? "পরিমাণ অবশ্যই ৳১০ থেকে ৳৫০,০০০ এর মধ্যে হতে হবে" : "Amount must be between ৳10 and ৳50,000");
      } else {
        setQuoteError(null);
      }
    }
  }, [operator, amount, isAmountValid, lang, isOperatorMismatch]);

  // Direct Order Creation - Zero OTP gate for Recharge airtime top-up
  const executeOrderCreation = async () => {
    setSubmitting(true);
    try {
      await api.ensureGuestSession();
      const order = await api.createRechargeOrder({
        operator_code: operator as OperatorCode,
        recharge_mobile_number: cleanedPhone,
        recharge_amount_bdt: amount,
      });
      setCreatedOrder(order);
      setStep(2);
    } catch (err: any) {
      setActionError(formatApiErrorMessage(err, lang));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    if (!operator) {
      setActionError(lang === "bn" ? "অনুগ্রহ করে একটি অপারেটর নির্বাচন করুন" : "Please select a telecom operator");
      return;
    }

    if (!isPhoneValid) {
      setActionError(lang === "bn" ? "সঠিক ১১-সংখ্যার বাংলাদেশী মোবাইল নম্বর দিন (যেমন ০১XXXXXXXXX)" : "Please enter a valid 11-digit Bangladesh mobile number (e.g. 01712345678)");
      return;
    }

    if (isOperatorMismatch) {
      setActionError(
        lang === "bn"
          ? "নির্বাচিত অপারেটর এই মোবাইল নম্বরের সাথে মিলছে না।"
          : "The selected operator does not match this mobile number."
      );
      return;
    }

    if (!isAmountValid) {
      setActionError(lang === "bn" ? "পরিমাণ অবশ্যই ৳১০ থেকে ৳৫০,০০০ এর মধ্যে হতে হবে" : "Amount must be between ৳10 and ৳50,000");
      return;
    }

    // Direct automated order creation
    await executeOrderCreation();
  };


  // Live Order & Automated Transfer State
  const [orderDetail, setOrderDetail] = useState<any>(null);
  const [transferProgress, setTransferProgress] = useState<any>(null);
  const [copiedNum, setCopiedNum] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [showManualTrx, setShowManualTrx] = useState(false);

  // Poll order status & live recharge transfer progress in Step 2 with terminal stopping
  useEffect(() => {
    if (step !== 2 || !createdOrder) return;

    let isMounted = true;
    let pollInterval: any = null;

    const poll = async () => {
      try {
        const orderData = await api.getOrder(createdOrder.order_id, createdOrder.tracking_token);
        if (isMounted && orderData) {
          setOrderDetail(orderData);
          if (["PAYMENT_VERIFIED", "RECHARGE_PROCESSING", "COMPLETED", "WAITING_FOR_COOLDOWN", "WAITING_FOR_SIM", "TRANSFER_FAILED", "FAILED"].includes(orderData.status)) {
            const prog = await api.getRechargeTransferProgress(createdOrder.order_id);
            if (isMounted && prog) {
              setTransferProgress(prog);
              if (prog.is_failed || prog.is_completed || isTerminalStatus(prog.status)) {
                if (pollInterval) clearInterval(pollInterval);
              }
            }
          }
          if (isTerminalStatus(orderData.status)) {
            if (pollInterval) clearInterval(pollInterval);
          }
        }
      } catch {
        // silent polling error
      }
    };

    poll();
    pollInterval = setInterval(poll, 3000);

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [step, createdOrder]);

  const handleCopy = (text: string, type: "num" | "ref") => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      if (type === "num") {
        setCopiedNum(true);
        setTimeout(() => setCopiedNum(false), 2000);
      } else {
        setCopiedRef(true);
        setTimeout(() => setCopiedRef(false), 2000);
      }
    }
  };

  // Handle Manual Payment Submission Fallback
  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdOrder) return;
    if (!paymentTrxId.trim()) {
      setActionError(lang === "bn" ? "আপনার bKash বা Nagad পেমেন্ট থেকে প্রাপ্ত ট্রানজ্যাকশন আইডি (TrxID) দিন" : "Please enter the payment transaction ID (TrxID) from your bKash or Nagad payment");
      return;
    }

    setSubmitting(true);
    setActionError(null);
    try {
      const backendMethod: PayoutMethod =
        paymentMethod === "ROCKET" || paymentMethod === "BANGLA_QR" ? "BANK" : (paymentMethod as PayoutMethod);

      await api.submitPayment({
        order_id: createdOrder.order_id,
        method: backendMethod,
        amount_bdt: createdOrder.customer_pay_amount_bdt,
        payer_reference: `${paymentMethod === "ROCKET" ? "[Rocket] " : paymentMethod === "BANGLA_QR" ? "[Bangla QR] " : ""}${payerAccount.trim() || destPhone}`,
        transaction_reference: paymentTrxId.trim(),
      });

      const tokenQuery = createdOrder.tracking_token ? `?token=${encodeURIComponent(createdOrder.tracking_token)}` : "";
      router.push(`/app/order/${createdOrder.order_id}${tokenQuery}`);
    } catch (err: any) {
      setActionError(formatApiErrorMessage(err, lang));
    } finally {
      setSubmitting(false);
    }
  };

  const tRecharge = tr.app.rechargeWizard;
  const currentOrderStatus = orderDetail?.status || createdOrder?.status || "PAYMENT_PENDING";
  const isFailed = currentOrderStatus === "FAILED" || currentOrderStatus === "TRANSFER_FAILED" || currentOrderStatus === "RECHARGE_FAILED" || Boolean(transferProgress?.is_failed);
  const isWaitingForSim = currentOrderStatus === "WAITING_FOR_SIM" || Boolean(transferProgress?.is_waiting_for_sim);
  const isPaymentVerified = ["PAYMENT_VERIFIED", "RECHARGE_PROCESSING", "COMPLETED", "WAITING_FOR_COOLDOWN", "WAITING_FOR_SIM"].includes(currentOrderStatus);
  const isRechargeCompleted = currentOrderStatus === "COMPLETED" || transferProgress?.is_completed;
  const isCooldown = currentOrderStatus === "WAITING_FOR_COOLDOWN" || transferProgress?.is_cooldown;

  return (
    <div className="app-form-wrapper">
      {/* 1. Shortened Page Header */}
      <div style={{ marginBottom: "14px", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "4px" }}>
          {step === 1 ? tRecharge.title : (lang === "bn" ? "পেমেন্ট ও রিচার্জ সম্পন্ন করুন" : "Payment & Automated Recharge")}
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: 0 }}>
          {step === 1
            ? (lang === "bn" ? "রিচার্জ নম্বর ও পরিমাণ প্রদান করুন।" : "Enter recipient number and recharge amount.")
            : (lang === "bn" ? "পেমেন্ট সম্পন্ন হলে স্বয়ংক্রিয়ভাবে এয়ারটাইম রিচার্জ চলে যাবে।" : "Top-up will be automatically transferred upon payment detection.")}
        </p>
      </div>

      {actionError && (
        <div style={{
          backgroundColor: "#FEF2F2",
          border: "1px solid #FECACA",
          borderRadius: "var(--radius-md)",
          padding: "10px 14px",
          color: "#991B1B",
          fontSize: "0.8125rem",
          marginBottom: "14px",
          display: "flex",
          gap: "8px",
          alignItems: "center"
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{actionError}</span>
        </div>
      )}

      {/* STEP 1: PROGRESSIVE RECHARGE FORM */}
      {step === 1 && (
        <form onSubmit={handleCreateOrder} className="card app-form-card" style={{ padding: "20px" }}>
          {/* Subtle Top Step Indicator */}
          <StepIndicator currentStep={currentStep} />

          {/* QUICK "MY SIM" SELECTOR (Rendered when customer has verified SIMs) */}
          {verifiedSims.length > 0 && (
            <div
              style={{
                backgroundColor: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "10px",
                padding: "12px 14px",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Smartphone size={14} color="var(--ft-green)" />
                  <span style={{ fontSize: "0.8125rem", fontWeight: "600", color: "#1E293B" }}>
                    {lang === "bn" ? "আমার নম্বর (My SIM)" : "Quick: My SIM"}
                  </span>
                </div>
                {selectedSimId && (
                  <button
                    type="button"
                    onClick={handleClearSelectedSim}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--ft-green)",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    {lang === "bn" ? "+ অন্য নম্বরে রিচার্জ করুন" : "+ Recharge another number"}
                  </button>
                )}
              </div>

              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {verifiedSims.map((sim) => {
                  const isSelected = selectedSimId === sim.sim_id;
                  return (
                    <button
                      key={sim.sim_id}
                      type="button"
                      onClick={() => handleSelectLinkedSim(sim)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        border: isSelected
                          ? "2px solid var(--ft-green)"
                          : "1px solid #CBD5E1",
                        backgroundColor: isSelected ? "var(--ft-green-subtle)" : "#FFFFFF",
                        color: isSelected ? "var(--ft-green-active)" : "#334155",
                        cursor: "pointer",
                        fontSize: "0.8125rem",
                        fontWeight: isSelected ? "600" : "500",
                        transition: "all 0.15s ease",
                        textAlign: "left",
                      }}
                    >
                      <span
                        style={{
                          padding: "1px 6px",
                          borderRadius: "4px",
                          backgroundColor: isSelected ? "var(--ft-green)" : "#E2E8F0",
                          color: isSelected ? "#FFFFFF" : "#475569",
                          fontSize: "0.6875rem",
                          fontWeight: "700",
                        }}
                      >
                        {sim.operator_code}
                      </span>
                      <span>
                        {lang === "bn" ? toBnDigits(sim.phone) : sim.phone}
                      </span>
                      {sim.label && (
                        <span style={{ color: "#64748B", fontSize: "0.75rem", fontWeight: "400" }}>
                          ({sim.label})
                        </span>
                      )}
                      <span style={{ color: "#16A34A", fontSize: "0.75rem" }}>✓</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STAGE 1: OPERATOR SELECTION (Always visible) */}
          <div className="form-group" style={{ marginBottom: isOperatorSelected ? "12px" : "4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
              <label className="form-label" style={{ fontSize: "0.8125rem", margin: 0 }}>
                {tRecharge.recipientOperator}
              </label>
              {isOperatorSelected && (
                <span style={{ fontSize: "0.6875rem", color: "var(--ft-green)", fontWeight: "500" }}>
                  {lang === "bn" ? "নির্বাচিত" : "Selected"}
                </span>
              )}
            </div>
            <OperatorSelector value={operator} onChange={(op) => setOperator(op)} />
          </div>

          {/* STAGE 2: RECIPIENT NUMBER (Revealed after operator is selected) */}
          {isOperatorSelected && (
            <div className="form-group progressive-step" style={{ marginBottom: isPhoneValid ? "12px" : "4px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
                <label className="form-label" style={{ fontSize: "0.8125rem", margin: 0 }}>
                  {tRecharge.recipientNumber}
                </label>
                {isPhoneValid && !isOperatorMismatch && (
                  <span style={{ fontSize: "0.75rem", color: "#16A34A", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <CheckCircle2 size={13} />
                    {lang === "bn" ? "সঠিক নম্বর" : "Valid Number"}
                  </span>
                )}
              </div>
              <input
                ref={phoneRef}
                type="tel"
                className="form-input"
                placeholder="01XXXXXXXXX"
                maxLength={11}
                value={destPhone}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, "").slice(0, 11);
                  setDestPhone(cleaned);
                  if (selectedSimId && cleaned !== destPhone) {
                    setSelectedSimId(null);
                  }
                  const autoOp = detectOperatorFromPhone(cleaned);
                  if (!operator && autoOp) {
                    setOperator(autoOp as OperatorCode);
                  }
                }}
                required
                style={{ height: "40px", borderColor: isOperatorMismatch ? "#EF4444" : undefined }}
              />
              {isOperatorMismatch && (
                <div style={{ fontSize: "0.75rem", color: "#DC2626", marginTop: "4px", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
                  <AlertCircle size={13} />
                  <span>
                    {lang === "bn"
                      ? `নির্বাচিত অপারেটর (${operator}) এই মোবাইল নম্বরের (${detectedOp}) সাথে মিলছে না।`
                      : `Selected operator (${operator}) does not match this number (${detectedOp}).`}
                  </span>
                </div>
              )}
              {!isOperatorMismatch && !isPhoneValid && destPhone.length > 0 && (
                <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", marginTop: "4px" }}>
                  {lang === "bn" ? "সঠিক ১১-সংখ্যার বাংলাদেশী মোবাইল নম্বর দিন (যেমন ০১XXXXXXXXX)" : "Enter a valid 11-digit Bangladesh mobile number (e.g. 01XXXXXXXXX)"}
                </div>
              )}
            </div>
          )}

          {/* STAGE 3: RECHARGE AMOUNT (Revealed after valid number is entered) */}
          {isOperatorSelected && isPhoneValid && (
            <div className="form-group progressive-step" style={{ marginBottom: isAmountValid ? "12px" : "4px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
                <label className="form-label" style={{ margin: 0, fontSize: "0.8125rem" }}>
                  {tRecharge.rechargeAmount}
                </label>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  {tRecharge.limitsHelp}
                </span>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  ref={amountRef}
                  type="number"
                  className="form-input"
                  min="10"
                  max="50000"
                  step="1"
                  placeholder={lang === "bn" ? "১০ - ৫০,০০০" : "10 - 50,000"}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  style={{ fontSize: "1.125rem", fontWeight: "600", paddingLeft: "32px", height: "42px" }}
                />
                <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontWeight: "500", color: "var(--text-muted)", fontSize: "1rem" }}>
                  ৳
                </span>
              </div>
            </div>
          )}

          {/* STAGE 4: DISCOUNT SUMMARY (Revealed only after valid amount is entered) */}
          {isOperatorSelected && isPhoneValid && isAmountValid && (
            <div className="progressive-step">
              <LiveQuoteCard
                mode="RECHARGE"
                quote={quote}
                loading={quoteLoading}
                error={quoteError}
              />
            </div>
          )}

          {/* STAGE 5: CONTINUE BUTTON (Revealed when quote is ready) */}
          {isOperatorSelected && isPhoneValid && isAmountValid && quote && (
            <div className="progressive-step" style={{ marginTop: "12px" }}>
              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={submitting || quoteLoading || !quote || isOperatorMismatch}
                style={{ height: "50px", fontSize: "0.9375rem", fontWeight: "600" }}
              >
                {submitting ? (
                  <span>{lang === "bn" ? "অর্ডার প্রস্তুত হচ্ছে..." : "Preparing Recharge Order..."}</span>
                ) : (
                  <span>
                    {lang === "bn" ? `রিচার্জ করুন ${formatBDT(quote.customer_pay_amount_bdt, { lang })} →` : `Recharge for ${formatBDT(quote.customer_pay_amount_bdt)} →`}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Standardized Trust Note */}
          <TrustNote />
        </form>
      )}

      {/* STEP 2: PAYMENT INSTRUCTIONS & AUTOMATED RECHARGE TRACKER */}
      {step === 2 && createdOrder && (
        <div className="card app-form-card" style={{ padding: "20px" }}>
          {/* Order Banner */}
          <div style={{
            backgroundColor: "var(--ft-yellow-subtle)",
            border: "1px solid #FEF08A",
            borderRadius: "var(--radius-md)",
            padding: "12px 16px",
            marginBottom: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <div>
              <div style={{ fontSize: "0.6875rem", fontWeight: "600", color: "#B45309", textTransform: "uppercase" }}>
                {lang === "bn" ? "রিচার্জ অর্ডার তৈরি হয়েছে" : "Recharge Order Placed"}
              </div>
              <div style={{ fontSize: "1.0625rem", fontWeight: "600", color: "var(--text-primary)" }}>
                {createdOrder.order_id}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                {createdOrder.operator_code} • {lang === "bn" ? toBnDigits(createdOrder.recharge_mobile_number) : createdOrder.recharge_mobile_number}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", fontWeight: "400" }}>
                {lang === "bn" ? "প্রদেয় পরিমাণ (৫% ছাড়)" : "Payable (5% Off)"}
              </div>
              <div style={{ fontSize: "1.125rem", fontWeight: "700", color: "var(--ft-green)" }}>
                {formatBDT(createdOrder.customer_pay_amount_bdt, { preserveDecimals: true, lang })}
              </div>
              <div style={{ fontSize: "0.6875rem", color: "#64748B", textDecoration: "line-through" }}>
                {formatBDT(createdOrder.recharge_amount_bdt, { preserveDecimals: true, lang })}
              </div>
            </div>
          </div>

          {/* LIVE AUTOMATED PAYMENT & TRANSFER RADAR */}
          <div style={{
            backgroundColor: isFailed ? "#FEF2F2" : isRechargeCompleted ? "#F0FDF4" : isPaymentVerified ? "#F0FDF4" : "#F8FAFC",
            border: isFailed
              ? "2px solid #EF4444"
              : isRechargeCompleted
              ? "2px solid #22C55E"
              : isPaymentVerified
              ? "2px solid var(--ft-green)"
              : isCooldown
              ? "2px solid #F59E0B"
              : "1.5px solid #CBD5E1",
            borderRadius: "var(--radius-md)",
            padding: "16px",
            marginBottom: "16px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.04)"
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
              <div style={{ marginTop: "2px" }}>
                {isFailed ? (
                  <AlertCircle size={24} color="#DC2626" />
                ) : isRechargeCompleted ? (
                  <CheckCircle2 size={24} color="#16A34A" />
                ) : isPaymentVerified ? (
                  <RefreshCw size={24} color="var(--ft-green)" className="spin" />
                ) : (
                  <div style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    backgroundColor: "#E2E8F0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative"
                  }}>
                    <span style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      backgroundColor: "#0284C7"
                    }} />
                  </div>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{
                    fontSize: "0.9375rem",
                    fontWeight: "700",
                    margin: 0,
                    color: isFailed ? "#991B1B" : "var(--text-primary)"
                  }}>
                    {isFailed
                      ? (lang === "bn" ? "রিচার্জ সম্পন্ন করা যায়নি" : "Recharge Failed")
                      : isRechargeCompleted
                      ? (lang === "bn" ? "রিচার্জ সম্পন্ন হয়েছে!" : "Recharge Completed Successfully!")
                      : isPaymentVerified
                      ? (lang === "bn" ? "পেমেন্ট যাচাইকৃত! স্বয়ংক্রিয় রিচার্জ চলছে..." : "Payment Verified! Transferring Airtime...")
                      : (lang === "bn" ? "স্বয়ংক্রিয় পেমেন্ট শনাক্তকরণ সক্রিয়" : "Automatic Payment Detection Active")}
                  </h3>
                  <span style={{
                    fontSize: "0.6875rem",
                    fontWeight: "600",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    backgroundColor: isFailed ? "#FEE2E2" : isRechargeCompleted ? "#DCFCE7" : isPaymentVerified ? "#DCFCE7" : "#E0F2FE",
                    color: isFailed ? "#991B1B" : isRechargeCompleted ? "#166534" : isPaymentVerified ? "#166534" : "#0369A1"
                  }}>
                    {isFailed ? (transferProgress?.error_code || "FAILED") : currentOrderStatus}
                  </span>
                </div>
                <p style={{
                  margin: "4px 0 0 0",
                  fontSize: "0.8125rem",
                  color: isFailed ? "#991B1B" : "var(--text-secondary)",
                  lineHeight: 1.45
                }}>
                  {isFailed
                    ? (transferProgress?.error_message || (lang === "bn" ? "লেনদেন সম্পন্ন করা যায়নি।" : "Transaction could not be completed."))
                    : isRechargeCompleted
                    ? (lang === "bn" ? "আপনার প্রদত্ত নম্বরে সফলভাবে এয়ারটাইম রিচার্জ প্রদান করা হয়েছে।" : "Airtime top-up has been successfully credited to your number.")
                    : isWaitingForSim
                    ? (lang === "bn" ? "একটি সক্রিয় রিচার্জ লাইনের জন্য অপেক্ষা করা হচ্ছে। লাইন প্রস্তুত হওয়া মাত্রই স্বয়ংক্রিয়ভাবে রিচার্জ সম্পন্ন হবে।" : "Waiting for an available recharge line. Your airtime transfer will proceed automatically as soon as an eligible line is free.")
                    : isPaymentVerified
                    ? (lang === "bn" ? "পেমেন্ট SMS নিশ্চিত হয়েছে। আমাদের সার্ভার স্বয়ংক্রিয়ভাবে এয়ারটাইম পাঠাচ্ছে।" : "Payment SMS verified. Server is transferring airtime via operator network.")
                    : (lang === "bn"
                        ? "আপনার বিকাশ বা নগদ থেকে নিচে দেওয়া নম্বরে পেমেন্ট করুন। রেফারেন্সে অর্ডার আইডি দিন। SMS আসার সাথে সাথে স্বয়ংক্রিয়ভাবে রিচার্জ সক্রিয় হবে।"
                        : "Send payment to the number below using bKash/Nagad with Order ID as reference. Top-up will trigger automatically upon SMS receipt.")}
                </p>

                {/* Transfer Chunk Progress (When Payment is Verified / Transfer Running) */}
                {transferProgress && transferProgress.total_chunks > 0 && (
                  <div style={{ marginTop: "12px", background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "var(--radius-sm)", padding: "10px 12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: "600", marginBottom: "6px" }}>
                      <span>{lang === "bn" ? "এয়ারটাইম ট্রান্সফার অগ্রগতি" : "Airtime Transfer Progress"}</span>
                      <span>
                        {transferProgress.completed_chunks} / {transferProgress.total_chunks} {lang === "bn" ? "ধাপ" : "chunks"} ({transferProgress.completed_amount_bdt} / {transferProgress.total_amount_bdt} ৳)
                      </span>
                    </div>
                    <div style={{ width: "100%", height: "6px", background: "#E2E8F0", borderRadius: "999px", overflow: "hidden" }}>
                      <div style={{
                        width: `${Math.round((transferProgress.completed_chunks / transferProgress.total_chunks) * 100)}%`,
                        height: "100%",
                        background: "var(--ft-green)",
                        transition: "width 0.4s ease"
                      }} />
                    </div>
                    {transferProgress.is_cooldown && (
                      <div style={{ marginTop: "6px", fontSize: "0.6875rem", color: "#B45309", fontWeight: "500" }}>
                        {lang === "bn"
                          ? `অপারেটর কুলডাউন উইন্ডো অপেক্ষা করছে (${Math.ceil(transferProgress.cooldown_seconds_remaining / 60)} মিনিট)। স্বয়ংক্রিয়ভাবে পুনরায় চলবে।`
                          : `Waiting for operator cooldown window (${Math.ceil(transferProgress.cooldown_seconds_remaining / 60)}m left). Will resume automatically.`}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Payment Method Selector */}
          {!isPaymentVerified && (
            <div className="form-group" style={{ marginBottom: "14px" }}>
              <label className="form-label" style={{ fontSize: "0.8125rem", marginBottom: "6px" }}>
                {tRecharge.paymentMethodLabel}
              </label>
              <WalletSelector
                mode="payment"
                value={paymentMethod}
                onChange={(val) => setPaymentMethod(val)}
              />
            </div>
          )}

          {/* Payment Instructions Box with Copy buttons */}
          {!isPaymentVerified && (
            <div style={{
              backgroundColor: "var(--bg-main)",
              border: "1.5px solid var(--border-card)",
              borderRadius: "var(--radius-md)",
              padding: "16px",
              marginBottom: "16px"
            }}>
              {/* Payment Number Card */}
              {(() => {
                const selectedAccount = paymentAccounts.find((a) => a.method === paymentMethod) ||
                  (paymentAccounts.length > 0 ? paymentAccounts[0] : null);
                const currentPaymentNumber = selectedAccount?.display_number || createdOrder?.payment_display_number || "01711-000002";
                const rawPaymentNumber = selectedAccount?.account_number || createdOrder?.payment_account_number || "01711000002";
                const currentInstructions = (lang === "bn" ? selectedAccount?.instructions_bn : selectedAccount?.instructions) ||
                  (lang === "bn"
                    ? "পেমেন্ট অ্যাপে Send Money করার সময় Reference অপশনে উপরের কোডটি দিলে তাৎক্ষণিক রিচার্জ নিশ্চিত হয়।"
                    : "Include this order ID in the 'Reference' field of bKash/Nagad for instant automatic detection.");

                return (
                  <div style={{ textAlign: "center", marginBottom: "14px" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>
                      {lang === "bn"
                        ? `FlexiTaka-কে ${formatBDT(createdOrder.customer_pay_amount_bdt, { preserveDecimals: true, lang })} পাঠান`
                        : `Send ${formatBDT(createdOrder.customer_pay_amount_bdt, { preserveDecimals: true })} To FlexiTaka`}
                    </div>

                    {paymentMethod === "BANGLA_QR" && selectedAccount?.qr_code_url && (
                      <div style={{ margin: "10px auto", display: "inline-block", background: "#FFFFFF", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-light)" }}>
                        <img src={selectedAccount.qr_code_url} alt="Bangla QR" style={{ width: "120px", height: "120px", objectFit: "contain", display: "block" }} />
                      </div>
                    )}

                    <div style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      backgroundColor: "#FFFFFF",
                      padding: "6px 14px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-light)"
                    }}>
                      <span style={{ fontSize: "1.375rem", fontWeight: "700", color: "var(--text-primary)", letterSpacing: "0.04em" }}>
                        {lang === "bn" ? toBnDigits(currentPaymentNumber) : currentPaymentNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(rawPaymentNumber, "num")}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: copiedNum ? "var(--ft-green)" : "var(--text-secondary)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "0.75rem",
                          fontWeight: "600"
                        }}
                      >
                        {copiedNum ? <Check size={14} /> : <Copy size={14} />}
                        <span>{copiedNum ? (lang === "bn" ? "কপি হয়েছে" : "Copied") : (lang === "bn" ? "কপি" : "Copy")}</span>
                      </button>
                    </div>

                    {/* Crucial Reference Code Card */}
                    <div style={{
                      backgroundColor: "#FEF9C3",
                      border: "1px dashed #CA8A04",
                      borderRadius: "var(--radius-sm)",
                      padding: "10px 14px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "12px",
                      textAlign: "left"
                    }}>
                      <div>
                        <div style={{ fontSize: "0.6875rem", fontWeight: "600", color: "#854D0E", textTransform: "uppercase" }}>
                          {lang === "bn" ? "পেমেন্ট রেফারেন্স কোড (জরুরি)" : "Payment Reference Code (Crucial)"}
                        </div>
                        <div style={{ fontSize: "1rem", fontWeight: "700", color: "#713F12", letterSpacing: "0.05em" }}>
                          {createdOrder.order_id}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(createdOrder.order_id, "ref")}
                        style={{
                          backgroundColor: copiedRef ? "#BBF7D0" : "#FFFFFF",
                          border: "1px solid #CA8A04",
                          borderRadius: "4px",
                          padding: "4px 10px",
                          fontSize: "0.75rem",
                          fontWeight: "600",
                          color: copiedRef ? "#166534" : "#854D0E",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        {copiedRef ? <Check size={13} /> : <Copy size={13} />}
                        <span>{copiedRef ? (lang === "bn" ? "কপি হয়েছে" : "Copied") : (lang === "bn" ? "রেফারেন্স কপি" : "Copy Ref")}</span>
                      </button>
                    </div>

                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "8px", textAlign: "center" }}>
                      {currentInstructions}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* If Completed, Show Celebration Link */}
          {isRechargeCompleted ? (
            <div style={{ textAlign: "center", marginTop: "16px" }}>
              <button
                type="button"
                onClick={() => {
                  const tokenQuery = createdOrder.tracking_token ? `?token=${encodeURIComponent(createdOrder.tracking_token)}` : "";
                  router.push(`/app/order/${createdOrder.order_id}${tokenQuery}`);
                }}
                className="btn btn-primary btn-full"
                style={{ height: "48px", fontWeight: "600" }}
              >
                <span>{lang === "bn" ? "অর্ডারের রসিদ ও বিস্তারিত দেখুন →" : "View Order Details & Receipt →"}</span>
              </button>
            </div>
          ) : (
            <>
              {/* Optional Manual TrxID Entry Accordion */}
              <div style={{ marginTop: "12px", borderTop: "1px solid var(--border-light)", paddingTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => setShowManualTrx(!showManualTrx)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-secondary)",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                    textDecoration: "underline",
                    display: "block",
                    margin: "0 auto",
                    padding: "4px"
                  }}
                >
                  {showManualTrx
                    ? (lang === "bn" ? "ম্যানুয়াল TrxID ফর্ম লুকান" : "Hide manual TrxID form")
                    : (lang === "bn" ? "পেমেন্ট ট্রানজ্যাকশন আইডি (TrxID) ম্যানুয়ালি দিতে চান? (ঐচ্ছিক)" : "Prefer to enter TrxID manually? (Optional)")}
                </button>

                {showManualTrx && (
                  <form onSubmit={handleConfirmPayment} style={{ marginTop: "14px" }}>
                    <div className="form-group" style={{ marginBottom: "10px" }}>
                      <label className="form-label" style={{ fontSize: "0.75rem", marginBottom: "4px" }}>
                        {lang === "bn" ? "আপনার ওয়ালেট মোবাইল নম্বর" : "Your Wallet Mobile Number"}
                      </label>
                      <input
                        type="tel"
                        className="form-input"
                        placeholder="01XXXXXXXXX"
                        maxLength={11}
                        value={payerAccount}
                        onChange={(e) => setPayerAccount(e.target.value.replace(/\D/g, "").slice(0, 11))}
                        style={{ height: "38px" }}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: "14px" }}>
                      <label className="form-label" style={{ fontSize: "0.75rem", marginBottom: "4px" }}>
                        {tRecharge.paymentTrxIdLabel} *
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder={tRecharge.paymentTrxIdPlaceholder}
                        value={paymentTrxId}
                        onChange={(e) => setPaymentTrxId(e.target.value)}
                        required
                        style={{ height: "38px" }}
                      />
                    </div>

                    <div style={{ display: "flex", gap: "10px" }}>
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="btn btn-outline"
                        style={{ flex: 1, height: "44px", fontWeight: "500", fontSize: "0.875rem" }}
                        disabled={submitting}
                      >
                        <ArrowLeft size={15} />
                        <span>{tr.common.actions.back}</span>
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ flex: 2, height: "44px", fontWeight: "600", fontSize: "0.875rem" }}
                        disabled={submitting || !paymentTrxId.trim()}
                      >
                        {submitting ? (
                          <span>{tr.common.loading}</span>
                        ) : (
                          <>
                            <span>{tRecharge.btnSubmitRecharge}</span>
                            <CheckCircle2 size={15} />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </>
          )}

          <TrustNote text={lang === "bn" ? "রিচার্জের পেমেন্ট আপনার পেমেন্ট SMS থেকে স্বয়ংক্রিয়ভাবে যাচাই করা হয়।" : "Recharge payment is verified automatically from your payment SMS."} />
        </div>
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
        <div style={{ color: "var(--text-secondary)", fontSize: "0.9375rem" }}>Loading...</div>
      </div>
    }>
      <RechargeWizardContent />
    </React.Suspense>
  );
}
