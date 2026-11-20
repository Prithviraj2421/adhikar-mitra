/**
 * Mismatch Detector: compares name / DOB / gender across one person's documents.
 * Names are normalised (case, honorifics, punctuation), Devanagari is transliterated to Latin,
 * then tokens are matched order-insensitively with Jaro-Winkler. Initials ("R.") match any
 * token starting with that letter. A human always confirms the result.
 */
import Sanscript from "@indic-transliteration/sanscript";
import type { HeldDocument } from "@/lib/doc-graph/types";

const HONORIFICS = new Set([
  "shri", "shree", "sri", "smt", "shrimati", "mr", "mrs", "ms", "miss", "kumari", "kum", "sau", "kumar_", "dr",
  "श्री", "श्रीमती", "कुमारी", "सौ", "कु", "श्रीयुत",
]);

export function jaroWinkler(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const range = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const am = new Array(a.length).fill(false);
  const bm = new Array(b.length).fill(false);
  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    for (let j = Math.max(0, i - range); j < Math.min(b.length, i + range + 1); j++) {
      if (!bm[j] && a[i] === b[j]) {
        am[i] = bm[j] = true;
        matches++;
        break;
      }
    }
  }
  if (!matches) return 0;
  let t = 0;
  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!am[i]) continue;
    while (!bm[k]) k++;
    if (a[i] !== b[k]) t++;
    k++;
  }
  const jaro = (matches / a.length + matches / b.length + (matches - t / 2) / matches) / 3;
  let prefix = 0;
  while (prefix < 4 && a[prefix] === b[prefix]) prefix++;
  return jaro + prefix * 0.1 * (1 - jaro);
}

const DEVANAGARI = /[ऀ-ॿ]/;

export function toLatin(s: string): string {
  if (!DEVANAGARI.test(s)) return s;
  const iast = Sanscript.t(s, "devanagari", "iast");
  return iast.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function normalizeName(raw: string): string[] {
  return toLatin(raw)
    .toLowerCase()
    .replace(/[.,'’"()_-]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !HONORIFICS.has(t));
}

export type MatchLevel = "MATCH" | "MINOR" | "MISMATCH";

export function compareNames(a: string, b: string): { level: MatchLevel; score: number } {
  const ta = normalizeName(a);
  const tb = normalizeName(b);
  if (!ta.length || !tb.length) return { level: "MISMATCH", score: 0 };
  if (ta.join(" ") === tb.join(" ")) return { level: "MATCH", score: 1 };
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  const pool = [...long];
  let total = 0;
  for (const tok of short) {
    let best = 0;
    let bestIdx = -1;
    pool.forEach((cand, i) => {
      const s = tok.length === 1 || cand.length === 1 ? (tok[0] === cand[0] ? 0.9 : 0) : jaroWinkler(tok, cand);
      if (s > best) {
        best = s;
        bestIdx = i;
      }
    });
    if (bestIdx >= 0) pool.splice(bestIdx, 1);
    total += best;
  }
  const score = total / short.length;
  // Same tokens (sorted) means only order differs: that is a match.
  if ([...ta].sort().join(" ") === [...tb].sort().join(" ")) return { level: "MATCH", score: 1 };
  if (score >= 0.85) return { level: ta.length === tb.length ? "MINOR" : "MINOR", score };
  return { level: "MISMATCH", score };
}

export interface Finding {
  field: "name" | "dob" | "gender";
  level: MatchLevel;
  score: number;
  a: { documentTypeId: string; value: string };
  b: { documentTypeId: string; value: string };
  hint?: string;
}

export function compareDocuments(docs: HeldDocument[]): Finding[] {
  const out: Finding[] = [];
  for (let i = 0; i < docs.length; i++) {
    for (let j = i + 1; j < docs.length; j++) {
      const x = docs[i];
      const y = docs[j];
      if (x.nameOnDocument && y.nameOnDocument) {
        const r = compareNames(x.nameOnDocument, y.nameOnDocument);
        if (r.level !== "MATCH")
          out.push({
            field: "name", ...r,
            a: { documentTypeId: x.documentTypeId, value: x.nameOnDocument },
            b: { documentTypeId: y.documentTypeId, value: y.nameOnDocument },
          });
      }
      if (x.dobOnDocument && y.dobOnDocument && x.dobOnDocument !== y.dobOnDocument) {
        const [yx, mx, dx] = x.dobOnDocument.split("-");
        const [yy, my, dy] = y.dobOnDocument.split("-");
        out.push({
          field: "dob", level: "MISMATCH", score: 0,
          a: { documentTypeId: x.documentTypeId, value: x.dobOnDocument },
          b: { documentTypeId: y.documentTypeId, value: y.dobOnDocument },
          hint: yx === yy && mx === dy && my === dx ? "DAY_MONTH_SWAPPED" : undefined,
        });
      }
      if (x.genderOnDocument && y.genderOnDocument && x.genderOnDocument !== y.genderOnDocument) {
        out.push({
          field: "gender", level: "MISMATCH", score: 0,
          a: { documentTypeId: x.documentTypeId, value: x.genderOnDocument },
          b: { documentTypeId: y.documentTypeId, value: y.genderOnDocument },
        });
      }
    }
  }
  return out;
}

/**
 * Findings for one person. Household-level documents (ration card, 7/12 land extract) are written in the
 * head of the family's name, so they are compared with the head's own documents as well.
 */
export function findingsForMember(all: HeldDocument[], memberId: string, isHead = false): Finding[] {
  return compareDocuments(all.filter((d) => d.memberId === memberId || (isHead && d.memberId === null && !!d.nameOnDocument)));
}
