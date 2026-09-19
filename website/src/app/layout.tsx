import type { Metadata } from "next";
import "@/styles/globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "FlexiTaka | Your SIM Balance, More Value — Bangladesh",
  description:
    "Convert unused Grameenphone, Robi, and Banglalink prepaid SIM balance to instant bKash, Nagad, or Bank cash, or enjoy guaranteed discounts on mobile airtime recharge.",
  keywords: [
    "FlexiTaka",
    "SIM balance to cash",
    "Bangladesh flexiload exchange",
    "bKash cash out",
    "Nagad airtime payout",
    "discount recharge Bangladesh",
    "GP balance transfer",
    "Robi balance transfer",
    "Banglalink balance transfer",
  ],
  metadataBase: new URL("https://flexitaka.com"),
  openGraph: {
    title: "FlexiTaka | Your SIM Balance, More Value",
    description:
      "Convert unused telecom balance to cash or get instant discounts on mobile recharge in Bangladesh.",
    url: "https://flexitaka.com",
    siteName: "FlexiTaka",
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <Navbar />
        <main style={{ flex: 1 }}>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
