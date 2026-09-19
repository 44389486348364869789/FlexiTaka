"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { OrderDetail } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  Headphones,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

function OrderDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orderId = params.id as string;
  const trackingToken = searchParams.get("token") || searchParams.get("tracking_token");

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrderDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getOrder(orderId, trackingToken);
      setOrder(data);
    } catch (err: any) {
      setError(err.message || "Failed to load order details. You may need an authorization tracking token.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId, trackingToken]);

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      {/* Back Link & Title */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <Link href="/app/orders" style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          color: "var(--text-secondary)",
          fontSize: "0.875rem",
          fontWeight: "600"
        }}>
          <ArrowLeft size={16} />
          <span>Back to All Orders</span>
        </Link>

        <button onClick={fetchOrderDetails} className="btn btn-outline btn-sm">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Refresh Status</span>
        </button>
      </div>

      {error ? (
        <div className="card" style={{ padding: "40px", textAlign: "center" }}>
          <h3 style={{ fontSize: "1.25rem", fontWeight: "800", color: "#DC2626", marginBottom: "8px" }}>
            Unable to View Order
          </h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>
            {error}
          </p>
          <Link href="/app/orders" className="btn btn-outline">
            Return to My Orders
          </Link>
        </div>
      ) : loading && !order ? (
        <div style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)" }}>
          <RefreshCw size={28} className="animate-spin" style={{ margin: "0 auto 12px auto" }} />
          <p>Retrieving authoritative order record...</p>
        </div>
      ) : order ? (
        <div>
          {/* Main Order Header Card */}
          <div className="card" style={{ padding: "32px", marginBottom: "28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
              <div>
                <div style={{ fontSize: "0.8125rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {order.service_type === "CASH_OUT" ? "SIM Balance Cash Out" : "Discounted Recharge"}
                </div>
                <h1 style={{ fontSize: "2rem", fontWeight: "900", color: "var(--text-primary)", marginTop: "4px" }}>
                  {order.order_id}
                </h1>
                <div style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginTop: "4px" }}>
                  Created: {new Date(order.created_at).toLocaleString()}
                </div>
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
              padding: "20px",
              border: "1px solid var(--border-light)"
            }} className="financial-grid">
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "600" }}>Operator</div>
                <div style={{ fontSize: "1.125rem", fontWeight: "800", color: "var(--text-primary)" }}>{order.operator_code}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "600" }}>Total Amount</div>
                <div style={{ fontSize: "1.125rem", fontWeight: "800", color: "var(--text-primary)" }}>৳{order.amount_bdt}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "600" }}>
                  {order.service_type === "CASH_OUT" ? "Net Payout Due" : "Amount Paid"}
                </div>
                <div style={{ fontSize: "1.125rem", fontWeight: "800", color: "var(--ft-green)" }}>
                  {order.service_type === "CASH_OUT"
                    ? `৳${order.cashout_details?.payout_amount || "..."}`
                    : `৳${order.recharge_details?.customer_pay_amount || "..."}`}
                </div>
              </div>
            </div>
          </div>

          {/* Service Details Card */}
          <div className="card" style={{ padding: "28px", marginBottom: "28px" }}>
            <h3 style={{ fontSize: "1.1875rem", fontWeight: "800", marginBottom: "16px" }}>
              Transaction Parameters
            </h3>

            {order.service_type === "CASH_OUT" && order.cashout_details && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "0.9375rem" }}>
                <div>
                  <span style={{ color: "var(--text-muted)", display: "block", fontSize: "0.8125rem" }}>Your SIM Number:</span>
                  <strong>{order.cashout_details.source_mobile_number || order.mobile_number}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)", display: "block", fontSize: "0.8125rem" }}>Payout Method & Account:</span>
                  <strong>{order.cashout_details.payout_method} ({order.cashout_details.payout_account})</strong>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)", display: "block", fontSize: "0.8125rem" }}>Assigned FlexiTaka SIM:</span>
                  <strong>{order.cashout_details.receiving_mobile_number || "Assigned on Order"}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)", display: "block", fontSize: "0.8125rem" }}>Transfer Reference (TrxID):</span>
                  <strong>{order.cashout_details.transfer_reference || "Pending submission"}</strong>
                </div>
              </div>
            )}

            {order.service_type === "RECHARGE" && order.recharge_details && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "0.9375rem" }}>
                <div>
                  <span style={{ color: "var(--text-muted)", display: "block", fontSize: "0.8125rem" }}>Recipient Mobile Number:</span>
                  <strong>{order.recharge_details.recharge_mobile_number || order.mobile_number}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)", display: "block", fontSize: "0.8125rem" }}>Recharge Face Value:</span>
                  <strong>৳{order.amount_bdt}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)", display: "block", fontSize: "0.8125rem" }}>Discount Applied:</span>
                  <strong style={{ color: "var(--ft-green)" }}>
                    ৳{order.recharge_details.discount_amount || "0.00"} ({order.recharge_details.discount_rate || "5"}%)
                  </strong>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)", display: "block", fontSize: "0.8125rem" }}>Payment Status:</span>
                  <strong>{order.payment_id ? "Payment Linked" : "Awaiting Verification"}</strong>
                </div>
              </div>
            )}
          </div>

          {/* Authoritative Event Timeline */}
          <div className="card" style={{ padding: "28px", marginBottom: "28px" }}>
            <h3 style={{ fontSize: "1.1875rem", fontWeight: "800", marginBottom: "20px" }}>
              Authoritative Lifecycle Timeline
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px", position: "relative" }}>
              {order.events && order.events.length > 0 ? (
                order.events.map((evt, idx) => (
                  <div key={evt.event_id || idx} style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                    <div style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      backgroundColor: "var(--ft-green-subtle)",
                      color: "var(--ft-green)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "700",
                      fontSize: "0.8125rem",
                      flexShrink: 0
                    }}>
                      ✓
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontWeight: "700", fontSize: "0.9375rem", color: "var(--text-primary)" }}>
                          {evt.new_status.replace(/_/g, " ")}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          by {evt.actor_type}
                        </span>
                      </div>
                      {evt.note && (
                        <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", margin: "4px 0 0 0" }}>
                          {evt.note}
                        </p>
                      )}
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        {new Date(evt.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>No events logged yet.</p>
              )}
            </div>
          </div>

          {/* Support Link for Order */}
          <div style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--border-card)",
            borderRadius: "var(--radius-lg)",
            padding: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <Headphones size={22} color="var(--ft-green)" />
              <div>
                <div style={{ fontWeight: "700", fontSize: "0.9375rem" }}>Need assistance with order {order.order_id}?</div>
                <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>Our support desk is ready to help verify your transfer.</div>
              </div>
            </div>
            <Link
              href={`/app/support?order_id=${encodeURIComponent(order.order_id)}`}
              className="btn btn-outline btn-sm"
            >
              <span>Open Support Ticket</span>
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
    <React.Suspense fallback={<div className="container" style={{ padding: "40px", textAlign: "center" }}>Loading Order Details...</div>}>
      <OrderDetailContent />
    </React.Suspense>
  );
}
