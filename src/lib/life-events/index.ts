/**
 * Life-event engine: apply a change to the household, re-run the deterministic engine,
 * and report exactly what changed. The same diff powers the time-travel slider.
 */
import events from "@data/life-events.json";
import { dateWhenAge, evaluateHousehold } from "@/lib/eligibility/engine";
import type { Evaluation, FamilyBenefitMap, Household, Member, Scheme } from "@/lib/eligibility/types";

export const LIFE_EVENT_TYPES = events as {
  id: LifeEventType; icon: string; needsMember: boolean; valueKind: string;
  label: { en: string; hi: string; mr: string };
}[];

export type LifeEventType =
  | "TURNS_AGE" | "SPOUSE_DIED" | "PREGNANCY" | "CHILD_BORN"
  | "CHILD_CLASS" | "OCCUPATION_CHANGED" | "DISABILITY_CERTIFIED" | "MOVED_DISTRICT";

export interface FamilyState {
  household: Household;
  members: Member[];
}
export interface LifeEventInput {
  type: LifeEventType;
  memberId?: string;
  value?: string | number;
}
export interface DiffItem {
  schemeId: string;
  memberId: string;
  from: Evaluation["status"] | "NONE";
  to: Evaluation["status"];
  valueINR: number;
}
export interface EligibilityDiff {
  gained: DiffItem[]; // NOT_ELIGIBLE -> ELIGIBLE / LIKELY
  upgraded: DiffItem[]; // LIKELY -> ELIGIBLE
  lost: DiffItem[]; // eligible/likely -> NOT_ELIGIBLE
}

export function applyLifeEvent(state: FamilyState, ev: LifeEventInput, asOf: string): FamilyState {
  const members = state.members.map((m) => ({ ...m }));
  const household = { ...state.household };
  const find = (id?: string) => members.find((m) => m.id === id);
  switch (ev.type) {
    case "SPOUSE_DIED": {
      const dead = find(ev.memberId);
      if (!dead) break;
      const survivor = members.find(
        (m) => m.id !== dead.id && (m.relation === "SPOUSE" || (m.relation === "SELF" && dead.relation === "SPOUSE")),
      );
      if (survivor) survivor.maritalStatus = "WIDOWED";
      return { household, members: members.filter((m) => m.id !== dead.id) };
    }
    case "PREGNANCY": {
      const m = find(ev.memberId);
      if (m) m.isPregnantOrLactating = true;
      break;
    }
    case "CHILD_BORN":
      members.push({
        id: `child-${members.length + 1}`, name: "Newborn", dob: asOf, gender: ev.value === "F" ? "F" : "M",
        relation: "CHILD", maritalStatus: "SINGLE", occupation: "student", educationClass: 0, isIncomeTaxPayer: false,
      });
      break;
    case "CHILD_CLASS": {
      const m = find(ev.memberId);
      if (m) {
        m.educationClass = Number(ev.value);
        m.occupation = "student";
      }
      break;
    }
    case "OCCUPATION_CHANGED": {
      const m = find(ev.memberId);
      if (m) m.occupation = String(ev.value);
      break;
    }
    case "DISABILITY_CERTIFIED": {
      const m = find(ev.memberId);
      if (m) m.disabilityPercent = Number(ev.value);
      break;
    }
    case "MOVED_DISTRICT":
      household.district = String(ev.value);
      break;
    case "TURNS_AGE":
      break; // no data change: the date moves (see dateForAge)
  }
  return { household, members };
}

/** Date on which a member reaches `age` (used by "turns 60" events and the time-travel slider). */
export const dateForAge = (m: Member, age: number) => dateWhenAge(m.dob, age);

export function diffMaps(before: FamilyBenefitMap, after: FamilyBenefitMap): EligibilityDiff {
  const prev = new Map<string, Evaluation>(before.entries.map((e) => [`${e.schemeId}:${e.memberId}`, e]));
  const diff: EligibilityDiff = { gained: [], upgraded: [], lost: [] };
  for (const e of after.entries) {
    const p = prev.get(`${e.schemeId}:${e.memberId}`);
    const from = p?.status ?? "NONE";
    const item: DiffItem = {
      schemeId: e.schemeId, memberId: e.memberId, from, to: e.status, valueINR: e.estimatedAnnualValueINR,
    };
    const was = from === "NONE" || from === "NOT_ELIGIBLE" ? 0 : from === "LIKELY_ELIGIBLE" ? 1 : 2;
    const now = e.status === "NOT_ELIGIBLE" ? 0 : e.status === "LIKELY_ELIGIBLE" ? 1 : 2;
    if (was === 0 && now > 0) diff.gained.push(item);
    else if (was === 1 && now === 2) diff.upgraded.push(item);
    else if (was > 0 && now === 0) diff.lost.push({ ...item, valueINR: p?.estimatedAnnualValueINR ?? 0 });
  }
  return diff;
}

export function runEvent(
  state: FamilyState, ev: LifeEventInput, schemes: Scheme[], asOf: string,
): { next: FamilyState; before: FamilyBenefitMap; after: FamilyBenefitMap; diff: EligibilityDiff } {
  const before = evaluateHousehold(state.household, state.members, schemes, asOf);
  const next = applyLifeEvent(state, ev, asOf);
  const after = evaluateHousehold(next.household, next.members, schemes, asOf);
  return { next, before, after, diff: diffMaps(before, after) };
}

/** Diff between two dates with unchanged data: what time alone unlocks (birthdays). */
export function timeDiff(state: FamilyState, schemes: Scheme[], from: string, to: string) {
  const a = evaluateHousehold(state.household, state.members, schemes, from);
  const b = evaluateHousehold(state.household, state.members, schemes, to);
  return { before: a, after: b, diff: diffMaps(a, b) };
}

/** "Coming soon": entries that become eligible within `months` of asOf. */
export function comingSoon(map: FamilyBenefitMap, months = 24) {
  const [y, m, d] = map.asOfDate.split("-").map(Number);
  const limit = new Date(Date.UTC(y, m - 1 + months, d)).toISOString().slice(0, 10);
  return map.entries
    .filter((e) => e.futureEligibility && e.futureEligibility.date <= limit)
    .sort((a, b) => (a.futureEligibility!.date < b.futureEligibility!.date ? -1 : 1));
}
