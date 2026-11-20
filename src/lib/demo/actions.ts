"use client";
/** Demo-hub actions: time travel, life events, daily check. All use the same deterministic engine as the citizen screens. */
import { DOCUMENTS, SCHEMES, schemeById } from "@/lib/data";
import { planDocuments } from "@/lib/doc-graph/path";
import { evaluateHousehold } from "@/lib/eligibility/engine";
import { LIFE_EVENT_TYPES, dateForAge, runEvent, timeDiff, type EligibilityDiff, type LifeEventInput } from "@/lib/life-events";
import { eligibilityNotif, runDailyChecks, type Locale, type Notif } from "@/lib/notifications";
import { addNotifs, getState, patch, setState, updateFamily, type Family } from "@/lib/store";
import { translate } from "@/lib/i18n/core";

function logLife(text: string, asOf: string) {
  setState((s) => ({ ...s, lifeLog: [{ at: new Date().toISOString(), asOf, text }, ...s.lifeLog].slice(0, 30) }));
}

function notifyGained(family: Family, diff: EligibilityDiff, locale: Locale, asOf: string): Notif[] {
  return [...diff.gained, ...diff.upgraded].map((g) => {
    const m = family.members.find((x) => x.id === g.memberId);
    return eligibilityNotif(g.schemeId, m?.name ?? "", locale, asOf, family.household.id);
  });
}

/** Moves the demo clock. Newly unlocked schemes create an in-app diff entry and an SMS. */
export function travelTo(newDate: string, locale: Locale): EligibilityDiff | null {
  const s = getState();
  const family = s.families.find((f) => f.id === s.activeId);
  const from = s.asOfDate;
  patch({ asOfDate: newDate });
  if (!family || family.members.length === 0 || newDate <= from) return null;
  const { diff } = timeDiff({ household: family.household, members: family.members }, SCHEMES, from, newDate);
  const notifs = notifyGained(family, diff, locale, newDate);
  addNotifs(notifs);
  if (diff.gained.length || diff.upgraded.length) {
    logLife(
      translate(locale, "le.logTime", {
        date: newDate,
        items: [...diff.gained, ...diff.upgraded].map((g) => `${schemeById(g.schemeId)!.name[locale]} (${family.members.find((m) => m.id === g.memberId)?.name.split(" ")[0]})`).join(", "),
      }),
      newDate,
    );
  }
  return diff;
}

export function applyEvent(ev: LifeEventInput, locale: Locale): EligibilityDiff | null {
  const s = getState();
  const family = s.families.find((f) => f.id === s.activeId);
  if (!family) return null;
  let asOf = s.asOfDate;
  const member = family.members.find((m) => m.id === ev.memberId);
  // "Turns age X" moves the clock to that birthday: nothing else in the data changes.
  if (ev.type === "TURNS_AGE" && member) {
    const d = dateForAge(member, Number(ev.value));
    return travelTo(d > asOf ? d : asOf, locale);
  }
  const { next, diff } = runEvent({ household: family.household, members: family.members }, ev, SCHEMES, asOf);
  updateFamily(family.id, (f) => ({ ...f, household: { ...f.household, ...next.household }, members: next.members }));
  addNotifs(notifyGained(family, diff, locale, asOf));
  const label = LIFE_EVENT_TYPES.find((x) => x.id === ev.type)!.label[locale];
  logLife(`${label}${member ? ` · ${member.name.split(" ")[0]}` : ""}: ${diff.gained.length} ${translate(locale, "le.newSchemes")}`, asOf);
  asOf = s.asOfDate;
  return diff;
}

export function runDaily(locale: Locale): Notif[] {
  const s = getState();
  const out: Notif[] = [];
  for (const f of s.families.filter((x) => x.id === s.activeId)) {
    const map = evaluateHousehold(f.household, f.members, SCHEMES, s.asOfDate);
    const plan = planDocuments(map, SCHEMES, DOCUMENTS, f.heldDocuments);
    const missingDocsByApp: Record<string, string[]> = {};
    for (const n of plan.needs) missingDocsByApp[`${n.schemeId}:${n.memberId}`] = n.missing.map((k) => k.split("|")[0]);
    const existing = new Set(s.notifications.map((n) => n.dedupeKey));
    out.push(
      ...runDailyChecks({
        asOf: s.asOfDate, locale, householdId: f.household.id, members: f.members, heldDocuments: f.heldDocuments,
        applications: f.applications, missingDocsByApp, existingKeys: existing,
      }),
    );
  }
  addNotifs(out);
  return out;
}
