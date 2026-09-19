import React from "react";
import { OrderStatus } from "@/lib/types";
import { CheckCircle2, Clock, AlertCircle, XCircle, ArrowUpRight } from "lucide-react";

interface StatusBadgeProps {
  status: OrderStatus | string;
  size?: "sm" | "md";
}

export default function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const normalized = (status || "").toUpperCase();

  let label = normalized.replace(/_/g, " ");
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
      badgeClass = "badge-pending";
      Icon = Clock;
      break;
    case "UNDER_VERIFICATION":
    case "TRANSFER_RECEIVED":
    case "PAYOUT_PROCESSING":
    case "RECHARGE_PROCESSING":
    case "PAYMENT_VERIFIED":
      badgeClass = "badge-processing";
      Icon = ArrowUpRight;
      break;
    case "REJECTED":
    case "CANCELLED":
    case "PAYMENT_FAILED":
      badgeClass = "badge-rejected";
      Icon = XCircle;
      break;
    default:
      badgeClass = "badge-neutral";
      Icon = AlertCircle;
  }

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
        fontWeight: "700",
      }}
    >
      <Icon size={iconSize} />
      <span>{label}</span>
    </span>
  );
}
