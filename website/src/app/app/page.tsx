"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api, getStoredAuthToken } from "@/lib/api";
import { InAppNotification, OrderSummary, UserProfile, LinkedSim } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import FlexiLoading from "@/components/FlexiLoading";
import {
  ArrowDownLeft,
  ArrowRight,
  Bell,
  RefreshCw,
  Zap,
  User,
  Smartphone,
  Headphones,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

export default function AppDashboardPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [linkedSims, setLinkedSims] = useState<LinkedSim[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const { isBn, tr, toBnDigits } = useLanguage();
  const d = tr.app.dashboard;

  const loadData = async () => {
    setLoading(true);
    try {
      await api.ensureGuestSession();
      const token = getStoredAuthToken();
      setIsLoggedIn(!!token);

      const promises: Promise<any>[] = [
        api.listOrders(5, 0).catch(() => []),
        api.getNotifications().catch(() => []),
      ];

      if (token) {
        promises.push(api.getUserProfile().catch(() => null));
        promises.push(api.getLinkedSims().catch(() => []));
      }

      const results = await Promise.all(promises);
      setOrders(results[0]);
      setNotifications(results[1]);

      if (token) {
        setProfile(results[2]);
        setLinkedSims(results[3] || []);
      } else {
        setProfile(null);
        setLinkedSims([]);
      }
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
      {/* Welcome Banner with Customer Status */}
      <div
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid var(--border-card)",
          borderRadius: "var(--radius-lg)",
          padding: "24px 28px",
          marginBottom: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <img
            src="/images/flexitaka-logo.png"
            alt="FlexiTaka"
            style={{
              height: "42px",
              width: "auto",
              objectFit: "contain",
              display: "block",
            }}
          />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1
                style={{
                  fontSize: "1.5rem",
                  fontWeight: "700",
                  color: "var(--text-primary)",
                  margin: 0,
                }}
              >
                {isLoggedIn && profile?.name
                  ? `${isBn ? "স্বাগতম, " : "Welcome back, "}${profile.name}`
                  : d.welcomeTitle}
              </h1>
              {isLoggedIn ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    backgroundColor: "var(--ft-green-subtle)",
                    color: "var(--ft-green-active)",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                  }}
                >
                  <CheckCircle2 size={12} />
                  <span>{isBn ? "ভেরিফায়েড গ্রাহক" : "Verified Customer"}</span>
                </span>
              ) : (
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: "12px",
                    backgroundColor: "#F3F4F6",
                    color: "#6B7280",
                    fontSize: "0.75rem",
                    fontWeight: "500",
                  }}
                >
                  {isBn ? "গেস্ট সেশন" : "Guest Session"}
                </span>
              )}
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: "4px 0 0 0" }}>
              {isLoggedIn && profile?.phone
                ? `${isBn ? "অ্যাকাউন্ট ফোন: " : "Account Phone: "}${isBn ? toBnDigits(profile.phone) : profile.phone}`
                : d.welcomeSubtitle}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={loadData}
            className="btn btn-outline btn-sm"
            title={isBn ? "রিফ্রেশ" : "Refresh"}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>{isBn ? "রিফ্রেশ" : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Customer Account & Shortcuts Bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "14px",
          marginBottom: "28px",
        }}
      >
        {/* Profile / Account Shortcut */}
        <Link
          href="/app/profile"
          style={{
            textDecoration: "none",
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--border-card)",
            borderRadius: "var(--radius-md)",
            padding: "16px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            transition: "all 0.15s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                backgroundColor: isLoggedIn ? "var(--ft-green-subtle)" : "var(--bg-subtle)",
                color: isLoggedIn ? "var(--ft-green-active)" : "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <User size={18} />
            </div>
            <div>
              <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-primary)" }}>
                {isLoggedIn ? (isBn ? "প্রোফাইল সেটিংস" : "Account Profile") : (isBn ? "লগইন / প্রোফাইল" : "Login / Profile")}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                {isLoggedIn
                  ? (isBn ? "তথ্য আপডেট করুন" : "Manage account")
                  : (isBn ? "অর্ডার লিংক করুন" : "Link guest orders")}
              </div>
            </div>
          </div>
          <ChevronRight size={16} color="var(--text-muted)" />
        </Link>

        {/* Linked SIMs Shortcut */}
        <Link
          href="/app/profile#sims"
          style={{
            textDecoration: "none",
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--border-card)",
            borderRadius: "var(--radius-md)",
            padding: "16px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            transition: "all 0.15s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                backgroundColor: "var(--ft-yellow-subtle)",
                color: "#B45309",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Smartphone size={18} />
            </div>
            <div>
              <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-primary)" }}>
                {isBn ? "যুক্ত সিম কার্ড" : "Linked SIMs"}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                {isLoggedIn
                  ? isBn
                    ? `${toBnDigits(linkedSims.length)}টি সিম তালিকাভুক্ত`
                    : `${linkedSims.length} SIM${linkedSims.length === 1 ? "" : "s"} linked`
                  : isBn
                    ? "সিম যাচাই ও যুক্ত করুন"
                    : "Add & verify SIMs"}
              </div>
            </div>
          </div>
          <ChevronRight size={16} color="var(--text-muted)" />
        </Link>

        {/* Support Desk Shortcut */}
        <Link
          href="/app/support"
          style={{
            textDecoration: "none",
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--border-card)",
            borderRadius: "var(--radius-md)",
            padding: "16px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            transition: "all 0.15s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                backgroundColor: "#EBF5FF",
                color: "#1D4ED8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Headphones size={18} />
            </div>
            <div>
              <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-primary)" }}>
                {isBn ? "গ্রাহক সেবা ডেস্ক" : "Support Desk"}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                {isBn ? "সহায়তা ও টিকিট" : "Help & inquiries"}
              </div>
            </div>
          </div>
          <ChevronRight size={16} color="var(--text-muted)" />
        </Link>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-2" style={{ marginBottom: "32px" }}>
        {/* Cash Out Card */}
        <div className="card" style={{ padding: "28px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                background: "var(--ft-green-subtle)",
                color: "var(--ft-green-active)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
              }}
            >
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
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                background: "var(--ft-yellow-subtle)",
                color: "#B45309",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
              }}
            >
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
        <div
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--border-card)",
            borderRadius: "var(--radius-md)",
            padding: "16px 20px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontWeight: "600",
              marginBottom: "10px",
              fontSize: "0.875rem",
              color: "var(--text-primary)",
            }}
          >
            <Bell size={16} color="var(--ft-green)" />
            <span>{isBn ? "ইন-অ্যাপ আপডেট" : "Recent In-App Updates"}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {notifications.map((n) => (
              <div
                key={n.notification_id}
                style={{
                  fontSize: "0.875rem",
                  color: "var(--text-secondary)",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>
                  <span style={{ fontWeight: "600" }}>{n.title}:</span> {n.body}
                </span>
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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
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
          <div
            style={{
              textAlign: "center",
              padding: "48px 20px",
              background: "var(--bg-main)",
              borderRadius: "var(--radius-md)",
              border: "1px dashed var(--border-card)",
            }}
          >
            <div style={{ marginBottom: "16px" }}>
              <img
                src="/images/flexitaka-logo.png"
                alt="FlexiTaka"
                style={{
                  height: "36px",
                  width: "auto",
                  objectFit: "contain",
                  margin: "0 auto",
                  display: "block",
                }}
              />
            </div>
            <h4 style={{ fontSize: "1.0625rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>
              {isBn ? "কোনো অর্ডার পাওয়া যায়নি" : "No orders found yet"}
            </h4>
            <p
              style={{
                fontSize: "0.875rem",
                color: "var(--text-secondary)",
                marginBottom: "20px",
                maxWidth: "400px",
                margin: "0 auto 20px auto",
              }}
            >
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
                          ? isBn
                            ? "ক্যাশ আউট"
                            : "Cash Out"
                          : isBn
                            ? "রিচার্জ"
                            : "Recharge"}
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
                      <div
                        style={{
                          fontSize: "0.6875rem",
                          fontWeight: "600",
                          color: "var(--text-muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {isBn ? "অর্ডার আইডি" : "ORDER ID"}
                      </div>
                      <div
                        style={{
                          fontSize: "0.9375rem",
                          fontWeight: "700",
                          color: "var(--text-primary)",
                          overflowWrap: "anywhere",
                          wordBreak: "break-word",
                        }}
                      >
                        {order.order_id}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        {order.service_type === "CASH_OUT"
                          ? isBn
                            ? "ক্যাশ আউট"
                            : "Cash Out"
                          : isBn
                            ? "রিচার্জ"
                            : "Recharge"}{" "}
                        • {order.operator_code}
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

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "8px",
                      paddingTop: "8px",
                      borderTop: "1px solid var(--border-light)",
                    }}
                  >
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
