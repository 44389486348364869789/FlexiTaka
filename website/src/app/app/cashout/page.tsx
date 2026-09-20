"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { CashOutOrderCreated, CashOutQuote, OperatorCode, PayoutMethod } from "@/lib/types";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  RefreshCw,
  Upload,
} from "lucide-react";
import OperatorSelector from "@/components/OperatorSelector";
import { formatBDT } from "@/lib/formatters";
import { getStoredAuthToken, getStoredGuestSessionId } from "@/lib/api";
import LiveQuoteCard from "@/components/LiveQuoteCard";
import WalletSelector from "@/components/WalletSelector";
import StepIndicator from "@/components/StepIndicator";
import TrustNote from "@/components/TrustNote";
import { useLanguage } from "@/i18n/LanguageContext";

function CashOutWizardContent() {
  const { lang, tr, toBnDigits } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Wizard state: 1 = Form & Quote, 2 = Order Placed & USSD Instructions
  const [step, setStep] = useState<1 | 2>(1);

  // Form inputs
  const initialOp = searchParams.get("operator") as OperatorCode | null;
  const [operator, setOperator] = useState<OperatorCode | "">(
    initialOp && ["GP", "ROBI", "BANGLALINK"].includes(initialOp) ? initialOp : ""
  );
  const [sourcePhone, setSourcePhone] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
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

  // Copy state
  const [copied, setCopied] = useState(false);

  // In-button upload progress state
  const [uploadState, setUploadState] = useState<"IDLE" | "UPLOADING" | "SUCCESS" | "ERROR">("IDLE");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Input refs for smooth progressive focus
  const phoneRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  // Validation helpers
  const isOperatorSelected = Boolean(operator);
  const cleanedPhone = sourcePhone.replace(/[\s\-\+]/g, "").replace(/^88/, "");
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
    if (isOperatorSelected && !sourcePhone) {
      phoneRef.current?.focus();
    }
  }, [isOperatorSelected]);

  useEffect(() => {
    if (isPhoneValid && !amount) {
      amountRef.current?.focus();
    }
  }, [isPhoneValid]);

  // Fetch live quote from backend strictly when inputs are valid
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
      const q = await api.getCashOutQuote(operator as OperatorCode, amount);
      setQuote(q);
    } catch {
      // Fallback calculation if offline
      const fee = numAmount * 0.2;
      setQuote({
        operator_code: operator as OperatorCode,
        source_amount_bdt: numAmount.toFixed(2),
        source_amount_poisha: Math.round(numAmount * 100),
        platform_fee_rate: "20.0",
        platform_fee_amount_bdt: fee.toFixed(2),
        platform_fee_amount_poisha: Math.round(fee * 100),
        payout_amount_bdt: (numAmount - fee).toFixed(2),
        payout_amount_poisha: Math.round((numAmount - fee) * 100),
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

    if (!payoutAccount.trim()) {
      setActionError(lang === "bn" ? "আপনার পেআউট অ্যাকাউন্ট নম্বর দিন (bKash/Nagad/Bank)" : "Please enter your payout account number (bKash/Nagad/Bank)");
      return;
    }

    setSubmitting(true);
    try {
      await api.ensureGuestSession();
      const order = await api.createCashOutOrder({
        operator_code: operator as OperatorCode,
        source_mobile_number: cleanedPhone,
        amount_bdt: amount,
        payout_method: payoutMethod,
        payout_account: payoutAccount.trim(),
      });
      setCreatedOrder(order);
      setStep(2);
    } catch (err: any) {
      setActionError(err.message || (lang === "bn" ? "ক্যাশ আউট অর্ডার তৈরি করতে ব্যর্থ হয়েছে" : "Failed to create Cash Out order"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyNumber = () => {
    if (!createdOrder?.receiving_mobile_number) return;
    navigator.clipboard.writeText(createdOrder.receiving_mobile_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !createdOrder) return;
    setProofFile(file);
    setUploadState("UPLOADING");
    setUploadProgress(15);

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "https://flexitaka.online/api/v1";
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${apiBase}/cashout/orders/${createdOrder.order_id}/proof`);

      const guestId = getStoredGuestSessionId();
      if (guestId) xhr.setRequestHeader("X-Guest-Session-ID", guestId);
      const token = getStoredAuthToken();
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable) {
          const pct = Math.round((evt.loaded / evt.total) * 100);
          setUploadProgress(pct);
        }
      };

      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload status ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error("Network error"));
        const formData = new FormData();
        formData.append("file", file);
        xhr.send(formData);
      });

      setUploadState("SUCCESS");
      setUploadProgress(100);
    } catch {
      setUploadState("ERROR");
    }
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setProofFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setUploadState("IDLE");
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getOperatorInfo = (code?: string) => {
    switch (code) {
      case "GP":
        return { name: "Grameenphone", logo: "/logos/gp.svg", height: 18 };
      case "ROBI":
        return { name: "Robi", logo: "/logos/robi.svg", height: 18 };
      case "BANGLALINK":
        return { name: "Banglalink", logo: "/logos/banglalink.svg", height: 16 };
      default:
        return { name: "Telecom", logo: null, height: 18 };
    }
  };

  // Handle Confirmation of USSD Transfer and Proof Upload
  const handleConfirmTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdOrder) return;
    if (!trxReference.trim()) {
      setActionError(lang === "bn" ? "অপারেটর এসএমএস থেকে প্রাপ্ত TrxID দিন" : "Please provide the transaction reference ID from your telecom transfer SMS");
      return;
    }

    setSubmitting(true);
    setActionError(null);
    try {
      if (proofFile && uploadState !== "SUCCESS") {
        await api.uploadTransferProof(createdOrder.order_id, proofFile);
      }

      await api.confirmCashOutTransfer(createdOrder.order_id, trxReference.trim());

      const tokenQuery = createdOrder.tracking_token ? `?token=${encodeURIComponent(createdOrder.tracking_token)}` : "";
      router.push(`/app/order/${createdOrder.order_id}${tokenQuery}`);
    } catch (err: any) {
      setActionError(err.message || (lang === "bn" ? "ট্রান্সফার নিশ্চিত করতে ব্যর্থ হয়েছে। তথ্য যাচাই করুন।" : "Failed to confirm transfer. Please verify your reference."));
    } finally {
      setSubmitting(false);
    }
  };

  const getTransferInstructionText = (opCode?: string) => {
    switch (opCode) {
      case "GP":
        return lang === "bn"
          ? "MyGP অ্যাপ অথবা গ্রামীণফোনের অফিশিয়াল ব্যালেন্স ট্রান্সফারের মাধ্যমে (*১২১#)"
          : "Transfer via MyGP App or official Grameenphone balance transfer (*121#)";
      case "ROBI":
        return lang === "bn"
          ? "MyRobi অ্যাপ অথবা রবির অফিশিয়াল ব্যালেন্স ট্রান্সফারের মাধ্যমে (*১৪১#)"
          : "Transfer via MyRobi App or official Robi balance transfer (*141#)";
      case "BANGLALINK":
        return lang === "bn"
          ? "MyBL অ্যাপ অথবা বাংলালিংকের অফিশিয়াল ব্যালেন্স ট্রান্সফারের মাধ্যমে (*১০০০#)"
          : "Transfer via MyBL App or official Banglalink balance transfer (*1000#)";
      default:
        return lang === "bn"
          ? "অপারেটরের অফিশিয়াল ব্যালেন্স ট্রান্সফার অপশনের মাধ্যমে"
          : "Transfer via the operator's official balance transfer option";
    }
  };

  const activeOpCode = (createdOrder?.operator_code || operator || "ROBI") as string;
  const opInfo = getOperatorInfo(activeOpCode);
  const tCash = tr.app.cashOutWizard;

  return (
    <div className="app-form-wrapper">
      {/* Page Header */}
      <div style={{ marginBottom: "14px", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "4px" }}>
          {step === 1 ? tCash.title : (lang === "bn" ? "ব্যালেন্স ট্রান্সফার সম্পন্ন করুন" : "Complete Balance Transfer")}
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: 0 }}>
          {step === 1
            ? (lang === "bn" ? "পরিমাণ ও পেআউট বিবরণ প্রদান করুন।" : "Enter amount and payout details.")
            : (lang === "bn" ? "ব্যালেন্স পাঠাতে নিচের অপারেটর নির্দেশনা অনুসরণ করুন।" : "Follow the operator instructions below to send balance.")}
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

      {/* STEP 1: PROGRESSIVE CASH OUT FORM */}
      {step === 1 && (
        <form onSubmit={handleCreateOrder} className="card app-form-card" style={{ padding: "20px" }}>
          {/* Subtle Top Step Indicator */}
          <StepIndicator currentStep={currentStep} />

          {/* STAGE 1: OPERATOR SELECTION (Always visible) */}
          <div className="form-group" style={{ marginBottom: isOperatorSelected ? "12px" : "4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
              <label className="form-label" style={{ fontSize: "0.8125rem", margin: 0 }}>
                {tCash.senderOperator}
              </label>
              {isOperatorSelected && (
                <span style={{ fontSize: "0.6875rem", color: "var(--ft-green)", fontWeight: "500" }}>
                  {lang === "bn" ? "নির্বাচিত" : "Selected"}
                </span>
              )}
            </div>
            <OperatorSelector value={operator} onChange={(op) => setOperator(op)} />
          </div>

          {/* STAGE 2: MOBILE NUMBER (Revealed after operator is selected) */}
          {isOperatorSelected && (
            <div className="form-group progressive-step" style={{ marginBottom: isPhoneValid ? "12px" : "4px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
                <label className="form-label" style={{ fontSize: "0.8125rem", margin: 0 }}>
                  {tCash.senderNumber}
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
                value={sourcePhone}
                onChange={(e) => setSourcePhone(e.target.value)}
                required
                style={{ height: "44px" }}
              />
              {!isPhoneValid && sourcePhone.length > 0 && (
                <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", marginTop: "4px" }}>
                  {lang === "bn" ? "সঠিক ১১-সংখ্যার বাংলাদেশী মোবাইল নম্বর দিন (যেমন ০১৭XXXXXXXX)" : "Enter a valid 11-digit Bangladesh mobile number (e.g. 017XXXXXXXX)"}
                </div>
              )}
            </div>
          )}

          {/* STAGE 3: AMOUNT (Revealed after valid number is entered) */}
          {isOperatorSelected && isPhoneValid && (
            <div className="form-group progressive-step" style={{ marginBottom: isAmountValid ? "12px" : "4px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
                <label className="form-label" style={{ margin: 0, fontSize: "0.8125rem" }}>
                  {tCash.balanceAmount}
                </label>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  {tCash.limitsHelp}
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
                  style={{ fontSize: "1.125rem", fontWeight: "600", paddingLeft: "32px", height: "44px" }}
                />
                <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontWeight: "500", color: "var(--text-muted)", fontSize: "1rem" }}>
                  ৳
                </span>
              </div>
            </div>
          )}

          {/* STAGE 4: FINANCIAL SUMMARY (Revealed only after valid amount is entered) */}
          {isOperatorSelected && isPhoneValid && isAmountValid && (
            <div className="progressive-step">
              <LiveQuoteCard
                mode="CASHOUT"
                quote={quote}
                loading={quoteLoading}
                error={quoteError}
              />
            </div>
          )}

          {/* STAGE 5: PAYOUT METHOD (Revealed when quote is ready) */}
          {isOperatorSelected && isPhoneValid && isAmountValid && quote && (
            <div className="progressive-step">
              <div className="form-group" style={{ marginBottom: "12px" }}>
                <label className="form-label" style={{ fontSize: "0.8125rem", marginBottom: "4px" }}>
                  {tCash.payoutMethod}
                </label>
                <WalletSelector value={payoutMethod} onChange={setPayoutMethod} />
              </div>

              <div className="form-group" style={{ marginBottom: "16px" }}>
                <label className="form-label" style={{ fontSize: "0.8125rem", marginBottom: "4px" }}>
                  {tCash.payoutAccount}
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={payoutMethod === "BANK" ? (lang === "bn" ? "ব্যাংকের নাম, শাখা, অ্যাকাউন্ট নম্বর" : "Bank Name, Branch, Account Number") : "01XXXXXXXXX"}
                  value={payoutAccount}
                  onChange={(e) => setPayoutAccount(e.target.value)}
                  required
                  style={{ height: "44px" }}
                />
              </div>

              {/* STAGE 6: CONTINUE BUTTON */}
              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={submitting || quoteLoading || !quote || !payoutAccount.trim()}
                style={{ height: "52px", fontSize: "0.9375rem", fontWeight: "600" }}
              >
                {submitting ? (
                  <span>{lang === "bn" ? "রিসিভিং সিম বরাদ্দ করা হচ্ছে..." : "Assigning Receiving SIM..."}</span>
                ) : (
                  <span>
                    {lang === "bn" ? `ক্যাশ আউট করুন ${formatBDT(quote.payout_amount_bdt, { lang })} →` : `Cash Out ${formatBDT(quote.payout_amount_bdt)} →`}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Standardized Trust Note */}
          <TrustNote />
        </form>
      )}

      {/* STEP 2: USSD INSTRUCTIONS & PROOF CONFIRMATION */}
      {step === 2 && createdOrder && (
        <form onSubmit={handleConfirmTransfer} className="card app-form-card" style={{ padding: "20px" }}>
          {/* 1. Order Created / Payout Banner */}
          <div style={{
            backgroundColor: "var(--ft-green-subtle)",
            border: "1px solid #BBF7D0",
            borderRadius: "var(--radius-md)",
            padding: "12px 16px",
            marginBottom: "14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <div>
              <div style={{ fontSize: "0.6875rem", fontWeight: "600", color: "#166534", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {lang === "bn" ? "অর্ডার তৈরি হয়েছে" : "Order Created"}
              </div>
              <div style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-primary)" }}>
                {createdOrder.order_id}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", fontWeight: "400" }}>{lang === "bn" ? "পেআউট" : "Payout"}</div>
              <div style={{ fontSize: "1.125rem", fontWeight: "700", color: "var(--ft-green)" }}>
                {formatBDT(createdOrder.payout_amount_bdt, { lang })}
              </div>
            </div>
          </div>

          {/* 2. Receiving SIM Card */}
          <div style={{
            backgroundColor: "#FFFFFF",
            border: "1.5px solid var(--ft-green)",
            borderRadius: "var(--radius-md)",
            padding: "14px 16px",
            marginBottom: "14px",
            boxShadow: "0 2px 8px rgba(0, 166, 81, 0.06)",
          }}>
            {/* Operator Brand Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {opInfo.logo ? (
                  <img
                    src={opInfo.logo}
                    alt={opInfo.name}
                    style={{ height: `${opInfo.height}px`, width: "auto", objectFit: "contain", display: "block" }}
                  />
                ) : null}
                <div>
                  <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-primary)", lineHeight: 1.2 }}>
                    {opInfo.name} {lang === "bn" ? "রিসিভার" : "Receiver"}
                  </div>
                  <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", fontWeight: "400" }}>
                    {lang === "bn" ? "FlexiTaka রিসিভিং নম্বর" : "FlexiTaka Receiving Number"}
                  </div>
                </div>
              </div>
              <div
                style={{
                  padding: "3px 8px",
                  backgroundColor: "var(--ft-green-subtle)",
                  color: "#166534",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.6875rem",
                  fontWeight: "600",
                }}
              >
                {lang === "bn" ? "অফিশিয়াল সিম" : "Official SIM"}
              </div>
            </div>

            {/* Receiving Phone Number + Copy Button */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "var(--bg-main)",
                border: "1px solid var(--border-light)",
                borderRadius: "var(--radius-sm)",
                padding: "10px 14px",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  fontSize: "1.25rem",
                  fontWeight: "700",
                  color: "var(--text-primary)",
                  letterSpacing: "0.04em",
                  userSelect: "all",
                  overflowWrap: "anywhere",
                  wordBreak: "break-word",
                }}
              >
                {lang === "bn" ? toBnDigits(createdOrder.receiving_mobile_number) : createdOrder.receiving_mobile_number}
              </span>
              <button
                type="button"
                onClick={handleCopyNumber}
                aria-label="Copy receiving number"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "7px 12px",
                  borderRadius: "var(--radius-sm)",
                  border: copied ? "1px solid var(--ft-green)" : "1px solid var(--border-card)",
                  backgroundColor: copied ? "var(--ft-green-subtle)" : "#FFFFFF",
                  color: copied ? "var(--ft-green-active)" : "var(--text-secondary)",
                  fontSize: "0.75rem",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  flexShrink: 0,
                }}
              >
                {copied ? (
                  <>
                    <Check size={14} color="var(--ft-green-active)" />
                    <span>{tr.common.actions.copied}</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>{lang === "bn" ? "নম্বর কপি করুন" : "Copy Number"}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 3. Transfer Instruction Card */}
          <div
            style={{
              backgroundColor: "var(--bg-main)",
              border: "1px solid var(--border-card)",
              borderRadius: "var(--radius-md)",
              padding: "10px 14px",
              fontSize: "0.8125rem",
              lineHeight: 1.45,
              marginBottom: "14px",
              display: "flex",
              gap: "10px",
              alignItems: "center",
            }}
          >
            <div style={{ flexShrink: 0, width: "4px", height: "32px", backgroundColor: "var(--ft-green)", borderRadius: "2px" }} />
            <div>
              <div style={{ fontSize: "0.6875rem", fontWeight: "500", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {lang === "bn" ? "ট্রান্সফার পদ্ধতি:" : "Transfer via:"}
              </div>
              <div style={{ color: "var(--text-primary)", fontWeight: "500", fontSize: "0.8125rem" }}>
                {getTransferInstructionText(activeOpCode)}
              </div>
            </div>
          </div>

          {/* 4. Transaction ID Field */}
          <div className="form-group" style={{ marginBottom: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
              <label htmlFor="trx-id-input" className="form-label" style={{ fontSize: "0.8125rem", margin: 0 }}>
                {tCash.trxIdLabel} <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>
                {lang === "bn" ? "অপারেটর এসএমএস থেকে" : "From operator SMS"}
              </span>
            </div>
            <input
              id="trx-id-input"
              type="text"
              className="form-input"
              placeholder={tCash.trxIdPlaceholder}
              value={trxReference}
              onChange={(e) => setTrxReference(e.target.value)}
              required
              style={{ height: "42px", fontSize: "0.875rem" }}
            />
          </div>

          {/* 5. Screenshot Upload */}
          <div className="form-group" style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
              <label className="form-label" style={{ fontSize: "0.8125rem", margin: 0 }}>
                {lang === "bn" ? "স্ক্রিনশট" : "Screenshot"}{" "}
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "400" }}>
                  {lang === "bn" ? "(ঐচ্ছিক)" : "(Optional)"}
                </span>
              </label>
              {uploadState === "SUCCESS" && (
                <span style={{ fontSize: "0.6875rem", color: "var(--ft-green)", fontWeight: "500" }}>
                  {lang === "bn" ? "সংযুক্ত হয়েছে" : "Attached"}
                </span>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/webp"
              onChange={handleFileSelect}
              style={{ display: "none" }}
              id="proof-upload-input"
            />

            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                if (uploadState !== "UPLOADING") {
                  fileInputRef.current?.click();
                }
              }}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && uploadState !== "UPLOADING") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              style={{
                position: "relative",
                overflow: "hidden",
                border: uploadState === "ERROR"
                  ? "1px solid #FECACA"
                  : uploadState === "SUCCESS"
                  ? "1px solid #BBF7D0"
                  : "1px dashed var(--border-card)",
                borderRadius: "var(--radius-sm)",
                backgroundColor: uploadState === "ERROR"
                  ? "#FEF2F2"
                  : uploadState === "SUCCESS"
                  ? "var(--ft-green-subtle)"
                  : "var(--bg-main)",
                height: "44px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 14px",
                cursor: uploadState === "UPLOADING" ? "wait" : "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {/* Thin in-button progress fill */}
              {uploadState === "UPLOADING" && (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${uploadProgress}%`,
                    backgroundColor: "rgba(0, 166, 81, 0.15)",
                    transition: "width 0.2s ease",
                    zIndex: 1,
                  }}
                />
              )}

              {/* Content layer */}
              <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", gap: "10px", width: "100%", overflow: "hidden" }}>
                {uploadState === "IDLE" && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", justifyContent: "center" }}>
                    <Upload size={16} color="var(--ft-green)" />
                    <span style={{ fontSize: "0.8125rem", fontWeight: "500", color: "var(--text-primary)" }}>
                      {lang === "bn" ? "স্ক্রিনশট আপলোড করুন" : "Upload Screenshot"}
                    </span>
                  </div>
                )}

                {uploadState === "UPLOADING" && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <RefreshCw size={15} className="animate-spin" color="var(--ft-green)" />
                      <span style={{ fontSize: "0.8125rem", fontWeight: "500", color: "var(--text-primary)" }}>
                        {lang === "bn" ? `আপলোড হচ্ছে… ${toBnDigits(uploadProgress)}%` : `Uploading… ${uploadProgress}%`}
                      </span>
                    </div>
                    <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>
                      {lang === "bn" ? "অপেক্ষা করুন" : "Please wait"}
                    </span>
                  </div>
                )}

                {uploadState === "SUCCESS" && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {previewUrl && (
                        <img
                          src={previewUrl}
                          alt="Screenshot thumbnail"
                          style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "4px",
                            objectFit: "cover",
                            border: "1px solid #BBF7D0",
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <Check size={16} color="var(--ft-green)" style={{ flexShrink: 0 }} />
                      <span style={{
                        fontSize: "0.8125rem",
                        fontWeight: "500",
                        color: "#166534",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>
                        {proofFile?.name || "screenshot.jpg"}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          fontSize: "0.75rem",
                          color: "var(--ft-green-active)",
                          fontWeight: "500",
                          cursor: "pointer",
                          padding: "2px 4px",
                        }}
                      >
                        {lang === "bn" ? "পরিবর্তন" : "Replace"}
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        aria-label="Remove screenshot"
                        style={{
                          background: "none",
                          border: "none",
                          fontSize: "0.75rem",
                          color: "#991B1B",
                          fontWeight: "500",
                          cursor: "pointer",
                          padding: "2px 4px",
                        }}
                      >
                        {lang === "bn" ? "মুছুন" : "Remove"}
                      </button>
                    </div>
                  </div>
                )}

                {uploadState === "ERROR" && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <AlertCircle size={16} color="#DC2626" />
                      <span style={{ fontSize: "0.8125rem", fontWeight: "500", color: "#DC2626" }}>
                        {lang === "bn" ? "আপলোড ব্যর্থ হয়েছে — আবার চেষ্টা করুন" : "Upload failed — Try again"}
                      </span>
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "var(--ft-green-active)", fontWeight: "500" }}>
                      {lang === "bn" ? "পুনরায় চেষ্টা" : "Retry"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 6. Action Buttons */}
          <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn btn-outline"
              style={{
                flex: 1,
                height: "48px",
                fontSize: "0.875rem",
                fontWeight: "500",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
              disabled={submitting}
            >
              <ArrowLeft size={16} />
              <span>{tr.common.actions.back}</span>
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                flex: 2.2,
                height: "48px",
                fontWeight: "600",
                fontSize: "0.9375rem",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
              disabled={submitting || !trxReference.trim()}
            >
              {submitting ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>{tr.common.loading}</span>
                </>
              ) : (
                <>
                  <span>{lang === "bn" ? "যাচাইয়ের জন্য জমা দিন" : "Submit for Verification"}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>

          {/* 7. Subtle Security Note */}
          <TrustNote />
        </form>
      )}
    </div>
  );
}

export default function CashOutWizardPage() {
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
      <CashOutWizardContent />
    </React.Suspense>
  );
}
