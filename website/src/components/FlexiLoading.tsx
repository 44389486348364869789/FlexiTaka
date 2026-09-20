"use client";

import React from "react";
import { useLanguage } from "@/i18n/LanguageContext";

interface FlexiLoadingProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  text?: string;
  fullscreen?: boolean;
  inline?: boolean;
  className?: string;
}

const sizeMap = {
  xs: { width: 36, height: 25 },
  sm: { width: 54, height: 38 },
  md: { width: 84, height: 58 },
  lg: { width: 120, height: 84 },
  xl: { width: 168, height: 117 },
};

export default function FlexiLoading({
  size = "md",
  text,
  fullscreen = false,
  inline = false,
  className = "",
}: FlexiLoadingProps) {
  const dims = sizeMap[size] || sizeMap.md;
  const { isBn } = useLanguage();

  const displayText = text ?? (isBn ? "লোড হচ্ছে..." : "Loading FlexiTaka...");
  const srText = isBn ? "লোড হচ্ছে..." : "Loading FlexiTaka...";

  const content = (
    <div
      role="status"
      aria-live="polite"
      className={`flexi-loader-container ${fullscreen ? "flexi-loader-fullscreen" : ""} ${className}`}
      style={{
        display: inline ? "inline-flex" : "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
      }}
    >
      <div
        className="flexi-loader-graphic"
        style={{
          width: `${dims.width}px`,
          height: `${dims.height}px`,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <picture>
          <source srcSet="/images/loader.webp" type="image/webp" />
          <img
            src="/images/loader.webp"
            alt={srText}
            width={dims.width}
            height={dims.height}
            loading="eager"
            decoding="async"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
            }}
          />
        </picture>
      </div>

      {displayText && (
        <span
          className="flexi-loader-text"
          style={{
            fontSize: size === "xs" || size === "sm" ? "0.8125rem" : "0.9375rem",
            color: "var(--text-secondary, #334155)",
            fontWeight: 500,
            textAlign: "center",
            letterSpacing: "-0.01em",
          }}
        >
          {displayText}
        </span>
      )}
      <span className="sr-only">{srText}</span>
    </div>
  );

  if (fullscreen) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(255, 255, 255, 0.88)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
        }}
      >
        <div
          style={{
            background: "var(--bg-white, #ffffff)",
            padding: "24px 36px",
            borderRadius: "16px",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            border: "1px solid var(--border-light, #edf2f7)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {content}
        </div>
      </div>
    );
  }

  return content;
}
