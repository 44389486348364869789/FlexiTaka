"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, CheckCircle2, RefreshCw, ShieldCheck, X } from "lucide-react";
import { api } from "@/lib/api";
import { useLanguage } from "@/i18n/LanguageContext";

interface OtpVerificationModalProps {
  isOpen: boolean;
  phone: string;
  onSuccess: (verifiedPhone: string, authResult?: any) => void;
  onClose: () => void;
  isOperatorAuth?: boolean;
  referenceId?: string;
  expectedLength?: number;
}

export default function OtpVerificationModal({
  isOpen,
  phone,
  onSuccess,
  onClose,
  isOperatorAuth = false,
  referenceId,
  expectedLength,
}: OtpVerificationModalProps) {
  const { isBn, toBnDigits, t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (!isOpen) return;
    setCooldown(60);
    setError(null);
    setOtp("");
    setSuccess(false);

    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, phone]);

  // Focus OTP input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanOtp = otp.trim();
    const minLen = expectedLength || (isOperatorAuth ? 4 : 6);
    if (cleanOtp.length < minLen || cleanOtp.length > 6) {
      setError(
        isBn
          ? `সঠিক ${expectedLength || "৪-৬"} ডিজিটের OTP লিখুন`
          : `Please enter the valid ${expectedLength || "4-6"} digit OTP`
      );
      return;
    }

    setError(null);
    setLoading(true);

    try {
      if (isOperatorAuth) {
        const authRes = await api.verifyOperatorOtp(phone, cleanOtp, referenceId);
        setSuccess(true);
        setTimeout(() => {
          onSuccess(phone, authRes);
        }, 700);
      } else {
        await api.verifyOtp(phone, cleanOtp);
        setSuccess(true);
        setTimeout(() => {
          onSuccess(phone);
        }, 700);
      }
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.toLowerCase().includes("expired") || msg.includes("মেয়াদ")) {
        setError(isBn ? "OTP-এর মেয়াদ শেষ হয়েছে। আবার পাঠান।" : "OTP expired. Please resend.");
      } else if (msg.toLowerCase().includes("too many") || msg.includes("অনেক")) {
        setError(isBn ? "অতিরিক্ত ভুল প্রচেষ্টা। কিছুক্ষণ পর চেষ্টা করুন।" : "Too many attempts. Please try again later.");
      } else {
        setError(isBn ? (msg || "ভুল OTP। আবার চেষ্টা করুন।") : (msg || "Invalid OTP. Please try again."));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError(null);

    try {
      if (isOperatorAuth) {
        await api.requestOperatorOtp(phone);
      } else {
        await api.requestOtp(phone);
      }
      setCooldown(60);
      setOtp("");
      const timer = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setError(err?.message || (isBn ? "OTP পাঠাতে ব্যর্থ হয়েছে" : "Failed to resend OTP"));
    } finally {
      setResending(false);
    }
  };

  const formattedPhone = isBn ? toBnDigits(phone) : phone;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "var(--radius-lg, 16px)",
          maxWidth: "420px",
          width: "100%",
          boxShadow: "0 20px 40px rgba(15, 23, 42, 0.2)",
          padding: "24px",
          position: "relative",
          animation: "fadeIn 0.2s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "var(--bg-main, #F8FAFC)",
            border: "1px solid var(--border-light, #E2E8F0)",
            borderRadius: "50%",
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--text-secondary, #64748B)",
          }}
          aria-label={isBn ? "বন্ধ করুন" : "Close"}
        >
          <X size={16} />
        </button>

        {/* Modal Header */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              backgroundColor: success ? "#DCFCE7" : "var(--ft-green-subtle, #F0FDF4)",
              color: success ? "#16A34A" : "var(--ft-green, #00A859)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "12px",
            }}
          >
            {success ? <CheckCircle2 size={26} /> : <ShieldCheck size={26} />}
          </div>
          <h3
            style={{
              fontSize: "1.125rem",
              fontWeight: "700",
              color: "var(--text-primary, #0F172A)",
              marginBottom: "6px",
            }}
          >
            {isBn ? "মোবাইল নম্বর যাচাই করুন" : "Verify Mobile Number"}
          </h3>
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--text-secondary, #64748B)",
              lineHeight: 1.5,
            }}
          >
            {isBn ? "আপনার নম্বরে পাঠানো OTP লিখুন" : "Enter the OTP sent to your number"}:{" "}
            <strong style={{ color: "var(--text-primary, #0F172A)" }}>{formattedPhone}</strong>
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "#FEF2F2",
              border: "1px solid #FECACA",
              color: "#DC2626",
              borderRadius: "var(--radius-md, 8px)",
              padding: "10px 14px",
              fontSize: "0.84375rem",
              marginBottom: "16px",
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Success Notification */}
        {success && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "#F0FDF4",
              border: "1px solid #BBF7D0",
              color: "#16A34A",
              borderRadius: "var(--radius-md, 8px)",
              padding: "10px 14px",
              fontSize: "0.84375rem",
              marginBottom: "16px",
            }}
          >
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{isBn ? "OTP যাচাই সম্পন্ন হয়েছে!" : "OTP verified successfully!"}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleVerify}>
          <div style={{ marginBottom: "16px" }}>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={otp}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                setOtp(val);
                if (error) setError(null);
              }}
              disabled={loading || success}
              placeholder="••••••"
              style={{
                width: "100%",
                height: "50px",
                fontSize: "1.5rem",
                letterSpacing: "0.35em",
                textAlign: "center",
                fontWeight: "700",
                fontFamily: "monospace",
                border: "2px solid var(--border-light, #E2E8F0)",
                borderRadius: "var(--radius-md, 10px)",
                outline: "none",
                transition: "border-color 0.2s ease",
                backgroundColor: loading || success ? "var(--bg-subtle, #F1F5F9)" : "#FFFFFF",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--ft-green, #00A859)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border-light, #E2E8F0)")}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || success || otp.trim().length !== 6}
            className="btn btn-primary"
            style={{
              width: "100%",
              height: "46px",
              fontSize: "0.9375rem",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              borderRadius: "var(--radius-md, 8px)",
              opacity: loading || success || otp.trim().length !== 6 ? 0.7 : 1,
              cursor: loading || success || otp.trim().length !== 6 ? "not-allowed" : "pointer",
            }}
          >
            {loading && <RefreshCw size={16} className="spin" />}
            <span>{isBn ? "যাচাই করুন" : "Verify"}</span>
          </button>
        </form>

        {/* Resend Action */}
        <div
          style={{
            marginTop: "16px",
            textAlign: "center",
            fontSize: "0.84375rem",
            color: "var(--text-secondary, #64748B)",
          }}
        >
          {cooldown > 0 ? (
            <span>
              {isBn ? "আবার OTP পাঠান" : "Resend OTP in"}:{" "}
              <strong style={{ color: "var(--ft-green, #00A859)" }}>
                {isBn ? toBnDigits(cooldown) : cooldown}s
              </strong>
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || loading}
              style={{
                background: "none",
                border: "none",
                color: "var(--ft-green-active, #006C38)",
                fontWeight: "600",
                cursor: resending ? "not-allowed" : "pointer",
                padding: "4px 8px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {resending && <RefreshCw size={14} className="spin" />}
              <span>{isBn ? "আবার OTP পাঠান" : "Resend OTP"}</span>
            </button>
          )}
        </div>

        {/* Security Notice */}
        <div
          style={{
            marginTop: "18px",
            padding: "10px 12px",
            backgroundColor: "var(--bg-main, #F8FAFC)",
            borderRadius: "var(--radius-sm, 6px)",
            fontSize: "0.75rem",
            color: "var(--text-muted, #94A3B8)",
            lineHeight: 1.4,
            textAlign: "center",
          }}
        >
          {t(
            "common.security.operatorOtpShortNotice",
            isBn
              ? "নিরাপত্তা তথ্য: প্রয়োজনে আপনার SIM অ্যাকাউন্ট যাচাই করতে operator verification OTP চাওয়া হতে পারে। আমরা কখনো আপনার SIM PIN বা account password চাইব না।"
              : "Security: An operator verification OTP may be requested when needed to authenticate your SIM account. We will never ask for your SIM PIN or account password."
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
