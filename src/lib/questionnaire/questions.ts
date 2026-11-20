/**
 * Data-driven question set. Every question may be skipped with "I don't know" (stored as null,
 * which the engine treats as UNKNOWN). Adaptive: a question is only asked if some scheme depends on it
 * (via askQuestionId) and it applies to this member.
 */
import { SCHEMES } from "@/lib/data";
import { ageOn } from "@/lib/eligibility/engine";
import type { Household, Member } from "@/lib/eligibility/types";
import type { Node } from "@/lib/eligibility/types";

export interface Opt {
  value: string | number | boolean;
  icon: string;
}
export interface Question {
  id: string;
  scope: "household" | "member";
  field: string;
  kind: "choice" | "text" | "date";
  unit?: "rupees" | "acres" | "years" | "class";
  allowNumber?: boolean;
  options?: Opt[];
  canSkip: boolean;
}

const yn: Opt[] = [{ value: true, icon: "✅" }, { value: false, icon: "❌" }];

export const QUESTIONS: Record<string, Question> = {
  q_area: { id: "q_area", scope: "household", field: "areaType", kind: "choice", canSkip: true,
    options: [{ value: "URBAN", icon: "🏙️" }, { value: "RURAL", icon: "🌾" }] },
  q_ration: { id: "q_ration", scope: "household", field: "rationCardType", kind: "choice", canSkip: true,
    options: [{ value: "AAY", icon: "🟨" }, { value: "BPL", icon: "🟧" }, { value: "PHH", icon: "🟫" }, { value: "APL", icon: "⬜" }, { value: "NONE", icon: "❌" }] },
  q_income: { id: "q_income", scope: "household", field: "annualIncomeINR", kind: "choice", unit: "rupees", allowNumber: true, canSkip: true,
    options: [25000, 50000, 100000, 250000, 500000].map((v) => ({ value: v, icon: "💰" })) },
  q_land: { id: "q_land", scope: "household", field: "landHoldingAcres", kind: "choice", unit: "acres", allowNumber: true, canSkip: true,
    options: [0, 1, 2.5, 5, 10].map((v) => ({ value: v, icon: v === 0 ? "🚫" : "🌱" })) },
  q_house: { id: "q_house", scope: "household", field: "houseType", kind: "choice", canSkip: true,
    options: [{ value: "KUTCHA", icon: "🛖" }, { value: "PUCCA", icon: "🏠" }, { value: "NONE", icon: "⛺" }] },
  q_lpg: { id: "q_lpg", scope: "household", field: "hasLpgConnection", kind: "choice", canSkip: true, options: yn },
  q_resident: { id: "q_resident", scope: "household", field: "yearsResidentInMaharashtra", kind: "choice", unit: "years", allowNumber: true, canSkip: true,
    options: [5, 10, 15, 20, 30].map((v) => ({ value: v, icon: "📍" })) },

  q_name: { id: "q_name", scope: "member", field: "name", kind: "text", canSkip: false },
  q_relation: { id: "q_relation", scope: "member", field: "relation", kind: "choice", canSkip: false,
    options: [
      { value: "SELF", icon: "🙂" }, { value: "SPOUSE", icon: "💑" }, { value: "SON", icon: "👦" },
      { value: "DAUGHTER", icon: "👧" }, { value: "MOTHER", icon: "👵" }, { value: "FATHER", icon: "👴" },
    ] },
  q_dob: { id: "q_dob", scope: "member", field: "dob", kind: "date", canSkip: true },
  q_gender: { id: "q_gender", scope: "member", field: "gender", kind: "choice", canSkip: true,
    options: [{ value: "M", icon: "👨" }, { value: "F", icon: "👩" }, { value: "O", icon: "🧑" }] },
  q_marital: { id: "q_marital", scope: "member", field: "maritalStatus", kind: "choice", canSkip: true,
    options: [{ value: "SINGLE", icon: "🧍" }, { value: "MARRIED", icon: "💍" }, { value: "WIDOWED", icon: "🕯️" }, { value: "DIVORCED", icon: "💔" }] },
  q_occupation: { id: "q_occupation", scope: "member", field: "occupation", kind: "choice", canSkip: true,
    options: [
      { value: "farmer", icon: "🧑‍🌾" }, { value: "agri-labourer", icon: "🌾" }, { value: "daily-wage", icon: "🪣" },
      { value: "construction", icon: "🏗️" }, { value: "domestic-worker", icon: "🧹" }, { value: "street-vendor", icon: "🛒" },
      { value: "artisan", icon: "🧵" }, { value: "student", icon: "🎓" }, { value: "homemaker", icon: "🏡" },
      { value: "unemployed", icon: "🕊️" }, { value: "salaried-private", icon: "💼" }, { value: "govt-employee", icon: "🏛️" },
    ] },
  q_class: { id: "q_class", scope: "member", field: "educationClass", kind: "choice", unit: "class", canSkip: true,
    options: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((v) => ({ value: v, icon: "📚" })) },
  q_caste: { id: "q_caste", scope: "member", field: "casteCategory", kind: "choice", canSkip: true,
    options: ["SC", "ST", "OBC", "VJNT", "SBC", "EWS", "General"].map((v) => ({ value: v, icon: "🪪" })) },
  q_bank: { id: "q_bank", scope: "member", field: "hasBankAccount", kind: "choice", canSkip: true, options: yn },
  q_pregnant: { id: "q_pregnant", scope: "member", field: "isPregnantOrLactating", kind: "choice", canSkip: true, options: yn },
  q_tax: { id: "q_tax", scope: "member", field: "isIncomeTaxPayer", kind: "choice", canSkip: true, options: yn },
};

