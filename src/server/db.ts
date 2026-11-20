import { PrismaClient, Prisma } from "@prisma/client";
import { DuplicateKeyError, type SyncPayload, type SyncRepo, type SyncTx } from "@/lib/offline/sync";

const g = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = g.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") g.prisma = prisma;

const toDate = (s?: string) => (s ? new Date(s) : undefined);

/**
 * Prisma-backed sync repository. The household row stores the client's idempotency key (`clientId`, UNIQUE)
 * and a SyncRecord (idempotencyKey UNIQUE) is written in the same transaction, so a retried or
 * concurrent request fails the unique constraint and is reported as a duplicate, never a second household.
 */
export const prismaSyncRepo: SyncRepo = {
  async transaction<T>(fn: (tx: SyncTx) => Promise<T>): Promise<T> {
    try {
      return await prisma.$transaction(async (db) => {
        const tx: SyncTx = {
          async findByKey(key) {
            const h = await db.household.findUnique({ where: { clientId: key }, select: { id: true } });
            return h?.id ?? null;
          },
          async insert(p: SyncPayload, hash: string) {
            const sahayak = await db.user.upsert({
              where: { phone: p.sahayakId }, update: {}, create: { phone: p.sahayakId, role: "SAHAYAK" },
            });
            const consent = await db.consent.create({
              data: { method: p.consentMethod, recordedBy: sahayak.id, at: toDate(p.consentAt) },
            });
            const h = p.household as SyncPayload["household"] & { villageOrWard?: string };
            const created = await db.household.create({
              data: {
                clientId: p.idempotencyKey,
                district: h.district ?? "Nagpur",
                wardId: h.wardId ?? null,
                village: h.villageOrWard ?? null,
                areaType: h.areaType ?? "URBAN",
                rationCardType: h.rationCardType ?? null,
                annualIncomeINR: h.annualIncomeINR ?? null,
                landHoldingAcres: h.landHoldingAcres ?? null,
                houseType: h.houseType ?? null,
                hasLpgConnection: h.hasLpgConnection ?? null,
                yearsResidentInMaharashtra: h.yearsResidentInMaharashtra ?? null,
                sahayakId: sahayak.id,
                consentId: consent.id,
                members: {
                  create: p.members.map((m) => ({
                    name: m.name, dob: m.dob, gender: m.gender ?? null, relation: m.relation ?? null,
                    maritalStatus: m.maritalStatus ?? null, isPregnantOrLactating: m.isPregnantOrLactating ?? null,
                    occupation: m.occupation ?? null, educationClass: m.educationClass ?? null,
                    casteCategory: m.casteCategory ?? null, disabilityPercent: m.disabilityPercent ?? null,
                    hasBankAccount: m.hasBankAccount ?? null, bankAadhaarSeeded: m.bankAadhaarSeeded ?? null,
                    isIncomeTaxPayer: m.isIncomeTaxPayer ?? null,
                  })),
                },
              },
            });
            await db.syncRecord.create({
              data: { idempotencyKey: p.idempotencyKey, sahayakId: sahayak.id, payloadHash: hash },
            });
            return created.id;
          },
        };
        return fn(tx);
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new DuplicateKeyError();
      throw e;
    }
  },
};
