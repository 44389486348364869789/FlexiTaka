"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { InAppNotification, OrderSummary } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import {
  ArrowDownLeft,
  ArrowRight,
  Bell,
  Clock,
  ExternalLink,
  Plus,
  RefreshCw,
  ShieldCheck,
  Zap,
} from "lucide-react";

export default function AppDashboardPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [loading, setLoading] = useState(true);

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
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "6px" }}>
            Web App Dashboard
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", margin: 0 }}>
            Quickly initiate a balance cash out, send a discounted recharge, or track ongoing orders.
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={loadData} className="btn btn-outline btn-sm" title="Refresh">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
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
            <h3 style={{ fontSize: "1.375rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "8px" }}>
              Cash Out SIM Balance
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.5, marginBottom: "20px" }}>
              Liquidate eligible prepaid balance from GP, Robi, or Banglalink directly to bKash, Nagad, or Bank.
            </p>
          </div>
          <Link href="/app/cashout" className="btn btn-primary btn-full">
            <span>Start Cash Out Flow</span>
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
            <h3 style={{ fontSize: "1.375rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "8px" }}>
              Discounted Recharge
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.5, marginBottom: "20px" }}>
              Top up any prepaid mobile number and receive an instant cashback discount on every transaction.
            </p>
          </div>
          <Link href="/app/recharge" className="btn btn-secondary btn-full">
            <span>Start Recharge Flow</span>
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
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", marginBottom: "10px", fontSize: "0.875rem", color: "var(--text-primary)" }}>
            <Bell size={16} color="var(--ft-green)" />
            <span>Recent In-App Updates</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {notifications.map((n) => (
              <div key={n.notification_id} style={{ fontSize: "0.875rem", color: "var(--text-secondary)", display: "flex", justifyContent: "space-between" }}>
                <span><strong>{n.title}:</strong> {n.body}</span>
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
            <h3 style={{ fontSize: "1.25rem", fontWeight: "800", color: "var(--text-primary)" }}>
              Recent Orders
            </h3>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", margin: 0 }}>
              Showing your latest transactions.
            </p>
          </div>
          <Link href="/app/orders" className="btn btn-outline btn-sm">
            <span>View All</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 12px auto" }} />
            <p>Loading your orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "48px 20px",
            background: "var(--bg-main)",
            borderRadius: "var(--radius-md)",
            border: "1px dashed var(--border-card)"
          }}>
            <Clock size={36} color="var(--text-muted)" style={{ margin: "0 auto 12px auto" }} />
            <h4 style={{ fontSize: "1.0625rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "4px" }}>
              No orders found yet
            </h4>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "20px", maxWidth: "400px", margin: "0 auto 20px auto" }}>
              You have not initiated any transactions in this session. Start a Cash Out or Discounted Recharge to see it tracked here.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
              <Link href="/app/cashout" className="btn btn-primary btn-sm">
                Cash Out Balance
              </Link>
              <Link href="/app/recharge" className="btn btn-outline btn-sm">
                Discounted Recharge
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9375rem" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border-card)", textAlign: "left" }}>
                  <th style={{ padding: "10px 8px", color: "var(--text-muted)", fontWeight: "700" }}>Order ID</th>
                  <th style={{ padding: "10px 8px", color: "var(--text-muted)", fontWeight: "700" }}>Service</th>
                  <th style={{ padding: "10px 8px", color: "var(--text-muted)", fontWeight: "700" }}>Operator</th>
                  <th style={{ padding: "10px 8px", color: "var(--text-muted)", fontWeight: "700" }}>Amount</th>
                  <th style={{ padding: "10px 8px", color: "var(--text-muted)", fontWeight: "700" }}>Status</th>
                  <th style={{ padding: "10px 8px", color: "var(--text-muted)", fontWeight: "700", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.order_id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                    <td style={{ padding: "12px 8px", fontWeight: "700", color: "var(--text-primary)" }}>
                      {order.order_id}
                    </td>
                    <td style={{ padding: "12px 8px" }}>
                      {order.service_type === "CASH_OUT" ? "Cash Out" : "Recharge"}
                    </td>
                    <td style={{ padding: "12px 8px", fontWeight: "600" }}>
                      {order.operator_code}
                    </td>
                    <td style={{ padding: "12px 8px", fontWeight: "700" }}>
                      ৳{order.amount_bdt}
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
                        Track
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
