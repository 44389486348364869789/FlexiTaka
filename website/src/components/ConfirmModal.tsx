"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  AlertCircle,
  Trash2,
  LogOut,
  Info,
  CheckCircle2,
  X,
  Loader2,
} from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

export type ConfirmVariant = "danger" | "warning" | "primary" | "info";
export type ConfirmIconType = "trash" | "logout" | "alert" | "info" | "check" | "none";

export interface ConfirmModalProps {
  isOpen: boolean;
  title: React.ReactNode;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  icon?: ConfirmIconType;
  isAlert?: boolean;
  loading?: boolean;
  onConfirm: () => Promise<void> | void;
  onCancel?: () => void;
  onClose: () => void;
}

export interface OpenConfirmOptions {
  title: React.ReactNode;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  icon?: ConfirmIconType;
  isAlert?: boolean;
  onConfirm?: () => Promise<void> | void;
  onCancel?: () => void;
}

export interface OpenAlertOptions {
  message: React.ReactNode;
  title?: React.ReactNode;
  variant?: ConfirmVariant;
  icon?: ConfirmIconType;
}

/**
 * Reusable FlexiTaka Confirm & Alert Modal
 * Fully accessible, mobile-responsive, portal-mounted modal
 * with bilingual support and smooth animations.
 */