export const HOUSEHOLD_ORDER = ["q_area", "q_ration", "q_income", "q_land", "q_house", "q_lpg", "q_resident"];
export const MEMBER_ORDER = [
  "q_name", "q_relation", "q_dob", "q_gender", "q_marital", "q_occupation", "q_class", "q_caste", "q_bank", "q_pregnant", "q_tax",
];

/** Question ids that at least one scheme asks about. Questions outside this set are skipped (adaptive). */
const usedIds = (() => {
  const s = new Set<string>(["q_name", "q_relation", "q_dob", "q_gender"]);
  const walk = (n: Node) => {
    if ("all" in n) n.all.forEach(walk);
    else if ("any" in n) n.any.forEach(walk);
    else if (n.askQuestionId) s.add(n.askQuestionId);
  };
  for (const sc of SCHEMES) {
    sc.eligibility.all.forEach(walk);
    sc.eligibility.exclusions.forEach((e) => e.askQuestionId && s.add(e.askQuestionId));
  }
  return s;
})();

export const householdQuestions = () => HOUSEHOLD_ORDER.filter((id) => usedIds.has(id)).map((id) => QUESTIONS[id]);

const age = (m: Member, asOf: string) => (m.dob ? ageOn(m.dob, asOf) : null);

const REL_GENDER: Record<string, "M" | "F"> = { SON: "M", DAUGHTER: "F", MOTHER: "F", FATHER: "M" };
export const relationGender = (rel?: string) => (rel ? REL_GENDER[rel] : undefined);

/** Whether a member-level question should still be asked for this member. */
export function appliesToMember(qid: string, m: Member, asOf: string): boolean {
  const a = age(m, asOf);
  switch (qid) {
    case "q_marital": return a === null || a >= 18;
    case "q_occupation": return a === null || a >= 15;
    case "q_class": return m.occupation === "student" && (a === null || a >= 5);
    case "q_caste": return m.relation !== "SON" && m.relation !== "DAUGHTER";
    case "q_bank": return a === null || a >= 18;
    case "q_pregnant": return m.gender === "F" && (a === null || (a >= 15 && a <= 49));
    case "q_tax": return a === null || a >= 18;
    default: return true;
  }
}

/**
 * Questions still to ask for this member. `asked` records what has been shown (including "I don't know"),
 * `skip` lists questions known up front (preset relation, gender implied by relation).
 */
export function memberQuestions(m: Member, asOf: string, asked: string[] = [], skip: string[] = []): Question[] {
  return MEMBER_ORDER.filter(
    (id) => usedIds.has(id) && !asked.includes(id) && !skip.includes(id) && appliesToMember(id, m, asOf),
  ).map((id) => QUESTIONS[id]);
}

export const presetSkips = (relation?: string): string[] =>
  relation ? ["q_relation", ...(relationGender(relation) ? ["q_gender"] : [])] : [];

/** Fill the answers that follow from what we already know, so we never ask the obvious. */
export function autoDefaults(m: Member, head: Member | undefined, asOf: string): Member {
  const out = { ...m };
  const a = age(out, asOf);
  const rg = relationGender(out.relation);
  if (!out.gender && rg) out.gender = rg;
  if (a !== null) {
    if (a < 18) {
      out.maritalStatus ??= "SINGLE";
      out.isIncomeTaxPayer ??= false;
    }
    if (a < 15) out.occupation ??= "student";
    if (a < 5) out.educationClass ??= 0;
    if (out.gender !== "F" || a < 15 || a > 49) out.isPregnantOrLactating ??= false;
  }
  if (out.occupation && out.occupation !== "student") out.educationClass ??= 0;
  if ((out.relation === "SON" || out.relation === "DAUGHTER") && head?.casteCategory && !out.casteCategory) {
    out.casteCategory = head.casteCategory;
  }
  return out;
}

export function dobFromAge(years: number, asOf: string): string {
  const y = Number(asOf.slice(0, 4)) - years;
  return `${y}-01-01`;
}

export type HouseholdLike = Household;
