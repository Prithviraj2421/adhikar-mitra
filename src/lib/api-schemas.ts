import { z } from "zod";

const opt = <T extends z.ZodTypeAny>(s: T) => s.nullish();

export const HouseholdSchema = z.object({
  id: z.string(),
  district: opt(z.string()),
  wardId: z.string().nullish(),
  villageOrWard: z.string().nullish(),
  areaType: opt(z.enum(["URBAN", "RURAL"])),
  rationCardType: opt(z.string()),
  annualIncomeINR: opt(z.number()),
  landHoldingAcres: opt(z.number()),
  houseType: opt(z.enum(["KUTCHA", "PUCCA", "NONE"])),
  hasLpgConnection: opt(z.boolean()),
  yearsResidentInMaharashtra: opt(z.number()),
});

export const MemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  dob: z.string(),
  gender: opt(z.enum(["M", "F", "O"])),
  relation: z.string().optional(),
  maritalStatus: opt(z.enum(["SINGLE", "MARRIED", "WIDOWED", "DIVORCED"])),
  isPregnantOrLactating: opt(z.boolean()),
  occupation: opt(z.string()),
  educationClass: opt(z.number()),
  casteCategory: opt(z.string()),
  disabilityPercent: opt(z.number()),
  hasBankAccount: opt(z.boolean()),
  bankAadhaarSeeded: opt(z.boolean()),
  isIncomeTaxPayer: opt(z.boolean()),
});
