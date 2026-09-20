"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { OrderDetail } from "@/lib/types";
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
  CreditCard,
  ExternalLink,
  Hash,
  Headphones,
  History,
  Percent,
  Phone,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Wallet,
  Building2,
  AlertCircle,
  Calendar,
} from "lucide-react";

function OrderDetailContent() {
  const { lang, tr, toBnDigits } = useLanguage();
  const params = useParams();
  const searchParams = useSearchParams();
  const orderId = params.id as string;
  const trackingToken = searchParams.get("token") || searchParams.get("tracking_token");

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedKeys, setCopiedKeys] = useState<{ [key: string]: boolean }>({});

  const handleCopy = (key: string, text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKeys((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopiedKeys((prev) => ({ ...prev, [key]: false }));
    }, 2000);
  };

  const fetchOrderDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getOrder(orderId, trackingToken);
      setOrder(data);
    } catch (err: any) {
      setError(err.message || (lang === "bn" ? "অর্ডারের বিবরণ লোড করা যায়নি।" : "Failed to load order details."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId, trackingToken]);

  const getOperatorInfo = (code?: string) => {
    switch (code) {
      case "GP":
        return { name: "Grameenphone", logo: "/logos/gp.svg", height: 16 };
      case "ROBI":
        return { name: "Robi", logo: "/logos/robi.svg", height: 16 };
      case "BANGLALINK":
        return { name: "Banglalink", logo: "/logos/banglalink.svg", height: 14 };
      default:
        return { name: code || "Telecom", logo: null, height: 16 };
    }
  };

  const tDetail = tr.app.orderDetails;

  const translateStatusText = (statusKey: string) => {
    const s = (tr.common.statuses as Record<string, string>)[statusKey];
    return s || statusKey.replace(/_/g, " ");
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      {/* Top Bar: Back Link & Refresh Status */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
        <Link href="/app/orders" style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          color: "var(--text-secondary)",
          fontSize: "0.875rem",
          fontWeight: "500",
          textDecoration: "none",
        }}>
          <ArrowLeft size={16} />
          <span>{tDetail.backToOrders}</span>
        </Link>

        <button
          onClick={fetchOrderDetails}
          className="btn btn-outline btn-sm"
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          aria-label={tr.common.actions.refresh}
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>{tr.common.actions.refresh}</span>
        </button>
      </div>

      {error ? (
        <div className="card" style={{ padding: "40px", textAlign: "center" }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            backgroundColor: "#FEE2E2",
            color: "#DC2626",
            marginBottom: "12px",
          }}>
            <AlertCircle size={24} />
          </div>
          <h3 style={{ fontSize: "1.25rem", fontWeight: "600", color: "#DC2626", marginBottom: "8px" }}>
            {lang === "bn" ? "অর্ডার দেখতে সমস্যা হচ্ছে" : "Unable to View Order"}
          </h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>
            {error}
          </p>
          <Link href="/app/orders" className="btn btn-outline">
            {tDetail.backToOrders}
          </Link>
        </div>
      ) : loading && !order ? (
        <div style={{ textAlign: "center", padding: "60px" }}>
          <FlexiLoading size="lg" text={tr.common.loading} />
        </div>
      ) : order ? (
        <div>
          {/* 1. Main Order Header Card */}
          <div className="card" style={{ padding: "28px", marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
              <div>
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  color: "var(--ft-green)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "4px",
                }}>
                  <Receipt size={14} />
                  <span>
                    {order.service_type === "CASH_OUT"
                      ? (lang === "bn" ? "সিম ব্যালেন্স ক্যাশ আউট" : "SIM Balance Cash Out")
                      : (lang === "bn" ? "ডিসকাউন্টেড রিচার্জ" : "Discounted Recharge")}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "2px", flexWrap: "wrap" }}>
                  <h1 style={{ fontSize: "1.5rem", fontWeight: "600", color: "var(--text-primary)", margin: 0, overflowWrap: "anywhere", wordBreak: "break-word" }}>
                    {order.order_id}
                  </h1>
                  <button
                    type="button"
                    onClick={() => handleCopy("order_id", order.order_id)}
                    aria-label="Copy Order ID"
                    title="Copy Order ID"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      background: copiedKeys["order_id"] ? "var(--ft-green-subtle)" : "var(--bg-subtle)",
                      border: copiedKeys["order_id"] ? "1px solid var(--ft-green)" : "1px solid var(--border-card)",
                      borderRadius: "var(--radius-sm)",
                      padding: "3px 7px",
                      fontSize: "0.6875rem",
                      fontWeight: "500",
                      color: copiedKeys["order_id"] ? "var(--ft-green-active)" : "var(--text-secondary)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {copiedKeys["order_id"] ? (
                      <>
                        <Check size={12} color="var(--ft-green-active)" />
                        <span>{tr.common.actions.copied}</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>{tr.common.actions.copy}</span>
                      </>
                    )}
                  </button>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.8125rem", color: "var(--text-muted)", marginTop: "6px", fontWeight: "400" }}>
                  <Calendar size={13} />
                  <span>
                    {tDetail.createdOn}{" "}
                    {lang === "bn"
                      ? toBnDigits(new Date(order.created_at).toLocaleString("en-CA"))
                      : new Date(order.created_at).toLocaleString()}
                  </span>
                </div>
                {order.linked_from_guest_session_id && (
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px", fontWeight: "400" }}>
                    <span style={{
                      backgroundColor: "var(--bg-subtle)",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      border: "1px solid var(--border-card)"
                    }}>
                      {lang === "bn" ? "পূর্বে গেস্ট হিসেবে করা • অ্যাকাউন্টের সাথে যুক্ত" : "Originally placed as Guest • Linked to Account"}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <StatusBadge status={order.status} size="md" />
              </div>
            </div>

            {/* Financial Overview Grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "16px",
              backgroundColor: "var(--bg-main)",
              borderRadius: "var(--radius-md)",
              padding: "16px 20px",
              border: "1px solid var(--border-light)"
            }} className="financial-grid">
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "400", marginBottom: "4px" }}>
                  <Smartphone size={13} color="var(--ft-green)" />
                  <span>{tDetail.operatorLabel}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {getOperatorInfo(order.operator_code).logo && (
                    <img
                      src={getOperatorInfo(order.operator_code).logo!}
                      alt={order.operator_code}
                      style={{ height: `${getOperatorInfo(order.operator_code).height}px`, width: "auto" }}
                    />
                  )}
                  <span style={{ fontSize: "1.0625rem", fontWeight: "600", color: "var(--text-primary)" }}>
                    {order.operator_code}
                  </span>
                </div>
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "400", marginBottom: "4px" }}>
                  <Wallet size={13} color="var(--ft-green)" />
                  <span>{order.service_type === "CASH_OUT" ? (lang === "bn" ? "সিম ব্যালেন্স" : "SIM Balance") : (lang === "bn" ? "রিচার্জ ভ্যালু" : "Recharge Value")}</span>
                </div>
                <div style={{ fontSize: "1.0625rem", fontWeight: "600", color: "var(--text-primary)" }}>
                  {order.service_type === "CASH_OUT"
                    ? formatBDT(order.pricing_snapshot?.source_amount_bdt || order.cashout_details?.source_amount_bdt || order.amount_bdt, { lang })
                    : formatBDT(order.pricing_snapshot?.recharge_amount_bdt || order.recharge_details?.recharge_amount_bdt || (order.recharge_details?.recharge_amount ? order.recharge_details.recharge_amount / 100 : order.amount_bdt), { lang })}
                </div>
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "500", marginBottom: "4px" }}>
                  <CreditCard size={13} color="var(--ft-green)" />
                  <span>
                    {order.service_type === "CASH_OUT"
                      ? (order.status === "COMPLETED"
                          ? (lang === "bn" ? "পেআউট পাঠানো হয়েছে" : "Payout Sent")
                          : (lang === "bn" ? "নিট পেআউট প্রদেয়" : "Net Payout Due"))
                      : (["COMPLETED", "PAYMENT_VERIFIED", "RECHARGE_PROCESSING"].includes(order.status)
                          ? (lang === "bn" ? "পরিশোধিত টাকা" : "Amount Paid")
                          : (lang === "bn" ? "প্রদেয় টাকা" : "Amount to Pay"))}
                  </span>
                </div>
                <div style={{ fontSize: "1.125rem", fontWeight: "700", color: "var(--ft-green)" }}>
                  {order.service_type === "CASH_OUT"
                    ? formatBDT(order.pricing_snapshot?.payout_amount_bdt || order.cashout_details?.payout_amount_bdt || (order.cashout_details?.payout_amount ? order.cashout_details.payout_amount / 100 : "0.00"), { lang })
                    : formatBDT(order.pricing_snapshot?.customer_pay_amount_bdt || order.recharge_details?.customer_pay_amount_bdt || order.amount_bdt, { lang })}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Service Details Card */}
          <div className="card" style={{ padding: "28px", marginBottom: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "18px" }}>
              <Receipt size={18} color="var(--ft-green)" />
              <h3 style={{ fontSize: "1.125rem", fontWeight: "600", margin: 0 }}>
                {tDetail.orderInfoTitle}
              </h3>
            </div>

            {order.service_type === "CASH_OUT" && order.cashout_details && (
              <div className="params-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "0.9375rem" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-secondary)", fontSize: "0.8125rem", marginBottom: "2px", fontWeight: "400" }}>
                    <Phone size={13} color="var(--ft-green)" />
                    <span>{lang === "bn" ? "আপনার সিম নম্বর:" : "Your SIM Number:"}</span>
                  </div>
                  <span style={{ fontWeight: "500", color: "var(--text-primary)" }}>
                    {lang === "bn"
                      ? toBnDigits(order.cashout_details.source_mobile_number || order.mobile_number)
                      : (order.cashout_details.source_mobile_number || order.mobile_number)}
                  </span>
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-secondary)", fontSize: "0.8125rem", marginBottom: "2px", fontWeight: "400" }}>
                    <Wallet size={13} color="var(--ft-green)" />
                    <span>{lang === "bn" ? "সিম ব্যালেন্স ট্রান্সফার:" : "SIM Balance Transfer:"}</span>
                  </div>
                  <span style={{ fontWeight: "600", color: "var(--text-primary)" }}>
                    {formatBDT(order.pricing_snapshot?.source_amount_bdt || order.cashout_details.source_amount_bdt || order.amount_bdt, { lang })}
                  </span>
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-secondary)", fontSize: "0.8125rem", marginBottom: "2px", fontWeight: "400" }}>
                    <Percent size={13} color="#DC2626" />
                    <span>
                      {lang === "bn"
                        ? `প্ল্যাটফর্ম ফি (${toBnDigits(order.pricing_snapshot?.platform_fee_rate || order.cashout_details.platform_fee_rate || "20")}%):`
                        : `Platform Fee (${order.pricing_snapshot?.platform_fee_rate || order.cashout_details.platform_fee_rate || "20"}%):`}
                    </span>
                  </div>
                  <span style={{ fontWeight: "500", color: "#DC2626" }}>
                    {formatBDT(order.pricing_snapshot?.platform_fee_amount_bdt || order.cashout_details.platform_fee_amount_bdt || (order.cashout_details.platform_fee_amount ? order.cashout_details.platform_fee_amount / 100 : "0.00"), { isDeduction: true, lang })}
                  </span>
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-secondary)", fontSize: "0.8125rem", marginBottom: "2px", fontWeight: "400" }}>
                    <CreditCard size={13} color="var(--ft-green)" />
                    <span>{lang === "bn" ? "নিট পেআউট:" : "Net Payout Amount:"}</span>
                  </div>
                  <span style={{ fontWeight: "600", color: "var(--ft-green)" }}>
                    {formatBDT(order.pricing_snapshot?.payout_amount_bdt || order.cashout_details.payout_amount_bdt || (order.cashout_details.payout_amount ? order.cashout_details.payout_amount / 100 : "0.00"), { lang })}
                  </span>
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-secondary)", fontSize: "0.8125rem", marginBottom: "2px", fontWeight: "400" }}>
                    <Building2 size={13} color="var(--ft-green)" />
                    <span>{lang === "bn" ? "পেআউট পদ্ধতি ও অ্যাকাউন্ট:" : "Payout Method & Account:"}</span>
                  </div>
                  <span style={{ fontWeight: "500", color: "var(--text-primary)" }}>
                    {order.cashout_details.payout_method} ({lang === "bn" ? toBnDigits(order.cashout_details.payout_account) : order.cashout_details.payout_account})
                  </span>
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-secondary)", fontSize: "0.8125rem", marginBottom: "2px", fontWeight: "400" }}>
                    <Smartphone size={13} color="var(--ft-green)" />
                    <span>{tDetail.assignedSimLabel}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontWeight: "600", fontFamily: "var(--font-mono, monospace)", color: "var(--text-primary)" }}>
                      {order.cashout_details.receiving_mobile_number
                        ? (lang === "bn" ? toBnDigits(order.cashout_details.receiving_mobile_number) : order.cashout_details.receiving_mobile_number)
                        : (lang === "bn" ? "অর্ডারে বরাদ্দ করা হবে" : "Assigned on Order")}
                    </span>
                    {order.cashout_details.receiving_mobile_number && (
                      <button
                        type="button"
                        onClick={() => handleCopy("receiving_sim", order.cashout_details?.receiving_mobile_number || "")}
                        aria-label="Copy receiving SIM number"
                        title="Copy receiving number"
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: "2px",
                          color: copiedKeys["receiving_sim"] ? "var(--ft-green)" : "var(--text-muted)",
                          display: "inline-flex",
                          alignItems: "center"
                        }}
                      >
                        {copiedKeys["receiving_sim"] ? <Check size={13} color="var(--ft-green)" /> : <Copy size={13} />}
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-secondary)", fontSize: "0.8125rem", marginBottom: "2px", fontWeight: "400" }}>
                    <Hash size={13} color="var(--ft-green)" />
                    <span>{tDetail.trxIdSubmittedLabel}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontWeight: "600", fontFamily: "var(--font-mono, monospace)", color: "var(--text-primary)" }}>
                      {order.cashout_details.transfer_reference || (lang === "bn" ? "জমার অপেক্ষায়" : "Pending submission")}
                    </span>
                    {order.cashout_details.transfer_reference && (
                      <button
                        type="button"
                        onClick={() => handleCopy("trx_ref", order.cashout_details?.transfer_reference || "")}
                        aria-label="Copy Transaction Reference"
                        title="Copy TrxID"
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: "2px",
                          color: copiedKeys["trx_ref"] ? "var(--ft-green)" : "var(--text-muted)",
                          display: "inline-flex",
                          alignItems: "center"
                        }}
                      >
                        {copiedKeys["trx_ref"] ? <Check size={13} color="var(--ft-green)" /> : <Copy size={13} />}
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-secondary)", fontSize: "0.8125rem", marginBottom: "2px", fontWeight: "400" }}>
                    <ShieldCheck size={13} color="var(--ft-green)" />
                    <span>{lang === "bn" ? "ভেরিফিকেশন স্ট্যাটাস:" : "Verification Status:"}</span>
                  </div>
                  <span style={{ fontWeight: "600", color: "var(--text-primary)" }}>
                    {order.status === "WAITING_FOR_TRANSFER"
                      ? (lang === "bn" ? "ব্যালেন্স ট্রান্সফারের অপেক্ষায়" : "Awaiting Balance Transfer")
                      : order.cashout_details.verification_status === "PENDING"
                      ? (lang === "bn" ? "ট্রান্সফার জমা হয়েছে (যাচাই প্রক্রিয়াধীন)" : "Transfer Submitted (Verifying)")
                      : order.cashout_details.verification_status === "VERIFIED"
                      ? (lang === "bn" ? "ট্রান্সফার যাচাইকৃত" : "Transfer Verified")
                      : order.cashout_details.verification_status === "REJECTED"
                      ? (lang === "bn" ? "ট্রান্সফার প্রত্যাখ্যাত" : "Transfer Rejected")
                      : (order.cashout_details.verification_status || (lang === "bn" ? "অপেক্ষমাণ" : "Pending"))}
                  </span>
                </div>
              </div>
            )}

            {order.service_type === "RECHARGE" && order.recharge_details && (
              <div className="params-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "0.9375rem" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-secondary)", fontSize: "0.8125rem", marginBottom: "2px", fontWeight: "400" }}>
                    <Phone size={13} color="var(--ft-green)" />
                    <span>{lang === "bn" ? "প্রাপকের মোবাইল নম্বর:" : "Recipient Mobile Number:"}</span>
                  </div>
                  <span style={{ fontWeight: "500", color: "var(--text-primary)" }}>
                    {lang === "bn"
                      ? toBnDigits(order.recharge_details.recharge_mobile_number || order.mobile_number)
                      : (order.recharge_details.recharge_mobile_number || order.mobile_number)}
                  </span>
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-secondary)", fontSize: "0.8125rem", marginBottom: "2px", fontWeight: "400" }}>
                    <Wallet size={13} color="var(--ft-green)" />
                    <span>{lang === "bn" ? "রিচার্জ ভ্যালু:" : "Recharge Value:"}</span>
                  </div>
                  <span style={{ fontWeight: "600", color: "var(--text-primary)" }}>
                    {formatBDT(order.pricing_snapshot?.recharge_amount_bdt || order.recharge_details.recharge_amount_bdt || (order.recharge_details.recharge_amount ? order.recharge_details.recharge_amount / 100 : order.amount_bdt), { lang })}
                  </span>
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-secondary)", fontSize: "0.8125rem", marginBottom: "2px", fontWeight: "400" }}>
                    <Percent size={13} color="var(--ft-green)" />
                    <span>
                      {lang === "bn"
                        ? `প্রযোজ্য ছাড় (${toBnDigits(order.pricing_snapshot?.discount_rate || order.recharge_details.discount_rate || "5")}%):`
                        : `Discount Applied (${order.pricing_snapshot?.discount_rate || order.recharge_details.discount_rate || "5"}%):`}
                    </span>
                  </div>
                  <span style={{ fontWeight: "500", color: "var(--ft-green)" }}>
                    {formatBDT(order.pricing_snapshot?.discount_amount_bdt || order.recharge_details.discount_amount_bdt || (order.recharge_details.discount_amount ? order.recharge_details.discount_amount / 100 : "0.00"), { isDeduction: true, lang })}
                  </span>
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-secondary)", fontSize: "0.8125rem", marginBottom: "2px", fontWeight: "400" }}>
                    <CreditCard size={13} color="var(--ft-green)" />
                    <span>
                      {["COMPLETED", "PAYMENT_VERIFIED", "RECHARGE_PROCESSING"].includes(order.status)
                        ? (lang === "bn" ? "পরিশোধিত টাকা:" : "Amount Paid:")
                        : (lang === "bn" ? "প্রদেয় টাকা:" : "Amount to Pay:")}
                    </span>
                  </div>
                  <span style={{ fontWeight: "600", color: "var(--text-primary)" }}>
                    {formatBDT(order.pricing_snapshot?.customer_pay_amount_bdt || order.recharge_details.customer_pay_amount_bdt || order.amount_bdt, { lang })}
                  </span>
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-secondary)", fontSize: "0.8125rem", marginBottom: "2px", fontWeight: "400" }}>
                    <ShieldCheck size={13} color="var(--ft-green)" />
                    <span>{lang === "bn" ? "পেমেন্ট স্ট্যাটাস:" : "Payment Status:"}</span>
                  </div>
                  <span style={{ fontWeight: "600", color: "var(--text-primary)" }}>
                    {order.status === "PAYMENT_PENDING"
                      ? (order.payment_id
                          ? (lang === "bn" ? "পেমেন্ট যাচাই অপেক্ষমাণ" : "Payment Verification Pending")
                          : (lang === "bn" ? "পেমেন্ট জমা দেওয়ার অপেক্ষায়" : "Awaiting Payment Submission"))
                      : ["PAYMENT_VERIFIED", "RECHARGE_PROCESSING", "COMPLETED"].includes(order.status)
                      ? (lang === "bn" ? "পেমেন্ট যাচাই সম্পন্ন" : "Payment Verified")
                      : order.status === "PAYMENT_FAILED"
                      ? (lang === "bn" ? "পেমেন্ট ব্যর্থ হয়েছে" : "Payment Failed")
                      : (lang === "bn" ? "যাচাই অপেক্ষমাণ" : "Awaiting Verification")}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 3. Event Timeline Card */}
          <div className="card" style={{ padding: "28px", marginBottom: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
              <History size={18} color="var(--ft-green)" />
              <h3 style={{ fontSize: "1.125rem", fontWeight: "600", margin: 0 }}>
                {tDetail.timelineTitle}
              </h3>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "18px", position: "relative" }}>
              {order.events && order.events.length > 0 ? (
                order.events.map((evt, idx) => (
                  <div key={evt.event_id || idx} style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                    <div style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "50%",
                      backgroundColor: "var(--ft-green-subtle)",
                      border: "1px solid #BBF7D0",
                      color: "var(--ft-green)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0
                    }}>
                      <CheckCircle2 size={16} color="var(--ft-green)" />
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: "600", fontSize: "0.9375rem", color: "var(--text-primary)" }}>
                          {translateStatusText(evt.new_status)}
                        </span>
                        <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)", backgroundColor: "var(--bg-subtle)", padding: "2px 6px", borderRadius: "var(--radius-sm)", fontWeight: "400" }}>
                          {lang === "bn"
                            ? `${evt.actor_type === "SYSTEM" ? "সিস্টেম" : evt.actor_type === "ADMIN" ? "অ্যাডমিন" : "গ্রাহক"} দ্বারা`
                            : `by ${evt.actor_type}`}
                        </span>
                      </div>
                      {evt.note && (
                        <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", margin: "4px 0 0 0", fontWeight: "400" }}>
                          {evt.note}
                        </p>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "3px", fontWeight: "400" }}>
                        <Clock size={11} />
                        <span>
                          {lang === "bn"
                            ? toBnDigits(new Date(evt.created_at).toLocaleString("en-CA"))
                            : new Date(evt.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                  {lang === "bn" ? "এখনো কোনো ইভেন্ট লগ হয়নি।" : "No events logged yet."}
                </p>
              )}
            </div>
          </div>

          {/* 4. Support Link for Order */}
          <div style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--border-card)",
            borderRadius: "var(--radius-lg)",
            padding: "20px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: "var(--ft-green-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}>
                <Headphones size={20} color="var(--ft-green)" />
              </div>
              <div>
                <div style={{ fontWeight: "600", fontSize: "0.9375rem" }}>
                  {lang === "bn" ? `অর্ডার ${order.order_id} নিয়ে কোনো সহায়তা প্রয়োজন?` : `Need assistance with order ${order.order_id}?`}
                </div>
                <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)", fontWeight: "400" }}>
                  {lang === "bn" ? "আমাদের সাপোর্ট টিম আপনার যেকোনো প্রশ্নের দ্রুত সমাধান দিতে প্রস্তুত।" : "Our support desk is ready to help verify your transfer."}
                </div>
              </div>
            </div>
            <Link
              href={`/app/support?order_id=${encodeURIComponent(order.order_id)}`}
              className="btn btn-outline btn-sm"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <span>{tDetail.btnSupport}</span>
              <ExternalLink size={14} />
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <React.Suspense fallback={<div className="container" style={{ padding: "60px 20px", textAlign: "center" }}><FlexiLoading size="md" /></div>}>
      <OrderDetailContent />
    </React.Suspense>
  );
}
