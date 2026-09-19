"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { SupportTicket } from "@/lib/types";
import {
  AlertCircle,
  CheckCircle2,
  Headphones,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
} from "lucide-react";

function AppSupportContent() {
  const searchParams = useSearchParams();
  const prefillOrderId = searchParams.get("order_id") || "";

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  // New Ticket Form State
  const [showNewModal, setShowNewModal] = useState(!!prefillOrderId);
  const [category, setCategory] = useState("ORDER_STATUS");
  const [subject, setSubject] = useState(prefillOrderId ? `Question regarding ${prefillOrderId}` : "");
  const [message, setMessage] = useState("");
  const [orderId, setOrderId] = useState(prefillOrderId);
  const [submitting, setSubmitting] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");

  const loadTickets = async () => {
    setLoading(true);
    try {
      await api.ensureGuestSession();
      const list = await api.listTickets();
      setTickets(list);
      if (list.length > 0 && !selectedTicket) {
        setSelectedTicket(list[0]);
      }
    } catch (err) {
      console.error("Failed to load tickets", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setSubmitting(true);
    try {
      const created = await api.createTicket({
        category,
        subject: subject.trim(),
        message: message.trim(),
        order_id: orderId.trim() || undefined,
      });
      setShowNewModal(false);
      setSubject("");
      setMessage("");
      setOrderId("");
      await loadTickets();
      setSelectedTicket(created);
    } catch (err: any) {
      alert(err.message || "Failed to create support ticket");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyMessage.trim()) return;

    setSubmitting(true);
    try {
      const updated = await api.addTicketMessage(selectedTicket.ticket_id, replyMessage.trim());
      setSelectedTicket(updated);
      setReplyMessage("");
      await loadTickets();
    } catch (err: any) {
      alert(err.message || "Failed to send message reply");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: "900", color: "var(--text-primary)", marginBottom: "4px" }}>
            Customer Support Desk
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", margin: 0 }}>
            Open support tickets, verify delayed transfers, or consult our technical operations desk.
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="btn btn-primary btn-sm"
        >
          <Plus size={16} />
          <span>New Ticket</span>
        </button>
      </div>

      {/* Main Support Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }} className="support-grid">
        {/* Left Ticket List */}
        <div className="card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <span style={{ fontSize: "0.875rem", fontWeight: "700", color: "var(--text-primary)" }}>Your Tickets</span>
            <button onClick={loadTickets} className="btn btn-ghost btn-sm" style={{ padding: "4px" }}>
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
              <RefreshCw size={20} className="animate-spin" style={{ margin: "0 auto 8px auto" }} />
              <p style={{ fontSize: "0.8125rem" }}>Loading tickets...</p>
            </div>
          ) : tickets.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 10px", color: "var(--text-muted)" }}>
              <MessageSquare size={28} style={{ margin: "0 auto 8px auto" }} />
              <p style={{ fontSize: "0.875rem", marginBottom: "12px" }}>No tickets opened yet.</p>
              <button onClick={() => setShowNewModal(true)} className="btn btn-outline btn-sm">
                Open a Ticket
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {tickets.map((t) => (
                <div
                  key={t.ticket_id}
                  onClick={() => setSelectedTicket(t)}
                  style={{
                    padding: "12px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid",
                    borderColor: selectedTicket?.ticket_id === t.ticket_id ? "var(--ft-green)" : "var(--border-light)",
                    backgroundColor: selectedTicket?.ticket_id === t.ticket_id ? "var(--ft-green-subtle)" : "var(--bg-white)",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--text-muted)" }}>
                      {t.ticket_id}
                    </span>
                    <span style={{
                      fontSize: "0.6875rem",
                      fontWeight: "700",
                      padding: "2px 6px",
                      borderRadius: "var(--radius-full)",
                      backgroundColor: t.status === "RESOLVED" ? "var(--status-approved-bg)" : "var(--status-processing-bg)",
                      color: t.status === "RESOLVED" ? "var(--status-approved-text)" : "var(--status-processing-text)",
                    }}>
                      {t.status}
                    </span>
                  </div>
                  <div style={{ fontWeight: "700", fontSize: "0.875rem", color: "var(--text-primary)", marginBottom: "4px" }}>
                    {t.subject}
                  </div>
                  {t.order_id && (
                    <div style={{ fontSize: "0.75rem", color: "var(--ft-green)" }}>
                      Order: {t.order_id}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Conversation Thread */}
        <div className="card" style={{ padding: "28px", display: "flex", flexDirection: "column", minHeight: "480px" }}>
          {selectedTicket ? (
            <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
              {/* Thread Header */}
              <div style={{ borderBottom: "1px solid var(--border-light)", paddingBottom: "16px", marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h2 style={{ fontSize: "1.25rem", fontWeight: "800", color: "var(--text-primary)" }}>
                    {selectedTicket.subject}
                  </h2>
                  <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                    Category: {selectedTicket.category.replace(/_/g, " ")}
                  </span>
                </div>
                {selectedTicket.order_id && (
                  <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                    Linked Order ID: <strong style={{ color: "var(--ft-green)" }}>{selectedTicket.order_id}</strong>
                  </div>
                )}
              </div>

              {/* Messages Body */}
              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px", marginBottom: "20px" }}>
                {selectedTicket.messages.map((m, idx) => {
                  const isStaff = m.sender_type === "STAFF" || m.sender_type === "ADMIN";
                  return (
                    <div
                      key={m.message_id || idx}
                      style={{
                        alignSelf: isStaff ? "flex-start" : "flex-end",
                        maxWidth: "80%",
                        backgroundColor: isStaff ? "var(--bg-main)" : "var(--ft-green-subtle)",
                        border: isStaff ? "1px solid var(--border-card)" : "1px solid #BBF7D0",
                        borderRadius: "var(--radius-md)",
                        padding: "12px 16px",
                      }}
                    >
                      <div style={{ fontSize: "0.6875rem", fontWeight: "700", color: isStaff ? "var(--text-muted)" : "#166534", marginBottom: "4px" }}>
                        {isStaff ? "FlexiTaka Support Desk" : "You (Customer)"} • {new Date(m.created_at).toLocaleTimeString()}
                      </div>
                      <p style={{ fontSize: "0.9375rem", color: "var(--text-primary)", margin: 0, lineHeight: 1.5 }}>
                        {m.message}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Reply Input Form */}
              <form onSubmit={handleSendReply} style={{ display: "flex", gap: "12px" }}>
                <input
                  type="text"
                  placeholder="Type a message or additional reference..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  className="form-input"
                  style={{ flex: 1 }}
                  required
                />
                <button type="submit" className="btn btn-primary" disabled={submitting || !replyMessage.trim()}>
                  <Send size={16} />
                  <span>Send</span>
                </button>
              </form>
            </div>
          ) : (
            <div style={{ textAlign: "center", margin: "auto", color: "var(--text-muted)" }}>
              <Headphones size={40} style={{ margin: "0 auto 12px auto" }} />
              <p>Select a ticket from the left or create a new support ticket.</p>
            </div>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      {showNewModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(15, 23, 42, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px"
        }}>
          <div className="card" style={{ maxWidth: "500px", width: "100%", padding: "32px", backgroundColor: "#FFFFFF" }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "800", marginBottom: "16px" }}>
              Open Customer Support Ticket
            </h3>
            <form onSubmit={handleCreateTicket}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="form-input"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="ORDER_STATUS">Order Verification Delay</option>
                  <option value="PAYMENT_ISSUE">Payment / TrxID Issue</option>
                  <option value="OPERATOR_ISSUE">Operator USSD Transfer Failure</option>
                  <option value="GENERAL">General Inquiries</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Linked Order ID (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. FT-108249"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Subject</label>
                <input
                  type="text"
                  placeholder="Summary of your question..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Your Message</label>
                <textarea
                  rows={4}
                  placeholder="Provide your transaction details, operator TrxID, or question..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="form-input"
                  style={{ resize: "vertical" }}
                  required
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || !subject.trim() || !message.trim()}
                >
                  {submitting ? "Opening..." : "Submit Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AppSupportPage() {
  return (
    <React.Suspense fallback={<div className="container" style={{ padding: "40px", textAlign: "center" }}>Loading Support Desk...</div>}>
      <AppSupportContent />
    </React.Suspense>
  );
}
