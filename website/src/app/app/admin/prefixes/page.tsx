"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AlertCircle, CheckCircle2, Plus, RefreshCw, Shield, ToggleLeft, ToggleRight } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

interface PrefixEntry {
  prefix: string;
  operator_code: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export default function AdminPrefixesPage() {
  const { lang } = useLanguage();
  const [prefixes, setPrefixes] = useState<PrefixEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states for adding
  const [newPrefix, setNewPrefix] = useState("");
  const [newOperator, setNewOperator] = useState("GP");
  const [newNotes, setNewNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchPrefixes = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAdminOperatorPrefixes();
      setPrefixes(data);
    } catch (err: any) {
      setError(err.message || "Failed to load operator prefixes. Admin authentication required.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrefixes();
  }, []);

  const handleAddPrefix = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrefix.match(/^01\d$/)) {
      setError("Prefix must be exactly 3 digits starting with 01 (e.g. 017)");
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await api.createAdminOperatorPrefix({
        prefix: newPrefix.trim(),
        operator_code: newOperator,
        notes: newNotes.trim() || undefined,
      });
      setSuccess(`Prefix ${newPrefix} successfully added for ${newOperator}`);
      setNewPrefix("");
      setNewNotes("");
      await fetchPrefixes();
    } catch (err: any) {
      setError(err.message || "Failed to add prefix");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (prefix: string, currentActive: boolean) => {
    setError(null);
    setSuccess(null);
    try {
      await api.updateAdminOperatorPrefix(prefix, {
        is_active: !currentActive,
      });
      setSuccess(`Prefix ${prefix} is now ${!currentActive ? "ACTIVE" : "INACTIVE"}`);
      await fetchPrefixes();
    } catch (err: any) {
      setError(err.message || "Failed to update prefix status");
    }
  };

  const handleChangeOperator = async (prefix: string, newOp: string) => {
    setError(null);
    setSuccess(null);
    try {
      await api.updateAdminOperatorPrefix(prefix, {
        operator_code: newOp,
      });
      setSuccess(`Prefix ${prefix} mapped to ${newOp}`);
      await fetchPrefixes();
    } catch (err: any) {
      setError(err.message || "Failed to update operator mapping");
    }
  };

  return (
    <div className="app-form-wrapper" style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
            <Shield size={24} color="var(--ft-green)" />
            <span>01X Operator Prefix Registry</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: "4px 0 0 0" }}>
            Authoritative registry for Bangladesh mobile operator prefixes (013-019).
          </p>
        </div>
        <button
          onClick={fetchPrefixes}
          className="btn btn-outline"
          style={{ height: "38px", display: "flex", alignItems: "center", gap: "6px" }}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? "spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div style={{
          backgroundColor: "#FEF2F2",
          border: "1px solid #FECACA",
          borderRadius: "var(--radius-md)",
          padding: "10px 14px",
          color: "#991B1B",
          fontSize: "0.875rem",
          marginBottom: "16px",
          display: "flex",
          gap: "8px",
          alignItems: "center"
        }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div style={{
          backgroundColor: "#F0FDF4",
          border: "1px solid #BBF7D0",
          borderRadius: "var(--radius-md)",
          padding: "10px 14px",
          color: "#166534",
          fontSize: "0.875rem",
          marginBottom: "16px",
          display: "flex",
          gap: "8px",
          alignItems: "center"
        }}>
          <CheckCircle2 size={16} />
          <span>{success}</span>
        </div>
      )}

      {/* Add Prefix Card */}
      <form onSubmit={handleAddPrefix} className="card" style={{ padding: "18px", marginBottom: "24px", background: "#FFFFFF" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "12px" }}>Add New Operator Prefix</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr auto", gap: "10px", alignItems: "flex-end" }}>
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: "600", display: "block", marginBottom: "4px" }}>
              Prefix (3 Digits)
            </label>
            <input
              type="text"
              placeholder="e.g. 017"
              maxLength={3}
              className="form-input"
              value={newPrefix}
              onChange={(e) => setNewPrefix(e.target.value.replace(/\D/g, "").slice(0, 3))}
              required
              style={{ height: "40px" }}
            />
          </div>
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: "600", display: "block", marginBottom: "4px" }}>
              Operator
            </label>
            <select
              className="form-input"
              value={newOperator}
              onChange={(e) => setNewOperator(e.target.value)}
              style={{ height: "40px" }}
            >
              <option value="GP">Grameenphone (GP)</option>
              <option value="ROBI">Robi / Airtel</option>
              <option value="BANGLALINK">Banglalink</option>
              <option value="TELETALK">Teletalk</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: "600", display: "block", marginBottom: "4px" }}>
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Grameenphone primary prefix"
              className="form-input"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              style={{ height: "40px" }}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting || newPrefix.length !== 3}
            style={{ height: "40px", display: "flex", alignItems: "center", gap: "6px" }}
          >
            <Plus size={16} />
            <span>Add Prefix</span>
          </button>
        </div>
      </form>

      {/* Prefixes Table */}
      <div className="card" style={{ padding: "0", overflow: "hidden", background: "#FFFFFF" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
          <thead>
            <tr style={{ background: "var(--bg-subtle)", borderBottom: "1px solid var(--border-card)" }}>
              <th style={{ padding: "12px 16px", fontWeight: "600" }}>Prefix</th>
              <th style={{ padding: "12px 16px", fontWeight: "600" }}>Operator</th>
              <th style={{ padding: "12px 16px", fontWeight: "600" }}>Status</th>
              <th style={{ padding: "12px 16px", fontWeight: "600" }}>Notes</th>
              <th style={{ padding: "12px 16px", fontWeight: "600", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {prefixes.map((item) => (
              <tr key={item.prefix} style={{ borderBottom: "1px solid var(--border-card)" }}>
                <td style={{ padding: "12px 16px", fontWeight: "700", fontFamily: "monospace", fontSize: "1rem" }}>
                  {item.prefix}
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <select
                    value={item.operator_code}
                    onChange={(e) => handleChangeOperator(item.prefix, e.target.value)}
                    style={{
                      padding: "4px 8px",
                      borderRadius: "4px",
                      border: "1px solid var(--border-card)",
                      fontSize: "0.8125rem",
                      fontWeight: "600"
                    }}
                  >
                    <option value="GP">GP</option>
                    <option value="ROBI">ROBI</option>
                    <option value="BANGLALINK">BANGLALINK</option>
                    <option value="TELETALK">TELETALK</option>
                  </select>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{
                    padding: "3px 8px",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    background: item.is_active ? "#DCFCE7" : "#FEE2E2",
                    color: item.is_active ? "#166534" : "#991B1B"
                  }}>
                    {item.is_active ? "ACTIVE" : "INACTIVE"}
                  </span>
                </td>
                <td style={{ padding: "12px 16px", color: "var(--text-secondary)", fontSize: "0.8125rem" }}>
                  {item.notes || "—"}
                </td>
                <td style={{ padding: "12px 16px", textAlign: "right" }}>
                  <button
                    onClick={() => handleToggleStatus(item.prefix, item.is_active)}
                    className="btn btn-outline"
                    style={{ padding: "4px 10px", fontSize: "0.75rem", height: "auto" }}
                  >
                    {item.is_active ? "Disable" : "Enable"}
                  </button>
                </td>
              </tr>
            ))}
            {prefixes.length === 0 && !loading && (
              <tr>
                <td colSpan={5} style={{ padding: "24px", textAlign: "center", color: "var(--text-secondary)" }}>
                  No operator prefixes configured.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
