"use client";
/**
 * Voice helpers: read-aloud (speechSynthesis) and voice answers (SpeechRecognition).
 * Marathi voices are often missing; we fall back to Hindi and tell the user in one line.
 * An optional Bhashini adapter can be plugged in behind NEXT_PUBLIC_BHASHINI (off by default).
 */
import { SPEECH_LANG, type Locale } from "@/lib/i18n";

export const speechSupported = () => typeof window !== "undefined" && "speechSynthesis" in window;

export interface SpeakResult {
  usedLang: string;
  fellBack: boolean;
}

function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => v.lang.replace("_", "-").toLowerCase() === lang.toLowerCase()) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()));
}

export function speak(text: string, locale: Locale, onEnd?: () => void): SpeakResult | null {
  if (!speechSupported() || !text.trim()) return null;
  window.speechSynthesis.cancel();
  let lang = SPEECH_LANG[locale];
  let fellBack = false;
  if (!pickVoice(lang) && locale === "mr") {
    // No Marathi voice on this device: Hindi shares the Devanagari script and is mostly understandable.
    lang = "hi-IN";
    fellBack = true;
  }
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  const v = pickVoice(lang);
  if (v) u.voice = v;
  u.rate = 0.9;
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  window.speechSynthesis.speak(u);
  return { usedLang: lang, fellBack };
}
export const stopSpeaking = () => {
  if (speechSupported()) window.speechSynthesis.cancel();
};

type RecCtor = new () => {
  lang: string; interimResults: boolean; maxAlternatives: number;
  start(): void; stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
};
function recognitionCtor(): RecCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
export const recognitionSupported = () => recognitionCtor() !== null;

/** Listens once and resolves with the recognised text (or rejects). The UI must show it for confirmation. */
export function listen(locale: Locale): Promise<string> {
  const Ctor = recognitionCtor();
  if (!Ctor) return Promise.reject(new Error("unsupported"));
  return new Promise((resolve, reject) => {
    const r = new Ctor();
    r.lang = SPEECH_LANG[locale];
    r.interimResults = false;
    r.maxAlternatives = 1;
    let got = false;
    r.onresult = (e) => {
      got = true;
      resolve(e.results[0][0].transcript);
    };
    r.onerror = (e) => reject(e);
    r.onend = () => {
      if (!got) reject(new Error("no-speech"));
    };
    r.start();
  });
}

const DEVANAGARI_DIGITS = "०१२३४५६७८९";
export function parseSpokenNumber(text: string): number | null {
  const mapped = text.replace(/[०-९]/g, (d) => String(DEVANAGARI_DIGITS.indexOf(d))).replace(/,/g, "");
  const m = mapped.match(/\d+(\.\d+)?/);
  if (m) {
    let n = parseFloat(m[0]);
    if (/हजार|हजारों|thousand|हज़ार/i.test(text)) n *= 1000;
    if (/लाख|lakh|lac/i.test(text)) n *= 100000;
    return n;
  }
  return null;
}

export function matchSpokenOption<T extends { value: string; labels: string[] }>(text: string, options: T[]): T | null {
  const t = text.toLowerCase();
  let best: T | null = null;
  let bestLen = 0;
  for (const o of options) {
    for (const label of o.labels) {
      const l = label.toLowerCase();
      if (l && t.includes(l) && l.length > bestLen) {
        best = o;
        bestLen = l.length;
      }
    }
  }
  return best;
}
