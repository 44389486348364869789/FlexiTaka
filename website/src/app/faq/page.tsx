"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  ChevronDown,
  HelpCircle,
  ShieldCheck,
  ArrowRight,
  Search,
} from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

export default function FAQPage() {
  const { isBn, tr } = useLanguage();
  const f = tr.faq;

  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [openIds, setOpenIds] = useState<Set<string>>(new Set(["about-1", "cashout-1", "recharge-1"]));

  const toggleItem = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const categories = useMemo(() => {
    const cats = Array.from(new Set(f.items.map((i) => i.category)));
    return [isBn ? "সব" : "All", ...cats];
  }, [f.items, isBn]);

  const filteredFaqs = useMemo(() => {
    return f.items.filter((item) => {
      const allLabel = isBn ? "সব" : "All";
      const matchesCategory = activeCategory === allLabel || activeCategory === "All" || item.category === activeCategory;
      const qLower = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !qLower ||
        item.q.toLowerCase().includes(qLower) ||
        item.a.toLowerCase().includes(qLower) ||
        item.category.toLowerCase().includes(qLower);
      return matchesCategory && matchesSearch;
    });
  }, [f.items, activeCategory, searchQuery, isBn]);

  return (
    <div style={{ backgroundColor: "var(--bg-main)", minHeight: "100vh", paddingBottom: "80px" }}>
      {/* 1. Header Banner */}
      <div style={{ backgroundColor: "#FFFFFF", borderBottom: "1px solid var(--border-light)", padding: "48px 0" }}>
        <div className="container text-center">
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "4px 12px",
              background: "var(--ft-green-subtle)",
              color: "var(--ft-green-active)",
              borderRadius: "var(--radius-full)",
              fontSize: "0.8125rem",
              fontWeight: "600",
              marginBottom: "16px",
            }}
          >
            <ShieldCheck size={16} />
            <span>{f.badge}</span>
          </div>
          <h1 style={{ fontSize: "2.375rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "12px", letterSpacing: "-0.02em" }}>
            {f.title}
          </h1>
          <p style={{ fontSize: "1.0625rem", color: "var(--text-secondary)", maxWidth: "620px", margin: "0 auto", lineHeight: 1.6 }}>
            {f.subtitle}
          </p>
        </div>
      </div>

      <div className="container" style={{ paddingTop: "36px", maxWidth: "920px" }}>
        {/* 2. Interactive Search Bar */}
        <div
          style={{
            position: "relative",
            marginBottom: "24px",
          }}
        >
          <Search
            size={18}
            style={{
              position: "absolute",
              left: "16px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            className="form-input"
            placeholder={f.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              paddingLeft: "46px",
              height: "48px",
              fontSize: "0.9375rem",
              backgroundColor: "#FFFFFF",
              borderRadius: "var(--radius-md)",
            }}
          />
        </div>

        {/* 3. Category Filter Chips */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            overflowX: "auto",
            paddingBottom: "8px",
            marginBottom: "28px",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {categories.map((cat) => {
            const isAll = cat === (isBn ? "সব" : "All");
            const isSelected = activeCategory === cat || (isAll && (activeCategory === "All" || activeCategory === "সব"));
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "var(--radius-full)",
                  fontSize: "0.8125rem",
                  fontWeight: isSelected ? "600" : "500",
                  border: isSelected ? "1px solid var(--ft-green)" : "1px solid var(--border-card)",
                  backgroundColor: isSelected ? "var(--ft-green)" : "#FFFFFF",
                  color: isSelected ? "#FFFFFF" : "var(--text-secondary)",
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Results Counter if searching */}
        {searchQuery && (
          <div style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "16px" }}>
            {isBn
              ? `"${searchQuery}" এর জন্য ${filteredFaqs.length}টি ফলাফল পাওয়া গেছে`
              : `Showing ${filteredFaqs.length} result${filteredFaqs.length === 1 ? "" : "s"} for "${searchQuery}"`}
          </div>
        )}

        {/* Accordion List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filteredFaqs.map((faq) => {
            const isOpen = openIds.has(faq.id);
            return (
              <div
                key={faq.id}
                style={{
                  backgroundColor: "#FFFFFF",
                  border: isOpen ? "1px solid var(--ft-green)" : "1px solid var(--border-card)",
                  borderRadius: "var(--radius-md)",
                  overflow: "hidden",
                  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                  boxShadow: isOpen ? "var(--shadow-sm)" : "none",
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleItem(faq.id)}
                  aria-expanded={isOpen}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "16px 20px",
                    background: "none",
                    border: "none",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "14px",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <span
                      style={{
                        fontSize: "0.6875rem",
                        fontWeight: "500",
                        textTransform: "uppercase",
                        color: "var(--text-muted)",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {faq.category}
                    </span>
                    <span
                      style={{
                        fontSize: "1rem",
                        fontWeight: "600",
                        color: isOpen ? "var(--ft-green-active)" : "var(--text-primary)",
                      }}
                    >
                      {faq.q}
                    </span>
                  </div>
                  <ChevronDown
                    size={18}
                    style={{
                      color: isOpen ? "var(--ft-green)" : "var(--text-muted)",
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s ease",
                      flexShrink: 0,
                    }}
                  />
                </button>

                {isOpen && (
                  <div
                    style={{
                      padding: "0 20px 18px",
                      color: "var(--text-secondary)",
                      fontSize: "0.9375rem",
                      lineHeight: 1.6,
                      borderTop: "1px solid var(--border-light)",
                      paddingTop: "14px",
                    }}
                  >
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}

          {filteredFaqs.length === 0 && (
            <div
              className="card text-center"
              style={{ padding: "40px 20px", color: "var(--text-muted)" }}
            >
              <HelpCircle size={32} style={{ margin: "0 auto 12px", opacity: 0.5 }} />
              <p style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-primary)", margin: "0 0 6px" }}>
                {f.noResults}
              </p>
              <p style={{ fontSize: "0.875rem", margin: 0 }}>
                {f.tryDifferentSearch}
              </p>
            </div>
          )}
        </div>

        {/* Still have questions card */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid var(--border-card)",
            borderRadius: "var(--radius-lg)",
            padding: "28px 32px",
            marginTop: "40px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "20px",
          }}
        >
          <div>
            <h3 style={{ fontSize: "1.125rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>
              {f.contactCtaTitle}
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: 0 }}>
              {f.contactCtaDesc}
            </p>
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <a
              href="mailto:Contact@flexitaka.com"
              className="btn btn-outline btn-sm"
              style={{ fontWeight: "600" }}
            >
              Contact@flexitaka.com
            </a>
            <Link href="/support" className="btn btn-primary btn-sm">
              <span>{f.btnContactSupport}</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
