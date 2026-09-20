"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { OperatorCode, PayoutMethod, RechargeOrderCreated, RechargeQuote } from "@/lib/types";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import OperatorSelector from "@/components/OperatorSelector";
import LiveQuoteCard from "@/components/LiveQuoteCard";
import StepIndicator from "@/components/StepIndicator";
import TrustNote from "@/components/TrustNote";
import WalletSelector from "@/components/WalletSelector";
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

  // Order & Payment State
  const [createdOrder, setCreatedOrder] = useState<RechargeOrderCreated | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Input refs for smooth progressive focus
  const phoneRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  // Validation helpers
  const isOperatorSelected = Boolean(operator);
  const cleanedPhone = destPhone.replace(/[\s\-\+]/g, "").replace(/^88/, "");
  const isPhoneValid = Boolean(cleanedPhone.match(/^01[3-9]\d{8}$/));

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

  // Handle Order Creation
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

    if (!isAmountValid) {
      setActionError(lang === "bn" ? "পরিমাণ অবশ্যই ৳৫০ থেকে ৳৫০,০০০ এর মধ্যে হতে হবে" : "Amount must be between ৳50 and ৳50,000");
      return;
    }

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
      setActionError(err.message || (lang === "bn" ? "রিচার্জ অর্ডার তৈরি করতে ব্যর্থ হয়েছে" : "Failed to create Recharge order"));
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Payment Submission
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

  return (
    <div className="app-form-wrapper">
      {/* 1. Shortened Page Header */}
      <div style={{ marginBottom: "14px", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "4px" }}>
          {step === 1 ? tRecharge.title : (lang === "bn" ? "পেমেন্ট সম্পন্ন করুন" : "Complete Payment")}
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: 0 }}>
          {step === 1
            ? (lang === "bn" ? "রিচার্জ নম্বর ও পরিমাণ প্রদান করুন।" : "Enter recipient number and recharge amount.")
            : (lang === "bn" ? "রিচার্জ পেতে পেমেন্ট সম্পন্ন করুন।" : "Complete payment to receive your top-up.")}
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
                  <span style={{ fontSize: "0.6875rem", color: "var(--ft-green)", fontWeight: "500" }}>
                    {lang === "bn" ? "সঠিক নম্বর" : "Valid Number"}
                  </span>
                )}
              </div>
              <input
                ref={phoneRef}
                type="tel"
                className="form-input"
                placeholder="01XXXXXXXXX"
                value={destPhone}
                onChange={(e) => setDestPhone(e.target.value)}
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

      {/* STEP 2: PAYMENT INSTRUCTIONS & TRXID */}
      {step === 2 && createdOrder && (
        <form onSubmit={handleConfirmPayment} className="card app-form-card" style={{ padding: "20px" }}>
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
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", fontWeight: "400" }}>
                {lang === "bn" ? "প্রদেয় পরিমাণ" : "Payable Amount"}
              </div>
              <div style={{ fontSize: "1.0625rem", fontWeight: "700", color: "var(--ft-green)" }}>
                {formatBDT(createdOrder.customer_pay_amount_bdt, { preserveDecimals: true, lang })}
              </div>
            </div>
          </div>

          {/* Payment Method Selector */}
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

          {/* Payment Instructions Box */}
          <div style={{
            backgroundColor: "var(--bg-main)",
            border: "1px solid var(--border-card)",
            borderRadius: "var(--radius-md)",
            padding: "14px",
            marginBottom: "16px",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "0.75rem", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>
              {lang === "bn"
                ? `FlexiTaka-কে ${formatBDT(createdOrder.customer_pay_amount_bdt, { preserveDecimals: true, lang })} পাঠান`
                : `Send ${formatBDT(createdOrder.customer_pay_amount_bdt, { preserveDecimals: true })} To FlexiTaka`}
            </div>
            <div style={{
              fontSize: "1.5rem",
              fontWeight: "700",
              color: "var(--text-primary)",
              letterSpacing: "0.04em",
              marginBottom: "4px"
            }}>
              {lang === "bn" ? toBnDigits("01711-000002") : "01711-000002"}
            </div>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", margin: 0, fontWeight: "400" }}>
              {paymentMethod === "BANGLA_QR" ? (
                lang === "bn"
                  ? "যেকোনো ব্যাংক বা MFS অ্যাপ (bKash, Nagad, Rocket) থেকে বাংলা কিউআর স্ক্যান করে বা উপরের নম্বরে Send Money করে প্রাপ্ত TrxID নিচে দিন।"
                  : "Scan Bangla QR or send money to the number above using any bank or MFS app, then enter the TrxID below."
              ) : (
                <>
                  {lang === "bn"
                    ? `আপনার ${paymentMethod === "BKASH" ? "bKash" : paymentMethod === "NAGAD" ? "Nagad" : "Rocket"} অ্যাপ ব্যবহার করে `
                    : `Use your ${paymentMethod === "BKASH" ? "bKash" : paymentMethod === "NAGAD" ? "Nagad" : "Rocket"} app to send `}
                  <span style={{ fontWeight: "600", color: "var(--text-primary)" }}>
                    {formatBDT(createdOrder.customer_pay_amount_bdt, { preserveDecimals: true, lang })}
                  </span>
                  {lang === "bn" ? " পাঠান।" : "."}
                </>
              )}
            </p>
          </div>

          {/* Payer Account & TrxID Inputs */}
          <div className="form-group" style={{ marginBottom: "12px" }}>
            <label className="form-label" style={{ fontSize: "0.8125rem", marginBottom: "4px" }}>
              {lang === "bn" ? "আপনার ওয়ালেট মোবাইল নম্বর" : "Your Wallet Mobile Number"}
            </label>
            <input
              type="tel"
              className="form-input"
              placeholder="01XXXXXXXXX"
              value={payerAccount}
              onChange={(e) => setPayerAccount(e.target.value)}
              required
              style={{ height: "40px" }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: "16px" }}>
            <label className="form-label" style={{ fontSize: "0.8125rem", marginBottom: "4px" }}>
              {tRecharge.paymentTrxIdLabel} *
            </label>
            <input
              type="text"
              className="form-input"
              placeholder={tRecharge.paymentTrxIdPlaceholder}
              value={paymentTrxId}
              onChange={(e) => setPaymentTrxId(e.target.value)}
              required
              style={{ height: "40px" }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn btn-outline"
              style={{ flex: 1, height: "48px", fontWeight: "500" }}
              disabled={submitting}
            >
              <ArrowLeft size={16} />
              <span>{tr.common.actions.back}</span>
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 2, height: "48px", fontWeight: "600" }}
              disabled={submitting || !paymentTrxId.trim()}
            >
              {submitting ? (
                <span>{tr.common.loading}</span>
              ) : (
                <>
                  <span>{tRecharge.btnSubmitRecharge}</span>
                  <CheckCircle2 size={16} />
                </>
              )}
            </button>
          </div>

          <TrustNote />
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
        <div style={{ color: "var(--text-secondary)", fontSize: "0.9375rem" }}>Loading...</div>
      </div>
    }>
      <RechargeWizardContent />
    </React.Suspense>
  );
}
