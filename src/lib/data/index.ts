import atal_pension from "@data/schemes/atal-pension.json";
import bocw_registration from "@data/schemes/bocw-registration.json";
import e_shram from "@data/schemes/e-shram.json";
import ladki_bahin from "@data/schemes/ladki-bahin.json";
import mahadbt_postmatric from "@data/schemes/mahadbt-postmatric.json";
import mjpjay from "@data/schemes/mjpjay.json";
import namo_shetkari from "@data/schemes/namo-shetkari.json";
import nsap_ignoaps from "@data/schemes/nsap-ignoaps.json";
import pm_kisan from "@data/schemes/pm-kisan.json";
import pm_sym from "@data/schemes/pm-sym.json";
import pm_ujjwala from "@data/schemes/pm-ujjwala.json";
import pmay_g from "@data/schemes/pmay-g.json";
import pmay_u from "@data/schemes/pmay-u.json";
import pmjay from "@data/schemes/pmjay.json";
import pmjjby from "@data/schemes/pmjjby.json";
import pmmvy from "@data/schemes/pmmvy.json";
import sgny from "@data/schemes/sgny.json";
import shravanbal from "@data/schemes/shravanbal.json";
import documentsRaw from "@data/documents.json";
import { z } from "zod";
import { L10n, SchemeSchema, type Scheme } from "@/lib/eligibility/types";

export const DocumentSchema = z.object({
  id: z.string(),
  name: L10n,
  scope: z.enum(["member", "household"]),
  issuingOffice: z.string(),
  effortDays: z.number().positive(),
  costINR: z.number().nonnegative(),
  validityMonths: z.number().positive().nullable(),
  prerequisites: z.array(z.string()),
  note: z.string().optional(),
});
export type DocumentType = z.infer<typeof DocumentSchema>;

/** Throws if the prerequisite graph has a cycle or references an unknown document. */
export function assertAcyclic(docs: DocumentType[]): void {
  const byId = new Map(docs.map((d) => [d.id, d]));
  const state = new Map<string, 1 | 2>(); // 1 = visiting, 2 = done
  const visit = (id: string, trail: string[]) => {
    const d = byId.get(id);
    if (!d) throw new Error(`Unknown document prerequisite: ${id}`);
    if (state.get(id) === 2) return;
    if (state.get(id) === 1) throw new Error(`Document prerequisite cycle: ${[...trail, id].join(" -> ")}`);
    state.set(id, 1);
    d.prerequisites.forEach((p) => visit(p, [...trail, id]));
    state.set(id, 2);
  };
  docs.forEach((d) => visit(d.id, []));
}

export function loadDocuments(raw: unknown = documentsRaw): DocumentType[] {
  const docs = z.array(DocumentSchema).parse(raw);
  assertAcyclic(docs);
  return docs;
}

export function loadSchemes(raws: unknown[] = ALL_RAW, docs: DocumentType[] = DOCUMENTS): Scheme[] {
  const schemes = raws.map((r) => SchemeSchema.parse(r));
  const ids = new Set(docs.map((d) => d.id));
  for (const s of schemes) {
    for (const d of s.requiredDocuments) {
      if (!ids.has(d)) throw new Error(`Scheme ${s.id} requires unknown document ${d}`);
    }
  }
  return schemes;
}
const ALL_RAW: unknown[] = [ atal_pension, bocw_registration, e_shram, ladki_bahin, mahadbt_postmatric, mjpjay, namo_shetkari, nsap_ignoaps, pm_kisan, pm_sym, pm_ujjwala, pmay_g, pmay_u, pmjay, pmjjby, pmmvy, sgny, shravanbal];
export const DOCUMENTS = loadDocuments();
export const SCHEMES = loadSchemes();
export const schemeById = (id: string) => SCHEMES.find((s) => s.id === id);
export const docById = (id: string) => DOCUMENTS.find((d) => d.id === id);
