"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { InAppNotification, OrderSummary } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import FlexiLoading from "@/components/FlexiLoading";
import {
  ArrowDownLeft,
  ArrowRight,
  Bell,
  RefreshCw,
  Zap,
} from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

export default function AppDashboardPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const { isBn, tr, toBnDigits } = useLanguage();
  const d = tr.app.dashboard;

  const loadData = async () => {
    setLoading(true);
    try {
      await api.ensureGuestSession();
      const [orderList, notifList] = await Promise.all([
        api.listOrders(5, 0).catch(() => []),
        api.getNotifications().catch(() => []),
      ]);
      setOrders(orderList);
      setNotifications(notifList);
    } catch (err) {
      console.error("Dashboard data load error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div>
      {/* Welcome Banner */}
      <div style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid var(--border-card)",
        borderRadius: "var(--radius-lg)",
        padding: "28px 32px",
        marginBottom: "32px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "20px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <img
            src="/images/flexitaka-logo.png"
            alt="FlexiTaka"
            style={{
              height: "44px",
              width: "auto",
              objectFit: "contain",
              display: "block"
            }}
          />
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "4px" }}>
              {d.welcomeTitle}
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", margin: 0 }}>
              {d.welcomeSubtitle}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={loadData} className="btn btn-outline btn-sm" title={isBn ? "রিফ্রেশ" : "Refresh"}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>{isBn ? "রিফ্রেশ" : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-2" style={{ marginBottom: "36px" }}>
        {/* Cash Out Card */}
        <div className="card" style={{ padding: "28px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: "var(--ft-green-subtle)",
              color: "var(--ft-green-active)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px"
            }}>
              <ArrowDownLeft size={24} />
            </div>
            <h3 style={{ fontSize: "1.375rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "8px" }}>
              {d.actionCashOutTitle}
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.5, marginBottom: "20px" }}>
              {d.actionCashOutDesc}
            </p>
          </div>
          <Link href="/app/cashout" className="btn btn-primary btn-full">
            <span>{isBn ? "ক্যাশ আউট শুরু করুন" : "Start Cash Out Flow"}</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Recharge Card */}
        <div className="card" style={{ padding: "28px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: "var(--ft-yellow-subtle)",
              color: "#B45309",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px"
            }}>
              <Zap size={24} />
            </div>
            <h3 style={{ fontSize: "1.375rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "8px" }}>
              {d.actionRechargeTitle}
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.5, marginBottom: "20px" }}>
              {d.actionRechargeDesc}
            </p>
          </div>
          <Link href="/app/recharge" className="btn btn-secondary btn-full">
            <span>{isBn ? "রিচার্জ শুরু করুন" : "Start Recharge Flow"}</span>
            <Zap size={16} />
          </Link>
        </div>
      </div>

      {/* Notifications Bar if any */}
      {notifications.length > 0 && (
        <div style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid var(--border-card)",
          borderRadius: "var(--radius-md)",
          padding: "16px 20px",
          marginBottom: "32px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600", marginBottom: "10px", fontSize: "0.875rem", color: "var(--text-primary)" }}>
            <Bell size={16} color="var(--ft-green)" />
            <span>{isBn ? "ইন-অ্যাপ আপডেট" : "Recent In-App Updates"}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {notifications.map((n) => (
              <div key={n.notification_id} style={{ fontSize: "0.875rem", color: "var(--text-secondary)", display: "flex", justifyContent: "space-between" }}>
                <span><span style={{ fontWeight: "600" }}>{n.title}:</span> {n.body}</span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  {new Date(n.created_at).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Orders Section */}
      <div className="card" style={{ padding: "28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "600", color: "var(--text-primary)" }}>
              {d.recentOrdersTitle}
            </h3>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", margin: 0 }}>
              {isBn ? "আপনার সর্বশেষ সম্পন্ন বা চলমান লেনদেনসমূহ।" : "Showing your latest transactions."}
            </p>
          </div>
          <Link href="/app/orders" className="btn btn-outline btn-sm">
            <span>{isBn ? "সবগুলো দেখুন" : "View All"}</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <FlexiLoading size="md" text={isBn ? "অর্ডার লোড হচ্ছে..." : "Loading your orders..."} />
          </div>
        ) : orders.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "48px 20px",
            background: "var(--bg-main)",
            borderRadius: "var(--radius-md)",
            border: "1px dashed var(--border-card)"
          }}>
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
            <h4 style={{ fontSize: "1.0625rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>
              {isBn ? "কোনো অর্ডার পাওয়া যায়নি" : "No orders found yet"}
            </h4>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "20px", maxWidth: "400px", margin: "0 auto 20px auto" }}>
              {isBn
                ? "আপনি এই সেশনে এখনো কোনো ক্যাশ আউট বা রিচার্জ অর্ডার করেননি।"
                : "You have not initiated any transactions in this session. Start a Cash Out or Discounted Recharge to see it tracked here."}
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
              <Link href="/app/cashout" className="btn btn-primary btn-sm">
                {isBn ? "ব্যালেন্স ক্যাশ আউট" : "Cash Out Balance"}
              </Link>
              <Link href="/app/recharge" className="btn btn-outline btn-sm">
                {isBn ? "ডিসকাউন্টেড রিচার্জ" : "Discounted Recharge"}
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="orders-table-wrapper">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9375rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--border-card)", textAlign: "left" }}>
                    <th style={{ padding: "10px 8px", color: "var(--text-muted)", fontWeight: "500" }}>
                      {isBn ? "অর্ডার আইডি" : "Order ID"}
                    </th>
                    <th style={{ padding: "10px 8px", color: "var(--text-muted)", fontWeight: "500" }}>
                      {isBn ? "সেবা" : "Service"}
                    </th>
                    <th style={{ padding: "10px 8px", color: "var(--text-muted)", fontWeight: "500" }}>
                      {isBn ? "অপারেটর" : "Operator"}
                    </th>
                    <th style={{ padding: "10px 8px", color: "var(--text-muted)", fontWeight: "500" }}>
                      {isBn ? "পরিমাণ" : "Amount"}
                    </th>
                    <th style={{ padding: "10px 8px", color: "var(--text-muted)", fontWeight: "500" }}>
                      {isBn ? "স্ট্যাটাস" : "Status"}
                    </th>
                    <th style={{ padding: "10px 8px", color: "var(--text-muted)", fontWeight: "500", textAlign: "right" }}>
                      {isBn ? "অ্যাকশন" : "Action"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.order_id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                      <td style={{ padding: "12px 8px", fontWeight: "600", color: "var(--text-primary)" }}>
                        <div style={{ overflowWrap: "anywhere" }}>{order.order_id}</div>
                      </td>
                      <td style={{ padding: "12px 8px" }}>
                        {order.service_type === "CASH_OUT"
                          ? (isBn ? "ক্যাশ আউট" : "Cash Out")
                          : (isBn ? "রিচার্জ" : "Recharge")}
                      </td>
                      <td style={{ padding: "12px 8px", fontWeight: "500" }}>
                        {order.operator_code}
                      </td>
                      <td style={{ padding: "12px 8px", fontWeight: "600" }}>
                        ৳{isBn ? toBnDigits(order.amount_bdt) : order.amount_bdt}
                      </td>
                      <td style={{ padding: "12px 8px" }}>
                        <StatusBadge status={order.status} size="sm" />
                      </td>
                      <td style={{ padding: "12px 8px", textAlign: "right" }}>
                        <Link
                          href={`/app/order/${order.order_id}`}
                          className="btn btn-outline btn-sm"
                          style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                        >
                          {isBn ? "ট্র্যাক করুন" : "Track"}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="orders-mobile-list">
              {orders.map((order) => (
                <div key={order.order_id} className="order-card-mobile">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: "0.6875rem", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        {isBn ? "অর্ডার আইডি" : "ORDER ID"}
                      </div>
                      <div style={{ fontSize: "0.9375rem", fontWeight: "700", color: "var(--text-primary)", overflowWrap: "anywhere", wordBreak: "break-word" }}>
                        {order.order_id}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        {order.service_type === "CASH_OUT" ? (isBn ? "ক্যাশ আউট" : "Cash Out") : (isBn ? "রিচার্জ" : "Recharge")} • {order.operator_code}
                      </div>
                    </div>

                    <Link
                      href={`/app/order/${order.order_id}`}
                      className="btn btn-outline btn-sm"
                      style={{ padding: "5px 12px", fontSize: "0.75rem", flexShrink: 0 }}
                    >
                      {isBn ? "ট্র্যাক করুন" : "Track"}
                    </Link>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", paddingTop: "8px", borderTop: "1px solid var(--border-light)" }}>
                    <div style={{ fontSize: "0.9375rem", fontWeight: "700", color: "var(--text-primary)" }}>
                      ৳{isBn ? toBnDigits(order.amount_bdt) : order.amount_bdt}
                    </div>
                    <StatusBadge status={order.status} size="sm" />
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
