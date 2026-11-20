/**
 * "Explain more simply". The engine's criteria are the ONLY source of truth.
 * The template explanation always works. An LLM (optional, env-configured) may only rephrase the
 * template text; it never sees raw user data beyond these criteria and never decides eligibility.
 */
import { describeExpected, formatValue } from "@/lib/eligibility/format";
import type { Evaluation, Scheme } from "@/lib/eligibility/types";
import { translate, type Locale } from "@/lib/i18n/core";

export function templateExplanation(scheme: Scheme, ev: Evaluation, locale: Locale, memberName: string): string {
  const t = (k: string, v?: Record<string, string | number>) => translate(locale, k, v);
  const head =
    ev.status === "ELIGIBLE" ? t("explain.eligible", { name: memberName, scheme: scheme.name[locale] })
    : ev.status === "LIKELY_ELIGIBLE" ? t("explain.likely", { name: memberName, scheme: scheme.name[locale] })
    : t("explain.not", { name: memberName, scheme: scheme.name[locale] });
  const lines = ev.criteria.map((c) => {
    if (c.result === "PASS") return t("explain.pass", { label: c.label[locale] });
    if (c.result === "FAIL")
      return t("explain.fail", { label: c.label[locale], actual: formatValue(c.field, c.actual, locale), expected: describeExpected(c, locale) });
    return t("explain.unknown", { label: c.label[locale] });
  });
  const excl = ev.failedExclusions.map((c) => t("explain.excluded", { label: c.label[locale] }));
  const future = ev.futureEligibility ? [t("explain.future", { date: ev.futureEligibility.date })] : [];
  return [head, ...lines, ...excl, ...future].join("\n");
}

const LANG_NAME: Record<Locale, string> = { en: "English", hi: "Hindi", mr: "Marathi" };

/** Returns rephrased text, or null if no LLM is configured or the call fails. */
export async function rephraseWithLlm(template: string, locale: Locale): Promise<string | null> {
  const provider = process.env.LLM_PROVIDER;
  const key = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL;
  if (!provider || !key || !model) return null;
  const system =
    `Rewrite the text below in very simple ${LANG_NAME[locale]} for a person with low literacy. ` +
    "Keep every fact, number, date and the pass/fail/unknown status exactly as given. " +
    "Do not add, remove or change eligibility conclusions. Do not invent advice. Short sentences. Output only the rewritten text.";
  try {
    if (provider === "anthropic") {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model, max_tokens: 700, system, messages: [{ role: "user", content: template }] }),
      });
      const j = await r.json();
      return j?.content?.[0]?.text ?? null;
    }
    // Any OpenAI-compatible endpoint
    const base = process.env.LLM_BASE_URL ?? "https://api.openai.com/v1";
    const r = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ model, messages: [{ role: "system", content: system }, { role: "user", content: template }] }),
    });
    const j = await r.json();
    return j?.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}
