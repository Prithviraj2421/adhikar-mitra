import type { DocumentType } from "@/lib/data";
import type { Evaluation, FamilyBenefitMap, Scheme } from "@/lib/eligibility/types";
import { buildNeeds, heldKeys, type Need } from "./graph";
import { rankMissing, type Ranked } from "./ranking";
import type { HeldDocument } from "./types";

export interface PathStep {
  key: string;
  documentTypeId: string;
  memberId: string | null;
  /** True when this step is only a prerequisite of the recommended document. */
  isPrerequisite: boolean;
  effortDays: number;
  unlocksFully: string[]; // entry ids that become ready after this whole group
}

export interface DocPlan {
  needs: Need[];
  ranked: Ranked[];
  top: Ranked | null;
  path: PathStep[];
  readyEntries: string[];
  blockedEntries: string[];
}

/**
 * Recommended path: greedily take the best-scoring document (with its unmet prerequisites,
 * already ordered prerequisites-first), mark it held, re-rank, repeat until every
 * eligible scheme is ready. Greedy is not globally optimal but is explainable and cheap.
 */
export function planDocuments(
  map: FamilyBenefitMap,
  schemes: Scheme[],
  docs: DocumentType[],
  heldDocs: HeldDocument[],
): DocPlan {
  const held = heldKeys(heldDocs, map.asOfDate);
  const needs = buildNeeds(map, schemes, docs, held);
  const ranked = rankMissing(needs, docs, held);

  const path: PathStep[] = [];
  const working = new Set(held);
  let guard = 0;
  while (guard++ < 100) {
    const live = buildNeeds(map, schemes, docs, working);
    const next = rankMissing(live, docs, working)[0];
    if (!next) break;
    const before = new Set(live.filter((n) => n.missing.length === 0).map((n) => n.entryId));
    next.obtain.forEach((k) => working.add(k));
    const after = buildNeeds(map, schemes, docs, working).filter((n) => n.missing.length === 0).map((n) => n.entryId);
    const newly = after.filter((id) => !before.has(id));
    next.obtain.forEach((k, i) => {
      const d = k.split("|");
      path.push({
        key: k,
        documentTypeId: d[0],
        memberId: d[1] === "-" ? null : d[1],
        isPrerequisite: k !== next.key,
        effortDays: docs.find((x) => x.id === d[0])?.effortDays ?? 0,
        unlocksFully: i === next.obtain.length - 1 ? newly : [],
      });
    });
  }
  return {
    needs,
    ranked,
    top: ranked[0] ?? null,
    path,
    readyEntries: needs.filter((n) => n.missing.length === 0).map((n) => n.entryId),
    blockedEntries: needs.filter((n) => n.missing.length > 0).map((n) => n.entryId),
  };
}

export type { Evaluation };
