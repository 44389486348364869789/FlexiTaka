import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Bengali } from "next/font/google";
import { cookies } from "next/headers";
import "@/styles/globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { LanguageProvider, COOKIE_NAME } from "@/i18n/LanguageContext";
import { Language } from "@/i18n/types";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
});

const notoSansBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-noto-bengali",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#00A859",
};

export const metadata: Metadata = {
  title: {
    default: "FlexiTaka | আপনার সিম ব্যালেন্স, আরও বেশি মূল্য — বাংলাদেশ",
    template: "%s | FlexiTaka",
  },
  description:
    "অব্যবহৃত প্রিপেইড মোবাইল ব্যালেন্সকে তাৎক্ষণিক bKash, Nagad বা ব্যাংক ক্যাশে রূপান্তর করুন অথবা বাংলাদেশে মোবাইল এয়ারটাইম রিচার্জে ৫% নিশ্চিত ডিসকাউন্ট উপভোগ করুন।",
  keywords: [
    "FlexiTaka",
    "ফ্লেক্সি টাকা",
    "সিম ব্যালেন্স ক্যাশ",
    "মোবাইল রিচার্জ ডিসকাউন্ট",
    "bKash cash out",
    "Nagad airtime payout",
    "GP balance transfer",
    "Robi balance transfer",
    "Banglalink balance transfer",
  ],
  metadataBase: new URL("https://flexitaka.com"),
  alternates: {
    canonical: "https://flexitaka.com",
  },
  openGraph: {
    title: "FlexiTaka | আপনার সিম ব্যালেন্স, আরও বেশি মূল্য — বাংলাদেশ",
    description:
      "অব্যবহৃত মোবাইল ব্যালেন্স ক্যাশ করুন অথবা এয়ারটাইম রিচার্জে পান তাৎক্ষণিক নিশ্চিত ডিসকাউন্ট। জিরো পাসওয়ার্ড শেয়ারিং।",
    url: "https://flexitaka.com",
    siteName: "FlexiTaka",
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "FlexiTaka - Your SIM Balance, More Value",
      },
    ],
    locale: "bn_BD",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FlexiTaka | আপনার সিম ব্যালেন্স, আরও বেশি মূল্য",
    description:
      "অব্যবহৃত সিম ব্যালেন্সকে তাৎক্ষণিক bKash ও Nagad ক্যাশে রূপান্তর করুন অথবা নিশ্চিত রিচার্জ ডিসকাউন্ট উপভোগ করুন।",
    images: ["/images/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico?v=2", sizes: "any" },
      { url: "/favicon.svg?v=2", type: "image/svg+xml" },
      { url: "/favicon-32x32.png?v=2", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png?v=2", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png?v=2", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        rel: "apple-touch-icon-precomposed",
        url: "/apple-touch-icon.png?v=2",
      },
    ],
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const rawLang = cookieStore.get(COOKIE_NAME)?.value;
  const initialLang: Language = rawLang === "en" ? "en" : "bn";

  return (
    <html lang={initialLang} className={`${inter.variable} ${notoSansBengali.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <LanguageProvider initialLanguage={initialLang}>
          <Navbar />
          <main style={{ flex: 1 }}>{children}</main>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
