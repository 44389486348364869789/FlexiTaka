import React from "react";
import { OperatorCode } from "@/lib/types";

interface OperatorOption {
  code: OperatorCode;
  name: string;
  logo: string;
  logoHeight: number;
}

const OPERATORS: OperatorOption[] = [
  { code: "GP", name: "Grameenphone", logo: "/logos/gp.svg", logoHeight: 18 },
  { code: "ROBI", name: "Robi", logo: "/logos/robi.svg", logoHeight: 18 },
  { code: "BANGLALINK", name: "Banglalink", logo: "/logos/banglalink.svg", logoHeight: 15 },
];

interface OperatorSelectorProps {
  value?: OperatorCode | "";
  onChange: (code: OperatorCode) => void;
  disabled?: boolean;
}

export default function OperatorSelector({
  value = "",
  onChange,
  disabled = false,
}: OperatorSelectorProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Operator"
      className="operator-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "8px",
        marginBottom: 0,
      }}
    >
      {OPERATORS.map((op) => {
        const isSelected = value === op.code;
        return (
          <button
            key={op.code}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onChange(op.code)}
            className={`operator-card ${isSelected ? "selected" : ""}`}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
              height: "60px",
              minHeight: "58px",
              padding: "6px 4px",
              cursor: disabled ? "not-allowed" : "pointer",
              borderRadius: "var(--radius-md)",
              border: isSelected
                ? "1.5px solid var(--ft-green)"
                : "1px solid var(--border-card)",
              backgroundColor: isSelected ? "var(--ft-green-subtle)" : "var(--bg-white)",
              transition: "all 0.15s ease",
            }}
          >
            <img
              src={op.logo}
              alt={op.name}
              style={{
                height: `${op.logoHeight}px`,
                width: "auto",
                objectFit: "contain",
                display: "block",
              }}
            />
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: isSelected ? "600" : "500",
                color: isSelected ? "var(--ft-green-active)" : "var(--text-primary)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "100%",
                lineHeight: 1.1,
              }}
            >
              {op.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
