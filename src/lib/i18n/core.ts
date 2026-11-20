// Server-safe i18n core (no React). The client provider lives in ./index.tsx.
import en from "../../../messages/en.json";
import hi from "../../../messages/hi.json";
import mr from "../../../messages/mr.json";

export type Locale = "en" | "hi" | "mr";
export const LOCALES: Locale[] = ["mr", "hi", "en"];
export const LOCALE_NAMES: Record<Locale, string> = { mr: "मराठी", hi: "हिंदी", en: "English" };
export const SPEECH_LANG: Record<Locale, string> = { mr: "mr-IN", hi: "hi-IN", en: "en-IN" };

export const MESSAGES: Record<Locale, Record<string, string>> = { en, hi, mr };

export function translate(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const raw = MESSAGES[locale][key] ?? MESSAGES.en[key] ?? key;
  return vars ? raw.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? "")) : raw;
}
export const isLocale = (s: string): s is Locale => s === "en" || s === "hi" || s === "mr";
