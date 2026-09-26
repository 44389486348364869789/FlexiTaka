"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  api,
  getStoredAuthToken,
  getStoredGuestSessionId,
  detectOperatorFromPhone,
  normalizeBdPhone11,
} from "@/lib/api";
import { UserProfile, LinkedSim, OperatorCode } from "@/lib/types";
import { formatApiErrorMessage } from "@/lib/formatters";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  User,
  Phone,
  Mail,
  Shield,
  Smartphone,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  LogOut,
  RefreshCw,
  Globe,
  History,
  Calendar,
  Check,
  X,
  ChevronRight,
  Lock,
  Tag,
  Star,
  Send,
  AlertTriangle,
} from "lucide-react";

export default function ProfilePage() {
  const { lang, setLanguage, tr, toBnDigits } = useLanguage();
  const tProfile = tr.app.profile;

  // Authentication & Guest State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [guestId, setGuestId] = useState<string | null>(null);

  // User Profile State
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Authoritative Linked SIMs State (Always fresh from GET /api/v1/user/sims)
  const [linkedSims, setLinkedSims] = useState<LinkedSim[]>([]);
  const [simsLoading, setSimsLoading] = useState(false);
  const [simsError, setSimsError] = useState<string | null>(null);

  // Profile Edit State
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [langPref, setLangPref] = useState<"bn" | "en">(lang || "bn");
  const [savingProfile, setSavingProfile] = useState(false);

  // Guest Login State
  const [loginStep, setLoginStep] = useState<"PHONE" | "OTP">("PHONE");
  const [loginPhone, setLoginPhone] = useState("");
  const [loginOtp, setLoginOtp] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Add SIM State
  const [showAddSim, setShowAddSim] = useState(false);
  const [newSimPhone, setNewSimPhone] = useState("");
  const [newSimLabel, setNewSimLabel] = useState("");
  const [addingSim, setAddingSim] = useState(false);

  // Active Verifying SIM & Operator OTP State
  const [verifyingSimId, setVerifyingSimId] = useState<string | null>(null);
  const [operatorOtp, setOperatorOtp] = useState("");
  const [operatorRefId, setOperatorRefId] = useState<string | null>(null);
  const [requestingOpOtp, setRequestingOpOtp] = useState(false);
  const [submittingOpOtp, setSubmittingOpOtp] = useState(false);
  const [otpSentForSimId, setOtpSentForSimId] = useState<string | null>(null);
  const [otpCooldown, setOtpCooldown] = useState<number>(0);

  // Global Feedback State
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Timer reference for cooldown
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const setFeedback = (err: string | null, success: string | null) => {
    setError(err);
    setSuccessMsg(success);
    if (success) {
      setTimeout(() => setSuccessMsg(null), 6000);
    }
  };

  // Cooldown countdown tick
  useEffect(() => {
    if (otpCooldown > 0) {
      timerRef.current = setTimeout(() => {
        setOtpCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [otpCooldown]);

  // Keep local language select in sync if global locale changes
  useEffect(() => {
    setLangPref(lang);
  }, [lang]);

  // --- Authoritative Data Fetchers ---

  // 1. Fetch Latest Linked SIMs directly from GET /api/v1/user/sims
  const fetchSims = useCallback(async (silent = false, refresh = false) => {
    const token = getStoredAuthToken();
    if (!token) {
      setLinkedSims([]);
      return;
    }

    if (!silent) setSimsLoading(true);
    setSimsError(null);
    try {
      const latestSims = await api.getLinkedSims(refresh);
      setLinkedSims(latestSims);
    } catch (err: any) {
      console.error("GET /api/v1/user/sims failed:", err);
      const msg = formatApiErrorMessage(err, lang);
      setSimsError(msg);
    } finally {
      if (!silent) setSimsLoading(false);
    }
  }, [lang]);

  // 2. Fetch User Profile
  const fetchProfile = useCallback(async () => {
    const token = getStoredAuthToken();
    if (!token) {
      setIsLoggedIn(false);
      setProfile(null);
      return;
    }

    setIsLoggedIn(true);
    setProfileLoading(true);
    try {
      const userProf = await api.getUserProfile();
      setProfile(userProf);
      setNameInput(userProf.name || "");
      setEmailInput(userProf.email || "");
      const prefLang = userProf.language_preference === "en" ? "en" : "bn";
      setLangPref(prefLang);
      if (prefLang !== lang) {
        setLanguage(prefLang, false);
      }
    } catch (err: any) {
      console.error("GET /api/v1/user/profile failed:", err);
      if (err.status === 401) {
        api.logout();
        setIsLoggedIn(false);
        setFeedback(
          lang === "bn"
            ? "আপনার লগইন সেশনের মেয়াদ শেষ হয়েছে। অনুগ্রহ করে আবার লগইন করুন।"
            : "Your session has expired. Please log in again.",
          null
        );
      }
    } finally {
      setProfileLoading(false);
    }
  }, [lang, setLanguage]);

  // Initial Load on Page Mount - Always fetch fresh live operator balance
  useEffect(() => {
    const token = getStoredAuthToken();
    setIsLoggedIn(!!token);
    setGuestId(getStoredGuestSessionId());

    if (token) {
      fetchProfile();
      fetchSims(false, true);
    }
  }, [fetchProfile, fetchSims]);

  // Re-fetch fresh live SIM balance when returning / refocusing the window/tab
  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible" && getStoredAuthToken()) {
        fetchSims(true, true);
        fetchProfile();
      }
    };

    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    return () => {
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
    };
  }, [fetchSims, fetchProfile]);

  // --- Handlers ---

  // Request FlexiTaka Account OTP (Login)
  const handleRequestLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null, null);

    const clean = normalizeBdPhone11(loginPhone);
    if (!clean.match(/^01[3-9]\d{8}$/)) {
      setFeedback(
        lang === "bn"
          ? "সঠিক ১১-সংখ্যার বাংলাদেশী মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)"
          : "Please enter a valid 11-digit Bangladesh mobile number (e.g., 017XXXXXXXX)",
        null
      );
      return;
    }

    setLoginLoading(true);
    try {
      await api.requestOtp(clean);
      setLoginStep("OTP");
      setFeedback(
        null,
        lang === "bn"
          ? `ভেরিফিকেশন কোড পাঠানো হয়েছে ${clean} নম্বরে।`
          : `Verification code sent to ${clean}.`
      );
    } catch (err: any) {
      setFeedback(formatApiErrorMessage(err, lang), null);
    } finally {
      setLoginLoading(false);
    }
  };

  // Verify FlexiTaka Account OTP (Login)
  const handleVerifyLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null, null);

    if (!loginOtp.trim()) {
      setFeedback(
        lang === "bn" ? "অনুগ্রহ করে ৬-সংখ্যার OTP লিখুন" : "Please enter the 6-digit OTP code",
        null
      );
      return;
    }

    setLoginLoading(true);
    try {
      const clean = normalizeBdPhone11(loginPhone);
      const res = await api.verifyOtp(clean, loginOtp.trim());
      setIsLoggedIn(true);
      setLoginStep("PHONE");
      setLoginOtp("");
      setLoginPhone("");

      // Re-fetch fresh profile & linked SIMs directly from backend
      await Promise.all([fetchProfile(), fetchSims()]);

      if (res.orders_linked && res.orders_linked > 0) {
        setFeedback(
          null,
          lang === "bn"
            ? `স্বাগতম! আপনার গেস্ট সেশনের ${toBnDigits(res.orders_linked)}টি অর্ডার সফলভাবে অ্যাকাউন্টে একীভূত হয়েছে।`
            : `Welcome! ${res.orders_linked} orders from your guest session have been linked to your account.`
        );
      } else {
        setFeedback(
          null,
          lang === "bn" ? "সফলভাবে লগইন সম্পন্ন হয়েছে!" : "Logged in successfully!"
        );
      }
    } catch (err: any) {
      setFeedback(formatApiErrorMessage(err, lang), null);
    } finally {
      setLoginLoading(false);
    }
  };

  // Update Profile Info
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null, null);
    setSavingProfile(true);

    try {
      const updated = await api.updateUserProfile({
        name: nameInput.trim() || undefined,
        email: emailInput.trim() || undefined,
        language_preference: langPref,
      });
      setProfile(updated);

      // Immediately switch the active frontend locale across the entire app
      setLanguage(langPref, false);

      setFeedback(
        null,
        langPref === "bn"
          ? "প্রোফাইল তথ্য সফলভাবে আপডেট হয়েছে।"
          : "Profile updated successfully."
      );
    } catch (err: any) {
      setFeedback(formatApiErrorMessage(err, langPref), null);
    } finally {
      setSavingProfile(false);
    }
  };

  // Add Linked SIM -> Re-fetch authoritative API data immediately
  const handleAddSim = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null, null);

    const clean = normalizeBdPhone11(newSimPhone);
    if (!clean.match(/^01[3-9]\d{8}$/)) {
      setFeedback(
        lang === "bn"
          ? "সঠিক ১১-সংখ্যার বাংলাদেশী মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)"
          : "Please enter a valid 11-digit Bangladesh mobile number",
        null
      );
      return;
    }

    setAddingSim(true);
    try {
      const created = await api.addLinkedSim({
        phone: clean,
        label: newSimLabel.trim() || undefined,
      });

      // Crucial: Re-fetch authoritative list from GET /api/v1/user/sims
      await fetchSims();

      setShowAddSim(false);
      setNewSimPhone("");
      setNewSimLabel("");

      // Open operator OTP verification console directly for this new SIM
      setVerifyingSimId(created.sim_id);
      setOperatorOtp("");
      setFeedback(null, tProfile.addSimSuccess);
    } catch (err: any) {
      setFeedback(formatApiErrorMessage(err, lang), null);
    } finally {
      setAddingSim(false);
    }
  };

  // Request Operator OTP for Linked SIM
  const handleRequestOperatorOtp = async (sim: LinkedSim) => {
    setFeedback(null, null);
    setRequestingOpOtp(true);
    try {
      const res = await api.requestLinkedSimOtp(sim.sim_id);
      setOperatorRefId(res.reference_id || null);
      setOtpSentForSimId(sim.sim_id);
      setOtpCooldown(60); // 60 seconds cooldown timer
      setFeedback(
        null,
        lang === "bn"
          ? `${sim.operator_code} থেকে ${sim.phone} নম্বরে ৬-সংখ্যার কনফার্মেশন কোড পাঠানো হয়েছে।`
          : `A confirmation code has been sent by ${sim.operator_code} to ${sim.phone}.`
      );
    } catch (err: any) {
      setFeedback(formatApiErrorMessage(err, lang), null);
    } finally {
      setRequestingOpOtp(false);
    }
  };

  // Submit Operator OTP -> Re-fetch authoritative API data immediately
  const handleVerifyOperatorOtp = async (e: React.FormEvent, sim: LinkedSim) => {
    e.preventDefault();
    setFeedback(null, null);

    if (!operatorOtp.trim()) {
      setFeedback(
        lang === "bn" ? "অনুগ্রহ করে অপারেটর OTP কোড দিন" : "Please enter the operator OTP code",
        null
      );
      return;
    }

    setSubmittingOpOtp(true);
    try {
      await api.verifyLinkedSimOtp(
        sim.sim_id,
        operatorOtp.trim(),
        operatorRefId || undefined
      );

      // Crucial: Always re-fetch authoritative list from GET /api/v1/user/sims with fresh live balance
      await fetchSims(false, true);

      setVerifyingSimId(null);
      setOperatorOtp("");
      setOperatorRefId(null);
      setOtpSentForSimId(null);
      setFeedback(null, tProfile.simVerifiedSuccess);
    } catch (err: any) {
      setFeedback(formatApiErrorMessage(err, lang), null);
    } finally {
      setSubmittingOpOtp(false);
    }
  };

  // Remove Linked SIM -> Re-fetch authoritative API data immediately
  const handleRemoveSim = async (simId: string) => {
    if (!window.confirm(tProfile.confirmRemoveSim)) {
      return;
    }

    setFeedback(null, null);
    try {
      await api.removeLinkedSim(simId);

      // Crucial: Always re-fetch authoritative list from GET /api/v1/user/sims
      await fetchSims();

      if (verifyingSimId === simId) {
        setVerifyingSimId(null);
      }
      setFeedback(null, tProfile.simRemovedSuccess);
    } catch (err: any) {
      setFeedback(formatApiErrorMessage(err, lang), null);
    }
  };

  // Logout
  const handleLogout = async () => {
    await api.logout();
    setIsLoggedIn(false);
    setProfile(null);
    setLinkedSims([]);
    setVerifyingSimId(null);
    setShowAddSim(false);
    setFeedback(
      null,
      lang === "bn"
        ? "সফলভাবে লগআউট হয়েছে। আপনি নিরাপদ গেস্ট মোডে আছেন।"
        : "Logged out successfully. Reverted to ephemeral guest mode."
    );
  };

  const detectedAddSimOp = detectOperatorFromPhone(newSimPhone);

  // Operator Brand Styling
  const getOperatorTheme = (op: OperatorCode | string) => {
    switch (op) {
      case "GP":
        return {
          name: "Grameenphone",
          color: "#0066FF",
          badgeBg: "#EFF6FF",
          badgeColor: "#1D4ED8",
          badgeBorder: "#BFDBFE",
          cardBorder: "#DBEAFE",
          cardBg: "#FFFFFF",
          accentGradient: "linear-gradient(135deg, #0066FF 0%, #2563EB 100%)",
        };
      case "ROBI":
        return {
          name: "Robi",
          color: "#DC2626",
          badgeBg: "#FEF2F2",
          badgeColor: "#DC2626",
          badgeBorder: "#FECACA",
          cardBorder: "#FEE2E2",
          cardBg: "#FFFFFF",
          accentGradient: "linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)",
        };
      case "BANGLALINK":
        return {
          name: "Banglalink",
          color: "#FF6600",
          badgeBg: "#FFF7ED",
          badgeColor: "#EA580C",
          badgeBorder: "#FED7AA",
          cardBorder: "#FFEDD5",
          cardBg: "#FFFFFF",
          accentGradient: "linear-gradient(135deg, #FF6600 0%, #EA580C 100%)",
        };
      case "AIRTEL":
        return {
          name: "Airtel",
          color: "#BE123C",
          badgeBg: "#FFF1F2",
          badgeColor: "#BE123C",
          badgeBorder: "#FECDD3",
          cardBorder: "#FFE4E6",
          cardBg: "#FFFFFF",
          accentGradient: "linear-gradient(135deg, #E11D48 0%, #BE123C 100%)",
        };
      case "TELETALK":
        return {
          name: "Teletalk",
          color: "#15803D",
          badgeBg: "#F0FDF4",
          badgeColor: "#15803D",
          badgeBorder: "#BBF7D0",
          cardBorder: "#DCFCE7",
          cardBg: "#FFFFFF",
          accentGradient: "linear-gradient(135deg, #16A34A 0%, #15803D 100%)",
        };
      default:
        return {
          name: op,
          color: "#4B5563",
          badgeBg: "#F3F4F6",
          badgeColor: "#374151",
          badgeBorder: "#E5E7EB",
          cardBorder: "#E5E7EB",
          cardBg: "#FFFFFF",
          accentGradient: "linear-gradient(135deg, #4B5563 0%, #374151 100%)",
        };
    }
  };

  // Format 11-digit phone as 01XXX - XXXXXX for readability
  const formatDisplayPhone = (rawPhone: string) => {
    const clean = rawPhone.replace(/\D/g, "");
    if (clean.length === 11) {
      const part1 = clean.slice(0, 5);
      const part2 = clean.slice(5);
      const formatted = `${part1} - ${part2}`;
      return lang === "bn" ? toBnDigits(formatted) : formatted;
    }
    return lang === "bn" ? toBnDigits(rawPhone) : rawPhone;
  };

  // Format dynamic relative last synced time based on authoritative timestamp (Never show fake "Just now")
  const formatRelativeSyncTime = (isoString?: string | null) => {
    if (!isoString) return lang === "bn" ? "অনুপলব্ধ (Not available)" : "Not available";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return lang === "bn" ? "অনুপলব্ধ (Not available)" : "Not available";
    const diffMs = Date.now() - date.getTime();
    const diffSecs = Math.max(1, Math.floor(diffMs / 1000));
    if (diffSecs < 60) {
      return lang === "bn" ? `${toBnDigits(diffSecs)} সেকেন্ড আগে` : `${diffSecs}s ago`;
    }
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) {
      return lang === "bn" ? `${toBnDigits(diffMins)} মিনিট আগে` : `${diffMins}m ago`;
    }
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return lang === "bn" ? `${toBnDigits(diffHours)} ঘণ্টা আগে` : `${diffHours}h ago`;
    }
    return date.toLocaleDateString(lang === "bn" ? "bn-BD" : "en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", paddingBottom: "60px" }}>
      {/* Page Header */}
      <div style={{ marginBottom: "28px" }}>
        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: "700",
            color: "var(--text-primary)",
            marginBottom: "6px",
          }}
        >
          {tProfile.title}
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", margin: 0 }}>
          {tProfile.subtitle}
        </p>
      </div>

      {/* Global Alerts */}
      {error && (
        <div
          style={{
            backgroundColor: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: "var(--radius-md)",
            padding: "14px 18px",
            color: "#991B1B",
            fontSize: "0.875rem",
            marginBottom: "20px",
            display: "flex",
            gap: "10px",
            alignItems: "center",
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{
              background: "none",
              border: "none",
              color: "#991B1B",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {successMsg && (
        <div
          style={{
            backgroundColor: "var(--ft-green-subtle)",
            border: "1px solid #BBF7D0",
            borderRadius: "var(--radius-md)",
            padding: "14px 18px",
            color: "#166534",
            fontSize: "0.875rem",
            marginBottom: "20px",
            display: "flex",
            gap: "10px",
            alignItems: "center",
          }}
        >
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{successMsg}</span>
          <button
            onClick={() => setSuccessMsg(null)}
            style={{
              background: "none",
              border: "none",
              color: "#166534",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* NOT LOGGED IN: Guest Info & FlexiTaka Account Login Card */}
      {!isLoggedIn ? (
        <div>
          {/* Guest Session Card */}
          <div className="card" style={{ padding: "32px", marginBottom: "28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "50%",
                  backgroundColor: "var(--bg-subtle)",
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <User size={26} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <h3
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: "700",
                      color: "var(--text-primary)",
                      margin: 0,
                    }}
                  >
                    {tProfile.statusGuest}
                  </h3>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      padding: "2px 8px",
                      borderRadius: "12px",
                      backgroundColor: "#F3F4F6",
                      color: "#4B5563",
                      fontWeight: "500",
                    }}
                  >
                    {lang === "bn" ? "অনিবন্ধিত" : "Guest Mode"}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "0.8125rem",
                    color: "var(--text-muted)",
                    display: "block",
                    marginTop: "2px",
                  }}
                >
                  {lang === "bn" ? "ডিভাইস সেশন আইডি" : "Browser Session ID"}:{" "}
                  <code style={{ fontSize: "0.75rem" }}>{guestId || "active"}</code>
                </span>
              </div>
            </div>

            <p
              style={{
                fontSize: "0.9375rem",
                color: "var(--text-secondary)",
                lineHeight: 1.6,
                marginBottom: "24px",
              }}
            >
              {lang === "bn"
                ? "FlexiTaka ব্যবহারের জন্য অ্যাকাউন্ট নিবন্ধন বাধ্যতামূলক নয়। আপনি এখনই সম্পূর্ণ ক্যাশ আউট ও রিচার্জ করতে পারেন। যেকোনো সময় আপনার ফোন নম্বর দিয়ে লগইন করলে আপনার পূর্বের গেস্ট অর্ডারগুলো স্থায়ী অ্যাকাউন্টে যুক্ত হয়ে যাবে।"
                : "Account registration is completely optional for all FlexiTaka services. You can perform full Cash Out and Recharge transactions right away. Verifying your mobile number links all previous guest orders into a permanent Customer Account."}
            </p>

            {/* Login Form */}
            <div
              style={{
                borderTop: "1px solid var(--border-light)",
                paddingTop: "24px",
              }}
            >
              <h4
                style={{
                  fontSize: "1.125rem",
                  fontWeight: "600",
                  color: "var(--text-primary)",
                  marginBottom: "6px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Lock size={18} color="var(--ft-green)" />
                <span>{tProfile.authModalTitle}</span>
              </h4>
              <p
                style={{
                  fontSize: "0.8125rem",
                  color: "var(--text-muted)",
                  marginBottom: "20px",
                }}
              >
                {tProfile.authModalSubtitle}
              </p>

              {loginStep === "PHONE" ? (
                <form onSubmit={handleRequestLoginOtp}>
                  <div className="form-group" style={{ marginBottom: "16px" }}>
                    <label className="form-label">{tProfile.phoneStepLabel}</label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="tel"
                        placeholder="017XXXXXXXX"
                        value={loginPhone}
                        onChange={(e) => setLoginPhone(e.target.value)}
                        className="form-input"
                        required
                        style={{ paddingLeft: "40px" }}
                      />
                      <Phone
                        size={18}
                        color="var(--text-muted)"
                        style={{
                          position: "absolute",
                          left: "14px",
                          top: "50%",
                          transform: "translateY(-50%)",
                        }}
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary btn-full"
                    disabled={loginLoading || !loginPhone.trim()}
                  >
                    {loginLoading
                      ? lang === "bn"
                        ? "OTP পাঠানো হচ্ছে..."
                        : "Sending OTP..."
                      : tProfile.btnGetOtp}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyLoginOtp}>
                  <div className="form-group" style={{ marginBottom: "16px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "8px",
                      }}
                    >
                      <label className="form-label" style={{ margin: 0 }}>
                        {tProfile.otpStepLabel}
                      </label>
                      <button
                        type="button"
                        onClick={() => setLoginStep("PHONE")}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--ft-green)",
                          fontSize: "0.8125rem",
                          cursor: "pointer",
                          fontWeight: "500",
                        }}
                      >
                        {lang === "bn" ? "নম্বর পরিবর্তন" : "Change Number"}
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="123456"
                      value={loginOtp}
                      onChange={(e) => setLoginOtp(e.target.value)}
                      className="form-input"
                      maxLength={6}
                      required
                      style={{
                        letterSpacing: "0.25em",
                        fontSize: "1.25rem",
                        textAlign: "center",
                        fontWeight: "700",
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary btn-full"
                    disabled={loginLoading || !loginOtp.trim()}
                  >
                    {loginLoading
                      ? lang === "bn"
                        ? "যাচাই করা হচ্ছে..."
                        : "Verifying..."
                      : tProfile.btnVerifySubmit}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* OTP Separation & Non-Custodial Security Notice */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid var(--border-card)",
              borderRadius: "var(--radius-md)",
              padding: "20px 24px",
              fontSize: "0.8125rem",
              color: "var(--text-muted)",
              lineHeight: 1.6,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontWeight: "600",
                color: "var(--text-primary)",
                marginBottom: "6px",
              }}
            >
              <Shield size={16} color="var(--ft-green)" />
              <span>
                {lang === "bn"
                  ? "নিরাপত্তা নীতি ও পাসওয়ার্ডহীন স্থাপত্য"
                  : "Security Architecture & Passwordless Model"}
              </span>
            </div>
            <p style={{ margin: 0 }}>{tProfile.otpSeparationNotice}</p>
          </div>
        </div>
      ) : (
        /* LOGGED IN: Customer Account Management (5 Sections) */
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Section 1: Personal Information */}
          <div className="card" style={{ padding: "28px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "50%",
                    backgroundColor: "var(--ft-green-subtle)",
                    color: "var(--ft-green-active)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <User size={22} />
                </div>
                <div>
                  <h3
                    style={{
                      fontSize: "1.1875rem",
                      fontWeight: "700",
                      color: "var(--text-primary)",
                      margin: 0,
                    }}
                  >
                    {tProfile.personalInfoTitle}
                  </h3>
                  <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                    {lang === "bn"
                      ? "আপনার গ্রাহক প্রোফাইলের বিবরণ"
                      : "Account details & preferences"}
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 12px",
                  borderRadius: "16px",
                  backgroundColor: "var(--ft-green-subtle)",
                  color: "var(--ft-green-active)",
                  fontSize: "0.8125rem",
                  fontWeight: "600",
                }}
              >
                <CheckCircle2 size={14} />
                <span>{tProfile.statusActive}</span>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: "16px",
                  marginBottom: "20px",
                }}
              >
                {/* Account Phone (Read-Only) */}
                <div className="form-group">
                  <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Phone size={14} color="var(--text-muted)" />
                    <span>{tProfile.phoneNumberLabel}</span>
                  </label>
                  <input
                    type="text"
                    value={
                      profile?.phone
                        ? lang === "bn"
                          ? toBnDigits(profile.phone)
                          : profile.phone
                        : ""
                    }
                    readOnly
                    className="form-input"
                    style={{ backgroundColor: "var(--bg-subtle)", color: "var(--text-secondary)", cursor: "not-allowed" }}
                  />
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                    {lang === "bn" ? "অ্যাকাউন্টের প্রধান সনাক্তকারী নম্বর" : "Authoritative account phone"}
                  </span>
                </div>

                {/* Full Name */}
                <div className="form-group">
                  <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <User size={14} color="var(--text-muted)" />
                    <span>{tProfile.fullNameLabel}</span>
                  </label>
                  <input
                    type="text"
                    placeholder={tProfile.fullNamePlaceholder}
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="form-input"
                  />
                </div>

                {/* Email Address */}
                <div className="form-group">
                  <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Mail size={14} color="var(--text-muted)" />
                    <span>{tProfile.emailLabel}</span>
                  </label>
                  <input
                    type="email"
                    placeholder={tProfile.emailPlaceholder}
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="form-input"
                  />
                </div>

                {/* Language Preference */}
                <div className="form-group">
                  <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Globe size={14} color="var(--text-muted)" />
                    <span>{tProfile.langPrefLabel}</span>
                  </label>
                  <select
                    value={langPref}
                    onChange={(e) => setLangPref(e.target.value as "bn" | "en")}
                    className="form-input"
                    style={{ cursor: "pointer" }}
                  >
                    <option value="bn">বাংলা (Bengali)</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>

              {/* Meta: Member Since & Save */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "12px",
                  paddingTop: "16px",
                  borderTop: "1px solid var(--border-light)",
                  fontSize: "0.8125rem",
                  color: "var(--text-muted)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Calendar size={14} />
                  <span>
                    {tProfile.memberSinceLabel}:{" "}
                    <strong>
                      {profile?.created_at
                        ? new Date(profile.created_at).toLocaleDateString()
                        : "N/A"}
                    </strong>
                  </span>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={savingProfile}
                >
                  {savingProfile ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  <span>{tProfile.btnSaveProfile}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Section 2: Linked SIMs — BEST FINTECH UX */}
          <div id="sims" className="card" style={{ padding: "28px" }}>
            {/* Header & Controls Bar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "16px",
                marginBottom: "20px",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      backgroundColor: "var(--ft-green-subtle)",
                      color: "var(--ft-green-active)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Smartphone size={20} />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <h3
                        style={{
                          fontSize: "1.25rem",
                          fontWeight: "700",
                          color: "var(--text-primary)",
                          margin: 0,
                        }}
                      >
                        {tProfile.linkedSimsTitle}
                      </h3>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          backgroundColor: "#E2E8F0",
                          color: "#334155",
                          fontWeight: "600",
                        }}
                      >
                        {lang === "bn"
                          ? `${toBnDigits(linkedSims.length)}টি সিম`
                          : `${linkedSims.length} SIM${linkedSims.length === 1 ? "" : "s"}`}
                      </span>
                    </div>
                  </div>
                </div>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--text-secondary)",
                    marginTop: "6px",
                    marginBottom: 0,
                  }}
                >
                  {tProfile.linkedSimsSubtitle}
                </p>
              </div>

              {/* Action Buttons: Refresh & Add SIM */}
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => fetchSims(false, true)}
                  className="btn btn-outline btn-sm"
                  title={lang === "bn" ? "সিম তালিকা রিফ্রেশ করুন" : "Refresh Linked SIMs"}
                  disabled={simsLoading}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <RefreshCw size={14} className={simsLoading ? "animate-spin" : ""} />
                  <span>{lang === "bn" ? "রিফ্রেশ" : "Refresh"}</span>
                </button>

                {!showAddSim && (
                  <button
                    type="button"
                    onClick={() => setShowAddSim(true)}
                    className="btn btn-primary btn-sm"
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    <Plus size={15} />
                    <span>{tProfile.btnAddSim}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Error Notification */}
            {simsError && (
              <div
                style={{
                  backgroundColor: "#FEF2F2",
                  border: "1px solid #FECACA",
                  borderRadius: "var(--radius-md)",
                  padding: "12px 16px",
                  color: "#991B1B",
                  fontSize: "0.875rem",
                  marginBottom: "18px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <AlertTriangle size={16} />
                  <span>{simsError}</span>
                </div>
                <button
                  onClick={() => fetchSims()}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#991B1B",
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "0.8125rem",
                    textDecoration: "underline",
                  }}
                >
                  {lang === "bn" ? "পুনরায় চেষ্টা" : "Retry"}
                </button>
              </div>
            )}

            {/* "Add New SIM" Drawer Form */}
            {showAddSim && (
              <div
                style={{
                  backgroundColor: "#F8FAFC",
                  border: "1.5px solid #CBD5E1",
                  borderRadius: "var(--radius-lg)",
                  padding: "24px",
                  marginBottom: "24px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "16px",
                    paddingBottom: "12px",
                    borderBottom: "1px solid #E2E8F0",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Smartphone size={18} color="var(--ft-green)" />
                    <h4 style={{ fontSize: "1.0625rem", fontWeight: "700", color: "#0F172A", margin: 0 }}>
                      {tProfile.btnAddSim}
                    </h4>
                  </div>
                  <button
                    onClick={() => setShowAddSim(false)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      padding: "4px",
                    }}
                    title={lang === "bn" ? "বন্ধ করুন" : "Close"}
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleAddSim}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                      gap: "16px",
                      marginBottom: "20px",
                    }}
                  >
                    {/* Mobile Number Input */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">
                        {tProfile.phoneNumberLabel} <span style={{ color: "#DC2626" }}>*</span>
                      </label>
                      <div style={{ position: "relative" }}>
                        <input
                          type="tel"
                          placeholder="017XXXXXXXX"
                          value={newSimPhone}
                          onChange={(e) => setNewSimPhone(e.target.value)}
                          className="form-input"
                          required
                          style={{ paddingLeft: "38px" }}
                        />
                        <Phone
                          size={16}
                          color="var(--text-muted)"
                          style={{
                            position: "absolute",
                            left: "12px",
                            top: "50%",
                            transform: "translateY(-50%)",
                          }}
                        />
                      </div>

                      {/* Live Auto-Detected Operator Pill */}
                      {detectedAddSimOp && (
                        <div
                          style={{
                            marginTop: "8px",
                            fontSize: "0.75rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            ...getOperatorTheme(detectedAddSimOp),
                            backgroundColor: getOperatorTheme(detectedAddSimOp).badgeBg,
                            color: getOperatorTheme(detectedAddSimOp).badgeColor,
                            border: `1px solid ${getOperatorTheme(detectedAddSimOp).badgeBorder}`,
                          }}
                        >
                          <span>✓</span>
                          <span>
                            {tProfile.simAutoDetected}:{" "}
                            <strong>{detectedAddSimOp}</strong>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Custom Label Input */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">
                        {lang === "bn" ? "সিমের নাম / লেবেল (ঐচ্ছিক)" : "SIM Nickname / Label (Optional)"}
                      </label>
                      <div style={{ position: "relative" }}>
                        <input
                          type="text"
                          placeholder={
                            lang === "bn"
                              ? "যেমন: my sim বা ব্যক্তিগত GP"
                              : "e.g., my sim or Personal Robi"
                          }
                          value={newSimLabel}
                          onChange={(e) => setNewSimLabel(e.target.value)}
                          className="form-input"
                          style={{ paddingLeft: "38px" }}
                        />
                        <Tag
                          size={16}
                          color="var(--text-muted)"
                          style={{
                            position: "absolute",
                            left: "12px",
                            top: "50%",
                            transform: "translateY(-50%)",
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                    <button
                      type="button"
                      onClick={() => setShowAddSim(false)}
                      className="btn btn-outline btn-sm"
                    >
                      {lang === "bn" ? "বাতিল" : "Cancel"}
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      disabled={addingSim || !newSimPhone.trim()}
                    >
                      {addingSim ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <Plus size={14} />
                      )}
                      <span>{tProfile.btnAddSim}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Authoritative SIM Cards List */}
            {simsLoading && linkedSims.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 20px",
                  color: "var(--text-muted)",
                }}
              >
                <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 10px" }} />
                <p style={{ fontSize: "0.875rem", margin: 0 }}>
                  {lang === "bn" ? "সার্ভার থেকে সিমের তথ্য লোড হচ্ছে..." : "Loading linked SIMs from server..."}
                </p>
              </div>
            ) : linkedSims.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "44px 20px",
                  backgroundColor: "var(--bg-main)",
                  borderRadius: "var(--radius-lg)",
                  border: "1.5px dashed var(--border-card)",
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    backgroundColor: "#E2E8F0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 14px auto",
                  }}
                >
                  <Smartphone size={24} color="#64748B" />
                </div>
                <h4 style={{ fontSize: "1rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "6px" }}>
                  {lang === "bn" ? "কোনো সিম কার্ড যুক্ত করা হয়নি" : "No linked SIMs found"}
                </h4>
                <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", maxWidth: "420px", margin: "0 auto 20px auto", lineHeight: 1.5 }}>
                  {lang === "bn"
                    ? "একটি FlexiTaka অ্যাকাউন্টে আপনার গ্রামীণফোন, রবি, এয়ারটেল বা বাংলালিংক সিম যুক্ত করে দ্রুত ও সহজে ক্যাশ আউট সম্পন্ন করুন।"
                    : "Link your verified telecom SIM cards (GP, Robi, Banglalink, Airtel, etc.) to perform instant, non-custodial cash outs."}
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddSim(true)}
                  className="btn btn-primary btn-sm"
                >
                  <Plus size={14} />
                  <span>{tProfile.btnAddSim}</span>
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {linkedSims.map((sim) => {
                  const theme = getOperatorTheme(sim.operator_code);
                  const isVerified = sim.status === "VERIFIED";
                  const isSuspended = sim.status === "SUSPENDED";
                  const isCurrentVerifying = verifyingSimId === sim.sim_id;

                  return (
                    <div
                      key={sim.sim_id}
                      style={{
                        backgroundColor: "#FFFFFF",
                        border: `1.5px solid ${isCurrentVerifying ? theme.color : theme.cardBorder}`,
                        borderLeft: `5px solid ${theme.color}`,
                        borderRadius: "var(--radius-lg)",
                        padding: "20px 24px",
                        boxShadow: isCurrentVerifying
                          ? "0 4px 12px rgba(0, 0, 0, 0.08)"
                          : "0 1px 3px rgba(0, 0, 0, 0.03)",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {/* Top Header Row: Operator, Badges & Remove */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: "10px",
                          marginBottom: "12px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          {/* Operator Badge */}
                          <span
                            style={{
                              padding: "4px 10px",
                              borderRadius: "6px",
                              fontWeight: "800",
                              fontSize: "0.8125rem",
                              letterSpacing: "0.06em",
                              backgroundColor: theme.badgeBg,
                              color: theme.badgeColor,
                              border: `1px solid ${theme.badgeBorder}`,
                              textTransform: "uppercase",
                            }}
                          >
                            {sim.operator_code}
                          </span>

                          {/* Primary SIM Badge */}
                          {sim.is_primary && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "3px 8px",
                                borderRadius: "6px",
                                backgroundColor: "#EFF6FF",
                                color: "#1D4ED8",
                                fontSize: "0.6875rem",
                                fontWeight: "700",
                                border: "1px solid #BFDBFE",
                              }}
                            >
                              <Star size={11} fill="#1D4ED8" />
                              <span>{lang === "bn" ? "প্রধান সিম" : "PRIMARY"}</span>
                            </span>
                          )}

                          {/* Status Pill */}
                          {isVerified ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                padding: "3px 10px",
                                borderRadius: "14px",
                                backgroundColor: "#DCFCE7",
                                color: "#15803D",
                                fontSize: "0.75rem",
                                fontWeight: "700",
                                border: "1px solid #BBF7D0",
                              }}
                            >
                              <CheckCircle2 size={12} />
                              <span>{lang === "bn" ? "✓ যাচাইকৃত (সক্রিয়)" : "✓ Verified"}</span>
                            </span>
                          ) : isSuspended ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                padding: "3px 10px",
                                borderRadius: "14px",
                                backgroundColor: "#FEE2E2",
                                color: "#991B1B",
                                fontSize: "0.75rem",
                                fontWeight: "700",
                                border: "1px solid #FECACA",
                              }}
                            >
                              <AlertCircle size={12} />
                              <span>{lang === "bn" ? "স্থগিত" : "Suspended"}</span>
                            </span>
                          ) : (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                padding: "3px 10px",
                                borderRadius: "14px",
                                backgroundColor: "#FEF3C7",
                                color: "#B45309",
                                fontSize: "0.75rem",
                                fontWeight: "700",
                                border: "1px solid #FDE68A",
                              }}
                            >
                              <span
                                style={{
                                  width: "6px",
                                  height: "6px",
                                  borderRadius: "50%",
                                  backgroundColor: "#D97706",
                                }}
                              />
                              <span>{lang === "bn" ? "যাচাইকরণ অপেক্ষমাণ" : "Pending Verification"}</span>
                            </span>
                          )}
                        </div>

                        {/* Remove Action Button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveSim(sim.sim_id)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#94A3B8",
                            cursor: "pointer",
                            padding: "6px",
                            borderRadius: "6px",
                            display: "inline-flex",
                            alignItems: "center",
                            transition: "all 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = "#DC2626";
                            e.currentTarget.style.backgroundColor = "#FEF2F2";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = "#94A3B8";
                            e.currentTarget.style.backgroundColor = "transparent";
                          }}
                          title={tProfile.btnRemoveSim}
                          aria-label={tProfile.btnRemoveSim}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Number & Custom Label */}
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "14px" }}>
                        <div
                          style={{
                            fontSize: "1.375rem",
                            fontWeight: "800",
                            color: "#0F172A",
                            letterSpacing: "0.03em",
                            fontFamily: "monospace, var(--font-inter)",
                          }}
                        >
                          {formatDisplayPhone(sim.phone)}
                        </div>

                        {sim.label && (
                          <div
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "0.8125rem",
                              fontWeight: "600",
                              color: "#475569",
                              backgroundColor: "#F1F5F9",
                              padding: "3px 8px",
                              borderRadius: "6px",
                              border: "1px solid #E2E8F0",
                            }}
                          >
                            <Tag size={12} color="#64748B" />
                            <span>{sim.label}</span>
                          </div>
                        )}
                      </div>

                      {/* Clean & Compact Parameter Grid */}
                      <div
                        style={{
                          backgroundColor: "#F8FAFC",
                          border: "1px solid #E2E8F0",
                          borderRadius: "10px",
                          padding: "12px 14px",
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                          gap: "10px 18px",
                          fontSize: "0.8125rem",
                          marginBottom: "14px",
                        }}
                      >
                        {/* 1. Balance */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ color: "#64748B", fontWeight: "500" }}>
                            {lang === "bn" ? "ব্যালেন্স" : "Balance"}
                          </span>
                          <span style={{ fontWeight: "700", color: "#0F172A", fontFamily: "var(--font-mono, monospace)" }}>
                            {sim.last_balance_bdt != null ? (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                                <span>{`৳${lang === "bn" ? toBnDigits(sim.last_balance_bdt.toFixed(2)) : sim.last_balance_bdt.toFixed(2)}`}</span>
                                {sim.is_live_balance ? (
                                  <span
                                    title={lang === "bn" ? "সরাসরি অপারেটর থেকে লাইভ প্রাপ্ত" : "Live from operator API"}
                                    style={{
                                      fontSize: "0.6875rem",
                                      padding: "1px 6px",
                                      borderRadius: "10px",
                                      backgroundColor: "#DCFCE7",
                                      color: "#15803D",
                                      fontWeight: "700",
                                      border: "1px solid #BBF7D0",
                                    }}
                                  >
                                    {lang === "bn" ? "লাইভ" : "Live"}
                                  </span>
                                ) : (
                                  <span
                                    title={lang === "bn" ? "সংরক্ষিত ব্যালেন্স (লাইভ আপডেট অনুপলব্ধ)" : "Stored offline balance (live update unavailable)"}
                                    style={{
                                      fontSize: "0.6875rem",
                                      padding: "1px 6px",
                                      borderRadius: "10px",
                                      backgroundColor: "#FEF3C7",
                                      color: "#B45309",
                                      fontWeight: "600",
                                      border: "1px solid #FDE68A",
                                    }}
                                  >
                                    {lang === "bn" ? "সংরক্ষিত" : "Stored"}
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span style={{ color: "#94A3B8", fontWeight: 400 }}>
                                {lang === "bn" ? "অনুপলব্ধ (Not available)" : "Not available"}
                              </span>
                            )}
                          </span>
                        </div>

                        {/* 2. SIM Type */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ color: "#64748B", fontWeight: "500" }}>
                            {lang === "bn" ? "সিমের ধরন" : "SIM Type"}
                          </span>
                          <span style={{ fontWeight: "600", color: "#334155" }}>
                            {sim.sim_type ? (
                              lang === "bn"
                                ? (sim.sim_type.toLowerCase() === "prepaid"
                                    ? "প্রিপেইড"
                                    : sim.sim_type.toLowerCase() === "postpaid"
                                    ? "পোস্টপেইড"
                                    : sim.sim_type)
                                : sim.sim_type
                            ) : (
                              <span style={{ color: "#94A3B8", fontWeight: 400 }}>
                                {lang === "bn" ? "অনুপলব্ধ (Not available)" : "Not available"}
                              </span>
                            )}
                          </span>
                        </div>

                        {/* 3. Customer ID */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ color: "#64748B", fontWeight: "500" }}>
                            {lang === "bn" ? "কাস্টমার আইডি" : "Customer ID"}
                          </span>
                          <span
                            style={{
                              fontWeight: sim.customer_id ? "700" : "400",
                              color: sim.customer_id ? "#0F172A" : "#94A3B8",
                              fontFamily: sim.customer_id ? "monospace" : "inherit",
                              fontSize: sim.customer_id ? "0.8125rem" : "0.75rem",
                            }}
                          >
                            {sim.customer_id || (lang === "bn" ? "অনুপলব্ধ (Not available)" : "Not available")}
                          </span>
                        </div>

                        {/* 4. Balance Transfer Status */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ color: "#64748B", fontWeight: "500" }}>
                            {lang === "bn" ? "ব্যালেন্স ট্রান্সফার" : "Balance Transfer"}
                          </span>
                          {sim.balance_transfer_available === true ? (
                            <span style={{ fontWeight: "600", color: "#16A34A" }}>
                              {lang === "bn" ? "সক্রিয় (Available ✓)" : "Available ✓"}
                            </span>
                          ) : sim.balance_transfer_available === false ? (
                            <span style={{ fontWeight: "600", color: "#DC2626" }}>
                              {lang === "bn" ? "নিষ্ক্রিয় (Unavailable)" : "Unavailable"}
                            </span>
                          ) : (
                            <span style={{ fontWeight: "400", color: "#94A3B8" }}>
                              {lang === "bn" ? "অনুপলব্ধ (Not available)" : "Not available"}
                            </span>
                          )}
                        </div>

                        {/* 5. Safe Transfer PIN Indicator (Never displays the secret PIN) */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ color: "#64748B", fontWeight: "500" }}>
                            {lang === "bn" ? "ট্রান্সফার পিন" : "Transfer PIN"}
                          </span>
                          {sim.transfer_pin_configured ? (
                            <span style={{ fontWeight: "700", color: "#16A34A", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <CheckCircle2 size={13} />
                              <span>{lang === "bn" ? "কনফিগার করা আছে ✓" : "Configured ✓"}</span>
                            </span>
                          ) : (
                            <span style={{ fontWeight: "600", color: "#D97706", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <span>{lang === "bn" ? "সেটআপ প্রয়োজন" : "Needs setup"}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Footer Metadata & Action Row */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: "10px",
                          fontSize: "0.75rem",
                          color: "#64748B",
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <div>
                            <span style={{ color: "#94A3B8" }}>{lang === "bn" ? "যাচাইকৃত: " : "Verified: "}</span>
                            <span style={{ fontWeight: "500", color: "#475569" }}>
                              {isVerified && sim.verified_at ? (
                                new Date(sim.verified_at).toLocaleDateString("en-GB", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              ) : (
                                <span style={{ color: "#94A3B8" }}>
                                  {lang === "bn" ? "অযাচাইকৃত (Not verified)" : "Not verified"}
                                </span>
                              )}
                            </span>
                          </div>
                          <div>
                            <span style={{ color: "#94A3B8" }}>{lang === "bn" ? "সর্বশেষ সিঙ্ক: " : "Last Synced: "}</span>
                            <span style={{ fontWeight: "500", color: "#475569" }}>
                              {formatRelativeSyncTime(sim.last_synced_at || (isVerified ? sim.verified_at : null))}
                            </span>
                          </div>
                        </div>

                        {/* Action CTA: Verify with Operator OTP */}
                        <div>
                          {!isVerified && !isCurrentVerifying && (
                            <button
                              type="button"
                              onClick={() => {
                                setVerifyingSimId(sim.sim_id);
                                setOperatorOtp("");
                              }}
                              className="btn btn-primary btn-sm"
                              style={{
                                backgroundColor: theme.color,
                                borderColor: theme.color,
                                fontWeight: "700",
                                fontSize: "0.8125rem",
                                padding: "6px 14px",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.08)",
                              }}
                            >
                              <span>{tProfile.btnVerifySim}</span>
                              <ChevronRight size={14} />
                            </button>
                          )}

                          {isVerified && !isCurrentVerifying && (
                            <button
                              type="button"
                              onClick={() => {
                                setVerifyingSimId(sim.sim_id);
                                setOperatorOtp("");
                              }}
                              className="btn btn-outline btn-sm"
                              style={{
                                fontSize: "0.75rem",
                                padding: "4px 10px",
                                color: "var(--text-secondary)",
                              }}
                            >
                              <span>{lang === "bn" ? "পুনরায় যাচাই" : "Re-verify"}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Embedded Step-by-Step Operator Verification Console */}
                      {isCurrentVerifying && (
                        <div
                          style={{
                            marginTop: "18px",
                            paddingTop: "16px",
                            borderTop: `1.5px dashed ${theme.badgeBorder}`,
                            backgroundColor: "#FAFAFA",
                            borderRadius: "var(--radius-md)",
                            padding: "16px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              marginBottom: "12px",
                            }}
                          >
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <Lock size={15} color={theme.color} />
                                <h5
                                  style={{
                                    fontSize: "0.9375rem",
                                    fontWeight: "700",
                                    color: "#0F172A",
                                    margin: 0,
                                  }}
                                >
                                  {lang === "bn"
                                    ? `${sim.operator_code} অপারেটর সিম ভেরিফিকেশন`
                                    : `${sim.operator_code} Operator SIM Verification`}
                                </h5>
                              </div>
                              <p
                                style={{
                                  fontSize: "0.8125rem",
                                  color: "var(--text-secondary)",
                                  margin: "4px 0 0 0",
                                }}
                              >
                                {lang === "bn"
                                  ? `${sim.phone} নম্বরে প্রাপ্ত ৬-সংখ্যার এসএমএস কোডটি দিন। কোনো পিন বা পাসওয়ার্ড প্রয়োজন নেই।`
                                  : `Enter the 6-digit confirmation OTP sent to ${sim.phone}. No PINs or passwords required.`}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setVerifyingSimId(null);
                                setOperatorOtp("");
                              }}
                              style={{
                                background: "none",
                                border: "none",
                                color: "#64748B",
                                cursor: "pointer",
                                padding: "2px",
                              }}
                              title={lang === "bn" ? "বন্ধ করুন" : "Close"}
                            >
                              <X size={18} />
                            </button>
                          </div>

                          {/* 2-Step Action Grid */}
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                              gap: "14px",
                              alignItems: "center",
                              marginBottom: "10px",
                            }}
                          >
                            {/* Step 1: Send / Resend SMS Code */}
                            <div>
                              <button
                                type="button"
                                onClick={() => handleRequestOperatorOtp(sim)}
                                className="btn btn-outline btn-sm btn-full"
                                disabled={requestingOpOtp || otpCooldown > 0}
                                style={{
                                  justifyContent: "center",
                                  borderColor: otpSentForSimId === sim.sim_id ? "#BBF7D0" : "var(--border-card)",
                                  backgroundColor: otpSentForSimId === sim.sim_id ? "#F0FDF4" : "#FFFFFF",
                                  color: otpSentForSimId === sim.sim_id ? "#15803D" : "var(--text-primary)",
                                  fontWeight: "600",
                                }}
                              >
                                {requestingOpOtp ? (
                                  <RefreshCw size={14} className="animate-spin" />
                                ) : (
                                  <Send size={14} />
                                )}
                                <span>
                                  {otpCooldown > 0
                                    ? `${lang === "bn" ? "পুনরায় পাঠান" : "Resend"} (${otpCooldown}s)`
                                    : otpSentForSimId === sim.sim_id
                                    ? lang === "bn"
                                      ? "কোড পুনরায় পাঠান"
                                      : "Resend Operator OTP"
                                    : tProfile.btnSendOperatorOtp}
                                </span>
                              </button>
                            </div>

                            {/* Step 2: Input OTP & Confirm */}
                            <form
                              onSubmit={(e) => handleVerifyOperatorOtp(e, sim)}
                              style={{ display: "flex", gap: "8px" }}
                            >
                              <input
                                type="text"
                                placeholder={tProfile.operatorOtpLabel}
                                value={operatorOtp}
                                onChange={(e) => setOperatorOtp(e.target.value)}
                                className="form-input"
                                maxLength={8}
                                required
                                style={{
                                  textAlign: "center",
                                  letterSpacing: "0.25em",
                                  fontWeight: "700",
                                  fontSize: "1.125rem",
                                  height: "38px",
                                }}
                              />
                              <button
                                type="submit"
                                className="btn btn-primary btn-sm"
                                disabled={submittingOpOtp || !operatorOtp.trim()}
                                style={{
                                  backgroundColor: theme.color,
                                  borderColor: theme.color,
                                  fontWeight: "700",
                                  flexShrink: 0,
                                }}
                              >
                                {submittingOpOtp ? (
                                  <RefreshCw size={14} className="animate-spin" />
                                ) : (
                                  <Check size={14} />
                                )}
                                <span>{tProfile.btnConfirmOperatorOtp}</span>
                              </button>
                            </form>
                          </div>

                          {/* Non-Custodial Assurance Badge */}
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: "#64748B",
                              display: "flex",
                              alignItems: "center",
                              gap: "5px",
                              marginTop: "8px",
                            }}
                          >
                            <Shield size={12} color="var(--ft-green)" />
                            <span>
                              {lang === "bn"
                                ? "নিরাপত্তা নীতি: FlexiTaka কখনই আপনার সিমের পাসওয়ার্ড বা পিন চায় না বা সংরক্ষণ করে না।"
                                : "Security Guarantee: FlexiTaka never asks for, captures, or stores your SIM PIN or password."}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 3: Account Security */}
          <div className="card" style={{ padding: "28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  backgroundColor: "#F3F4F6",
                  color: "#374151",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Shield size={20} />
              </div>
              <div>
                <h3
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: "700",
                    color: "var(--text-primary)",
                    margin: 0,
                  }}
                >
                  {tProfile.securityTitle}
                </h3>
                <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                  {tProfile.securityDesc}
                </span>
              </div>
            </div>

            <div
              style={{
                backgroundColor: "var(--bg-main)",
                borderRadius: "var(--radius-sm)",
                padding: "16px 20px",
                fontSize: "0.8125rem",
                color: "var(--text-secondary)",
                lineHeight: 1.6,
                border: "1px solid var(--border-light)",
              }}
            >
              <p style={{ margin: "0 0 10px 0" }}>
                <strong>{lang === "bn" ? "কঠোর নন-কাস্টোডিয়াল নীতি: " : "Strict Non-Custodial Architecture: "}</strong>
                {lang === "bn"
                  ? "FlexiTaka কখনোই আপনার টেলিকম সিমের পিন বা পাসওয়ার্ড সংগ্রহ বা সংরক্ষণ করে না। সমস্ত ক্যাশ আউট শুধুমাত্র আপনার অনুমোদিত অপারেটর সেশনের মাধ্যমে প্রক্রিয়া করা হয়।"
                  : "FlexiTaka never asks for, captures, or stores your telecom SIM PINs or passwords. Cash out transfers are executed strictly via ephemeral, cryptographically secured telecom sessions."}
              </p>
              <p style={{ margin: 0 }}>{tProfile.otpSeparationNotice}</p>
            </div>
          </div>

          {/* Section 4: Order History Shortcut */}
          <div
            className="card"
            style={{
              padding: "24px 28px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "10px",
                  backgroundColor: "var(--ft-green-subtle)",
                  color: "var(--ft-green-active)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <History size={20} />
              </div>
              <div>
                <h3
                  style={{
                    fontSize: "1.0625rem",
                    fontWeight: "700",
                    color: "var(--text-primary)",
                    margin: 0,
                  }}
                >
                  {tProfile.orderHistoryTitle}
                </h3>
                <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                  {tProfile.orderHistoryDesc}
                </span>
              </div>
            </div>

            <Link href="/app/orders" className="btn btn-outline btn-sm">
              <span>{tProfile.btnViewOrders}</span>
              <ChevronRight size={15} />
            </Link>
          </div>

          {/* Section 5: Logout */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={handleLogout}
              className="btn btn-outline"
              style={{
                color: "#DC2626",
                borderColor: "#FECACA",
                backgroundColor: "#FEF2F2",
              }}
            >
              <LogOut size={16} />
              <span>{tProfile.btnLogout}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
