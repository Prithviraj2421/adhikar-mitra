import { NextResponse } from "next/server";
import { z } from "zod";
import { HouseholdSchema, MemberSchema } from "@/lib/api-schemas";
import { applySync } from "@/lib/offline/sync";
import { prismaSyncRepo } from "@/server/db";

const Body = z.object({
  idempotencyKey: z.string().min(8).max(100),
  sahayakId: z.string().min(1).max(40),
  household: HouseholdSchema,
  members: z.array(MemberSchema).max(30),
  consentMethod: z.enum(["self", "verbal-via-sahayak"]),
  consentAt: z.string(),
});

/** Idempotent: the same idempotencyKey always yields the same household (status "created" once, then "duplicate"). */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  try {
    const out = await applySync(prismaSyncRepo, parsed.data as never);
    return NextResponse.json(out);
  } catch (e) {
    console.error("sync failed", e);
    return NextResponse.json({ error: "server unavailable, retry later" }, { status: 503 });
  }
}
