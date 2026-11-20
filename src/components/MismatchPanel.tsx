"use client";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { DOCUMENTS } from "@/lib/data";
import type { Member } from "@/lib/eligibility/types";
import type { HeldDocument } from "@/lib/doc-graph/types";
import { useT } from "@/lib/i18n";
import { findingsForMember, type Finding } from "@/lib/mismatch";
import { REASONS } from "@/lib/rejection";

const docName = (id: string) => DOCUMENTS.find((d) => d.id === id)?.name;

/** Name / date-of-birth / gender comparison across a member's documents, with generic fix guidance. */
export function MismatchPanel({ members, held }: { members: Member[]; held: HeldDocument[] }) {
  const { t, l, locale } = useT();
  const fix = REASONS.find((r) => r.id === "name-mismatch")!;
  const rows = members.map((m) => ({ m, f: findingsForMember(held, m.id, m.relation === "SELF") })).filter((x) => x.f.length);

  const lvl = (f: Finding) =>
    f.level === "MISMATCH" ? { c: "var(--danger)", s: "var(--danger-soft)", label: t("mm.mismatch") } :
    { c: "var(--accent)", s: "var(--warn-soft)", label: t("mm.minor") };

  return (
    <section className="card" aria-labelledby="mm" data-testid="mismatch-panel">
      <h2 id="mm" className="mb-1 text-xl font-bold">{t("mm.title")}</h2>
      <p className="muted mb-3 text-sm">{t("mm.sub")}</p>
      {rows.length === 0 ? (
        <p className="flex items-center gap-2" style={{ color: "var(--success)" }}><CheckCircle2 aria-hidden /> {t("mm.none")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map(({ m, f }) =>
            f.map((x, i) => {
              const v = lvl(x);
              const a = docName(x.a.documentTypeId);
              const b = docName(x.b.documentTypeId);
              return (
                <li key={`${m.id}-${i}`} className="rounded-2xl p-3" style={{ background: v.s }}>
                  <p className="flex items-center gap-2 font-bold" style={{ color: v.c }}>
                    <AlertTriangle aria-hidden size={18} /> {m.name.split(" ")[0]} · {t(`mm.${x.field}`)} · {v.label}
                  </p>
                  <p className="text-sm">
                    {a ? l(a) : x.a.documentTypeId}: <strong>{x.a.value}</strong><br />
                    {b ? l(b) : x.b.documentTypeId}: <strong>{x.b.value}</strong>
                    {x.hint === "DAY_MONTH_SWAPPED" && <><br />{t("mm.swapped")}</>}
                  </p>
                </li>
              );
            }),
          )}
        </ul>
      )}
      {rows.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer font-semibold">{t("mm.howToFix")}</summary>
          <ol className="mt-2 list-decimal pl-6">
            {fix.fixSteps.map((s, i) => (<li key={i}>{s[locale]}</li>))}
          </ol>
          <p className="muted mt-2 text-sm">{t("mm.verifyGeneric")}</p>
        </details>
      )}
    </section>
  );
}
