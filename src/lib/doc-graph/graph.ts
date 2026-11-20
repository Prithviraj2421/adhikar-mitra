/**
 * Document Unlock Graph.
 *
 * A "slot" is one concrete document a specific person (or the household) must hold, e.g.
 * income-certificate for the household, or aadhaar for Sunil. Schemes need slots; slots need
 * prerequisite slots (an income certificate needs an Aadhaar and a ration card first).
 * Everything here is pure and deterministic so it can be unit-tested and explained to judges.
 */
import type { DocumentType } from "@/lib/data";
import { headOf } from "@/lib/eligibility/engine";
import type { Evaluation, FamilyBenefitMap, Member, Scheme } from "@/lib/eligibility/types";
import type { HeldDocument } from "./types";

export interface Slot {
  key: string;
  documentTypeId: string;
  memberId: string | null;
}
export const slotKey = (docId: string, memberId: string | null) => `${docId}|${memberId ?? "-"}`;
export const parseKey = (key: string): Slot => {
  const [documentTypeId, m] = key.split("|");
  return { key, documentTypeId, memberId: m === "-" ? null : m };
};

/** One (scheme, member) pairing that the family could apply for, with the slots it requires. */
export interface Need {
  entryId: string; // `${schemeId}:${memberId}`
  schemeId: string;
  memberId: string;
  valueINR: number; // weighted: ELIGIBLE = 100%, LIKELY = 50%
  required: string[]; // slot keys
  missing: string[]; // slot keys not held
}

export function isHeld(h: HeldDocument, asOfDate: string): boolean {
  if (h.status === "missing") return false;
  if (h.expiresOn && h.expiresOn < asOfDate) return false; // expired documents do not count
  return true;
}

export function heldKeys(held: HeldDocument[], asOfDate: string): Set<string> {
  return new Set(held.filter((h) => isHeld(h, asOfDate)).map((h) => slotKey(h.documentTypeId, h.memberId)));
}

function slotFor(doc: DocumentType, memberId: string): string {
  return slotKey(doc.id, doc.scope === "household" ? null : memberId);
}

export function buildNeeds(
  map: FamilyBenefitMap,
  schemes: Scheme[],
  docs: DocumentType[],
  held: Set<string>,
): Need[] {
  const docById = new Map(docs.map((d) => [d.id, d]));
  const schemeById = new Map(schemes.map((s) => [s.id, s]));
  const needs: Need[] = [];
  for (const e of map.entries) {
    if (e.status === "NOT_ELIGIBLE") continue;
    const scheme = schemeById.get(e.schemeId);
    if (!scheme) continue;
    const required = scheme.requiredDocuments.map((id) => slotFor(docById.get(id) as DocumentType, e.memberId));
    needs.push({
      entryId: `${e.schemeId}:${e.memberId}`,
      schemeId: e.schemeId,
      memberId: e.memberId,
      valueINR: e.estimatedAnnualValueINR * (e.status === "ELIGIBLE" ? 1 : 0.5),
      required,
      missing: required.filter((k) => !held.has(k)),
    });
  }
  return needs;
}

/**
 * obtainSet(slot): the slot itself plus every unmet prerequisite, transitively.
 * Returned prerequisites-first (topological order), so it doubles as a to-do order.
 */
export function obtainSet(key: string, docs: DocumentType[], held: Set<string>): string[] {
  const docById = new Map(docs.map((d) => [d.id, d]));
  const out: string[] = [];
  const seen = new Set<string>();
  const visit = (k: string) => {
    if (seen.has(k) || held.has(k)) return;
    seen.add(k);
    const { documentTypeId, memberId } = parseKey(k);
    const d = docById.get(documentTypeId);
    if (!d) return;
    for (const p of d.prerequisites) {
      const pd = docById.get(p);
      if (!pd) continue;
      // A household-level document (e.g. income certificate) needs *someone's* Aadhaar, not a specific member's:
      // if any family member already holds the member-level prerequisite, it is satisfied.
      if (pd.scope === "member" && memberId === null && [...held].some((h) => h.startsWith(`${p}|`))) continue;
      visit(slotKey(p, pd.scope === "household" ? null : memberId));
    }
    out.push(k); // post-order => prerequisites come first
  };
  visit(key);
  return out;
}

export const effortOf = (keys: string[], docs: DocumentType[]) =>
  keys.reduce((s, k) => s + (docs.find((d) => d.id === parseKey(k).documentTypeId)?.effortDays ?? 0), 0);

/** Convenience used by pages: evaluation entries grouped for display. */
export function entriesNeedingDocs(map: FamilyBenefitMap): Evaluation[] {
  return map.entries.filter((e) => e.status !== "NOT_ELIGIBLE");
}

export { headOf };
export type { Member };
