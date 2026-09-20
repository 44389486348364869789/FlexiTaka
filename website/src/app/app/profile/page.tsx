"use client";

import React, { useEffect, useState } from "react";
import { api, getStoredAuthToken, getStoredGuestSessionId } from "@/lib/api";
import {
  AlertCircle,
  CheckCircle2,
  LogOut,
  User,
} from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

export default function ProfilePage() {
  const { lang, tr, toBnDigits } = useLanguage();
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
      setError(lang === "bn" ? "সঠিক ১১-সংখ্যার বাংলাদেশী মোবাইল নম্বর দিন" : "Please enter a valid 11-digit Bangladesh mobile number");
      return;
    }

    setLoading(true);
    try {
      await api.requestOtp(cleanPhone);
      setStep("OTP");
      setSuccessMsg(lang === "bn" ? "ভেরিফিকেশন কোড সফলভাবে পাঠানো হয়েছে।" : "Verification code sent successfully.");
    } catch (err: any) {
      setError(err.message || (lang === "bn" ? "ভেরিফিকেশন কোড পাঠানো যায়নি। আবার চেষ্টা করুন।" : "Unable to send verification code. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!otp.trim()) {
      setError(lang === "bn" ? "অনুগ্রহ করে ৬-সংখ্যার ভেরিফিকেশন কোড দিন" : "Please enter the 6-digit verification code");
      return;
    }

    setLoading(true);
    try {
      const res = await api.verifyOtp(phone.trim(), otp.trim());
      setIsLoggedIn(true);
      setUserData({ user_id: res.user_id, phone: phone.trim() });
      if (res.orders_linked && res.orders_linked > 0) {
        setSuccessMsg(
          lang === "bn"
            ? `সফলভাবে যাচাই সম্পন্ন হয়েছে! গেস্ট সেশনের ${toBnDigits(res.orders_linked)}টি অর্ডার আপনার অ্যাকাউন্টে যুক্ত হয়েছে।`
            : `Successfully verified! ${res.orders_linked} order${res.orders_linked > 1 ? "s" : ""} from your guest session have been linked to your account.`
        );
      } else {
        setSuccessMsg(lang === "bn" ? "সফলভাবে যাচাই ও লগইন সম্পন্ন হয়েছে।" : "Successfully verified and logged in.");
      }
      setStep("PHONE");
    } catch (err: any) {
      setError(err.message || (lang === "bn" ? "ভুল বা মেয়াদোত্তীর্ণ OTP কোড।" : "Invalid or expired OTP code."));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    api.logout();
    setIsLoggedIn(false);
    setUserData(null);
    setSuccessMsg(lang === "bn" ? "লগআউট সম্পন্ন হয়েছে। গেস্ট সেশনে ফিরে গেছেন।" : "Logged out successfully. Reverted to ephemeral guest session.");
  };

  const tProfile = tr.app.profile;

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto" }}>
      {/* Page Header */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "4px" }}>
          {tProfile.title}
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", margin: 0 }}>
          {lang === "bn"
            ? "FlexiTaka সেবাসমূহের জন্য অ্যাকাউন্ট নিবন্ধন সম্পূর্ণ ঐচ্ছিক।"
            : "Account registration is completely optional for all FlexiTaka services."}
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
            fontWeight: "600",
            fontSize: "1.125rem"
          }}>
            <User size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "600", color: "var(--text-primary)" }}>
              {isLoggedIn ? tProfile.statusVerified : tProfile.statusGuest}
            </h3>
            <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)", fontWeight: "400" }}>
              {isLoggedIn
                ? (lang === "bn" ? "অনুমোদিত ব্যবহারকারী" : "Authenticated User")
                : `${lang === "bn" ? "সেশন" : "Session"}: ${guestId || (lang === "bn" ? "সক্রিয়" : "Active")}`}
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
                <span style={{ color: "var(--text-muted)", fontWeight: "400" }}>
                  {lang === "bn" ? "ব্যবহারকারী আইডি: " : "User ID: "}
                </span>
                <span style={{ fontWeight: "600" }}>{userData?.user_id || "FT-U-VERIFIED"}</span>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)", fontWeight: "400" }}>
                  {tProfile.phoneNumberLabel}:{" "}
                </span>
                <span style={{ fontWeight: "600" }}>
                  {userData?.phone ? (lang === "bn" ? toBnDigits(userData.phone) : userData.phone) : (lang === "bn" ? "যাচাইকৃত" : "Verified")}
                </span>
              </div>
            </div>

            <button onClick={handleLogout} className="btn btn-outline btn-full">
              <LogOut size={16} />
              <span>{tProfile.btnLogout}</span>
            </button>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: "0.9375rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "24px" }}>
              {lang === "bn"
                ? "আপনি বর্তমানে FlexiTaka গেস্ট হিসেবে ব্যবহার করছেন। লগইন না করেই আপনি ক্যাশ আউট এবং রিচার্জ করতে পারবেন। গেস্ট অর্ডারের ইতিহাস এই ব্রাউজার সেশনের সাথে যুক্ত থাকে।"
                : "You are currently using FlexiTaka as a Guest. You can perform full Cash Out and Recharge transactions without logging in. Orders placed as a guest are linked to this browser session."}
            </p>

            <div style={{
              borderTop: "1px solid var(--border-light)",
              paddingTop: "24px"
            }}>
              <h4 style={{ fontSize: "1.0625rem", fontWeight: "600", marginBottom: "8px" }}>
                {lang === "bn" ? "ঐচ্ছিক: OTP দিয়ে ফোন যাচাই করুন" : "Optional: Verify Phone via OTP"}
              </h4>
              <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginBottom: "16px", fontWeight: "400" }}>
                {lang === "bn"
                  ? "আপনার বাংলাদেশী মোবাইল নম্বর দিয়ে লগইন করুন বা স্থায়ী অ্যাকাউন্ট তৈরি করুন।"
                  : "Log in or create a registered account using your Bangladesh mobile number."}
              </p>

              {step === "PHONE" ? (
                <form onSubmit={handleRequestOtp}>
                  <div className="form-group">
                    <label className="form-label">{tProfile.phoneNumberLabel}</label>
                    <input
                      type="tel"
                      placeholder={tProfile.phonePlaceholder}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-full" disabled={loading || !phone.trim()}>
                    {loading ? (lang === "bn" ? "OTP পাঠানো হচ্ছে..." : "Sending OTP...") : tProfile.btnGetOtp}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp}>
                  <div className="form-group">
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <label className="form-label" style={{ margin: 0 }}>
                        {tProfile.otpStepLabel}
                      </label>
                      <button
                        type="button"
                        onClick={() => setStep("PHONE")}
                        style={{ background: "none", border: "none", color: "var(--ft-green)", fontSize: "0.8125rem", cursor: "pointer", fontWeight: "500" }}
                      >
                        {lang === "bn" ? "নম্বর পরিবর্তন" : "Change Number"}
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder={tProfile.otpPlaceholder}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="form-input"
                      maxLength={6}
                      required
                      style={{ letterSpacing: "0.2em", fontSize: "1.25rem", textAlign: "center", fontWeight: "600" }}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-full" disabled={loading || !otp.trim()}>
                    {loading ? (lang === "bn" ? "যাচাই করা হচ্ছে..." : "Verifying...") : tProfile.btnVerifySubmit}
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
        <span style={{ fontWeight: "600", color: "var(--text-secondary)" }}>
          {lang === "bn" ? "আইডেন্টিটি আর্কিটেকচার তথ্য: " : "Identity Architecture Notice: "}
        </span>
        {lang === "bn"
          ? "নিরাপত্তা ও আর্থিক নিরীক্ষার স্বার্থে, OTP যাচাইয়ের মাধ্যমে লগইন করার সাথে সাথে আপনার বর্তমান গেস্ট সেশনের সমস্ত অর্ডার আপনার স্থায়ী প্রোফাইলে যুক্ত হয়ে যাবে।"
          : "For security and financial auditing integrity, orders placed in your current guest session are automatically linked to your registered profile upon verified OTP login, providing a unified order history without altering financial amounts or historical tracking tokens."}
      </div>
    </div>
  );
}
