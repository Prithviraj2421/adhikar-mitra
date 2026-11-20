/**
 * Deterministic, explainable eligibility engine.
 *
 * Design notes (the "why"):
 *  - Three-valued logic (PASS / FAIL / UNKNOWN). A missing answer is UNKNOWN, never silently FAIL,
 *    so "I don't know" yields LIKELY_ELIGIBLE plus the exact questions that would resolve it.
 *  - No LLM is involved here. Every outcome is traceable to one criterion in the scheme JSON.
 *  - Dates are handled as UTC calendar dates to avoid timezone drift on birthday boundaries.
 */
import type {
  CriterionOutcome,
  CriterionResult,
  Evaluation,
  FamilyBenefitMap,
  Household,
  Leaf,
  Member,
  Node,
  Scheme,
} from "./types";

/* ------------------------------------------------------------------ dates */

function parseISO(d: string): { y: number; m: number; d: number } {
  const [y, m, day] = d.slice(0, 10).split("-").map(Number);
  return { y, m, d: day };
}

/** Completed years between dob and asOf (birthday counts on the day itself). */
export function ageOn(dob: string, asOf: string): number {
  const b = parseISO(dob);
  const a = parseISO(asOf);
  let age = a.y - b.y;
  if (a.m < b.m || (a.m === b.m && a.d < b.d)) age -= 1;
  return age;
}

