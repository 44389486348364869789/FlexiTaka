"use client";

import React from "react";
import { useLanguage } from "@/i18n/LanguageContext";

// Official telecom providers
const TELECOM_PROVIDERS = [
  {
    id: "gp",
    name: "Grameenphone",
    logo: "/logos/gp.svg",
    showText: true,
    logoHeight: 20,
  },
  {
    id: "robi",
    name: "Robi",
    logo: "/logos/robi.svg",
    showText: true,
    logoHeight: 20,
  },
  {
    id: "banglalink",
    name: "Banglalink",
    logo: "/logos/banglalink.svg",
    showText: false,
    logoHeight: 18,
  },
];

// Official wallet providers
const WALLET_PROVIDERS = [
  {
    id: "bkash",
    name: "bKash",
    logo: "/logos/bkash.svg",
    logoHeight: 20,
    showText: true,
  },
  {
    id: "nagad",
    name: "Nagad",
    logo: "/logos/nagad.svg",
    logoHeight: 20,
    showText: true,
  },
  {
    id: "rocket",
    name: "Rocket",
    logo: "/logos/rocket.svg",
    logoHeight: 20,
    showText: true,
  },
  {
    id: "bangla-qr",
    name: "Bangla QR",
    logo: "/logos/bangla-qr.svg",
    logoHeight: 20,
    showText: true,
  },
];

// Repetitions to ensure continuous coverage across all viewport sizes
const TELECOM_REPETITIONS = [0, 1];
const WALLET_REPETITIONS = [0, 1];

export default function NetworkWalletMarquee() {
  const { lang } = useLanguage();

  return (
    <section
      className="network-wallet-strip"
      aria-label={
        lang === "bn"
          ? "সমর্থিত টেলিকম নেটওয়ার্ক ও উপলব্ধ ওয়ালেটসমূহ"
          : "Supported Telecom Networks and Available Wallets"
      }
    >
      <div className="container">
        <div className="nw-strip-card">
          {/* Row 1: Supported Telecom Networks */}
          <div className="nw-row">
            <div className="nw-label-col">
              <span className="nw-label">
                {lang === "bn" ? "সমর্থিত টেলিকম নেটওয়ার্ক:" : "Supported Telecom Networks:"}
              </span>
            </div>

            <div
              className="nw-marquee-container"
              aria-label={
                lang === "bn"
                  ? "সমর্থিত টেলিকম নেটওয়ার্কের তালিকা"
                  : "Supported Telecom Networks List"
              }
            >
              <div className="nw-marquee-track nw-telecom-track">
                {/* Set A (Primary) */}
                <div className="nw-marquee-set">
                  {TELECOM_REPETITIONS.map((repIndex) => (
                    <div
                      key={`telecom-rep-${repIndex}`}
                      className={`nw-subgroup ${repIndex > 0 ? "nw-repetition-extra" : ""}`}
                      aria-hidden={repIndex > 0}
                    >
                      {TELECOM_PROVIDERS.map((provider) => (
                        <div
                          key={`tel-${repIndex}-${provider.id}`}
                          className="nw-logo-card"
                          title={provider.name}
                        >
                          <img
                            src={provider.logo}
                            alt={provider.name}
                            style={{
                              height: `${provider.logoHeight}px`,
                              width: "auto",
                              display: "block",
                            }}
                          />
                          {provider.showText && (
                            <span className="nw-logo-text">
                              {provider.name}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                {/* Set B (Duplicate for seamless infinite loop) */}
                <div className="nw-marquee-set nw-marquee-clone" aria-hidden="true">
                  {TELECOM_REPETITIONS.map((repIndex) => (
                    <div
                      key={`telecom-clone-rep-${repIndex}`}
                      className="nw-subgroup"
                      aria-hidden="true"
                    >
                      {TELECOM_PROVIDERS.map((provider) => (
                        <div
                          key={`tel-clone-${repIndex}-${provider.id}`}
                          className="nw-logo-card"
                          tabIndex={-1}
                        >
                          <img
                            src={provider.logo}
                            alt={provider.name}
                            style={{
                              height: `${provider.logoHeight}px`,
                              width: "auto",
                              display: "block",
                            }}
                          />
                          {provider.showText && (
                            <span className="nw-logo-text">
                              {provider.name}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Subtle divider between categories */}
          <div className="nw-row-divider" role="separator" />

          {/* Row 2: Available Wallets */}
          <div className="nw-row">
            <div className="nw-label-col">
              <span className="nw-label">
                {lang === "bn" ? "উপলব্ধ ওয়ালেটসমূহ:" : "Available Wallets:"}
              </span>
            </div>

            <div
              className="nw-marquee-container"
              aria-label={
                lang === "bn"
                  ? "উপলব্ধ ওয়ালেটের তালিকা"
                  : "Available Wallets List"
              }
            >
              <div className="nw-marquee-track nw-wallet-track">
                {/* Set A (Primary) */}
                <div className="nw-marquee-set">
                  {WALLET_REPETITIONS.map((repIndex) => (
                    <div
                      key={`wallet-rep-${repIndex}`}
                      className={`nw-subgroup ${repIndex > 0 ? "nw-repetition-extra" : ""}`}
                      aria-hidden={repIndex > 0}
                    >
                      {WALLET_PROVIDERS.map((wallet) => (
                        <div
                          key={`wal-${repIndex}-${wallet.id}`}
                          className="nw-logo-card"
                          title={wallet.name}
                        >
                          <img
                            src={wallet.logo}
                            alt={wallet.name}
                            style={{
                              height: `${wallet.logoHeight}px`,
                              width: "auto",
                              display: "block",
                            }}
                          />
                          {wallet.showText && (
                            <span className="nw-logo-text">
                              {wallet.name}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                {/* Set B (Duplicate for seamless infinite loop) */}
                <div className="nw-marquee-set nw-marquee-clone" aria-hidden="true">
                  {WALLET_REPETITIONS.map((repIndex) => (
                    <div
                      key={`wallet-clone-rep-${repIndex}`}
                      className="nw-subgroup"
                      aria-hidden="true"
                    >
                      {WALLET_PROVIDERS.map((wallet) => (
                        <div
                          key={`wal-clone-${repIndex}-${wallet.id}`}
                          className="nw-logo-card"
                          tabIndex={-1}
                        >
                          <img
                            src={wallet.logo}
                            alt={wallet.name}
                            style={{
                              height: `${wallet.logoHeight}px`,
                              width: "auto",
                              display: "block",
                            }}
                          />
                          {wallet.showText && (
                            <span className="nw-logo-text">
                              {wallet.name}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
