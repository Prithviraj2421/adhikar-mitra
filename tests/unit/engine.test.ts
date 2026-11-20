import { describe, expect, it } from "vitest";
import { ageOn, applyOp, dateWhenAge, evaluate, evaluateHousehold } from "@/lib/eligibility/engine";
import type { Household, Member, Scheme } from "@/lib/eligibility/types";

const l = (s: string) => ({ en: s, hi: s, mr: s });
const leaf = (id: string, field: string, op: any, value?: unknown, q?: string) => ({
  id, field, op, value, label: l(id), askQuestionId: q,
});
function scheme(all: any[], exclusions: any[] = [], extra: Partial<Scheme> = {}): Scheme {
  return {
    id: "s", name: l("s"), summary: l("s"), level: "CENTRAL", department: "d", category: "PENSION",
    target: "MEMBER",
    benefit: { type: "CASH_RECURRING", estimatedAnnualINR: 1000, description: l("b") },
    eligibility: { all, exclusions }, requiredDocuments: [],
    application: { modes: [], steps: [], deadline: null },
    sourceUrls: ["https://example.gov.in"], verified: false, lastVerified: null, ...extra,
  } as Scheme;
}
const hh: Household = { id: "h", annualIncomeINR: 40000, areaType: "URBAN" };
const m = (o: Partial<Member> = {}): Member => ({ id: "m", name: "A", dob: "1980-06-15", gender: "F", ...o });

describe("operators", () => {
  it.each([
    ["eq", 1, 1, true], ["eq", 1, 2, false], ["neq", 1, 2, true], ["lt", 1, 2, true], ["lt", 2, 2, false],
    ["lte", 2, 2, true], ["gt", 3, 2, true], ["gt", 2, 2, false], ["gte", 2, 2, true],
    ["in", "a", ["a", "b"], true], ["in", "c", ["a", "b"], false], ["notIn", "c", ["a", "b"], true],
    ["notIn", "a", ["a"], false], ["between", 5, [1, 5], true], ["between", 6, [1, 5], false], ["exists", 0, undefined, true],
  ] as const)("%s(%s,%s)=%s", (op, a, e, r) => expect(applyOp(op as any, a, e)).toBe(r));
});

describe("dates", () => {
  it("age on birthday boundary", () => {
    expect(ageOn("1966-03-14", "2026-03-13")).toBe(59);
    expect(ageOn("1966-03-14", "2026-03-14")).toBe(60);
  });
  it("leap-day births", () => expect(dateWhenAge("2000-02-29", 21)).toBe("2021-03-01"));
});

