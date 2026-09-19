"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { OrderSummary, ServiceType } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import { Clock, Filter, RefreshCw, Search } from "lucide-react";

export default function OrdersHistoryPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterService, setFilterService] = useState<"ALL" | ServiceType>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const loadOrders = async () => {
    setLoading(true);
    try {
      await api.ensureGuestSession();
      const list = await api.listOrders(50, 0);
      setOrders(list);
    } catch (err) {
      console.error("Failed to load orders", err);
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
          <h1 style={{ fontSize: "1.75rem", fontWeight: "900", color: "var(--text-primary)", marginBottom: "4px" }}>
            Order History
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", margin: 0 }}>
            Track and inspect all Cash Out and Recharge transactions associated with your session.
          </p>
        </div>

        <button onClick={loadOrders} className="btn btn-outline btn-sm">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: "16px 20px", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          {/* Service Tabs */}
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setFilterService("ALL")}
              style={{
                padding: "6px 14px",
                borderRadius: "var(--radius-sm)",
                border: "none",
                fontSize: "0.875rem",
                fontWeight: filterService === "ALL" ? "700" : "500",
                backgroundColor: filterService === "ALL" ? "var(--ft-green)" : "var(--bg-subtle)",
                color: filterService === "ALL" ? "#FFFFFF" : "var(--text-secondary)",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              All Orders
            </button>
            <button
              onClick={() => setFilterService("CASH_OUT")}
              style={{
                padding: "6px 14px",
                borderRadius: "var(--radius-sm)",
                border: "none",
                fontSize: "0.875rem",
                fontWeight: filterService === "CASH_OUT" ? "700" : "500",
                backgroundColor: filterService === "CASH_OUT" ? "var(--ft-green)" : "var(--bg-subtle)",
                color: filterService === "CASH_OUT" ? "#FFFFFF" : "var(--text-secondary)",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              Cash Out
            </button>
            <button
              onClick={() => setFilterService("RECHARGE")}
              style={{
                padding: "6px 14px",
                borderRadius: "var(--radius-sm)",
                border: "none",
                fontSize: "0.875rem",
                fontWeight: filterService === "RECHARGE" ? "700" : "500",
                backgroundColor: filterService === "RECHARGE" ? "var(--ft-green)" : "var(--bg-subtle)",
                color: filterService === "RECHARGE" ? "#FFFFFF" : "var(--text-secondary)",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              Recharge
            </button>
          </div>

          {/* Search Input */}
          <div style={{ position: "relative", minWidth: "240px" }}>
            <input
              type="text"
              placeholder="Search Order ID / Phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ padding: "8px 12px 8px 34px", fontSize: "0.875rem" }}
            />
            <Search size={16} color="var(--text-muted)" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }} />
          </div>
        </div>
      </div>

      {/* Orders Table Card */}
      <div className="card" style={{ padding: "24px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "48px", color: "var(--text-muted)" }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 12px auto" }} />
            <p>Loading transactions...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 20px" }}>
            <Clock size={36} color="var(--text-muted)" style={{ margin: "0 auto 12px auto" }} />
            <h3 style={{ fontSize: "1.125rem", fontWeight: "700", marginBottom: "6px" }}>
              No transactions match your criteria
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
              {searchQuery ? "Try searching with a different Order ID or keyword." : "You haven't placed any orders in this session yet."}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9375rem" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border-card)", textAlign: "left" }}>
                  <th style={{ padding: "12px 10px", color: "var(--text-muted)", fontWeight: "700" }}>Order ID</th>
                  <th style={{ padding: "12px 10px", color: "var(--text-muted)", fontWeight: "700" }}>Service</th>
                  <th style={{ padding: "12px 10px", color: "var(--text-muted)", fontWeight: "700" }}>Operator</th>
                  <th style={{ padding: "12px 10px", color: "var(--text-muted)", fontWeight: "700" }}>Target Number</th>
                  <th style={{ padding: "12px 10px", color: "var(--text-muted)", fontWeight: "700" }}>Amount</th>
                  <th style={{ padding: "12px 10px", color: "var(--text-muted)", fontWeight: "700" }}>Status</th>
                  <th style={{ padding: "12px 10px", color: "var(--text-muted)", fontWeight: "700" }}>Created</th>
                  <th style={{ padding: "12px 10px", color: "var(--text-muted)", fontWeight: "700", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((o) => (
                  <tr key={o.order_id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                    <td style={{ padding: "14px 10px", fontWeight: "700", color: "var(--text-primary)" }}>
                      {o.order_id}
                    </td>
                    <td style={{ padding: "14px 10px" }}>
                      {o.service_type === "CASH_OUT" ? "Cash Out" : "Recharge"}
                    </td>
                    <td style={{ padding: "14px 10px", fontWeight: "600" }}>
                      {o.operator_code}
                    </td>
                    <td style={{ padding: "14px 10px" }}>
                      {o.mobile_number}
                    </td>
                    <td style={{ padding: "14px 10px", fontWeight: "700" }}>
                      ৳{o.amount_bdt}
                    </td>
                    <td style={{ padding: "14px 10px" }}>
                      <StatusBadge status={o.status} size="sm" />
                    </td>
                    <td style={{ padding: "14px 10px", color: "var(--text-muted)", fontSize: "0.8125rem" }}>
                      {new Date(o.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "14px 10px", textAlign: "right" }}>
                      <Link
                        href={`/app/order/${o.order_id}`}
                        className="btn btn-outline btn-sm"
                        style={{ padding: "4px 12px", fontSize: "0.75rem" }}
                      >
                        Details
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
