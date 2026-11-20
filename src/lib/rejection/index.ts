import reasonsRaw from "@data/rejection-reasons.json";
import type { L10n } from "@/lib/eligibility/types";

export interface RejectionReason {
  id: string;
  patterns: Record<"en" | "hi" | "mr", string[]>;
  explanation: L10n;
  fixSteps: L10n[];
  relatedDocumentId: string | null;
  note?: string;
}
export const REASONS = reasonsRaw as RejectionReason[];

export interface Decoded {
  reason: RejectionReason;
  confidence: number; // 0..1, share of the winning reason's patterns that matched
  matched: string[];
}

const clean = (t: string) => t.replace(/\s+/g, " ").toLowerCase();

/**
 * Keyword/regex matching only. If nothing matches we return null and the UI says so honestly.
 * OCR text is noisy, so patterns tolerate gaps (.{0,N}).
 */
export function decodeRejection(ocrText: string): Decoded | null {
  const text = clean(ocrText);
  let best: Decoded | null = null;
  for (const reason of REASONS) {
    const all = Object.values(reason.patterns).flat();
    const matched = all.filter((p) => new RegExp(p, "iu").test(text));
    if (!matched.length) continue;
    const confidence = matched.length / all.length;
    if (!best || matched.length > best.matched.length) best = { reason, confidence, matched };
  }
  return best;
}
