import { NextResponse } from "next/server";
import { z } from "zod";
import { docById } from "@/lib/data";
import { prisma } from "@/server/db";

const Body = z.object({
  wardId: z.string().min(1).max(40),
  title: z.string().min(1).max(120),
  focusDocumentTypeId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  location: z.string().min(1).max(160),
});

/** Persists a camp announcement (CampEvent). SMS to affected families is created by the admin screen/daily job. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !docById(parsed.data.focusDocumentTypeId)) return NextResponse.json({ error: "invalid input" }, { status: 400 });
  try {
    const camp = await prisma.campEvent.create({ data: parsed.data });
    await prisma.auditLog.create({ data: { action: "camp.create", entity: "CampEvent", entityId: camp.id } });
    return NextResponse.json({ id: camp.id });
  } catch (e) {
    console.error("camp save failed", e);
    return NextResponse.json({ error: "server unavailable" }, { status: 503 });
  }
}

export async function GET() {
  try {
    return NextResponse.json({ camps: await prisma.campEvent.findMany({ orderBy: { date: "asc" }, take: 50 }) });
  } catch {
    return NextResponse.json({ camps: [] });
  }
}
