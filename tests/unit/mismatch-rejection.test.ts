import { describe, expect, it } from "vitest";
import { compareDocuments, compareNames, findingsForMember, jaroWinkler, normalizeName } from "@/lib/mismatch";
import { decodeRejection } from "@/lib/rejection";
import { RAMESH, SHANTABAI } from "@/lib/demo/personas";

describe("jaro-winkler", () => {
  it("basics", () => {
    expect(jaroWinkler("kamble", "kamble")).toBe(1);
    expect(jaroWinkler("kamble", "kambale")).toBeGreaterThan(0.9);
    expect(jaroWinkler("kamble", "wankhede")).toBeLessThan(0.6);
  });
});

describe("name normalisation and comparison", () => {
  it("strips honorifics and punctuation", () => {
    expect(normalizeName("Smt. Shanta R. Kamble")).toEqual(["shanta", "r", "kamble"]);
  });
  it("transliterates Devanagari", () => {
    expect(compareNames("रमेश वानखेडे", "Ramesh Vankhede").level).not.toBe("MISMATCH");
  });
  it("order-insensitive", () => expect(compareNames("Kamble Shanta", "Shanta Kamble").level).toBe("MATCH"));
  it("flags minor variation and real mismatch", () => {
    expect(compareNames("Shantabai Ramesh Kamble", "Shanta R. Kambale").level).toBe("MINOR");
    expect(compareNames("Ramesh Wankhede", "Ramesh Vankhede").level).toBe("MINOR");
    expect(compareNames("Sunil Kamble", "Anita Deshmukh").level).toBe("MISMATCH");
  });
});

describe("document comparison", () => {
  it("flags Shantabai's Aadhaar vs passbook", () => {
    const f = findingsForMember(SHANTABAI.heldDocuments, "shanta");
    expect(f.some((x) => x.field === "name" && x.level === "MINOR")).toBe(true);
  });
  it("flags Ramesh's 7/12 spelling only when compared with his Aadhaar", () => {
    const docs = RAMESH.heldDocuments.filter((d) => d.documentTypeId === "aadhaar" && d.memberId === "ramesh" || d.documentTypeId === "land-7-12");
    expect(compareDocuments(docs).some((x) => x.field === "name")).toBe(true);
  });
  it("detects day/month swap and gender mismatch", () => {
    const f = compareDocuments([
      { id: "1", documentTypeId: "aadhaar", memberId: "m", dobOnDocument: "1980-03-04", genderOnDocument: "F" },
      { id: "2", documentTypeId: "bank-passbook", memberId: "m", dobOnDocument: "1980-04-03", genderOnDocument: "M" },
    ]);
    expect(f.find((x) => x.field === "dob")?.hint).toBe("DAY_MONTH_SWAPPED");
    expect(f.some((x) => x.field === "gender")).toBe(true);
  });
});

describe("rejection decoder", () => {
  const id = (t: string) => decodeRejection(t)?.reason.id;
  it("matches English notices", () => {
    expect(id("Application REJECTED. Reason: Aadhaar is not seeded with bank account.")).toBe("aadhaar-not-seeded");
    expect(id("Rejected: name does not match with Aadhaar")).toBe("name-mismatch");
    expect(id("Income certificate expired, please upload latest")).toBe("income-cert-expired");
  });
  it("matches Hindi and Marathi", () => {
    expect(id("आवेदन अस्वीकृत: आधार बैंक खाते से जुड़ा नहीं है")).toBe("aadhaar-not-seeded");
    expect(id("अर्ज नाकारला: उत्पन्न मर्यादेपेक्षा जास्त आहे")).toBe("income-above-limit");
  });
  it("returns null when nothing matches", () => {
    expect(decodeRejection("Thank you for your visit")).toBeNull();
  });
});

describe("household documents are compared with the head", () => {
  it("flags Ramesh's 7/12 spelling (Vankhede) against his Aadhaar (Wankhede)", () => {
    const f = findingsForMember(RAMESH.heldDocuments, "ramesh", true);
    expect(f.some((x) => x.field === "name" && x.a.value.includes("Wankhede") !== x.b.value.includes("Wankhede"))).toBe(true);
    // Not for other members: only the head is compared with household documents.
    expect(findingsForMember(RAMESH.heldDocuments, "sunita", false)).toEqual([]);
  });
});
