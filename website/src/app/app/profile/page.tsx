"use client";

import React, { useEffect, useState } from "react";
import { api, getStoredAuthToken, getStoredGuestSessionId } from "@/lib/api";
import {
  AlertCircle,
  CheckCircle2,
  Lock,
  LogOut,
  Phone,
  ShieldCheck,
  Smartphone,
  User,
} from "lucide-react";

export default function ProfilePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [guestId, setGuestId] = useState<string | null>(null);

  // OTP Login State
  const [step, setStep] = useState<"PHONE" | "OTP">("PHONE");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [userData, setUserData] = useState<{ user_id: string; phone: string } | null>(null);

  useEffect(() => {
    const token = getStoredAuthToken();
    setIsLoggedIn(!!token);
    const gid = getStoredGuestSessionId();
    setGuestId(gid);
  }, []);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanPhone = phone.trim();
    if (!cleanPhone.match(/^(?:\+88|88)?01[3-9]\d{8}$/)) {
      setError("Please enter a valid 11-digit Bangladesh mobile number");
      return;
    }

    setLoading(true);
    try {
      await api.requestOtp(cleanPhone);
      setStep("OTP");
      setSuccessMsg("SMS OTP dispatched to your mobile number.");
    } catch (err: any) {
      setError(err.message || "Failed to request OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!otp.trim()) {
      setError("Please enter the 6-digit verification code");
      return;
    }

    setLoading(true);
    try {
      const res = await api.verifyOtp(phone.trim(), otp.trim());
      setIsLoggedIn(true);
      setUserData({ user_id: res.user_id, phone: phone.trim() });
      setSuccessMsg("Successfully verified and logged in.");
      setStep("PHONE");
    } catch (err: any) {
      setError(err.message || "Invalid or expired OTP code.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    api.logout();
    setIsLoggedIn(false);
    setUserData(null);
    setSuccessMsg("Logged out successfully. Reverted to ephemeral guest session.");
  };

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto" }}>
      {/* Page Header */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: "900", color: "var(--text-primary)", marginBottom: "4px" }}>
          User Account & Identity
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", margin: 0 }}>
          Account registration is completely optional for all FlexiTaka services.
        </p>
      </div>

      {error && (
        <div style={{
          backgroundColor: "#FEF2F2",
          border: "1px solid #FECACA",
          borderRadius: "var(--radius-md)",
          padding: "14px 18px",
          color: "#991B1B",
          fontSize: "0.875rem",
          marginBottom: "20px",
          display: "flex",
          gap: "10px",
          alignItems: "center"
        }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div style={{
          backgroundColor: "var(--ft-green-subtle)",
          border: "1px solid #BBF7D0",
          borderRadius: "var(--radius-md)",
          padding: "14px 18px",
          color: "#166534",
          fontSize: "0.875rem",
          marginBottom: "20px",
          display: "flex",
          gap: "10px",
          alignItems: "center"
        }}>
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Active Session Card */}
      <div className="card" style={{ padding: "32px", marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px" }}>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            backgroundColor: isLoggedIn ? "var(--ft-green-subtle)" : "var(--bg-subtle)",
            color: isLoggedIn ? "var(--ft-green-active)" : "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "800",
            fontSize: "1.125rem"
          }}>
            <User size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "800", color: "var(--text-primary)" }}>
              {isLoggedIn ? "Registered Account" : "Ephemeral Guest Session"}
            </h3>
            <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
              {isLoggedIn ? "Authenticated User" : `Session: ${guestId || "Active"}`}
            </span>
          </div>
        </div>

        {isLoggedIn ? (
          <div>
            <div style={{
              backgroundColor: "var(--bg-main)",
              borderRadius: "var(--radius-sm)",
              padding: "16px",
              marginBottom: "24px",
              fontSize: "0.9375rem"
            }}>
              <div style={{ marginBottom: "6px" }}>
                <span style={{ color: "var(--text-muted)" }}>User ID: </span>
                <strong>{userData?.user_id || "FT-U-VERIFIED"}</strong>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Phone Number: </span>
                <strong>{userData?.phone || phone || "Verified"}</strong>
              </div>
            </div>

            <button onClick={handleLogout} className="btn btn-outline btn-full">
              <LogOut size={16} />
              <span>Log Out</span>
            </button>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: "0.9375rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "24px" }}>
              You are currently using FlexiTaka as a <strong>Guest</strong>. You can perform full Cash Out and Recharge transactions without logging in. Orders placed as a guest are linked to this browser session.
            </p>

            <div style={{
              borderTop: "1px solid var(--border-light)",
              paddingTop: "24px"
            }}>
              <h4 style={{ fontSize: "1.0625rem", fontWeight: "800", marginBottom: "8px" }}>
                Optional: Verify Phone via OTP
              </h4>
              <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginBottom: "16px" }}>
                Log in or create a registered account using your Bangladesh mobile number.
              </p>

              {step === "PHONE" ? (
                <form onSubmit={handleRequestOtp}>
                  <div className="form-group">
                    <label className="form-label">Mobile Phone Number</label>
                    <input
                      type="tel"
                      placeholder="e.g. 01712345678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-full" disabled={loading || !phone.trim()}>
                    {loading ? "Sending OTP..." : "Send Verification OTP"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp}>
                  <div className="form-group">
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <label className="form-label" style={{ margin: 0 }}>6-Digit SMS Code</label>
                      <button
                        type="button"
                        onClick={() => setStep("PHONE")}
                        style={{ background: "none", border: "none", color: "var(--ft-green)", fontSize: "0.8125rem", cursor: "pointer", fontWeight: "600" }}
                      >
                        Change Number
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. 123456"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="form-input"
                      maxLength={6}
                      required
                      style={{ letterSpacing: "0.2em", fontSize: "1.25rem", textAlign: "center", fontWeight: "700" }}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-full" disabled={loading || !otp.trim()}>
                    {loading ? "Verifying..." : "Verify Code & Log In"}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Identity Clarification Policy Card */}
      <div style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid var(--border-card)",
        borderRadius: "var(--radius-md)",
        padding: "20px 24px",
        fontSize: "0.8125rem",
        color: "var(--text-muted)",
        lineHeight: 1.6
      }}>
        <strong style={{ color: "var(--text-secondary)" }}>Identity Architecture Notice:</strong> For security and financial auditing integrity, orders placed as a guest remain securely linked to your guest session. Logging in manages your registered profile without altering historical guest tracking tokens.
      </div>
    </div>
  );
}
