import { NextResponse } from "next/server";
import { z } from "zod";
import { HouseholdSchema, MemberSchema } from "@/lib/api-schemas";
import { runDailyChecks } from "@/lib/notifications";

const Body = z.object({
  asOf: z.string(),
  locale: z.enum(["en", "hi", "mr"]),
  householdId: z.string(),
  household: HouseholdSchema.optional(),
  members: z.array(MemberSchema),
  heldDocuments: z.array(z.object({
    id: z.string(), documentTypeId: z.string(), memberId: z.string().nullable(), expiresOn: z.string().nullish(),
  }).passthrough()),
  applications: z.array(z.object({
    id: z.string(), schemeId: z.string(), memberId: z.string(), status: z.string(), updatedOn: z.string(),
    deadline: z.string().optional(), nextAction: z.string().optional(),
  }).passthrough()),
  missingDocsByApp: z.record(z.string(), z.array(z.string())).optional(),
  existingKeys: z.array(z.string()).default([]),
});

/**
 * Daily checks as an HTTP endpoint (a scheduler can POST household snapshots here).
 * It is stateless: it returns the notifications to send. The default provider only records them for the SMS simulator.
 */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid input" }, { status: 400 });
  const b = parsed.data;
  const notifications = runDailyChecks({
    asOf: b.asOf, locale: b.locale, householdId: b.householdId, members: b.members as never,
    heldDocuments: b.heldDocuments as never, applications: b.applications as never,
    missingDocsByApp: b.missingDocsByApp, existingKeys: new Set(b.existingKeys),
  });
  return NextResponse.json({ notifications });
}

export async function GET() {
  return NextResponse.json({ info: "POST a household snapshot to run the daily checks. See docs/ARCHITECTURE.md." });
}
