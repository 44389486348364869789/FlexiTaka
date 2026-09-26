"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { OrderProgressResponse, OrderProgressStep } from "@/lib/types";
import { formatBDT } from "@/lib/formatters";
import StatusBadge from "@/components/StatusBadge";
import FlexiLoading from "@/components/FlexiLoading";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Hash,
  Headphones,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  AlertCircle,
  XCircle,
  Timer,
  ChevronRight,
  Layers,
} from "lucide-react";

function OrderProgressContent() {
  const { lang, toBnDigits } = useLanguage();
  const params = useParams();
  const searchParams = useSearchParams();
  const orderId = params.id as string;
  const trackingToken = searchParams.get("token") || searchParams.get("tracking_token");

  const [progress, setProgress] = useState<OrderProgressResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [transferOtp, setTransferOtp] = useState("");

  const handleVerifyOtp = async () => {
    if (!transferOtp.trim()) return;
    setSubmittingAction(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await api.verifyNextCashOutOtp(orderId, transferOtp.trim(), trackingToken || undefined);
      setTransferOtp("");
      if (res.completed) {
        setActionSuccess(lang === "bn" ? "সকল ট্রান্সফার সফলভাবে সম্পন্ন হয়েছে!" : "All transfers completed successfully!");
      } else {
        setActionSuccess(res.message || (lang === "bn" ? "ওটিপি সফলভাবে যাচাই করা হয়েছে।" : "OTP verified successfully."));
      }
      await fetchProgress(true);
    } catch (err: any) {
      setActionError(err.message || (lang === "bn" ? "ওটিপি যাচাই ব্যর্থ হয়েছে।" : "Failed to verify transfer OTP."));
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleContinueRemaining = async () => {
    setSubmittingAction(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await api.continueRemainingCashOut(orderId, undefined, undefined, trackingToken || undefined);
      setActionSuccess(res.message || (lang === "bn" ? "পরবর্তী ট্রান্সফার শুরু হয়েছে।" : "Continuing remaining transfers."));
      await fetchProgress(true);
    } catch (err: any) {
      setActionError(err.message || (lang === "bn" ? "ট্রান্সফার চালু করা সম্ভব হয়নি।" : "Could not continue remaining transfers."));
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleCancelRemaining = async () => {
    if (typeof window !== "undefined" && !window.confirm(lang === "bn" ? "আপনি কি নিশ্চিতভাবে বাকি ট্রান্সফার বাতিল করে প্রাপ্ত অংশের ক্যাশ আউট পেতে চান?" : "Are you sure you want to cancel remaining transfers and settle confirmed amount?")) {
      return;
    }
    setSubmittingAction(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await api.cancelRemainingCashOut(orderId, trackingToken || undefined);
      setActionSuccess(res.message || (lang === "bn" ? "বাকি অংশ বাতিল করে প্রাপ্ত ব্যালেন্স ক্যাশ আউট করা হয়েছে।" : "Cancelled remaining transfers. Confirmed balance queued for payout."));
      await fetchProgress(true);
    } catch (err: any) {
      setActionError(err.message || (lang === "bn" ? "বাতিল করা সম্ভব হয়নি।" : "Could not cancel remaining transfers."));
    } finally {
      setSubmittingAction(false);
    }
  };

  const fetchProgress = useCallback(
    async (isManual = false) => {
      if (isManual) setRefreshing(true);
      try {
        const data = await api.getOrderProgress(orderId, trackingToken);
        setProgress(data);
        setError(null);
      } catch (err: any) {
        if (!progress) {
          setError(
            err.message ||
              (lang === "bn"
                ? "অর্ডারের লাইভ প্রগ্রেস লোড করা সম্ভব হয়নি।"
                : "Failed to load order progress.")
          );
        }
      } finally {
        setLoading(false);
        if (isManual) setRefreshing(false);
      }
    },
    [orderId, trackingToken, progress, lang]
  );

  // Initial load
  useEffect(() => {
    if (orderId) {
      fetchProgress(false);
    }
  }, [orderId, trackingToken]);

  // Auto-refresh interval while non-terminal
  useEffect(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    if (progress && !progress.is_terminal) {
      pollingRef.current = setInterval(() => {
        fetchProgress(false);
      }, 3500);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [progress?.is_terminal, fetchProgress]);

  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getOperatorInfo = (code?: string) => {
    switch (code) {
      case "GP":
        return { name: "Grameenphone", logo: "/logos/gp.svg", color: "#006699" };
      case "ROBI":
        return { name: "Robi", logo: "/logos/robi.svg", color: "#EE1D23" };
      case "BANGLALINK":
        return { name: "Banglalink", logo: "/logos/banglalink.svg", color: "#FF6600" };
      default:
        return { name: code || "Telecom", logo: null, color: "#4F46E5" };
    }
  };

  const fullOrderUrl = `/app/order/${orderId}${
    trackingToken ? `?token=${encodeURIComponent(trackingToken)}` : ""
  }`;

  if (loading && !progress) {
    return (
      <div style={{ maxWidth: "840px", margin: "60px auto", textAlign: "center" }}>
        <FlexiLoading size="lg" text={lang === "bn" ? "লাইভ প্রগ্রেস লোড হচ্ছে..." : "Loading live order progress..."} />
      </div>
    );
  }

  if (error && !progress) {
    return (
      <div style={{ maxWidth: "840px", margin: "40px auto", padding: "0 16px" }}>
        <div
          style={{
            backgroundColor: "#FEF2F2",
            border: "1.5px solid #FECACA",
            borderRadius: "16px",
            padding: "32px 24px",
            textAlign: "center",
          }}
        >
          <AlertCircle size={48} color="#DC2626" style={{ margin: "0 auto 16px" }} />
          <h2 style={{ fontSize: "1.25rem", fontWeight: "700", color: "#991B1B", marginBottom: "8px" }}>
            {lang === "bn" ? "অর্ডার লোড করা যায়নি" : "Order Could Not Be Loaded"}
          </h2>
          <p style={{ color: "#7F1D1D", fontSize: "0.9375rem", marginBottom: "20px" }}>{error}</p>
          <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
            <button
              onClick={() => fetchProgress(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                borderRadius: "10px",
                backgroundColor: "#DC2626",
                color: "#FFFFFF",
                border: "none",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              <RefreshCw size={16} />
              <span>{lang === "bn" ? "পুনরায় চেষ্টা করুন" : "Try Again"}</span>
            </button>
            <Link
              href="/app/orders"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                borderRadius: "10px",
                backgroundColor: "#FFFFFF",
                color: "#374151",
                border: "1px solid #D1D5DB",
                fontWeight: "600",
                textDecoration: "none",
              }}
            >
              <ArrowLeft size={16} />
              <span>{lang === "bn" ? "অর্ডার তালিকায় ফিরুন" : "Back to Orders"}</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!progress) return null;

  const opInfo = getOperatorInfo(progress.operator_code);
  const isCashOut = progress.service_type === "CASH_OUT";
  const completedStepsCount = progress.steps.filter((s) => s.status === "COMPLETED").length;
  const progressPercent = Math.min(
    100,
    Math.round(
      progress.status === "COMPLETED"
        ? 100
        : (completedStepsCount / progress.total_steps) * 100
    )
  );

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto", padding: "16px 16px 60px" }}>
      {/* Top Navigation Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <Link
          href="/app/orders"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "0.875rem",
            color: "#475569",
            fontWeight: "600",
            textDecoration: "none",
            backgroundColor: "#F1F5F9",
            padding: "8px 14px",
            borderRadius: "10px",
            transition: "all 0.2s ease",
          }}
        >
          <ArrowLeft size={16} />
          <span>{lang === "bn" ? "সকল অর্ডার" : "All Orders"}</span>
        </Link>

        {/* Dynamic Link: View Full Order */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <a
            id="view-full-order-btn"
            href={`https://www.flexitaka.com/app/order/${orderId}${
              trackingToken ? `?token=${encodeURIComponent(trackingToken)}` : ""
            }`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "0.875rem",
              color: "#1D4ED8",
              backgroundColor: "#EFF6FF",
              border: "1.5px solid #BFDBFE",
              padding: "8px 16px",
              borderRadius: "10px",
              fontWeight: "700",
              textDecoration: "none",
              transition: "all 0.2s ease",
            }}
          >
            <span>{lang === "bn" ? "অর্ডারের বিস্তারিত দেখুন" : "View Full Order"}</span>
            <ExternalLink size={15} />
          </a>

          <button
            onClick={() => fetchProgress(true)}
            disabled={refreshing}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.875rem",
              color: "#475569",
              backgroundColor: "#FFFFFF",
              border: "1px solid #E2E8F0",
              padding: "8px 14px",
              borderRadius: "10px",
              fontWeight: "600",
              cursor: refreshing ? "not-allowed" : "pointer",
            }}
            title={lang === "bn" ? "প্রগ্রেস রিফ্রেশ করুন" : "Refresh Progress"}
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            <span>{refreshing ? (lang === "bn" ? "রিফ্রেশ হচ্ছে..." : "Refreshing...") : (lang === "bn" ? "রিফ্রেশ" : "Refresh")}</span>
          </button>
        </div>
      </div>

      {/* Main Order Header Summary Card */}
      <div
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "18px",
          padding: "24px 28px",
          boxShadow: "0 2px 10px rgba(0, 0, 0, 0.04)",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "16px",
            marginBottom: "20px",
          }}
        >
          {/* Order ID & Service Badges */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "1.125rem",
                  fontWeight: "800",
                  color: "#0F172A",
                  fontFamily: "var(--font-mono, monospace)",
                }}
              >
                <Hash size={18} color="#64748B" />
                {progress.order_id}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(progress.order_id)}
                style={{
                  background: "none",
                  border: "none",
                  color: copied ? "#16A34A" : "#94A3B8",
                  cursor: "pointer",
                  padding: "4px",
                  display: "inline-flex",
                  alignItems: "center",
                }}
                title={lang === "bn" ? "অর্ডার আইডি কপি করুন" : "Copy Order ID"}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>

              <span
                style={{
                  padding: "4px 10px",
                  borderRadius: "8px",
                  fontSize: "0.75rem",
                  fontWeight: "800",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  backgroundColor: isCashOut ? "#FEF3C7" : "#E0E7FF",
                  color: isCashOut ? "#B45309" : "#4338CA",
                  border: `1px solid ${isCashOut ? "#FDE68A" : "#C7D2FE"}`,
                }}
              >
                {isCashOut
                  ? lang === "bn"
                    ? "ক্যাশ আউট"
                    : "Cash Out"
                  : lang === "bn"
                  ? "মোবাইল রিচার্জ"
                  : "Recharge"}
              </span>

              <span
                style={{
                  padding: "4px 10px",
                  borderRadius: "8px",
                  fontSize: "0.75rem",
                  fontWeight: "800",
                  backgroundColor: "#F1F5F9",
                  color: "#334155",
                  border: "1px solid #E2E8F0",
                }}
              >
                {opInfo.name}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "#64748B", fontSize: "0.875rem" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                <Smartphone size={15} />
                <span style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: "600", color: "#334155" }}>
                  {progress.mobile_number}
                </span>
              </span>
              <span>•</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                <Clock size={14} />
                <span>
                  {lang === "bn" ? "হালনাগাদ: " : "Updated: "}
                  {progress.last_updated
                    ? new Date(progress.last_updated).toLocaleTimeString(
                        lang === "bn" ? "bn-BD" : "en-US",
                        { hour: "2-digit", minute: "2-digit", second: "2-digit" }
                      )
                    : "Live"}
                </span>
              </span>
            </div>
          </div>

          {/* Amount & Status Badge */}
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: "1.75rem",
                fontWeight: "900",
                color: "#0F172A",
                fontFamily: "var(--font-mono, monospace)",
                letterSpacing: "-0.02em",
                marginBottom: "6px",
              }}
            >
              {formatBDT(progress.amount_bdt)}
            </div>
            <div style={{ display: "inline-flex", justifyContent: "flex-end" }}>
              <StatusBadge status={progress.status} />
            </div>
          </div>
        </div>

        {/* Linear Progress Bar */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "0.8125rem",
              fontWeight: "700",
              color: "#475569",
              marginBottom: "8px",
            }}
          >
            <span>
              {lang === "bn"
                ? `ধাপ ${toBnDigits(progress.current_step_index)} / ${toBnDigits(progress.total_steps)}: ${progress.status_display_bn}`
                : `Step ${progress.current_step_index} of ${progress.total_steps}: ${progress.status_display_en}`}
            </span>
            <span style={{ fontFamily: "var(--font-mono, monospace)", color: progress.is_failed ? "#DC2626" : "#2563EB" }}>
              {progressPercent}%
            </span>
          </div>

          <div
            style={{
              height: "10px",
              width: "100%",
              backgroundColor: "#F1F5F9",
              borderRadius: "10px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progressPercent}%`,
                backgroundColor: progress.is_failed
                  ? "#DC2626"
                  : progress.status === "COMPLETED"
                  ? "#16A34A"
                  : "#2563EB",
                borderRadius: "10px",
                transition: "width 0.4s ease",
              }}
            />
          </div>
        </div>
      </div>

      {/* Dynamic State Alert Banner */}
      {progress.is_waiting && !progress.is_terminal && (
        <div
          style={{
            backgroundColor: "#FFFBEB",
            border: "1.5px solid #FDE68A",
            borderRadius: "14px",
            padding: "16px 20px",
            display: "flex",
            alignItems: "flex-start",
            gap: "14px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              backgroundColor: "#FEF3C7",
              color: "#D97706",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Timer size={18} className="animate-spin" style={{ animationDuration: "3s" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: "700", color: "#92400E", fontSize: "0.9375rem", marginBottom: "4px" }}>
              {lang === "bn" ? "অপেক্ষমাণ অবস্থা (Waiting State)" : "Waiting State"}
            </div>
            <p style={{ color: "#B45309", fontSize: "0.875rem", margin: 0, lineHeight: 1.5 }}>
              {lang === "bn"
                ? progress.waiting_message_bn || "পরবর্তী ধাপের জন্য সিস্টেম প্রসেস চলছে। অনুগ্রহ করে অপেক্ষা করুন।"
                : progress.waiting_message_en || "System is processing the next step. Please wait."}
            </p>
          </div>
        </div>
      )}

      {progress.is_failed && (
        <div
          style={{
            backgroundColor: "#FEF2F2",
            border: "1.5px solid #FECACA",
            borderRadius: "14px",
            padding: "18px 20px",
            display: "flex",
            alignItems: "flex-start",
            gap: "14px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              backgroundColor: "#FEE2E2",
              color: "#DC2626",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <XCircle size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: "800", color: "#991B1B", fontSize: "1rem", marginBottom: "4px" }}>
              {lang === "bn" ? "অর্ডার ব্যর্থ হয়েছে (Order Failed)" : "Order Failed"}
            </div>
            <p style={{ color: "#7F1D1D", fontSize: "0.875rem", margin: "0 0 12px 0", lineHeight: 1.5 }}>
              {lang === "bn"
                ? progress.waiting_message_bn || "এই অর্ডারের প্রক্রিয়া সম্পন্ন করা সম্ভব হয়নি।"
                : progress.waiting_message_en || "This order could not be completed."}
            </p>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <Link
                href="/app/support"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "0.8125rem",
                  fontWeight: "700",
                  color: "#FFFFFF",
                  backgroundColor: "#DC2626",
                  padding: "7px 14px",
                  borderRadius: "8px",
                  textDecoration: "none",
                }}
              >
                <Headphones size={14} />
                <span>{lang === "bn" ? "সাপোর্টে যোগাযোগ করুন" : "Contact Support"}</span>
              </Link>
              <Link
                href={fullOrderUrl}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "0.8125rem",
                  fontWeight: "700",
                  color: "#991B1B",
                  backgroundColor: "#FEE2E2",
                  padding: "7px 14px",
                  borderRadius: "8px",
                  textDecoration: "none",
                }}
              >
                <span>{lang === "bn" ? "অর্ডারের পূর্ণ বিবরণ দেখুন" : "View Full Order"}</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {progress.status === "COMPLETED" && (
        <div
          style={{
            backgroundColor: "#F0FDF4",
            border: "1.5px solid #BBF7D0",
            borderRadius: "14px",
            padding: "18px 20px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              backgroundColor: "#DCFCE7",
              color: "#16A34A",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <CheckCircle2 size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: "800", color: "#166534", fontSize: "1rem" }}>
              {lang === "bn" ? "অর্ডার সফলভাবে সম্পন্ন হয়েছে!" : "Order Successfully Completed!"}
            </div>
            <p style={{ color: "#15803D", fontSize: "0.875rem", margin: "4px 0 0 0" }}>
              {isCashOut
                ? lang === "bn"
                  ? "ক্যাশ আউট পেমেন্ট সফলভাবে আপনার অ্যাকাউন্টে পাঠিয়ে দেওয়া হয়েছে।"
                  : "Cash out payout has been successfully dispatched to your payout account."
                : lang === "bn"
                ? "রিচার্জ সফলভাবে গ্রাহকের নম্বরে পৌঁছে গেছে।"
                : "Recharge balance has been successfully credited to the recipient."}
            </p>
          </div>
        </div>
      )}

      {/* Multi-Chunk Balance Transfer Card */}
      {progress.transfer_progress && (
        <div
          style={{
            backgroundColor: "#F8FAFC",
            border: "1.5px solid #E2E8F0",
            borderRadius: "16px",
            padding: "20px 24px",
            marginBottom: "24px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "14px",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "800", color: "#1E293B", fontSize: "1rem" }}>
              <Layers size={20} color="#2563EB" />
              <span>
                {lang === "bn" ? "ব্যালেন্স ট্রান্সফার অগ্রগতি" : "Balance Transfer Progress"}
              </span>
            </div>
            {(progress.transfer_progress.is_cooling_down || (progress.transfer_progress.cooldown_seconds_remaining || 0) > 0) && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "5px 12px",
                  borderRadius: "20px",
                  backgroundColor: "#FEF3C7",
                  color: "#B45309",
                  fontSize: "0.8125rem",
                  fontWeight: "700",
                  border: "1px solid #FDE68A",
                }}
              >
                <Clock size={14} className="animate-spin" style={{ animationDuration: "4s" }} />
                <span>
                  {lang === "bn"
                    ? `অপারেটর কুলডাউন: ${toBnDigits(progress.transfer_progress.cooldown_seconds_remaining || progress.transfer_progress.cooldown_seconds || 0)} সেকেন্ড বাকি`
                    : `Operator Cooldown: ${progress.transfer_progress.cooldown_seconds_remaining || progress.transfer_progress.cooldown_seconds || 0}s remaining`}
                </span>
              </span>
            )}
          </div>

          {/* Action Success / Error Notifications */}
          {actionSuccess && (
            <div style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0", color: "#166534", padding: "10px 14px", borderRadius: "10px", marginBottom: "14px", fontSize: "0.875rem", fontWeight: "600" }}>
              ✓ {actionSuccess}
            </div>
          )}
          {actionError && (
            <div style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B", padding: "10px 14px", borderRadius: "10px", marginBottom: "14px", fontSize: "0.875rem", fontWeight: "600" }}>
              ✕ {actionError}
            </div>
          )}

          {/* Progress Metrics Grid */}
          {(() => {
            const completedAmt = progress.transfer_progress.completed_amount_bdt ?? progress.transfer_progress.amount_transferred_bdt ?? progress.completed_amount_bdt ?? 0;
            const remainingAmt = progress.transfer_progress.remaining_amount_bdt ?? progress.remaining_amount_bdt ?? Math.max(0, Number(progress.amount_bdt) - completedAmt);
            const totalAmt = progress.transfer_progress.requested_amount_bdt ?? Number(progress.amount_bdt);
            const isOtpRequired = progress.otp_required_for_next_chunk || progress.transfer_progress.otp_required_for_next_chunk || progress.action_required === "OTP_REQUIRED" || progress.transfer_progress.action_required === "OTP_REQUIRED";
            const isPartial = progress.status === "PARTIALLY_COMPLETED" || (completedAmt > 0 && remainingAmt > 0 && !progress.is_terminal);

            return (
              <div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                    gap: "12px",
                    marginBottom: "16px",
                  }}
                >
                  <div style={{ backgroundColor: "#FFFFFF", padding: "12px 16px", borderRadius: "12px", border: "1px solid #E2E8F0" }}>
                    <div style={{ color: "#64748B", fontSize: "0.8125rem", marginBottom: "4px" }}>
                      {lang === "bn" ? "সফলভাবে স্থানান্তরিত" : "Successfully Transferred"}
                    </div>
                    <div style={{ fontWeight: "800", color: "#16A34A", fontSize: "1.25rem", fontFamily: "var(--font-mono, monospace)" }}>
                      ৳{toBnDigits(completedAmt)}
                    </div>
                  </div>
                  <div style={{ backgroundColor: "#FFFFFF", padding: "12px 16px", borderRadius: "12px", border: "1px solid #E2E8F0" }}>
                    <div style={{ color: "#64748B", fontSize: "0.8125rem", marginBottom: "4px" }}>
                      {lang === "bn" ? "বাকি রয়েছে" : "Remaining Amount"}
                    </div>
                    <div style={{ fontWeight: "800", color: remainingAmt > 0 ? "#D97706" : "#64748B", fontSize: "1.25rem", fontFamily: "var(--font-mono, monospace)" }}>
                      ৳{toBnDigits(remainingAmt)}
                    </div>
                  </div>
                  <div style={{ backgroundColor: "#FFFFFF", padding: "12px 16px", borderRadius: "12px", border: "1px solid #E2E8F0" }}>
                    <div style={{ color: "#64748B", fontSize: "0.8125rem", marginBottom: "4px" }}>
                      {lang === "bn" ? "সম্পন্ন চাঙ্ক" : "Completed Chunks"}
                    </div>
                    <div style={{ fontWeight: "800", color: "#0F172A", fontSize: "1.25rem", fontFamily: "var(--font-mono, monospace)" }}>
                      {progress.transfer_progress.chunks_completed ?? 0} / {progress.transfer_progress.chunks_total ?? 0}
                    </div>
                  </div>
                </div>

                {/* Sequential OTP Verification Box (When operator requires OTP per transfer) */}
                {isOtpRequired && (
                  <div
                    style={{
                      backgroundColor: "#EFF6FF",
                      border: "1.5px solid #BFDBFE",
                      borderRadius: "14px",
                      padding: "18px 20px",
                      marginBottom: "16px",
                    }}
                  >
                    <div style={{ fontWeight: "800", color: "#1E40AF", fontSize: "0.9375rem", marginBottom: "6px" }}>
                      {lang === "bn" ? "পরবর্তী ট্রান্সফার নিশ্চিতকরণ (OTP)" : "Next Transfer Verification (OTP)"}
                    </div>
                    <p style={{ color: "#1D4ED8", fontSize: "0.875rem", margin: "0 0 12px 0" }}>
                      {progress.transfer_progress.next_action || (lang === "bn"
                        ? `পরবর্তী চাঙ্ক স্থানান্তরের জন্য আপনার নম্বরে পাঠানো ওটিপি কোডটি লিখুন:`
                        : `Please enter the verification OTP sent to your phone for the next transfer chunk:`)}
                    </p>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder={lang === "bn" ? "ওটিপি কোড (যেমন: 1234)" : "Enter 4-6 digit OTP"}
                        value={transferOtp}
                        onChange={(e) => setTransferOtp(e.target.value)}
                        maxLength={8}
                        style={{
                          padding: "10px 14px",
                          borderRadius: "10px",
                          border: "1.5px solid #93C5FD",
                          fontSize: "1rem",
                          fontFamily: "var(--font-mono, monospace)",
                          fontWeight: "700",
                          letterSpacing: "0.1em",
                          width: "180px",
                        }}
                      />
                      <button
                        id="verify-next-transfer-btn"
                        onClick={handleVerifyOtp}
                        disabled={submittingAction || !transferOtp.trim()}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "10px 20px",
                          borderRadius: "10px",
                          backgroundColor: "#2563EB",
                          color: "#FFFFFF",
                          border: "none",
                          fontWeight: "700",
                          fontSize: "0.875rem",
                          cursor: submittingAction || !transferOtp.trim() ? "not-allowed" : "pointer",
                          opacity: submittingAction || !transferOtp.trim() ? 0.6 : 1,
                        }}
                      >
                        {submittingAction ? (lang === "bn" ? "যাচাই হচ্ছে..." : "Verifying...") : (lang === "bn" ? "যাচাই ও ট্রান্সফার করুন" : "Verify Next Transfer")}
                      </button>
                    </div>
                  </div>
                )}

                {/* Partial Transfer Actions: [ Continue ৳... ] and [ Cancel Remaining ] */}
                {isPartial && !isOtpRequired && (
                  <div
                    style={{
                      backgroundColor: "#FFFBEB",
                      border: "1.5px solid #FDE68A",
                      borderRadius: "14px",
                      padding: "16px 20px",
                      marginTop: "12px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: "700", color: "#92400E", fontSize: "0.9375rem" }}>
                        ৳{toBnDigits(completedAmt)} {lang === "bn" ? "সফলভাবে স্থানান্তরিত হয়েছে" : "successfully transferred"} • ৳{toBnDigits(remainingAmt)} {lang === "bn" ? "বাকি রয়েছে" : "remaining"}
                      </div>
                      <div style={{ color: "#B45309", fontSize: "0.8125rem", marginTop: "2px" }}>
                        {lang === "bn"
                          ? "আপনি চাইলে বাকি ব্যালেন্স ট্রান্সফার সম্পন্ন করতে পারেন, অথবা বাকি অংশ বাতিল করে প্রাপ্ত টাকার ক্যাশ আউট নিতে পারেন।"
                          : "You can continue the remaining transfer or cancel it and settle payout for confirmed amount."}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      <button
                        id="continue-remaining-btn"
                        onClick={handleContinueRemaining}
                        disabled={submittingAction}
                        style={{
                          padding: "9px 18px",
                          borderRadius: "10px",
                          backgroundColor: "#2563EB",
                          color: "#FFFFFF",
                          border: "none",
                          fontWeight: "700",
                          fontSize: "0.875rem",
                          cursor: submittingAction ? "not-allowed" : "pointer",
                        }}
                      >
                        {submittingAction ? (lang === "bn" ? "অপেক্ষা করুন..." : "Processing...") : (lang === "bn" ? `চালিয়ে যান ৳${toBnDigits(remainingAmt)}` : `Continue ৳${remainingAmt}`)}
                      </button>
                      <button
                        id="cancel-remaining-btn"
                        onClick={handleCancelRemaining}
                        disabled={submittingAction}
                        style={{
                          padding: "9px 16px",
                          borderRadius: "10px",
                          backgroundColor: "#FFFFFF",
                          color: "#DC2626",
                          border: "1.5px solid #FECACA",
                          fontWeight: "700",
                          fontSize: "0.875rem",
                          cursor: submittingAction ? "not-allowed" : "pointer",
                        }}
                      >
                        {lang === "bn" ? "বাকি অংশ বাতিল করুন" : "Cancel Remaining"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Visual Stepper Section */}
      <div
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "18px",
          padding: "28px 24px",
          boxShadow: "0 2px 10px rgba(0, 0, 0, 0.04)",
          marginBottom: "28px",
        }}
      >
        <h3
          style={{
            fontSize: "1.125rem",
            fontWeight: "800",
            color: "#0F172A",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>{lang === "bn" ? "অর্ডারের ধাপসমূহ" : "Order Execution Milestones"}</span>
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
          {progress.steps.map((step, idx) => {
            const isCompleted = step.status === "COMPLETED";
            const isCurrent = step.status === "CURRENT";
            const isStepFailed = step.status === "FAILED";
            const isWaiting = step.status === "WAITING";
            const isLast = idx === progress.steps.length - 1;

            return (
              <div key={step.id} style={{ display: "flex", alignItems: "flex-start", position: "relative" }}>
                {/* Stepper Vertical Track */}
                {!isLast && (
                  <div
                    style={{
                      position: "absolute",
                      left: "19px",
                      top: "40px",
                      bottom: "-8px",
                      width: "3px",
                      backgroundColor: isCompleted ? "#16A34A" : "#E2E8F0",
                      zIndex: 1,
                    }}
                  />
                )}

                {/* Step Circle Indicator */}
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "800",
                    fontSize: "0.875rem",
                    zIndex: 2,
                    flexShrink: 0,
                    marginRight: "18px",
                    transition: "all 0.3s ease",
                    backgroundColor: isCompleted
                      ? "#16A34A"
                      : isCurrent
                      ? "#2563EB"
                      : isStepFailed
                      ? "#DC2626"
                      : "#F1F5F9",
                    color: isWaiting ? "#94A3B8" : "#FFFFFF",
                    boxShadow: isCurrent ? "0 0 0 4px rgba(37, 99, 235, 0.2)" : "none",
                  }}
                >
                  {isCompleted ? (
                    <Check size={20} strokeWidth={3} />
                  ) : isStepFailed ? (
                    <XCircle size={20} />
                  ) : (
                    <span>{toBnDigits(step.step_index)}</span>
                  )}
                </div>

                {/* Step Content */}
                <div
                  style={{
                    flex: 1,
                    paddingBottom: isLast ? "0" : "32px",
                    paddingTop: "2px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "8px",
                      marginBottom: "4px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "1rem",
                        fontWeight: isCurrent ? "800" : isCompleted ? "700" : "600",
                        color: isCurrent
                          ? "#1D4ED8"
                          : isCompleted
                          ? "#0F172A"
                          : isStepFailed
                          ? "#DC2626"
                          : "#94A3B8",
                      }}
                    >
                      {lang === "bn" ? step.title_bn : step.title_en}
                    </div>

                    {/* Step Status Badge */}
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: "12px",
                        fontSize: "0.75rem",
                        fontWeight: "700",
                        backgroundColor: isCompleted
                          ? "#DCFCE7"
                          : isCurrent
                          ? "#DBEAFE"
                          : isStepFailed
                          ? "#FEE2E2"
                          : "#F1F5F9",
                        color: isCompleted
                          ? "#15803D"
                          : isCurrent
                          ? "#1D4ED8"
                          : isStepFailed
                          ? "#991B1B"
                          : "#94A3B8",
                      }}
                    >
                      {isCompleted
                        ? lang === "bn"
                          ? "সম্পন্ন ✓"
                          : "Completed ✓"
                        : isCurrent
                        ? lang === "bn"
                          ? "চলমান ⟳"
                          : "In Progress ⟳"
                        : isStepFailed
                        ? lang === "bn"
                          ? "ব্যর্থ ✕"
                          : "Failed ✕"
                        : lang === "bn"
                        ? "অপেক্ষমাণ"
                        : "Waiting"}
                    </span>
                  </div>

                  <p
                    style={{
                      fontSize: "0.875rem",
                      color: isWaiting ? "#94A3B8" : "#64748B",
                      margin: 0,
                      lineHeight: 1.4,
                    }}
                  >
                    {lang === "bn" ? step.description_bn : step.description_en}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Security & Support Footer Callout */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
          padding: "16px 20px",
          backgroundColor: "#F8FAFC",
          border: "1px solid #E2E8F0",
          borderRadius: "14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#64748B", fontSize: "0.8125rem" }}>
          <ShieldCheck size={20} color="#16A34A" />
          <span>
            {lang === "bn"
              ? "এন্ড-টু-এন্ড এনক্রিপ্টেড অপারেটর গেটওয়ে। গ্রাহকের পিন ও ক্রেডেনশিয়াল কখনোই উন্মুক্ত বা স্টোর করা হয় না।"
              : "End-to-End Encrypted Operator Gateway. Customer PINs and credentials are never stored in plaintext."}
          </span>
        </div>

        <Link
          href="/app/support"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "0.8125rem",
            color: "#2563EB",
            fontWeight: "700",
            textDecoration: "none",
          }}
        >
          <Headphones size={15} />
          <span>{lang === "bn" ? "সাহায্য প্রয়োজন?" : "Need Help?"}</span>
        </Link>
      </div>
    </div>
  );
}

export default function OrderProgressPage() {
  return (
    <React.Suspense
      fallback={
        <div style={{ padding: "60px 20px", textAlign: "center" }}>
          <FlexiLoading size="lg" text="Loading..." />
        </div>
      }
    >
      <OrderProgressContent />
    </React.Suspense>
  );
}
