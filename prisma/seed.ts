/**
 * Seeds the local database with SYNTHETIC data only:
 *  - the two demo personas (Shantabai, Ramesh),
 *  - ~200 generated households across 10 fictional wards (the admin map data),
 *  - a demo Sahayak user assigned to 15 of those households, and a demo admin.
 * Run: npm run seed
 */
import { PrismaClient } from "@prisma/client";
import { generateHouseholds } from "../src/lib/admin/synth";
import { PERSONAS } from "../src/lib/demo/personas";
import type { Household, Member } from "../src/lib/eligibility/types";

const prisma = new PrismaClient();

async function createHousehold(opts: {
  clientId: string; household: Household & { wardId?: string; villageOrWard?: string }; members: Member[]; sahayakId?: string; consentMethod: string;
}) {
  const h = opts.household;
  const consent = await prisma.consent.create({ data: { method: opts.consentMethod } });
  return prisma.household.create({
    data: {
      clientId: opts.clientId, district: h.district ?? "Nagpur", wardId: h.wardId ?? null, village: h.villageOrWard ?? null,
      areaType: h.areaType ?? "URBAN", rationCardType: h.rationCardType ?? null, annualIncomeINR: h.annualIncomeINR ?? null,
      landHoldingAcres: h.landHoldingAcres ?? null, houseType: h.houseType ?? null, hasLpgConnection: h.hasLpgConnection ?? null,
      yearsResidentInMaharashtra: h.yearsResidentInMaharashtra ?? null, sahayakId: opts.sahayakId ?? null, consentId: consent.id,
      members: {
        create: opts.members.map((m) => ({
          name: m.name, dob: m.dob, gender: m.gender ?? null, relation: m.relation ?? null, maritalStatus: m.maritalStatus ?? null,
          isPregnantOrLactating: m.isPregnantOrLactating ?? null, occupation: m.occupation ?? null, educationClass: m.educationClass ?? null,
          casteCategory: m.casteCategory ?? null, disabilityPercent: m.disabilityPercent ?? null, hasBankAccount: m.hasBankAccount ?? null,
          bankAadhaarSeeded: m.bankAadhaarSeeded ?? null, isIncomeTaxPayer: m.isIncomeTaxPayer ?? null,
        })),
      },
    },
  });
}

async function main() {
  // Fresh start so the seed is repeatable.
  await prisma.$transaction([
    prisma.syncRecord.deleteMany(), prisma.notification.deleteMany(), prisma.lifeEvent.deleteMany(), prisma.applicationEvent.deleteMany(),
    prisma.application.deleteMany(), prisma.heldDocument.deleteMany(), prisma.member.deleteMany(), prisma.household.deleteMany(),
    prisma.consent.deleteMany(), prisma.campEvent.deleteMany(), prisma.auditLog.deleteMany(), prisma.user.deleteMany(),
  ]);

  // Fictional phone numbers for demo roles only.
  const sahayak = await prisma.user.create({ data: { phone: "9000000001", role: "SAHAYAK", preferredLocale: "mr" } });
  await prisma.user.create({ data: { phone: "9000000002", role: "ADMIN", preferredLocale: "en" } });
  await prisma.user.create({ data: { phone: "9000000003", role: "CITIZEN", preferredLocale: "mr" } });

  for (const p of PERSONAS) {
    await createHousehold({ clientId: `seed-${p.id}`, household: p.household, members: p.members, consentMethod: "self" });
  }

  const synth = generateHouseholds();
  let n = 0;
  for (const s of synth) {
    await createHousehold({
      clientId: `seed-${s.household.id}`, household: s.household, members: s.members,
      sahayakId: n < 15 ? sahayak.id : undefined, consentMethod: n < 15 ? "verbal-via-sahayak" : "self",
    });
    n++;
  }
  console.log(`Seeded ${PERSONAS.length} personas, ${synth.length} synthetic households, 15 assigned to the demo Sahayak.`);
}

main().finally(() => prisma.$disconnect());
