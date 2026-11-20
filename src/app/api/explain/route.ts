import { NextResponse } from "next/server";
import { z } from "zod";
import { schemeById } from "@/lib/data";
import { evaluate } from "@/lib/eligibility/engine";
import { HouseholdSchema, MemberSchema } from "@/lib/api-schemas";
import { rephraseWithLlm, templateExplanation } from "@/lib/llm/explain";

const Body = z.object({
  schemeId: z.string(),
  locale: z.enum(["en", "hi", "mr"]),
  asOfDate: z.string(),
  household: HouseholdSchema,
  member: MemberSchema,
  householdSize: z.number().int().positive().default(1),
});

/**
 * The server re-runs the deterministic engine itself, so the client cannot influence the verdict.
 * The LLM (if configured) only rephrases the template text.
 */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid input" }, { status: 400 });
  const b = parsed.data;
  const scheme = schemeById(b.schemeId);
  if (!scheme) return NextResponse.json({ error: "unknown scheme" }, { status: 404 });
  const ev = evaluate(scheme, b.member, b.household, b.asOfDate, b.householdSize);
  const template = templateExplanation(scheme, ev, b.locale, b.member.name.split(" ")[0]);
  const rephrased = await rephraseWithLlm(template, b.locale);
  return NextResponse.json({ text: rephrased ?? template, ai: rephrased !== null, status: ev.status });
}
