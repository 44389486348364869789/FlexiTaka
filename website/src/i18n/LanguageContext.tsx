"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { Language } from "./types";
import { translations, TranslationsType } from "./translations";

interface LanguageContextType {
  language: Language;
  lang: Language;
  isBn: boolean;
  setLanguage: (lang: Language) => void;
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

  // Sync with client-side localStorage on mount without causing hydration mismatch
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
      if (stored === "en" || stored === "bn") {
        if (stored !== language) {
          setLanguageState(stored);
          document.documentElement.lang = stored;
          document.cookie = `${COOKIE_NAME}=${stored}; path=/; max-age=31536000; SameSite=Lax`;
        }
      } else {
        localStorage.setItem(STORAGE_KEY, initialLanguage);
      }
    } catch {
      // storage unavailable
    }
  }, [initialLanguage, language]);

  const setLanguage = useCallback((lang: Language) => {
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
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === "bn" ? "en" : "bn");
  }, [language, setLanguage]);

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
