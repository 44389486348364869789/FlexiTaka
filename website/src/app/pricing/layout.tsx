import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Live Pricing & Rates — Transparent Telecom Exchange",
  description:
    "View live authoritative exchange rates for SIM balance Cash Out and guaranteed discounts for mobile recharge across GP, Robi, and Banglalink.",
  alternates: {
    canonical: "https://flexitaka.com/pricing",
  },
  openGraph: {
    title: "Live Pricing & Authoritative Rates | FlexiTaka",
    description:
      "Real-time transparent conversion rates for airtime balance to cash and recharge discounts in Bangladesh.",
    url: "https://flexitaka.com/pricing",
    images: ["/images/og-image.png"],
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
