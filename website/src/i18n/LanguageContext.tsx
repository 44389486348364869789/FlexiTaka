"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { Language } from "./types";
import { translations, TranslationsType } from "./translations";
import { api, getStoredAuthToken } from "@/lib/api";

interface LanguageContextType {
  language: Language;
  lang: Language;
  isBn: boolean;
  setLanguage: (lang: Language, syncBackend?: boolean) => void;
  toggleLanguage: () => void;
  t: (path: string, fallback?: string) => string;
  tr: TranslationsType;
  toBnDigits: (value: string | number) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const COOKIE_NAME = "ft_lang";
export const STORAGE_KEY = "flexitaka_lang";

const BN_DIGITS: { [key: string]: string } = {
  "0": "০",
  "1": "১",
  "2": "২",
  "3": "৩",
  "4": "৪",
  "5": "৫",
  "6": "৬",
  "7": "৭",
  "8": "৮",
  "9": "৯",
};

export function toBnDigits(value: string | number): string {
  const str = String(value);
  return str.replace(/[0-9]/g, (match) => BN_DIGITS[match] || match);
}

export function LanguageProvider({
  children,
  initialLanguage = "bn",
}: {
  children: React.ReactNode;
  initialLanguage?: Language;
}) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  // Core language setter with immediate DOM, Cookie, localStorage, and optional backend sync
  const setLanguage = useCallback((lang: Language, syncBackend: boolean = false) => {
    setLanguageState(lang);

    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
      document.cookie = `${COOKIE_NAME}=${lang}; path=/; max-age=31536000; SameSite=Lax`;
      try {
        localStorage.setItem(STORAGE_KEY, lang);
      } catch {
        // storage unavailable
      }
    }

    if (syncBackend) {
      const token = getStoredAuthToken();
      if (token) {
        api.updateUserProfile({ language_preference: lang }).catch((err) => {
          console.warn("Background language preference sync failed:", err);
        });
      }
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    const nextLang = language === "bn" ? "en" : "bn";
    setLanguage(nextLang, true);
  }, [language, setLanguage]);

  // Sync with client-side localStorage on mount without causing hydration mismatch
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
      if (stored === "en" || stored === "bn") {
        if (stored !== language) {
          setLanguage(stored, false);
        }
      } else {
        localStorage.setItem(STORAGE_KEY, initialLanguage);
      }
    } catch {
      // storage unavailable
    }

    // On authenticated session load: Fetch language_preference from /api/v1/user/profile
    const token = getStoredAuthToken();
    if (token) {
      api.getUserProfile()
        .then((profile) => {
          if (profile && (profile.language_preference === "en" || profile.language_preference === "bn")) {
            setLanguage(profile.language_preference, false);
          }
        })
        .catch(() => {
          // Keep current local language if network offline
        });
    }
  }, [initialLanguage, language, setLanguage]);

  // Sync across tabs via storage event
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && (e.newValue === "en" || e.newValue === "bn")) {
        setLanguageState(e.newValue as Language);
        if (typeof document !== "undefined") {
          document.documentElement.lang = e.newValue;
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const tr = useMemo(() => {
    return translations[language] || translations.bn;
  }, [language]);

  const t = useCallback(
    (path: string, fallback?: string): string => {
      const keys = path.split(".");
      let current: any = translations[language];
      for (const k of keys) {
        if (current && typeof current === "object" && k in current) {
          current = current[k];
        } else {
          current = undefined;
          break;
        }
      }

      if (typeof current === "string") {
        return current;
      }

      // Fallback to English dictionary
      let fallbackCurrent: any = translations.en;
      for (const k of keys) {
        if (fallbackCurrent && typeof fallbackCurrent === "object" && k in fallbackCurrent) {
          fallbackCurrent = fallbackCurrent[k];
        } else {
          fallbackCurrent = undefined;
          break;
        }
      }

      if (typeof fallbackCurrent === "string") {
        return fallbackCurrent;
      }

      return fallback || path;
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      lang: language,
      isBn: language === "bn",
      setLanguage,
      toggleLanguage,
      t,
      tr,
      toBnDigits,
    }),
    [language, setLanguage, toggleLanguage, t, tr]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
