import type { DocumentType } from "@/lib/data";
import { effortOf, obtainSet, parseKey, type Need } from "./graph";

export interface Ranked {
  key: string;
  documentTypeId: string;
  memberId: string | null;
  obtain: string[]; // prerequisites-first
  effortDays: number;
  fullyUnlocked: Need[];
  partial: Need[];
  fullValueINR: number;
  partialValueINR: number;
  membersHelped: number;
  score: number;
}

/**
 * Score(d) = (value fully unlocked + 0.3 x value partially progressed) / effort days of obtainSet(d).
 * Ties are broken by how many family members benefit.
 */
export function rankMissing(needs: Need[], docs: DocumentType[], held: Set<string>): Ranked[] {
  const candidates = new Set<string>();
  needs.forEach((n) => n.missing.forEach((k) => candidates.add(k)));

  const ranked: Ranked[] = [];
  for (const key of candidates) {
    const obtain = obtainSet(key, docs, held);
    const got = new Set(obtain);
    const fully: Need[] = [];
    const partial: Need[] = [];
    for (const n of needs) {
      if (n.missing.length === 0) continue;
      const remaining = n.missing.filter((k) => !got.has(k));
      if (remaining.length === 0) fully.push(n);
      else if (remaining.length < n.missing.length) partial.push(n);
    }
    const effortDays = Math.max(effortOf(obtain, docs), 0.5);
    const fullValueINR = fully.reduce((s, n) => s + n.valueINR, 0);
    const partialValueINR = partial.reduce((s, n) => s + n.valueINR, 0);
    const members = new Set([...fully, ...partial].map((n) => n.memberId));
    ranked.push({
      key,
      ...parseKey(key),
      obtain,
      effortDays,
      fullyUnlocked: fully,
      partial,
      fullValueINR,
      partialValueINR,
      membersHelped: members.size,
      score: (fullValueINR + 0.3 * partialValueINR) / effortDays,
    });
  }
  return ranked.sort((a, b) => b.score - a.score || b.membersHelped - a.membersHelped || a.key.localeCompare(b.key));
}
