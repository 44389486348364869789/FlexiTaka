"use client";

import React from "react";
import FlexiLoading from "@/components/FlexiLoading";
import { useLanguage } from "@/i18n/LanguageContext";

export default function Loading() {
  const { isBn } = useLanguage();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "50vh",
        padding: "40px 20px",
      }}
    >
      <FlexiLoading size="lg" text={isBn ? "লোড হচ্ছে..." : "Loading FlexiTaka..."} />
    </div>
  );
}
