"use client";

import React from "react";
import { Check } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

interface StepIndicatorProps {
  currentStep: 1 | 2 | 3 | 4;
  className?: string;
}

export default function StepIndicator({
  currentStep,
  className = "",
}: StepIndicatorProps) {
  const { lang, toBnDigits } = useLanguage();

  const STEPS = [
    { step: 1, label: lang === "bn" ? "অপারেটর" : "Operator" },
    { step: 2, label: lang === "bn" ? "নম্বর" : "Number" },
    { step: 3, label: lang === "bn" ? "পরিমাণ" : "Amount" },
    { step: 4, label: lang === "bn" ? "পর্যালোচনা" : "Review" },
  ];

  const currentStepObj = STEPS.find((s) => s.step === currentStep) || STEPS[0];
  const progressPercent = Math.round((currentStep / 4) * 100);

  return (
    <div className={`step-indicator-wrapper ${className}`} style={{ marginBottom: "16px" }}>
      {/* DESKTOP VIEW: Multi-label step trail */}
      <div
        role="progressbar"
        aria-label="Progress"
        aria-valuenow={currentStep}
        aria-valuemin={1}
        aria-valuemax={4}
        className="step-indicator-desktop"
        style={{
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          backgroundColor: "var(--bg-subtle)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-light)",
        }}
      >
        {STEPS.map((s, idx) => {
          const isCompleted = currentStep > s.step;
          const isCurrent = currentStep === s.step;

          return (
            <React.Fragment key={s.step}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    backgroundColor: isCompleted
                      ? "var(--ft-green)"
                      : isCurrent
                      ? "var(--ft-green)"
                      : "var(--border-card)",
                    color: isCompleted || isCurrent ? "#FFFFFF" : "var(--text-muted)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.6875rem",
                    fontWeight: "600",
                    transition: "all 0.2s ease",
                    boxShadow: isCurrent ? "0 0 0 2px var(--ft-green-subtle)" : "none",
                  }}
                >
                  {isCompleted ? <Check size={12} strokeWidth={3} /> : (lang === "bn" ? toBnDigits(s.step) : s.step)}
                </div>

                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: isCurrent ? "600" : "500",
                    color: isCurrent
                      ? "var(--ft-green-active)"
                      : isCompleted
                      ? "var(--text-primary)"
                      : "var(--text-muted)",
                    transition: "color 0.2s ease",
                  }}
                >
                  {s.label}
                </span>
              </div>

              {idx < STEPS.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: "2px",
                    margin: "0 8px",
                    backgroundColor: currentStep > s.step ? "var(--ft-green)" : "var(--border-light)",
                    transition: "background-color 0.2s ease",
                    minWidth: "12px",
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* MOBILE VIEW: Compact non-overflowing progress bar */}
      <div
        role="progressbar"
        aria-label="Progress"
        aria-valuenow={currentStep}
        aria-valuemin={1}
        aria-valuemax={4}
        className="step-indicator-mobile"
        style={{
          padding: "10px 14px",
          backgroundColor: "var(--bg-subtle)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-light)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "6px",
          }}
        >
          <span style={{ fontSize: "0.8125rem", fontWeight: "600", color: "var(--text-primary)" }}>
            {lang === "bn"
              ? `ধাপ ${toBnDigits(currentStep)} / ৪ · `
              : `Step ${currentStep} of 4 · `}
            <span style={{ color: "var(--ft-green-active)" }}>{currentStepObj.label}</span>
          </span>
          <span style={{ fontSize: "0.75rem", fontWeight: "500", color: "var(--text-muted)" }}>
            {lang === "bn" ? `${toBnDigits(progressPercent)}%` : `${progressPercent}%`}
          </span>
        </div>
        <div
          style={{
            height: "5px",
            backgroundColor: "var(--border-card)",
            borderRadius: "var(--radius-full)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progressPercent}%`,
              height: "100%",
              backgroundColor: "var(--ft-green)",
              borderRadius: "var(--radius-full)",
              transition: "width 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
