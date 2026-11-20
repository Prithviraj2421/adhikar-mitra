/** Synthetic demo personas. All names, numbers and documents are fictional. */
import type { Household, Member } from "@/lib/eligibility/types";
import type { HeldDocument } from "@/lib/doc-graph/types";

export interface Persona {
  id: string;
  title: string;
  household: Household & { wardId?: string; villageOrWard: string };
  members: Member[];
  heldDocuments: HeldDocument[];
}

const doc = (
  id: string,
  documentTypeId: string,
  memberId: string | null,
  extra: Partial<HeldDocument> = {},
): HeldDocument => ({ id, documentTypeId, memberId, status: "held", ...extra });

export const SHANTABAI: Persona = {
  id: "shantabai",
  title: "Shantabai Kamble household · Ward 4, Nagpur (urban)",
  household: {
    id: "hh-kamble", district: "Nagpur", areaType: "URBAN", wardId: "ward-4", villageOrWard: "Ward 4",
    rationCardType: "BPL", annualIncomeINR: 48000, landHoldingAcres: 0, houseType: "KUTCHA",
    hasLpgConnection: false, yearsResidentInMaharashtra: 40,
  },
  members: [
    { id: "shanta", name: "Shantabai Kamble", dob: "1968-03-14", gender: "F", relation: "SELF", maritalStatus: "WIDOWED",
      occupation: "domestic-worker", educationClass: 0, casteCategory: "SC", hasBankAccount: true, bankAadhaarSeeded: false,
      isIncomeTaxPayer: false, isPregnantOrLactating: false },
    { id: "sunil", name: "Sunil Kamble", dob: "1995-08-02", gender: "M", relation: "SON", maritalStatus: "MARRIED",
      occupation: "construction", educationClass: 0, casteCategory: "SC", hasBankAccount: true, bankAadhaarSeeded: true, isIncomeTaxPayer: false },
    { id: "pooja", name: "Pooja Kamble", dob: "1999-05-21", gender: "F", relation: "DAUGHTER_IN_LAW", maritalStatus: "MARRIED",
      occupation: "homemaker", educationClass: 0, casteCategory: "SC", hasBankAccount: true, bankAadhaarSeeded: true,
      isIncomeTaxPayer: false, isPregnantOrLactating: true },
    { id: "aarav", name: "Aarav Kamble", dob: "2022-09-10", gender: "M", relation: "GRANDSON", maritalStatus: "SINGLE",
      occupation: "student", educationClass: 0, casteCategory: "SC", isIncomeTaxPayer: false },
  ],
  heldDocuments: [
    doc("d1", "aadhaar", "shanta", { nameOnDocument: "Shantabai Ramesh Kamble", dobOnDocument: "1968-03-14", genderOnDocument: "F", aadhaarLast4: "4821" }),
    doc("d2", "bank-passbook", "shanta", { nameOnDocument: "Shanta R. Kambale", dobOnDocument: "1968-03-14", genderOnDocument: "F" }),
    doc("d3", "ration-card", null, { nameOnDocument: "Shantabai Kamble" }),
    doc("d4", "aadhaar", "sunil", { nameOnDocument: "Sunil Ramesh Kamble", dobOnDocument: "1995-08-02", genderOnDocument: "M", aadhaarLast4: "1175" }),
    doc("d5", "bank-passbook", "sunil", { nameOnDocument: "Sunil R Kamble" }),
    doc("d6", "bank-account-aadhaar-seeded", "sunil"),
    doc("d7", "aadhaar", "pooja", { nameOnDocument: "Pooja Sunil Kamble", dobOnDocument: "1999-05-21", genderOnDocument: "F", aadhaarLast4: "3390" }),
    doc("d8", "bank-passbook", "pooja"),
    doc("d9", "bank-account-aadhaar-seeded", "pooja"),
    doc("d10", "mch-card", "pooja", { issuedOn: "2026-08-01" }),
    doc("d11", "aadhaar", "aarav", { aadhaarLast4: "5502" }),
  ],
};

export const RAMESH: Persona = {
  id: "ramesh",
  title: "Ramesh Wankhede household · Village, Nagpur district (rural)",
  household: {
    id: "hh-wankhede", district: "Nagpur", areaType: "RURAL", villageOrWard: "Village (sample)",
    rationCardType: "PHH", annualIncomeINR: 90000, landHoldingAcres: 1.8, houseType: "PUCCA",
    hasLpgConnection: true, yearsResidentInMaharashtra: 42,
  },
  members: [
    { id: "ramesh", name: "Ramesh Wankhede", dob: "1984-05-10", gender: "M", relation: "SELF", maritalStatus: "MARRIED",
      occupation: "farmer", educationClass: 0, casteCategory: "OBC", hasBankAccount: true, bankAadhaarSeeded: true, isIncomeTaxPayer: false },
    { id: "sunita", name: "Sunita Wankhede", dob: "1988-02-17", gender: "F", relation: "SPOUSE", maritalStatus: "MARRIED",
      occupation: "homemaker", educationClass: 0, casteCategory: "OBC", hasBankAccount: true, bankAadhaarSeeded: true,
      isIncomeTaxPayer: false, isPregnantOrLactating: false },
    { id: "priya", name: "Priya Wankhede", dob: "2010-07-09", gender: "F", relation: "DAUGHTER", maritalStatus: "SINGLE",
      occupation: "student", educationClass: 11, casteCategory: "OBC", hasBankAccount: true, bankAadhaarSeeded: true, isIncomeTaxPayer: false },
    { id: "rohan", name: "Rohan Wankhede", dob: "2014-01-25", gender: "M", relation: "SON", maritalStatus: "SINGLE",
      occupation: "student", educationClass: 7, casteCategory: "OBC", isIncomeTaxPayer: false },
  ],
  heldDocuments: [
    doc("r1", "aadhaar", "ramesh", { nameOnDocument: "Ramesh Wankhede", dobOnDocument: "1984-05-10", genderOnDocument: "M", aadhaarLast4: "7710" }),
    doc("r2", "land-7-12", null, { nameOnDocument: "Ramesh Vankhede", issuedOn: "2026-06-01", expiresOn: "2027-06-01" }),
    doc("r3", "bank-passbook", "ramesh", { nameOnDocument: "Ramesh Wankhede" }),
    doc("r4", "bank-account-aadhaar-seeded", "ramesh"),
    doc("r5", "ration-card", null, { nameOnDocument: "Ramesh Wankhede" }),
    doc("r6", "aadhaar", "sunita", { nameOnDocument: "Sunita Ramesh Wankhede", dobOnDocument: "1988-02-17", genderOnDocument: "F", aadhaarLast4: "2204" }),
    doc("r7", "bank-passbook", "sunita"),
    doc("r8", "bank-account-aadhaar-seeded", "sunita"),
    doc("r9", "aadhaar", "priya", { nameOnDocument: "Priya Ramesh Wankhede", dobOnDocument: "2010-07-09", genderOnDocument: "F", aadhaarLast4: "6638" }),
    doc("r10", "school-bonafide", "priya", { issuedOn: "2026-07-01", expiresOn: "2027-07-01" }),
    doc("r11", "bank-passbook", "priya"),
    doc("r12", "bank-account-aadhaar-seeded", "priya"),
    doc("r13", "aadhaar", "rohan", { aadhaarLast4: "9051" }),
  ],
};

export const PERSONAS: Persona[] = [SHANTABAI, RAMESH];
