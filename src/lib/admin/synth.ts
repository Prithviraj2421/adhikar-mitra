/**
 * Synthetic data for the Benefit Gap Map: ~200 fictional households across 10 fictional wards.
 * Deterministic (seeded PRNG) so the map tells the same story every time.
 * Uses the real rules engine and document graph, so numbers are consistent with the citizen app.
 */
import wardsRaw from "@data/wards.json";
import { DOCUMENTS, SCHEMES } from "@/lib/data";
import { buildNeeds, heldKeys, slotKey } from "@/lib/doc-graph/graph";
import type { HeldDocument } from "@/lib/doc-graph/types";
import { evaluateHousehold } from "@/lib/eligibility/engine";
import type { Household, Member } from "@/lib/eligibility/types";

export interface WardDef {
  id: string; name: string; lat: number; lng: number; households: number;
  missingIncomeCert: number; missingSeeding: number; applyRate: number;
}
export const WARDS = wardsRaw.wards as WardDef[];

function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SynthHousehold {
  household: Household & { wardId: string };
  members: Member[];
  held: HeldDocument[];
}

const OCC = ["daily-wage", "construction", "domestic-worker", "street-vendor", "farmer", "artisan", "agri-labourer"];
const CASTES = ["SC", "ST", "OBC", "VJNT", "General"];

export function generateHouseholds(asOf = "2026-11-20"): SynthHousehold[] {
  const rnd = mulberry32(2026);
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
  const out: SynthHousehold[] = [];
  for (const w of WARDS) {
    for (let n = 0; n < w.households; n++) {
      const id = `${w.id}-h${n + 1}`;
      const rural = rnd() < 0.25;
      const household: SynthHousehold["household"] = {
        id, wardId: w.id, district: "Nagpur", areaType: rural ? "RURAL" : "URBAN",
        rationCardType: pick(["AAY", "BPL", "BPL", "PHH", "APL"]),
        annualIncomeINR: Math.round((20000 + rnd() * 180000) / 1000) * 1000,
        landHoldingAcres: rural && rnd() < 0.6 ? Math.round(rnd() * 40) / 10 : 0,
        houseType: pick(["KUTCHA", "KUTCHA", "PUCCA", "NONE"]),
        hasLpgConnection: rnd() < 0.6, yearsResidentInMaharashtra: 10 + Math.floor(rnd() * 40),
      };
      const members: Member[] = [];
      const headAge = 28 + Math.floor(rnd() * 45);
      const headFemale = rnd() < 0.4;
      const year = (age: number) => 2026 - age;
      const dob = (age: number) => `${year(age)}-0${1 + Math.floor(rnd() * 8)}-1${Math.floor(rnd() * 9)}`;
      const occ = rural && household.landHoldingAcres! > 0 ? "farmer" : pick(OCC);
      const caste = pick(CASTES);
      members.push({
        id: `${id}-m1`, name: "Head", dob: dob(headAge), gender: headFemale ? "F" : "M", relation: "SELF", educationClass: 0,
        maritalStatus: headFemale && rnd() < 0.45 ? "WIDOWED" : "MARRIED", occupation: occ, casteCategory: caste,
        hasBankAccount: true, bankAadhaarSeeded: rnd() > w.missingSeeding, isIncomeTaxPayer: false, isPregnantOrLactating: false,
      });
      if (rnd() < 0.75 && members[0].maritalStatus === "MARRIED") {
        members.push({
          id: `${id}-m2`, name: "Spouse", dob: dob(headAge - 2), gender: headFemale ? "M" : "F", relation: "SPOUSE",
          maritalStatus: "MARRIED", educationClass: 0, occupation: headFemale ? occ : "homemaker", casteCategory: caste, hasBankAccount: true,
          bankAadhaarSeeded: rnd() > w.missingSeeding, isIncomeTaxPayer: false, isPregnantOrLactating: rnd() < 0.08,
        });
      }
      const kids = Math.floor(rnd() * 3);
      for (let k = 0; k < kids; k++) {
        const age = 3 + Math.floor(rnd() * 20);
        members.push({
          id: `${id}-c${k + 1}`, name: `Child ${k + 1}`, dob: dob(age), gender: rnd() < 0.5 ? "F" : "M", relation: "CHILD",
          maritalStatus: "SINGLE", occupation: age < 25 ? "student" : "daily-wage", educationClass: Math.min(14, Math.max(0, age - 5)),
          casteCategory: caste, hasBankAccount: age > 15, bankAadhaarSeeded: age > 15 && rnd() > w.missingSeeding, isIncomeTaxPayer: false,
        });
      }
      if (rnd() < 0.2) {
        members.push({
          id: `${id}-e1`, name: "Elder", dob: dob(60 + Math.floor(rnd() * 20)), gender: rnd() < 0.6 ? "F" : "M", relation: "PARENT",
          maritalStatus: "WIDOWED", educationClass: 0, occupation: "unemployed", casteCategory: caste, hasBankAccount: true,
          bankAadhaarSeeded: rnd() > w.missingSeeding, isIncomeTaxPayer: false, isPregnantOrLactating: false,
        });
      }

      // Held documents. Ward profile drives income certificate and Aadhaar-seeding gaps (the story).
      const held: HeldDocument[] = [];
      const add = (docId: string, memberId: string | null) =>
        held.push({ id: `${id}-${docId}-${memberId ?? "hh"}`, documentTypeId: docId, memberId, status: "held" });
      for (const d of DOCUMENTS) {
        if (d.scope === "household") {
          const p = d.id === "income-certificate" ? 1 - w.missingIncomeCert : d.id === "ration-card" ? 0.9 : d.id === "land-7-12" ? 0.7 : 0.5;
          if (rnd() < p) add(d.id, null);
        } else {
          for (const m of members) {
            const p =
              d.id === "aadhaar" ? 0.97 : d.id === "bank-passbook" ? 0.9 :
              d.id === "bank-account-aadhaar-seeded" ? (m.bankAadhaarSeeded ? 1 : 0) :
              d.id === "age-proof" ? 0.7 : d.id === "school-bonafide" ? 0.8 : 0.35;
            if (rnd() < p) add(d.id, m.id);
          }
        }
      }
      out.push({ household, members, held });
    }
  }
  void asOf;
  return out;
}

