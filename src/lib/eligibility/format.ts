/** Human-readable "actual vs required" values for the Why? checklist, in the user's language. */
import { translate, type Locale } from "@/lib/i18n/core";
import { QUESTIONS } from "@/lib/questionnaire/questions";
import type { CriterionOutcome } from "./types";

export function formatValue(field: string, v: unknown, locale: Locale): string {
  const t = (k: string, vars?: Record<string, string | number>) => translate(locale, k, vars);
  if (v === null || v === undefined) return t("why.unknown");
  if (Array.isArray(v)) return v.map((x) => formatValue(field, x, locale)).join(" – ");
  if (typeof v === "boolean") return v ? t("common.yes") : t("common.no");
  const key = field.split(".")[1];
  if (key === "annualIncomeINR") return `₹${Number(v).toLocaleString("en-IN")}`;
  if (key === "landHoldingAcres") return t("unit.acres", { n: Number(v) });
  if (key === "yearsResidentInMaharashtra") return t("unit.years", { n: Number(v) });
  if (key === "age") return t("unit.yearsOld", { n: Number(v) });
  if (key === "educationClass") return Number(v) === 0 ? t("opt.q_class.0") : t("unit.class", { n: Number(v) });
  if (key === "size") return String(v);
  if (typeof v === "string") {
    const q = Object.values(QUESTIONS).find((x) => x.field === key);
    if (q) return t(`opt.${q.id}.${v}`);
  }
  return String(v);
}

export function describeExpected(c: CriterionOutcome, locale: Locale): string {
  const t = (k: string, vars?: Record<string, string | number>) => translate(locale, k, vars);
  const val = formatValue(c.field, c.expected, locale);
  if (c.op === "between") return t("op.between", { v: val });
  if (c.op === "exists") return t("op.exists");
  if (c.op === "in" && Array.isArray(c.expected)) {
    return t("op.in", { v: c.expected.map((x) => formatValue(c.field, x, locale)).join(", ") });
  }
  if (c.op === "notIn" && Array.isArray(c.expected)) {
    return t("op.notIn", { v: c.expected.map((x) => formatValue(c.field, x, locale)).join(", ") });
  }
  return t(`op.${c.op}`, { v: val });
}
