import { describe, expect, it } from "vitest";
import { DOCUMENTS, SCHEMES, type DocumentType } from "@/lib/data";
import { evaluateHousehold } from "@/lib/eligibility/engine";
import { RAMESH, SHANTABAI } from "@/lib/demo/personas";
import { heldKeys, obtainSet, slotKey } from "@/lib/doc-graph/graph";
import { planDocuments } from "@/lib/doc-graph/path";

const today = "2026-11-20";
const plan = (p: typeof RAMESH, asOf = today) =>
  planDocuments(evaluateHousehold(p.household, p.members, SCHEMES, asOf), SCHEMES, DOCUMENTS, p.heldDocuments);

describe("obtainSet", () => {
  const mk = (id: string, prerequisites: string[], scope: "member" | "household" = "member"): DocumentType => ({
    id, name: { en: id, hi: id, mr: id }, scope, issuingOffice: "x", effortDays: 2, costINR: 0, validityMonths: null, prerequisites,
  });
  const chain = [mk("a", []), mk("b", ["a"]), mk("c", ["b"])];
  it("returns the transitive chain prerequisites-first", () => {
    expect(obtainSet(slotKey("c", "m"), chain, new Set())).toEqual(["a|m", "b|m", "c|m"]);
  });
  it("skips prerequisites already held", () => {
    expect(obtainSet(slotKey("c", "m"), chain, new Set(["a|m"]))).toEqual(["b|m", "c|m"]);
  });
  it("household prerequisites are shared across members", () => {
    const d = [mk("h", [], "household"), mk("x", ["h"])];
    expect(obtainSet(slotKey("x", "m1"), d, new Set())).toEqual(["h|-", "x|m1"]);
  });
});

describe("held documents", () => {
  it("expired documents do not count", () => {
    const k = heldKeys([{ id: "1", documentTypeId: "income-certificate", memberId: null, expiresOn: "2026-01-01" }], today);
    expect(k.has("income-certificate|-")).toBe(false);
  });
});

describe("Ramesh", () => {
  it("recommends the income certificate first", () => {
    const p = plan(RAMESH);
    expect(p.top?.documentTypeId).toBe("income-certificate");
    expect(p.top?.memberId).toBeNull();
    const schemesUnlocked = p.top!.fullyUnlocked.map((n) => n.schemeId);
    expect(schemesUnlocked).toEqual(expect.arrayContaining(["ladki-bahin", "mjpjay"]));
    expect(p.top!.partial.map((n) => n.schemeId)).toContain("mahadbt-postmatric");
  });
  it("path eventually makes everything ready", () => {
    const p = plan(RAMESH);
    const docsInPath = p.path.map((s) => s.documentTypeId);
    expect(docsInPath).toContain("caste-certificate");
    expect(docsInPath.indexOf("income-certificate")).toBeLessThan(docsInPath.indexOf("caste-certificate"));
  });
});

describe("Shantabai", () => {
  it("path orders prerequisites before the documents that need them", () => {
    const p = plan(SHANTABAI);
    const idx = (key: string) => p.path.findIndex((s) => s.key === key);
    expect(idx("income-certificate|-")).toBeGreaterThanOrEqual(0);
    expect(idx("bank-account-aadhaar-seeded|shanta")).toBeGreaterThanOrEqual(0);
    expect(idx("spouse-death-certificate|shanta")).toBeGreaterThanOrEqual(0);
    // every path step appears once
    expect(new Set(p.path.map((s) => s.key)).size).toBe(p.path.length);
  });
  it("marking the income certificate as held changes the ranking", () => {
    const withIncome = { ...SHANTABAI, heldDocuments: [...SHANTABAI.heldDocuments, { id: "x", documentTypeId: "income-certificate", memberId: null }] };
    const p = plan(withIncome);
    expect(p.path.map((s) => s.key)).not.toContain("income-certificate|-");
  });
});