/** Date the person reaches `years` (their birthday). Feb 29 births use Mar 1 in non-leap years. */
export function dateWhenAge(dob: string, years: number): string {
  const b = parseISO(dob);
  const y = b.y + years;
  let m = b.m;
  let d = b.d;
  if (m === 2 && d === 29) {
    const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    if (!leap) {
      m = 3;
      d = 1;
    }
  }
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/* --------------------------------------------------------- field resolver */

export interface Ctx {
  member: Member;
  household: Household;
  householdSize: number;
  asOfDate: string;
}

const isNil = (v: unknown) => v === null || v === undefined || v === "UNKNOWN";

export function resolveField(field: string, ctx: Ctx): unknown {
  const { member, household, asOfDate } = ctx;
  switch (field) {
    case "member.age":
      return member.dob ? ageOn(member.dob, asOfDate) : undefined;
    case "member.isChild": {
      return member.dob ? ageOn(member.dob, asOfDate) < 18 : undefined;
    }
    case "member.isSeniorCitizen":
      return member.dob ? ageOn(member.dob, asOfDate) >= 60 : undefined;
    case "household.size":
      return ctx.householdSize;
  }
  const [scope, key] = field.split(".");
  const src = scope === "member" ? member : scope === "household" ? household : undefined;
  return src ? (src as unknown as Record<string, unknown>)[key] : undefined;
}

/* -------------------------------------------------------------- operators */

/** Apply an operator. `actual` is never nil here (nil → UNKNOWN is handled by the caller). */
export function applyOp(op: Leaf["op"], actual: unknown, expected: unknown): boolean {
  switch (op) {
    case "eq":
      return actual === expected;
    case "neq":
      return actual !== expected;
    case "lt":
      return (actual as number) < (expected as number);
    case "lte":
      return (actual as number) <= (expected as number);
    case "gt":
      return (actual as number) > (expected as number);
    case "gte":
      return (actual as number) >= (expected as number);
    case "in":
      return Array.isArray(expected) && expected.includes(actual);
    case "notIn":
      return Array.isArray(expected) && !expected.includes(actual);
    case "between": {
      const [lo, hi] = expected as [number, number];
      return (actual as number) >= lo && (actual as number) <= hi;
    }
    case "exists":
      return true; // reaching here means actual is not nil
  }
}

export function evalLeaf(leaf: Leaf, ctx: Ctx): CriterionOutcome {
  const actual = resolveField(leaf.field, ctx);
  let result: CriterionResult;
  if (isNil(actual)) {
    // `exists` on a missing value is a definite FAIL only if we explicitly know it's absent; we treat as UNKNOWN.
    result = "UNKNOWN";
  } else {
    result = applyOp(leaf.op, actual, leaf.value) ? "PASS" : "FAIL";
  }
  return {
    id: leaf.id,
    label: leaf.label,
    result,
    field: leaf.field,
    actual: isNil(actual) ? null : actual,
    expected: leaf.value ?? null,
    op: leaf.op,
    note: leaf.note,
  };
}

/* ------------------------------------------------------------ tree walking */

interface Walk {
  result: CriterionResult;
  leaves: CriterionOutcome[];
  questions: string[];
}

const isAll = (n: Node): n is { all: Node[] } => "all" in n;
const isAny = (n: Node): n is { any: Node[] } => "any" in n;

function walk(node: Node, ctx: Ctx): Walk {
  if (isAll(node) || isAny(node)) {
    const children = (isAll(node) ? node.all : node.any).map((c) => walk(c, ctx));
    const leaves = children.flatMap((c) => c.leaves);
    const questions = children.flatMap((c) => c.questions);
    const rs = children.map((c) => c.result);
    let result: CriterionResult;
    if (isAll(node)) {
      result = rs.includes("FAIL") ? "FAIL" : rs.includes("UNKNOWN") ? "UNKNOWN" : "PASS";
    } else {
      result = rs.includes("PASS") ? "PASS" : rs.includes("UNKNOWN") ? "UNKNOWN" : "FAIL";
    }
    return { result, leaves, questions };
  }
  const out = evalLeaf(node, ctx);
  return {
    result: out.result,
    leaves: [out],
    questions: out.result === "UNKNOWN" && node.askQuestionId ? [node.askQuestionId] : [],
  };
}

/* ---------------------------------------------------------------- evaluate */

export function evaluate(
  scheme: Scheme,
  member: Member,
  household: Household,
  asOfDate: string,
  householdSize = 1,
): Evaluation {
  const ctx: Ctx = { member, household, householdSize, asOfDate };
  const main = walk({ all: scheme.eligibility.all }, ctx);

  // Exclusions: a PASS on an exclusion criterion means the person is excluded.
  const exclOutcomes = scheme.eligibility.exclusions.map((l) => ({ leaf: l, out: evalLeaf(l, ctx) }));
  const failedExclusions = exclOutcomes.filter((e) => e.out.result === "PASS").map((e) => e.out);
  const exclUnknownQs = exclOutcomes
    .filter((e) => e.out.result === "UNKNOWN" && e.leaf.askQuestionId)
    .map((e) => e.leaf.askQuestionId as string);

  const unknownCount = main.leaves.filter((l) => l.result === "UNKNOWN").length;
  let status: Evaluation["status"];
  if (main.result === "FAIL" || failedExclusions.length > 0) status = "NOT_ELIGIBLE";
  else if (main.result === "UNKNOWN" || exclUnknownQs.length > 0 || exclOutcomes.some((e) => e.out.result === "UNKNOWN"))
    status = "LIKELY_ELIGIBLE";
  else status = "ELIGIBLE";
  void unknownCount;

  const missingQuestions =
    status === "LIKELY_ELIGIBLE" ? Array.from(new Set([...main.questions, ...exclUnknownQs])) : [];

  const evaluation: Evaluation = {
    schemeId: scheme.id,
    memberId: member.id,
    status,
    criteria: main.leaves,
    failedExclusions,
    missingQuestions,
    estimatedAnnualValueINR: status === "NOT_ELIGIBLE" ? 0 : scheme.benefit.estimatedAnnualINR,
  };

  // Future eligibility: the ONLY failures are minimum-age thresholds the member will cross.
  if (status === "NOT_ELIGIBLE" && failedExclusions.length === 0) {
    const fails = main.leaves.filter((l) => l.result === "FAIL");
    const ageOnly =
      fails.length > 0 &&
      scheme.eligibility.all.length > 0 &&
      fails.every((f) => {
        const leaf = findLeaf(scheme, f.id);
        return leaf?.field === "member.age" && (leaf.op === "gte" || leaf.op === "gt");
      });
    if (ageOnly && member.dob) {
      const years = Math.max(
        ...fails.map((f) => {
          const leaf = findLeaf(scheme, f.id) as Leaf;
          return (leaf.value as number) + (leaf.op === "gt" ? 1 : 0);
        }),
      );
      evaluation.futureEligibility = {
        date: dateWhenAge(member.dob, years),
        reason: `Age reaches ${years}`,
      };
    }
  }
  return evaluation;
}

function findLeaf(scheme: Scheme, id: string): Leaf | undefined {
  const stack: Node[] = [...scheme.eligibility.all];
  while (stack.length) {
    const n = stack.pop() as Node;
    if (isAll(n)) stack.push(...n.all);
    else if (isAny(n)) stack.push(...n.any);
    else if (n.id === id) return n;
  }
  return undefined;
}

/** The member a household-level scheme is evaluated against: SELF, else oldest adult. */
export function headOf(members: Member[], asOfDate: string): Member | undefined {
  return (
    members.find((m) => m.relation === "SELF") ??
    [...members].sort((a, b) => ageOn(b.dob, asOfDate) - ageOn(a.dob, asOfDate))[0]
  );
}

export function evaluateHousehold(
  household: Household,
  members: Member[],
  schemes: Scheme[],
  asOfDate: string,
): FamilyBenefitMap {
  const entries: Evaluation[] = [];
  const head = headOf(members, asOfDate);
  for (const scheme of schemes) {
    if (scheme.target === "HOUSEHOLD") {
      // Counted once per household, attributed to the head, so totals are not inflated.
      if (head) entries.push(evaluate(scheme, head, household, asOfDate, members.length));
    } else {
      for (const m of members) entries.push(evaluate(scheme, m, household, asOfDate, members.length));
    }
  }
  const sum = (pred: (e: Evaluation) => boolean) =>
    entries.filter(pred).reduce((s, e) => s + e.estimatedAnnualValueINR, 0);
  return {
    asOfDate,
    entries,
    totalEligibleINR: sum((e) => e.status === "ELIGIBLE"),
    totalPotentialINR: sum((e) => e.status !== "NOT_ELIGIBLE"),
  };
}