export interface WardStats {
  ward: WardDef;
  households: number;
  eligibleInstances: number;
  appliedInstances: number;
  notApplied: number;
  gapIndex: number;
  valueIdentifiedINR: number;
  submitted: number;
  approved: number;
  topBlockingDocs: { documentTypeId: string; count: number }[];
  families: { id: string; missingKeys: string[]; notApplied: number }[];
}
export interface AdminData {
  wards: WardStats[];
  uptakeByScheme: { schemeId: string; eligible: number; applied: number }[];
  uptakeByCategory: { category: string; eligible: number; applied: number }[];
  totals: { households: number; valueINR: number; submitted: number; approved: number };
}

export function buildAdminData(asOf = "2026-11-20", only?: { wardIds?: string[]; category?: string }): AdminData {
  const rnd = mulberry32(99);
  const hhs = generateHouseholds(asOf);
  const wardMap = new Map<string, WardStats>(
    WARDS.map((w) => [w.id, {
      ward: w, households: 0, eligibleInstances: 0, appliedInstances: 0, notApplied: 0, gapIndex: 0,
      valueIdentifiedINR: 0, submitted: 0, approved: 0, topBlockingDocs: [], families: [],
    }]),
  );
  const byScheme = new Map<string, { eligible: number; applied: number }>();
  const byCat = new Map<string, { eligible: number; applied: number }>();
  const blockers = new Map<string, Map<string, number>>();
  const schemes = only?.category ? SCHEMES.filter((s) => s.category === only.category) : SCHEMES;

  for (const h of hhs) {
    const st = wardMap.get(h.household.wardId)!;
    st.households++;
    const map = evaluateHousehold(h.household, h.members, schemes, asOf);
    const held = heldKeys(h.held, asOf);
    const needs = buildNeeds(map, schemes, DOCUMENTS, held);
    let famNotApplied = 0;
    const famMissing = new Set<string>();
    for (const n of needs) {
      const e = map.entries.find((x) => `${x.schemeId}:${x.memberId}` === n.entryId)!;
      if (e.status !== "ELIGIBLE") continue;
      const scheme = schemes.find((s) => s.id === n.schemeId)!;
      st.eligibleInstances++;
      if (scheme.benefit.type.startsWith("CASH")) st.valueIdentifiedINR += e.estimatedAnnualValueINR; // cash only, like the family view
      const s = byScheme.get(n.schemeId) ?? { eligible: 0, applied: 0 };
      const c = byCat.get(scheme.category) ?? { eligible: 0, applied: 0 };
      s.eligible++; c.eligible++;
      const applied = n.missing.length === 0 && rnd() < st.ward.applyRate;
      if (applied) {
        st.appliedInstances++; s.applied++; c.applied++;
        const r = rnd();
        if (r < 0.7) st.submitted++;
        if (r > 0.45 && r < 0.85) st.approved++;
      } else {
        st.notApplied++; famNotApplied++;
        const bm = blockers.get(st.ward.id) ?? new Map<string, number>();
        for (const k of n.missing) {
          const doc = k.split("|")[0];
          bm.set(doc, (bm.get(doc) ?? 0) + 1);
          famMissing.add(k);
        }
        blockers.set(st.ward.id, bm);
      }
      byScheme.set(n.schemeId, s); byCat.set(scheme.category, c);
    }
    st.families.push({ id: h.household.id, missingKeys: [...famMissing], notApplied: famNotApplied });
  }

  let wards = [...wardMap.values()];
  for (const st of wards) {
    st.gapIndex = st.eligibleInstances ? st.notApplied / st.eligibleInstances : 0;
    st.topBlockingDocs = [...(blockers.get(st.ward.id) ?? new Map()).entries()]
      .map(([documentTypeId, count]) => ({ documentTypeId, count }))
      .sort((a, b) => b.count - a.count).slice(0, 3);
  }
  if (only?.wardIds?.length) wards = wards.filter((w) => only.wardIds!.includes(w.ward.id));
  return {
    wards,
    uptakeByScheme: [...byScheme.entries()].map(([schemeId, v]) => ({ schemeId, ...v })),
    uptakeByCategory: [...byCat.entries()].map(([category, v]) => ({ category, ...v })),
    totals: {
      households: wards.reduce((s, w) => s + w.households, 0),
      valueINR: wards.reduce((s, w) => s + w.valueIdentifiedINR, 0),
      submitted: wards.reduce((s, w) => s + w.submitted, 0),
      approved: wards.reduce((s, w) => s + w.approved, 0),
    },
  };
}

export { slotKey };