describe("evaluate", () => {
  it("ELIGIBLE when all pass", () => {
    const r = evaluate(scheme([leaf("f", "member.gender", "eq", "F"), leaf("i", "household.annualIncomeINR", "lte", 50000)]), m(), hh, "2026-01-01");
    expect(r.status).toBe("ELIGIBLE");
    expect(r.estimatedAnnualValueINR).toBe(1000);
    expect(r.criteria.every((c) => c.result === "PASS")).toBe(true);
  });
  it("NOT_ELIGIBLE on any fail and zero value", () => {
    const r = evaluate(scheme([leaf("g", "member.gender", "eq", "M")]), m(), hh, "2026-01-01");
    expect(r.status).toBe("NOT_ELIGIBLE");
    expect(r.estimatedAnnualValueINR).toBe(0);
  });
  it("unknown gives LIKELY with missing questions", () => {
    const r = evaluate(scheme([leaf("w", "member.maritalStatus", "eq", "WIDOWED", "q_marital")]), m(), hh, "2026-01-01");
    expect(r.status).toBe("LIKELY_ELIGIBLE");
    expect(r.missingQuestions).toEqual(["q_marital"]);
  });
  it("FAIL beats UNKNOWN", () => {
    const r = evaluate(scheme([leaf("g", "member.gender", "eq", "M"), leaf("w", "member.maritalStatus", "eq", "WIDOWED", "q")]), m(), hh, "2026-01-01");
    expect(r.status).toBe("NOT_ELIGIBLE");
  });
  it("any-group: one pass is enough; unknown otherwise", () => {
    const grp = { any: [leaf("a", "household.areaType", "eq", "RURAL"), leaf("b", "household.areaType", "eq", "URBAN")] };
    expect(evaluate(scheme([grp]), m(), hh, "2026-01-01").status).toBe("ELIGIBLE");
    const unk = { any: [leaf("a", "household.areaType", "eq", "RURAL"), leaf("c", "member.maritalStatus", "eq", "WIDOWED", "q")] };
    expect(evaluate(scheme([unk]), m(), hh, "2026-01-01").status).toBe("LIKELY_ELIGIBLE");
    const none = { any: [leaf("a", "household.areaType", "eq", "RURAL")] };
    expect(evaluate(scheme([none]), m(), hh, "2026-01-01").status).toBe("NOT_ELIGIBLE");
  });
  it("nested all/any", () => {
    const nested = { all: [{ any: [leaf("a", "member.age", "gte", 60), leaf("b", "member.gender", "eq", "F")] }, leaf("c", "household.annualIncomeINR", "lt", 50000)] };
    expect(evaluate(scheme([nested]), m(), hh, "2026-01-01").status).toBe("ELIGIBLE");
  });
  it("exclusion pass => not eligible; unknown => likely", () => {
    const s = scheme([leaf("f", "member.gender", "eq", "F")], [leaf("tax", "member.isIncomeTaxPayer", "eq", true, "q_tax")]);
    expect(evaluate(s, m({ isIncomeTaxPayer: true }), hh, "2026-01-01").failedExclusions).toHaveLength(1);
    expect(evaluate(s, m({ isIncomeTaxPayer: true }), hh, "2026-01-01").status).toBe("NOT_ELIGIBLE");
    expect(evaluate(s, m({ isIncomeTaxPayer: false }), hh, "2026-01-01").status).toBe("ELIGIBLE");
    const u = evaluate(s, m(), hh, "2026-01-01");
    expect(u.status).toBe("LIKELY_ELIGIBLE");
    expect(u.missingQuestions).toContain("q_tax");
  });
  it("derived fields", () => {
    const s = scheme([leaf("c", "member.isChild", "eq", true), leaf("z", "household.size", "gte", 4)]);
    expect(evaluate(s, m({ dob: "2020-01-01" }), hh, "2026-01-01", 4).status).toBe("ELIGIBLE");
    const sr = scheme([leaf("s", "member.isSeniorCitizen", "eq", true)]);
    expect(evaluate(sr, m({ dob: "1966-03-14" }), hh, "2026-03-13").status).toBe("NOT_ELIGIBLE");
    expect(evaluate(sr, m({ dob: "1966-03-14" }), hh, "2026-03-14").status).toBe("ELIGIBLE");
  });
  it("future eligibility when only age fails", () => {
    const s = scheme([leaf("a", "member.age", "gte", 60), leaf("f", "member.gender", "eq", "F")]);
    const r = evaluate(s, m({ dob: "1968-03-14" }), hh, "2026-01-01");
    expect(r.status).toBe("NOT_ELIGIBLE");
    expect(r.futureEligibility?.date).toBe("2028-03-14");
  });
  it("no future eligibility if another criterion fails or age is a maximum", () => {
    const s = scheme([leaf("a", "member.age", "gte", 60), leaf("g", "member.gender", "eq", "M")]);
    expect(evaluate(s, m({ dob: "1968-03-14" }), hh, "2026-01-01").futureEligibility).toBeUndefined();
    const mx = scheme([leaf("a", "member.age", "lte", 40)]);
    expect(evaluate(mx, m({ dob: "1968-03-14" }), hh, "2026-01-01").futureEligibility).toBeUndefined();
  });
});

describe("evaluateHousehold", () => {
  it("sums eligible only and counts household schemes once", () => {
    const a = scheme([leaf("f", "member.gender", "eq", "F")], [], { id: "a" });
    const b = scheme([leaf("i", "household.annualIncomeINR", "lte", 50000)], [], { id: "b", target: "HOUSEHOLD" });
    const members = [m({ id: "1", relation: "SELF" }), m({ id: "2", gender: "M" }), m({ id: "3", gender: "F" })];
    const map = evaluateHousehold(hh, members, [a, b], "2026-01-01");
    expect(map.entries).toHaveLength(4);
    expect(map.totalEligibleINR).toBe(3000);
    expect(map.totalPotentialINR).toBe(3000);
  });
});
