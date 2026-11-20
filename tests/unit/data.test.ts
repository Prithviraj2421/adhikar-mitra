import { describe, expect, it } from "vitest";
import { DOCUMENTS, SCHEMES, assertAcyclic, loadDocuments } from "@/lib/data";
import { evaluateHousehold } from "@/lib/eligibility/engine";
import { RAMESH, SHANTABAI } from "@/lib/demo/personas";

describe("reference data", () => {
  it("loads 18 schemes and 16 docs, all unverified with sources", () => {
    expect(SCHEMES).toHaveLength(18);
    expect(DOCUMENTS).toHaveLength(16);
    for (const s of SCHEMES) {
      expect(s.verified).toBe(false);
      expect(s.lastVerified).toBeNull();
      expect(s.sourceUrls.length).toBeGreaterThan(0);
    }
  });
  it("rejects prerequisite cycles and unknown prerequisites", () => {
    const base = { name: { en: "", hi: "", mr: "" }, scope: "member", issuingOffice: "x", effortDays: 1, costINR: 0, validityMonths: null };
    expect(() => loadDocuments([{ ...base, id: "a", prerequisites: ["b"] }, { ...base, id: "b", prerequisites: ["a"] }])).toThrow(/cycle/);
    expect(() => assertAcyclic([{ ...base, id: "a", prerequisites: ["zzz"] } as never])).toThrow(/Unknown/);
  });
});

type FamilyMap = ReturnType<typeof evaluateHousehold>;
const ids = (map: FamilyMap, member: string, status = "ELIGIBLE") =>
  map.entries.filter((e) => e.memberId === member && e.status === status).map((e) => e.schemeId);

describe("personas", () => {
  const today = "2026-11-20";
  it("Shantabai", () => {
    const map = evaluateHousehold(SHANTABAI.household, SHANTABAI.members, SCHEMES, today);
    expect(ids(map, "shanta")).toEqual(expect.arrayContaining(["sgny", "e-shram"]));
    const nsap = map.entries.find((e) => e.schemeId === "nsap-ignoaps" && e.memberId === "shanta")!;
    expect(nsap.status).toBe("NOT_ELIGIBLE");
    expect(nsap.futureEligibility?.date).toBe("2028-03-14");
    expect(ids(map, "sunil")).toEqual(expect.arrayContaining(["e-shram", "bocw-registration", "pm-sym"]));
    expect(ids(map, "pooja")).toContain("pmmvy");
    const later = evaluateHousehold(SHANTABAI.household, SHANTABAI.members, SCHEMES, "2028-03-14");
    expect(ids(later, "shanta")).toContain("nsap-ignoaps");
  });
  it("Ramesh", () => {
    const map = evaluateHousehold(RAMESH.household, RAMESH.members, SCHEMES, today);
    expect(ids(map, "ramesh")).toEqual(expect.arrayContaining(["pm-kisan", "namo-shetkari"]));
    expect(ids(map, "sunita")).toContain("ladki-bahin");
    expect(ids(map, "priya")).toContain("mahadbt-postmatric");
  });
  it("total equals the sum of eligible estimates", () => {
    const map = evaluateHousehold(SHANTABAI.household, SHANTABAI.members, SCHEMES, today);
    const sum = map.entries.filter((e) => e.status === "ELIGIBLE").reduce((s, e) => s + e.estimatedAnnualValueINR, 0);
    expect(map.totalEligibleINR).toBe(sum);
  });
});

describe("Ramesh's headline cash schemes (deck numbers)", () => {
  it("PM-KISAN + Namo Shetkari + Majhi Ladki Bahin = ₹30,000 per year (estimated)", () => {
    const map = evaluateHousehold(RAMESH.household, RAMESH.members, SCHEMES, "2026-11-20");
    const get = (id: string) => map.entries.find((e) => e.schemeId === id && e.status === "ELIGIBLE")?.estimatedAnnualValueINR ?? 0;
    expect(get("pm-kisan")).toBe(6000);
    expect(get("namo-shetkari")).toBe(6000);
    expect(get("ladki-bahin")).toBe(18000);
    expect(get("pm-kisan") + get("namo-shetkari") + get("ladki-bahin")).toBe(30000);
    // Health cover is eligible too, but it is insurance (not cash).
    expect(map.entries.some((e) => e.schemeId === "pmjay" && e.status === "ELIGIBLE")).toBe(true);
  });
});
