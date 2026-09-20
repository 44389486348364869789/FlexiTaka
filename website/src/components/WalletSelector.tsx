"use client";

import React from "react";
import { Building2 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

export type PaymentOrPayoutMethod = "BKASH" | "NAGAD" | "ROCKET" | "BANGLA_QR" | "BANK";

interface WalletOption {
  id: PaymentOrPayoutMethod;
  name: string;
  nameBn: string;
  logo?: string;
  logoHeight?: number;
  icon?: React.ReactNode;
}

const PAYOUT_WALLETS: WalletOption[] = [
  { id: "BKASH", name: "bKash", nameBn: "bKash", logo: "/logos/bkash.svg", logoHeight: 20 },
  { id: "NAGAD", name: "Nagad", nameBn: "Nagad", logo: "/logos/nagad.svg", logoHeight: 18 },
  {
    id: "BANK",
    name: "Bank",
    nameBn: "ব্যাংক",
    icon: <Building2 size={20} color="var(--ft-green-active)" />,
  },
];

const PAYMENT_WALLETS: WalletOption[] = [
  { id: "BKASH", name: "bKash", nameBn: "bKash", logo: "/logos/bkash.svg", logoHeight: 20 },
  { id: "NAGAD", name: "Nagad", nameBn: "Nagad", logo: "/logos/nagad.svg", logoHeight: 18 },
  { id: "ROCKET", name: "Rocket", nameBn: "Rocket", logo: "/logos/rocket.svg", logoHeight: 20 },
  { id: "BANGLA_QR", name: "Bangla QR", nameBn: "Bangla QR", logo: "/logos/bangla-qr.svg", logoHeight: 20 },
];

interface WalletSelectorProps {
  mode?: "payout" | "payment";
  value: string;
  onChange: (method: any) => void;
  disabled?: boolean;
  className?: string;
}

export default function WalletSelector({
  mode = "payout",
  value,
  onChange,
  disabled = false,
  className = "",
}: WalletSelectorProps) {
  const { lang } = useLanguage();
  const options = mode === "payment" ? PAYMENT_WALLETS : PAYOUT_WALLETS;

  return (
    <div
      role="radiogroup"
      aria-label={
        mode === "payment"
          ? lang === "bn"
            ? "পেমেন্ট মাধ্যম নির্বাচন"
            : "Select Payment Method"
          : lang === "bn"
          ? "পেআউট মাধ্যম নির্বাচন"
          : "Select Payout Method"
      }
      className={`wallet-selector-grid ${className}`}
      style={{
        display: "grid",
        gridTemplateColumns: mode === "payment" ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
        gap: "8px",
        marginBottom: 0,
      }}
    >
      {options.map((w) => {
        const isSelected = value === w.id;
        const displayName = lang === "bn" ? w.nameBn : w.name;

        return (
          <button
            key={w.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onChange(w.id)}
            className={`wallet-card ${isSelected ? "selected" : ""}`}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
              height: "62px",
              minHeight: "60px",
              padding: "6px 8px",
              cursor: disabled ? "not-allowed" : "pointer",
              borderRadius: "var(--radius-md)",
              border: isSelected
                ? "1.5px solid var(--ft-green)"
                : "1px solid var(--border-card)",
              backgroundColor: isSelected ? "var(--ft-green-subtle)" : "var(--bg-white)",
              transition: "all 0.15s ease",
              opacity: disabled ? 0.6 : 1,
              userSelect: "none",
            }}
          >
            {w.logo ? (
              <div
                style={{
                  height: "22px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  maxWidth: "100%",
                }}
              >
                <img
                  src={w.logo}
                  alt={displayName}
                  style={{
                    height: `${w.logoHeight || 20}px`,
                    maxWidth: "85px",
                    width: "auto",
                    objectFit: "contain",
                    display: "block",
                  }}
                />
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "22px",
                }}
              >
                {w.icon}
              </div>
            )}
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: isSelected ? "600" : "500",
                color: isSelected ? "var(--ft-green-active)" : "var(--text-primary)",
                lineHeight: 1.2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "100%",
              }}
            >
              {displayName}
            </span>
          </button>
        );
      })}
    </div>
  );
}