export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  variant = "danger",
  icon,
  isAlert = false,
  loading = false,
  onConfirm,
  onCancel,
  onClose,
}: ConfirmModalProps) {
  const { lang } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const modalBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll and trap focus when open
  useEffect(() => {
    if (!isOpen || typeof document === "undefined") return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Auto-focus appropriate button
    const timer = setTimeout(() => {
      if (variant === "danger") {
        cancelBtnRef.current?.focus();
      } else {
        confirmBtnRef.current?.focus();
      }
    }, 60);

    return () => {
      document.body.style.overflow = originalOverflow;
      clearTimeout(timer);
    };
  }, [isOpen, variant]);

  // Handle ESC and keyboard accessibility safely
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (loading) return; // Prevent action abort while processing

      if (e.key === "Escape") {
        e.preventDefault();
        if (onCancel) onCancel();
        else onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onCancel, onClose]);

  if (!mounted || !isOpen) return null;

  // Bilingual Defaults
  const resolvedCancelText =
    cancelText || (lang === "bn" ? "বাতিল" : "Cancel");

  const resolvedConfirmText =
    confirmText ||
    (isAlert
      ? lang === "bn"
        ? "ঠিক আছে"
        : "OK"
      : variant === "danger"
      ? lang === "bn"
        ? "নিশ্চিত করুন"
        : "Confirm"
      : variant === "warning"
      ? lang === "bn"
        ? "নিশ্চিত করুন"
        : "Confirm"
      : lang === "bn"
      ? "নিশ্চিত করুন"
      : "Confirm");

  // Determine Icon
  const selectedIcon = icon || (
    isAlert
      ? variant === "danger"
        ? "alert"
        : "info"
      : variant === "danger"
      ? "trash"
      : variant === "warning"
      ? "logout"
      : "check"
  );

  // Styling maps based on variant
  const themeStyles = {
    danger: {
      iconBg: "#FEE2E2",
      iconColor: "#DC2626",
      btnBg: "linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)",
      btnHoverBg: "#B91C1C",
      btnBorder: "1px solid #DC2626",
      btnShadow: "0 2px 8px rgba(220, 38, 38, 0.25)",
      headerAccent: "#EF4444",
    },
    warning: {
      iconBg: "#FEF3C7",
      iconColor: "#D97706",
      btnBg: "linear-gradient(135deg, #D97706 0%, #B45309 100%)",
      btnHoverBg: "#B45309",
      btnBorder: "1px solid #D97706",
      btnShadow: "0 2px 8px rgba(217, 119, 6, 0.25)",
      headerAccent: "#F59E0B",
    },
    primary: {
      iconBg: "var(--ft-green-subtle, #F0FDF4)",
      iconColor: "var(--ft-green, #00A859)",
      btnBg: "linear-gradient(135deg, var(--ft-green, #00A859) 0%, #008f4c 100%)",
      btnHoverBg: "var(--ft-green-hover, #008f4c)",
      btnBorder: "1px solid var(--ft-green, #00A859)",
      btnShadow: "0 2px 8px rgba(0, 168, 89, 0.25)",
      headerAccent: "var(--ft-green, #00A859)",
    },
    info: {
      iconBg: "#EFF6FF",
      iconColor: "#2563EB",
      btnBg: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
      btnHoverBg: "#1D4ED8",
      btnBorder: "1px solid #2563EB",
      btnShadow: "0 2px 8px rgba(37, 99, 235, 0.25)",
      headerAccent: "#3B82F6",
    },
  }[variant];

  const renderIcon = () => {
    if (selectedIcon === "none") return null;

    const iconSize = 24;
    return (
      <div
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          backgroundColor: themeStyles.iconBg,
          color: themeStyles.iconColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "16px",
          flexShrink: 0,
        }}
      >
        {selectedIcon === "trash" && <Trash2 size={iconSize} />}
        {selectedIcon === "logout" && <LogOut size={iconSize} />}
        {selectedIcon === "alert" && <AlertTriangle size={iconSize} />}
        {selectedIcon === "info" && <Info size={iconSize} />}
        {selectedIcon === "check" && <CheckCircle2 size={iconSize} />}
      </div>
    );
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (loading) return;
    if (modalBoxRef.current && !modalBoxRef.current.contains(e.target as Node)) {
      if (onCancel) onCancel();
      else onClose();
    }
  };

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(5px)",
        WebkitBackdropFilter: "blur(5px)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        animation: "ftFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      onClick={handleBackdropClick}
      role={isAlert ? "alertdialog" : "dialog"}
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-desc"
    >
      <div
        ref={modalBoxRef}
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "18px",
          width: "100%",
          maxWidth: "430px",
          padding: "26px 24px 22px 24px",
          boxShadow:
            "0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
          border: "1px solid rgba(226, 232, 240, 0.9)",
          position: "relative",
          animation: "ftScaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          boxSizing: "border-box",
        }}
      >
        {/* Close Button Top Right */}
        {!loading && (
          <button
            type="button"
            onClick={onCancel || onClose}
            style={{
              position: "absolute",
              top: "14px",
              right: "14px",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "50%",
              color: "#94A3B8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#F1F5F9";
              e.currentTarget.style.color = "#475569";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "#94A3B8";
            }}
            aria-label={lang === "bn" ? "বন্ধ করুন" : "Close"}
          >
            <X size={18} />
          </button>
        )}

        {/* Modal Icon */}
        {renderIcon()}

        {/* Modal Title */}
        <h3
          id="confirm-modal-title"
          style={{
            fontSize: "1.1875rem",
            fontWeight: "700",
            color: "var(--text-primary, #0F172A)",
            margin: "0 0 8px 0",
            lineHeight: 1.35,
          }}
        >
          {title}
        </h3>

        {/* Modal Message */}
        <div
          id="confirm-modal-desc"
          style={{
            fontSize: "0.875rem",
            color: "var(--text-secondary, #64748B)",
            lineHeight: 1.55,
            marginBottom: "24px",
            wordBreak: "break-word",
          }}
        >
          {message}
        </div>

        {/* Actions Grid */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            width: "100%",
            justifyContent: "center",
            flexDirection: isAlert ? "row" : "row",
          }}
        >
          {/* Cancel button (omitted if isAlert) */}
          {!isAlert && (
            <button
              ref={cancelBtnRef}
              type="button"
              onClick={onCancel || onClose}
              disabled={loading}
              style={{
                flex: 1,
                minHeight: "44px",
                padding: "10px 16px",
                borderRadius: "10px",
                border: "1px solid #CBD5E1",
                backgroundColor: "#FFFFFF",
                color: "#475569",
                fontSize: "0.875rem",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.15s ease",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: loading ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = "#F8FAFC";
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = "#FFFFFF";
              }}
            >
              {resolvedCancelText}
            </button>
          )}

          {/* Confirm Button */}
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: isAlert ? 1 : 1.15,
              minHeight: "44px",
              padding: "10px 18px",
              borderRadius: "10px",
              border: themeStyles.btnBorder,
              background: themeStyles.btnBg,
              color: "#FFFFFF",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: loading ? "wait" : "pointer",
              boxShadow: themeStyles.btnShadow,
              transition: "all 0.15s ease",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              opacity: loading ? 0.8 : 1,
            }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>{lang === "bn" ? "অপেক্ষা করুন..." : "Processing..."}</span>
              </>
            ) : (
              <span>{resolvedConfirmText}</span>
            )}
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes ftFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes ftScaleUp {
          from {
            opacity: 0;
            transform: scale(0.94) translateY(8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>,
    document.body
  );
}

/**
 * Reusable Hook to trigger ConfirmModal anywhere without state boilerplate.
 */
export function useConfirmModal() {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    loading: boolean;
    title: React.ReactNode;
    message: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant: ConfirmVariant;
    icon?: ConfirmIconType;
    isAlert: boolean;
    onConfirmHandler?: () => Promise<void> | void;
    onCancelHandler?: () => void;
  }>({
    isOpen: false,
    loading: false,
    title: "",
    message: "",
    variant: "danger",
    isAlert: false,
  });

  const closeConfirm = useCallback(() => {
    setModalState((prev) => ({
      ...prev,
      isOpen: false,
      loading: false,
    }));
  }, []);

  const openConfirm = useCallback((options: OpenConfirmOptions) => {
    setModalState({
      isOpen: true,
      loading: false,
      title: options.title,
      message: options.message,
      confirmText: options.confirmText,
      cancelText: options.cancelText,
      variant: options.variant || "danger",
      icon: options.icon,
      isAlert: !!options.isAlert,
      onConfirmHandler: options.onConfirm,
      onCancelHandler: options.onCancel,
    });
  }, []);

  const openAlert = useCallback(
    (
      messageOrOptions: React.ReactNode | OpenAlertOptions,
      maybeTitle?: React.ReactNode,
      maybeVariant: ConfirmVariant = "danger"
    ) => {
      let title: React.ReactNode;
      let message: React.ReactNode;
      let variant: ConfirmVariant = maybeVariant;
      let icon: ConfirmIconType = "alert";

      if (
        typeof messageOrOptions === "object" &&
        messageOrOptions !== null &&
        "message" in messageOrOptions &&
        !React.isValidElement(messageOrOptions)
      ) {
        const opts = messageOrOptions as OpenAlertOptions;
        title = opts.title;
        message = opts.message;
        variant = opts.variant || "danger";
        icon = opts.icon || (variant === "danger" ? "alert" : "info");
      } else {
        message = messageOrOptions as React.ReactNode;
        title = maybeTitle;
        variant = maybeVariant;
        icon = variant === "danger" ? "alert" : "info";
      }

      setModalState({
        isOpen: true,
        loading: false,
        title: title || (variant === "danger" ? "সতর্কতা / Notice" : "তথ্য / Information"),
        message,
        confirmText: undefined,
        cancelText: undefined,
        variant,
        icon,
        isAlert: true,
      });
    },
    []
  );

  const handleConfirm = useCallback(async () => {
    if (modalState.onConfirmHandler) {
      try {
        setModalState((prev) => ({ ...prev, loading: true }));
        await modalState.onConfirmHandler();
        setModalState((prev) => ({ ...prev, isOpen: false, loading: false }));
      } catch (err) {
        setModalState((prev) => ({ ...prev, loading: false }));
        // Caller handles the error in their onConfirm or throws
        throw err;
      }
    } else {
      setModalState((prev) => ({ ...prev, isOpen: false, loading: false }));
    }
  }, [modalState.onConfirmHandler]);

  const handleCancel = useCallback(() => {
    if (modalState.onCancelHandler) {
      modalState.onCancelHandler();
    }
    closeConfirm();
  }, [modalState.onCancelHandler, closeConfirm]);

  const confirmModalProps: ConfirmModalProps = {
    isOpen: modalState.isOpen,
    title: modalState.title,
    message: modalState.message,
    confirmText: modalState.confirmText,
    cancelText: modalState.cancelText,
    variant: modalState.variant,
    icon: modalState.icon,
    isAlert: modalState.isAlert,
    loading: modalState.loading,
    onConfirm: handleConfirm,
    onCancel: handleCancel,
    onClose: closeConfirm,
  };

  return {
    confirmModalProps,
    openConfirm,
    openAlert,
    closeConfirm,
  };
}
