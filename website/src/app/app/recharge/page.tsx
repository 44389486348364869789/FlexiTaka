"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { OperatorCode, PayoutMethod, RechargeOrderCreated, RechargeQuote } from "@/lib/types";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import OperatorSelector from "@/components/OperatorSelector";
import LiveQuoteCard from "@/components/LiveQuoteCard";
import StepIndicator from "@/components/StepIndicator";
import TrustNote from "@/components/TrustNote";
import WalletSelector from "@/components/WalletSelector";
import OtpVerificationModal from "@/components/OtpVerificationModal";
import { formatBDT } from "@/lib/formatters";
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

  // Live Server Discount Quote
  const [quote, setQuote] = useState<RechargeQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Order  // Order state
  const [createdOrder, setCreatedOrder] = useState<RechargeOrderCreated | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // OTP Verification state
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpSending, setOtpSending] = useState(false);

  // Input refs for smooth progressive focus
  const phoneRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  // Validation helpers
  const isOperatorSelected = Boolean(operator);
  const cleanedPhone = destPhone.replace(/[\s\-\+]/g, "").replace(/^88/, "");
  const isPhoneValid = Boolean(cleanedPhone.match(/^01[3-9]\d{8}$/));
  const isPhoneVerified = Boolean(verifiedPhone && verifiedPhone === cleanedPhone);

  const numAmount = parseFloat(amount);
  const isAmountValid = !isNaN(numAmount) && numAmount >= 50 && numAmount <= 50000;

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
    if (!operator || !isAmountValid) {
      setQuote(null);
      setQuoteLoading(false);
      setQuoteError(null);
      return;
    }

    setQuoteError(null);
    setQuoteLoading(true);
    try {
      const q = await api.getRechargeQuote(operator as OperatorCode, amount);
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
    if (operator && isAmountValid) {
      updateQuote();
    } else {
      setQuote(null);
      setQuoteLoading(false);
      if (amount.trim() !== "" && !isAmountValid) {
        setQuoteError(lang === "bn" ? "পরিমাণ অবশ্যই ৳৫০ থেকে ৳৫০,০০০ এর মধ্যে হতে হবে" : "Amount must be between ৳50 and ৳50,000");
      } else {
        setQuoteError(null);
      }
    }
  }, [operator, amount, isAmountValid, lang]);

  // Handle OTP Trigger & Order Creation
  const handleTriggerOtp = async () => {
    if (!isPhoneValid) {
      setActionError(lang === "bn" ? "সঠিক ১১-সংখ্যার বাংলাদেশী মোবাইল নম্বর দিন (যেমন ০১৭XXXXXXXX)" : "Please enter a valid 11-digit Bangladesh mobile number (e.g. 01712345678)");
      return;
    }
    setActionError(null);
    setOtpSending(true);
    try {
      await api.requestOtp(cleanedPhone);
      setOtpModalOpen(true);
    } catch (err: any) {
      setActionError(err.message || (lang === "bn" ? "OTP পাঠাতে ব্যর্থ হয়েছে। অনুগ্রহ করে অপেক্ষা করুন।" : "Failed to send OTP. Please wait."));
    } finally {
      setOtpSending(false);
    }
  };

  const executeOrderCreation = async (phoneToUse?: string) => {
    const finalPhone = phoneToUse || cleanedPhone;
    setSubmitting(true);
    try {
      await api.ensureGuestSession();
      const order = await api.createRechargeOrder({
        operator_code: operator as OperatorCode,
        recharge_mobile_number: finalPhone,
        recharge_amount_bdt: amount,
      });
      setCreatedOrder(order);
      setStep(2);
    } catch (err: any) {
      let msg = err.message || (lang === "bn" ? "রিচার্জ অর্ডার তৈরি করতে ব্যর্থ হয়েছে" : "Failed to create Recharge order");
      if (msg.includes(" : ")) {
        const parts = msg.split(" : ");
        msg = lang === "bn" ? parts[0].trim() : parts[1].trim();
      }
      setActionError(msg);
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
      setActionError(lang === "bn" ? "সঠিক ১১-সংখ্যার বাংলাদেশী মোবাইল নম্বর দিন (যেমন ০১৭XXXXXXXX)" : "Please enter a valid 11-digit Bangladesh mobile number (e.g. 01712345678)");
      return;
    }

    // Enforce OTP verification before allowing order placement
    if (!isPhoneVerified) {
      await handleTriggerOtp();
      return;
    }

    if (!isAmountValid) {
      setActionError(lang === "bn" ? "পরিমাণ অবশ্যই ৳৫০ থেকে ৳৫০,০০০ এর মধ্যে হতে হবে" : "Amount must be between ৳50 and ৳50,000");
      return;
    }

    await executeOrderCreation();
  };

  const handleOtpSuccess = async (vPhone: string) => {
    setVerifiedPhone(vPhone);
    setOtpModalOpen(false);
    if (operator && isAmountValid) {
      await executeOrderCreation(vPhone);
    }
  };

  // Live Order & Automated Transfer State
  const [orderDetail, setOrderDetail] = useState<any>(null);
  const [transferProgress, setTransferProgress] = useState<any>(null);
  const [copiedNum, setCopiedNum] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [showManualTrx, setShowManualTrx] = useState(false);

  // Poll order status & live recharge transfer progress in Step 2
  useEffect(() => {
    if (step !== 2 || !createdOrder) return;

    let isMounted = true;
    const pollInterval = setInterval(async () => {
      try {
        const orderData = await api.getOrder(createdOrder.order_id, createdOrder.tracking_token);
        if (isMounted && orderData) {
          setOrderDetail(orderData);
          if (["PAYMENT_VERIFIED", "RECHARGE_PROCESSING", "COMPLETED", "WAITING_FOR_COOLDOWN"].includes(orderData.status)) {
            const prog = await api.getRechargeTransferProgress(createdOrder.order_id);
            if (isMounted && prog) {
              setTransferProgress(prog);
            }
          }
        }
      } catch {
        // silent polling error
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
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
      setActionError(err.message || (lang === "bn" ? "পেমেন্ট রেকর্ড করতে ব্যর্থ হয়েছে। ট্রানজ্যাকশন রেফারেন্স যাচাই করুন।" : "Failed to record payment. Please check your transaction reference."));
    } finally {
      setSubmitting(false);
    }
  };

  const tRecharge = tr.app.rechargeWizard;
  const currentOrderStatus = orderDetail?.status || createdOrder?.status || "PAYMENT_PENDING";
  const isPaymentVerified = ["PAYMENT_VERIFIED", "RECHARGE_PROCESSING", "COMPLETED", "WAITING_FOR_COOLDOWN"].includes(currentOrderStatus);
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
                {isPhoneValid && (
                  isPhoneVerified ? (
                    <span style={{ fontSize: "0.75rem", color: "#16A34A", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <CheckCircle2 size={13} />
                      {lang === "bn" ? "যাচাই সম্পন্ন" : "Verified"}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleTriggerOtp}
                      disabled={otpSending}
                      style={{
                        background: "var(--ft-green-subtle)",
                        border: "1px solid #BBF7D0",
                        color: "var(--ft-green-active)",
                        fontSize: "0.6875rem",
                        fontWeight: "600",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      {otpSending ? <RefreshCw size={11} className="spin" /> : <ShieldCheck size={12} />}
                      <span>{lang === "bn" ? "OTP যাচাই করুন" : "Verify OTP"}</span>
                    </button>
                  )
                )}
              </div>
              <input
                ref={phoneRef}
                type="tel"
                className="form-input"
                placeholder="01XXXXXXXXX"
                value={destPhone}
                onChange={(e) => {
                  setDestPhone(e.target.value);
                  const newClean = e.target.value.replace(/[\s\-\+]/g, "").replace(/^88/, "");
                  if (verifiedPhone && verifiedPhone !== newClean) {
                    setVerifiedPhone(null);
                  }
                }}
                required
                style={{ height: "40px" }}
              />
              {!isPhoneValid && destPhone.length > 0 && (
                <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", marginTop: "4px" }}>
                  {lang === "bn" ? "সঠিক ১১-সংখ্যার বাংলাদেশী মোবাইল নম্বর দিন (যেমন ০১৭XXXXXXXX)" : "Enter a valid 11-digit Bangladesh mobile number (e.g. 017XXXXXXXX)"}
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
                  min="50"
                  max="50000"
                  step="10"
                  placeholder={lang === "bn" ? "পরিমাণ" : "Amount"}
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
                disabled={submitting || quoteLoading || !quote}
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
            backgroundColor: isRechargeCompleted ? "#F0FDF4" : isPaymentVerified ? "#F0FDF4" : "#F8FAFC",
            border: isRechargeCompleted
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
                {isRechargeCompleted ? (
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
                  <h3 style={{ fontSize: "0.9375rem", fontWeight: "700", margin: 0, color: "var(--text-primary)" }}>
                    {isRechargeCompleted
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
                    backgroundColor: isRechargeCompleted ? "#DCFCE7" : isPaymentVerified ? "#DCFCE7" : "#E0F2FE",
                    color: isRechargeCompleted ? "#166534" : isPaymentVerified ? "#166534" : "#0369A1"
                  }}>
                    {currentOrderStatus}
                  </span>
                </div>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.45 }}>
                  {isRechargeCompleted
                    ? (lang === "bn" ? "আপনার প্রদত্ত নম্বরে সফলভাবে এয়ারটাইম রিচার্জ প্রদান করা হয়েছে।" : "Airtime top-up has been successfully credited to your number.")
                    : isPaymentVerified
                    ? (lang === "bn" ? "iPhone Shortcut দ্বারা পেমেন্ট SMS নিশ্চিত হয়েছে। আমাদের সার্ভার স্বয়ংক্রিয়ভাবে টেলকো সিম থেকে রিচার্জ পাঠাচ্ছে।" : "Payment SMS verified via iPhone Shortcut. Server is transferring airtime chunks via operator SIM.")
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
              <div style={{ textAlign: "center", marginBottom: "14px" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>
                  {lang === "bn"
                    ? `FlexiTaka-কে ${formatBDT(createdOrder.customer_pay_amount_bdt, { preserveDecimals: true, lang })} পাঠান`
                    : `Send ${formatBDT(createdOrder.customer_pay_amount_bdt, { preserveDecimals: true })} To FlexiTaka`}
                </div>
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
                    {lang === "bn" ? toBnDigits("01711-000002") : "01711-000002"}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy("01711000002", "num")}
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
              </div>

              {/* Crucial Reference Code Card */}
              <div style={{
                backgroundColor: "#FEF9C3",
                border: "1px dashed #CA8A04",
                borderRadius: "var(--radius-sm)",
                padding: "10px 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
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
                {lang === "bn"
                  ? "পেমেন্ট অ্যাপে Send Money করার সময় Reference অপশনে উপরের কোডটি দিলে তাৎক্ষণিক রিচার্জ নিশ্চিত হয়।"
                  : "Include this order ID in the 'Reference' field of bKash/Nagad for instant automatic detection."}
              </div>
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
                        value={payerAccount}
                        onChange={(e) => setPayerAccount(e.target.value)}
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

          <TrustNote />
        </div>
      )}

      {/* OTP Verification Modal */}
      <OtpVerificationModal
        isOpen={otpModalOpen}
        phone={cleanedPhone}
        onSuccess={handleOtpSuccess}
        onClose={() => setOtpModalOpen(false)}
      />
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
