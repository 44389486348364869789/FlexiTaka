"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { OrderSummary, ServiceType } from "@/lib/types";
import { formatBDT } from "@/lib/formatters";
import StatusBadge from "@/components/StatusBadge";
import FlexiLoading from "@/components/FlexiLoading";
import { useLanguage } from "@/i18n/LanguageContext";
import { RefreshCw, Search, AlertCircle } from "lucide-react";

export default function OrdersHistoryPage() {
  const { lang, tr, toBnDigits } = useLanguage();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterService, setFilterService] = useState<"ALL" | ServiceType>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.ensureGuestSession();
      const list = await api.listOrders(50, 0);
      setOrders(list);
    } catch (err: any) {
      console.error("Failed to load orders", err);
      setError(
        err?.message ||
          (lang === "bn"
            ? "অর্ডার তালিকা লোড করতে ব্যর্থ হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।"
            : "Failed to load orders list. Please try again.")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const filteredOrders = orders.filter((o) => {
    const matchesService = filterService === "ALL" || o.service_type === filterService;
    const matchesSearch =
      !searchQuery.trim() ||
      o.order_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.mobile_number.includes(searchQuery.trim());
    return matchesService && matchesSearch;
  });

  const tOrders = tr.app.ordersList;

  return (
    <div>
      {/* Page Title */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "28px",
        flexWrap: "wrap",
        gap: "16px"
      }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "4px" }}>
            {tOrders.title}
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", margin: 0 }}>
            {tOrders.subtitle}
          </p>
        </div>

        <button onClick={loadOrders} className="btn btn-outline btn-sm">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>{tr.common.actions.refresh}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: "16px 20px", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          {/* Service Tabs */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <button
              onClick={() => setFilterService("ALL")}
              style={{
                padding: "6px 12px",
                borderRadius: "var(--radius-sm)",
                border: "none",
                fontSize: "0.8125rem",
                fontWeight: filterService === "ALL" ? "600" : "500",
                backgroundColor: filterService === "ALL" ? "var(--ft-green)" : "var(--bg-subtle)",
                color: filterService === "ALL" ? "#FFFFFF" : "var(--text-secondary)",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              {tOrders.filterAll}
            </button>
            <button
              onClick={() => setFilterService("CASH_OUT")}
              style={{
                padding: "6px 12px",
                borderRadius: "var(--radius-sm)",
                border: "none",
                fontSize: "0.8125rem",
                fontWeight: filterService === "CASH_OUT" ? "600" : "500",
                backgroundColor: filterService === "CASH_OUT" ? "var(--ft-green)" : "var(--bg-subtle)",
                color: filterService === "CASH_OUT" ? "#FFFFFF" : "var(--text-secondary)",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              {tOrders.filterCashOut}
            </button>
            <button
              onClick={() => setFilterService("RECHARGE")}
              style={{
                padding: "6px 12px",
                borderRadius: "var(--radius-sm)",
                border: "none",
                fontSize: "0.8125rem",
                fontWeight: filterService === "RECHARGE" ? "600" : "500",
                backgroundColor: filterService === "RECHARGE" ? "var(--ft-green)" : "var(--bg-subtle)",
                color: filterService === "RECHARGE" ? "#FFFFFF" : "var(--text-secondary)",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              {tOrders.filterRecharge}
            </button>
          </div>

          {/* Search Input */}
          <div style={{ position: "relative", flex: "1 1 200px", minWidth: 0, width: "100%", maxWidth: "360px" }}>
            <input
              type="text"
              placeholder={tOrders.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ padding: "8px 12px 8px 34px", fontSize: "0.875rem", width: "100%", boxSizing: "border-box" }}
            />
            <Search size={16} color="var(--text-muted)" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }} />
          </div>
        </div>
      </div>

      {/* Orders Container Card */}
      <div className="card" style={{ padding: "20px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "48px 16px" }}>
            <FlexiLoading size="md" text={tr.common.loading} />
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: "44px 16px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: "#FEE2E2",
                color: "#DC2626",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "14px",
              }}
            >
              <AlertCircle size={26} />
            </div>
            <h3
              style={{
                fontSize: "1.125rem",
                fontWeight: "600",
                color: "#DC2626",
                marginBottom: "6px",
              }}
            >
              {lang === "bn" ? "অর্ডার লোড করতে সমস্যা হয়েছে" : "Failed to Load Orders"}
            </h3>
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.875rem",
                maxWidth: "420px",
                margin: "0 auto 20px auto",
              }}
            >
              {error}
            </p>
            <button
              type="button"
              onClick={loadOrders}
              className="btn btn-primary btn-sm"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", margin: "0 auto" }}
            >
              <RefreshCw size={14} />
              <span>{lang === "bn" ? "পুনরায় চেষ্টা করুন" : "Retry"}</span>
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 16px" }}>
            <div style={{ marginBottom: "16px" }}>
              <img
                src="/images/flexitaka-logo.png"
                alt="FlexiTaka"
                style={{
                  height: "36px",
                  width: "auto",
                  objectFit: "contain",
                  margin: "0 auto",
                  display: "block"
                }}
              />
            </div>
            <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "6px" }}>
              {searchQuery ? (lang === "bn" ? "কোনো ফলাফল পাওয়া যায়নি" : "No matching orders") : tOrders.emptyTitle}
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
              {searchQuery
                ? (lang === "bn" ? "ভিন্ন অর্ডার আইডি বা নম্বর দিয়ে অনুসন্ধান করুন।" : "Try searching with a different Order ID or keyword.")
                : tOrders.emptyDesc}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop View: Full Data Table */}
            <div className="orders-table-wrapper">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9375rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--border-card)", textAlign: "left" }}>
                    <th style={{ padding: "12px 10px", color: "var(--text-muted)", fontWeight: "500" }}>{tOrders.colOrderId}</th>
                    <th style={{ padding: "12px 10px", color: "var(--text-muted)", fontWeight: "500" }}>{tOrders.colService}</th>
                    <th style={{ padding: "12px 10px", color: "var(--text-muted)", fontWeight: "500" }}>{tOrders.colOperator}</th>
                    <th style={{ padding: "12px 10px", color: "var(--text-muted)", fontWeight: "500" }}>{tOrders.colTarget}</th>
                    <th style={{ padding: "12px 10px", color: "var(--text-muted)", fontWeight: "500" }}>{tOrders.colAmount}</th>
                    <th style={{ padding: "12px 10px", color: "var(--text-muted)", fontWeight: "500" }}>{tOrders.colStatus}</th>
                    <th style={{ padding: "12px 10px", color: "var(--text-muted)", fontWeight: "500" }}>{tOrders.colDate}</th>
                    <th style={{ padding: "12px 10px", color: "var(--text-muted)", fontWeight: "500", textAlign: "right" }}>{tOrders.colAction}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((o) => (
                    <tr key={o.order_id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                      <td style={{ padding: "14px 10px", fontWeight: "600", color: "var(--text-primary)" }}>
                        <div style={{ overflowWrap: "anywhere" }}>{o.order_id}</div>
                        {o.linked_from_guest_session_id && (
                          <span
                            style={{
                              display: "inline-block",
                              fontSize: "0.6875rem",
                              fontWeight: "500",
                              color: "var(--text-muted)",
                              backgroundColor: "var(--bg-subtle)",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              marginTop: "3px"
                            }}
                          >
                            {lang === "bn" ? "পূর্বে গেস্ট হিসেবে করা" : "Previously placed as Guest"}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "14px 10px" }}>
                        {o.service_type === "CASH_OUT" ? tOrders.filterCashOut : tOrders.filterRecharge}
                      </td>
                      <td style={{ padding: "14px 10px", fontWeight: "500" }}>
                        {o.operator_code}
                      </td>
                      <td style={{ padding: "14px 10px" }}>
                        {lang === "bn" ? toBnDigits(o.mobile_number) : o.mobile_number}
                      </td>
                      <td style={{ padding: "14px 10px", fontWeight: "600" }}>
                        {formatBDT(o.amount_bdt, { lang })}
                      </td>
                      <td style={{ padding: "14px 10px" }}>
                        <StatusBadge status={o.status} size="sm" />
                      </td>
                      <td style={{ padding: "14px 10px", color: "var(--text-muted)", fontSize: "0.8125rem" }}>
                        {lang === "bn"
                          ? toBnDigits(new Date(o.created_at).toLocaleDateString("en-CA"))
                          : new Date(o.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "14px 10px", textAlign: "right" }}>
                        <Link
                          href={`/app/order/${o.order_id}`}
                          className="btn btn-outline btn-sm"
                          style={{ padding: "4px 12px", fontSize: "0.75rem" }}
                        >
                          {lang === "bn" ? "বিস্তারিত" : "Details"}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View: High-Readability Responsive Cards */}
            <div className="orders-mobile-list">
              {filteredOrders.map((o) => (
                <div key={o.order_id} className="order-card-mobile">
                  {/* Card Header: Order ID + Details Action */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: "0.6875rem", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        {tOrders.colOrderId}
                      </div>
                      <div style={{ fontSize: "0.9375rem", fontWeight: "700", color: "var(--text-primary)", overflowWrap: "anywhere", wordBreak: "break-word" }}>
                        {o.order_id}
                      </div>
                      {o.linked_from_guest_session_id && (
                        <span
                          style={{
                            display: "inline-block",
                            fontSize: "0.6875rem",
                            fontWeight: "500",
                            color: "var(--text-muted)",
                            backgroundColor: "var(--bg-subtle)",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            marginTop: "3px"
                          }}
                        >
                          {lang === "bn" ? "পূর্বে গেস্ট হিসেবে করা" : "Previously placed as Guest"}
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/app/order/${o.order_id}`}
                      className="btn btn-outline btn-sm"
                      style={{ padding: "5px 12px", fontSize: "0.75rem", flexShrink: 0 }}
                    >
                      {lang === "bn" ? "বিস্তারিত" : "Details"}
                    </Link>
                  </div>

                  {/* Card Parameters Grid */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: "10px",
                    padding: "10px 12px",
                    backgroundColor: "var(--bg-main)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "0.8125rem",
                    border: "1px solid var(--border-light)"
                  }}>
                    <div>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", display: "block" }}>{tOrders.colService}</span>
                      <span style={{ fontWeight: "600", color: "var(--text-primary)" }}>
                        {o.service_type === "CASH_OUT" ? tOrders.filterCashOut : tOrders.filterRecharge}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", display: "block" }}>{tOrders.colOperator}</span>
                      <span style={{ fontWeight: "600", color: "var(--text-primary)" }}>
                        {o.operator_code}
                      </span>
                    </div>
                    <div style={{ gridColumn: "span 2", minWidth: 0 }}>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", display: "block" }}>{tOrders.colTarget}</span>
                      <span style={{ fontWeight: "500", color: "var(--text-primary)", overflowWrap: "anywhere", wordBreak: "break-word" }}>
                        {lang === "bn" ? toBnDigits(o.mobile_number) : o.mobile_number}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", display: "block" }}>{tOrders.colAmount}</span>
                      <span style={{ fontWeight: "700", color: "var(--ft-green-active)", fontSize: "0.9375rem" }}>
                        {formatBDT(o.amount_bdt, { lang })}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", display: "block" }}>{tOrders.colDate}</span>
                      <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>
                        {lang === "bn"
                          ? toBnDigits(new Date(o.created_at).toLocaleDateString("en-CA"))
                          : new Date(o.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Card Footer: Status */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "2px" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{tOrders.colStatus}</span>
                    <StatusBadge status={o.status} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
