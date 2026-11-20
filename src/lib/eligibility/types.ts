import { z } from "zod";

export const L10n = z.object({ en: z.string(), hi: z.string(), mr: z.string() });
export type L10n = z.infer<typeof L10n>;

export const OPS = ["eq", "neq", "lt", "lte", "gt", "gte", "in", "notIn", "between", "exists"] as const;
export type Op = (typeof OPS)[number];

/** A single testable criterion (leaf). */
export const Leaf = z.object({
  id: z.string(),
  field: z.string(), // e.g. "member.gender", "household.annualIncomeINR"
  op: z.enum(OPS),
  value: z.unknown().optional(),
  label: L10n,
  askQuestionId: z.string().optional(),
  note: z.string().optional(), // "VERIFY" marks an uncertain value
});
export type Leaf = z.infer<typeof Leaf>;

export type Node = Leaf | { all: Node[] } | { any: Node[] };
export const NodeSchema: z.ZodType<Node> = z.lazy(() =>
  z.union([z.object({ all: z.array(NodeSchema) }), z.object({ any: z.array(NodeSchema) }), Leaf]),
) as z.ZodType<Node>;

export const SchemeSchema = z.object({
  id: z.string(),
  name: L10n,
  summary: L10n,
  level: z.enum(["CENTRAL", "STATE"]),
  state: z.string().optional(),
  department: z.string(),
  category: z.enum(["PENSION", "HEALTH", "HOUSING", "FARMER", "WOMEN", "STUDENT", "WORKER", "INSURANCE", "ENERGY"]),
  target: z.enum(["MEMBER", "HOUSEHOLD"]),
  benefit: z.object({
    type: z.enum(["CASH_RECURRING", "CASH_ONE_TIME", "INSURANCE", "IN_KIND", "REGISTRATION"]),
    estimatedAnnualINR: z.number().nonnegative(),
    description: L10n,
  }),
  eligibility: z.object({ all: z.array(NodeSchema), exclusions: z.array(Leaf).default([]) }),
  requiredDocuments: z.array(z.string()),
  application: z.object({
    modes: z.array(
      z.union([
        z.object({ type: z.literal("ONLINE"), url: z.string().url() }),
        z.object({ type: z.literal("OFFLINE"), officeTypes: z.array(z.string()) }),
      ]),
    ),
    steps: z.array(L10n),
    deadline: z.string().nullable(),
  }),
  sourceUrls: z.array(z.string().url()).min(1),
  verified: z.boolean(),
  lastVerified: z.string().nullable(),
});
export type Scheme = z.infer<typeof SchemeSchema>;

export type Gender = "M" | "F" | "O";
export interface Member {
  id: string;
  name: string;
  dob: string; // ISO yyyy-mm-dd
  gender?: Gender | null;
  relation?: string;
  maritalStatus?: "SINGLE" | "MARRIED" | "WIDOWED" | "DIVORCED" | null;
  isPregnantOrLactating?: boolean | null;
  occupation?: string | null;
  educationClass?: number | null;
  casteCategory?: string | null;
  disabilityPercent?: number | null;
  hasBankAccount?: boolean | null;
  bankAadhaarSeeded?: boolean | null;
  isIncomeTaxPayer?: boolean | null;
}
export interface Household {
  id: string;
  district?: string | null;
  areaType?: "URBAN" | "RURAL" | null;
  rationCardType?: string | null;
  annualIncomeINR?: number | null;
  landHoldingAcres?: number | null;
  houseType?: "KUTCHA" | "PUCCA" | "NONE" | null;
  hasLpgConnection?: boolean | null;
  yearsResidentInMaharashtra?: number | null;
}

export type CriterionResult = "PASS" | "FAIL" | "UNKNOWN";
export interface CriterionOutcome {
  id: string;
  label: L10n;
  result: CriterionResult;
  field: string;
  actual: unknown;
  expected: unknown;
  op: Op;
  note?: string;
}
export type EligibilityStatus = "ELIGIBLE" | "LIKELY_ELIGIBLE" | "NOT_ELIGIBLE";

export interface Evaluation {
  schemeId: string;
  memberId: string;
  status: EligibilityStatus;
  criteria: CriterionOutcome[];
  failedExclusions: CriterionOutcome[];
  missingQuestions: string[];
  estimatedAnnualValueINR: number;
  futureEligibility?: { date: string; reason: string };
}

export interface FamilyBenefitMap {
  asOfDate: string;
  entries: Evaluation[];
  /** Sum over ELIGIBLE entries only (definite). */
  totalEligibleINR: number;
  /** ELIGIBLE + LIKELY_ELIGIBLE (potential). */
  totalPotentialINR: number;
}
