import { commonTranslations } from "./common";
import { homeTranslations } from "./home";
import { pricingTranslations } from "./pricing";
import { appTranslations } from "./app";
import { faqTranslations } from "./faq";
import { aboutTranslations } from "./about";
import { termsTranslations } from "./terms";
import { privacyTranslations } from "./privacy";

export const translations = {
  bn: {
    common: commonTranslations.bn,
    home: homeTranslations.bn,
    pricing: pricingTranslations.bn,
    app: appTranslations.bn,
    faq: faqTranslations.bn,
    about: aboutTranslations.bn,
    terms: termsTranslations.bn,
    privacy: privacyTranslations.bn,
  },
  en: {
    common: commonTranslations.en,
    home: homeTranslations.en,
    pricing: pricingTranslations.en,
    app: appTranslations.en,
    faq: faqTranslations.en,
    about: aboutTranslations.en,
    terms: termsTranslations.en,
    privacy: privacyTranslations.en,
  },
};

export type TranslationsType = typeof translations.bn;
