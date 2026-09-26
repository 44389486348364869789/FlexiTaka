"use client";

import React from "react";
import { OrderStatus } from "@/lib/types";
import { CheckCircle2, Clock, AlertCircle, XCircle, ArrowUpRight } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

interface StatusBadgeProps {
  status: OrderStatus | string;
  size?: "sm" | "md";
}

const STATUS_MAP: { [key: string]: { bn: string; en: string } } = {
  COMPLETED: { bn: "সম্পন্ন", en: "Completed" },
  APPROVED: { bn: "অনুমোদিত", en: "Approved" },
  WAITING_FOR_TRANSFER: { bn: "ট্রান্সফার অপেক্ষমাণ", en: "Waiting for Transfer" },
  PAYMENT_PENDING: { bn: "পেমেন্ট অপেক্ষমাণ", en: "Payment Pending" },
  REQUESTED: { bn: "অনুরোধ গৃহীত", en: "Requested" },
  UNDER_VERIFICATION: { bn: "যাচাই প্রক্রিয়াধীন", en: "Under Verification" },
  TRANSFER_RECEIVED: { bn: "ট্রান্সফার প্রাপ্ত", en: "Transfer Received" },
  PAYOUT_PROCESSING: { bn: "পেআউট প্রক্রিয়াধীন", en: "Payout Processing" },
  RECHARGE_PROCESSING: { bn: "রিচার্জ প্রক্রিয়াধীন", en: "Recharge Processing" },
  PAYMENT_VERIFIED: { bn: "পেমেন্ট যাচাই হয়েছে", en: "Payment Verified" },
  WAITING_FOR_SIM: { bn: "রিচার্জ লাইন অপেক্ষমাণ", en: "Waiting for Line" },
  WAITING_FOR_COOLDOWN: { bn: "কুলডাউন অপেক্ষমাণ", en: "Cooldown" },
  REJECTED: { bn: "প্রত্যাখ্যাত", en: "Rejected" },
  CANCELLED: { bn: "বাতিল", en: "Cancelled" },
  PAYMENT_FAILED: { bn: "পেমেন্ট ব্যর্থ", en: "Payment Failed" },
  FAILED: { bn: "ব্যর্থ হয়েছে", en: "Failed" },
  PROCESSING: { bn: "প্রক্রিয়াধীন", en: "Processing" },
  PENDING: { bn: "অপেক্ষমাণ", en: "Pending" },
};

export default function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const { isBn } = useLanguage();
  const normalized = (status || "").toUpperCase();

  let badgeClass = "badge-pending";
  let Icon = Clock;

  switch (normalized) {
    case "COMPLETED":
    case "APPROVED":
      badgeClass = "badge-approved";
      Icon = CheckCircle2;
      break;
    case "WAITING_FOR_TRANSFER":
    case "PAYMENT_PENDING":
    case "REQUESTED":
    case "PENDING":
      badgeClass = "badge-pending";
      Icon = Clock;
      break;
    case "UNDER_VERIFICATION":
    case "TRANSFER_RECEIVED":
    case "PAYOUT_PROCESSING":
    case "RECHARGE_PROCESSING":
    case "PAYMENT_VERIFIED":
    case "PROCESSING":
      badgeClass = "badge-processing";
      Icon = ArrowUpRight;
      break;
    case "REJECTED":
    case "CANCELLED":
    case "PAYMENT_FAILED":
    case "FAILED":
      badgeClass = "badge-rejected";
      Icon = XCircle;
      break;
    default:
      badgeClass = "badge-neutral";
      Icon = AlertCircle;
  }

  const mapped = STATUS_MAP[normalized];
  const label = mapped ? (isBn ? mapped.bn : mapped.en) : normalized.replace(/_/g, " ");

  const iconSize = size === "sm" ? 12 : 14;
  const padding = size === "sm" ? "2px 8px" : "4px 12px";
  const fontSize = size === "sm" ? "0.6875rem" : "0.75rem";

  return (
    <span
      className={`badge ${badgeClass}`}
      style={{
        padding,
        fontSize,
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        fontWeight: "600",
      }}
    >
      <Icon size={iconSize} />
      <span>{label}</span>
    </span>
  );
}
