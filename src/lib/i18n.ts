import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import fr from "./locales/fr";
import en from "./locales/en";
import wo from "./locales/wo";

export const SUPPORTED_LANGS = ["fr", "en", "wo"] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

const canDetect = typeof window !== "undefined";

if (!i18n.isInitialized) {
  i18n
    .use(...(canDetect ? [LanguageDetector] : []))
    .use(initReactI18next)
    .init({
      resources: {
        fr: { translation: fr },
        en: { translation: en },
        wo: { translation: wo },
      },
      lng: canDetect ? undefined : "fr",
      fallbackLng: "fr",
      supportedLngs: SUPPORTED_LANGS as unknown as string[],
      interpolation: { escapeValue: false },
      detection: {
        order: ["localStorage", "navigator"],
        caches: ["localStorage"],
        lookupLocalStorage: "mamacare_lang",
      },
    });
}

export default i18n;