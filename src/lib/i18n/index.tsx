"use client";
/**
 * Small i18n layer: flat message files (messages/{en,hi,mr}.json), a locale taken from the URL
 * segment, and `t(key, vars)`. Missing keys fall back to English, and tests fail if any key is missing.
 */
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { translate, type Locale } from "./core";

export { LOCALES, LOCALE_NAMES, SPEECH_LANG, translate, isLocale } from "./core";
export type { Locale } from "./core";

const Ctx = createContext<Locale>("en");

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return <Ctx.Provider value={locale}>{children}</Ctx.Provider>;
}

export function useLocale(): Locale {
  return useContext(Ctx);
}
/** Same as useLocale, for components that can also render outside a locale route (falls back to the saved choice, then English). */
export function useLocaleOr(): Locale {
  return useContext(Ctx);
}
export function useT() {
  const locale = useContext(Ctx);
  return {
    locale,
    t: (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars),
    /** Pick the right language from a {en,hi,mr} object (scheme/document data). */
    l: (o: { en: string; hi: string; mr: string }) => o[locale],
  };
}
