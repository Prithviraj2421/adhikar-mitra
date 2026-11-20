"use client";
import { useState } from "react";
import { MismatchPanel } from "@/components/MismatchPanel";
import { PageTitle } from "@/components/ui";
import { DOCUMENTS } from "@/lib/data";
import type { HeldDocument } from "@/lib/doc-graph/types";
import { useT } from "@/lib/i18n";
import { extractFields, ocrImage } from "@/lib/ocr";
import { SAMPLE_DOCS } from "@/lib/rejection/samples";

interface Draft { type: string; name: string; dob: string; gender: "M" | "F" | "O" | ""; busy?: boolean; note?: string }
const TYPES = ["aadhaar", "bank-passbook", "land-7-12", "ration-card", "school-bonafide"];
const blank = (type: string): Draft => ({ type, name: "", dob: "", gender: "" });

function DocForm({ d, set, idx }: { d: Draft; set: (x: Draft) => void; idx: number }) {
  const { t, l } = useT();
  const fill = async (src: string | File, fallback?: string) => {
    set({ ...d, busy: true, note: "" });
    let text = fallback ?? "";
    try { text = await ocrImage(src); } catch { if (!fallback) { set({ ...d, busy: false, note: t("dec.ocrFailed") }); return; } }
    const f = extractFields(text);
    set({ ...d, name: f.name || d.name, dob: f.dob || d.dob, gender: f.gender || d.gender, busy: false, note: t("mm.confirmOcr") });
  };
  const input = "mt-1 min-h-[3rem] w-full rounded-xl border-2 bg-transparent px-3 font-normal";
  return (
    <section className="card mb-4" aria-label={t("mm.docN", { n: idx + 1 })}>
      <h2 className="mb-2 text-lg font-bold">{t("mm.docN", { n: idx + 1 })}</h2>
      <label className="block text-sm font-semibold">{t("mm.docType")}
        <select value={d.type} onChange={(e) => set({ ...d, type: e.target.value })} className={`${input} bg-[var(--card)]`} style={{ borderColor: "var(--border)" }}>
          {TYPES.map((x) => (<option key={x} value={x}>{l(DOCUMENTS.find((y) => y.id === x)!.name)}</option>))}
        </select>
      </label>
      <label className="btn btn-ghost mt-3 w-full cursor-pointer !text-base">📷 {t("mm.fromPhoto")}
        <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && void fill(e.target.files[0])} />
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        {SAMPLE_DOCS.map((s) => (
          <button key={s.id} className="chip" type="button" onClick={() => void fill(s.file, s.text)} data-testid={`mmsample-${idx}-${s.id}`}>{t("mm.sample")}: {s.id}</button>
        ))}
      </div>
      {d.busy && <p className="mt-2" role="status">{t("dec.reading")}…</p>}
      {d.note && <p className="mt-2 text-sm font-semibold" role="status">{d.note}</p>}
      <div className="mt-3 grid gap-3">
        <label className="text-sm font-semibold">{t("mm.name")}
          <input value={d.name} onChange={(e) => set({ ...d, name: e.target.value })} className={input} style={{ borderColor: "var(--border)" }} data-testid={`mm-name-${idx}`} />
        </label>
        <label className="text-sm font-semibold">{t("mm.dob")}
          <input type="date" value={d.dob} onChange={(e) => set({ ...d, dob: e.target.value })} className={input} style={{ borderColor: "var(--border)" }} />
        </label>
        <label className="text-sm font-semibold">{t("mm.gender")}
          <select value={d.gender} onChange={(e) => set({ ...d, gender: e.target.value as Draft["gender"] })} className={`${input} bg-[var(--card)]`} style={{ borderColor: "var(--border)" }}>
            <option value="">—</option><option value="M">{t("opt.q_gender.M")}</option><option value="F">{t("opt.q_gender.F")}</option><option value="O">{t("opt.q_gender.O")}</option>
          </select>
        </label>
      </div>
    </section>
  );
}

export default function MismatchPage() {
  const { t } = useT();
  const [a, setA] = useState<Draft>(blank("aadhaar"));
  const [b, setB] = useState<Draft>(blank("bank-passbook"));
  const [run, setRun] = useState(false);
  const toDoc = (d: Draft, id: string): HeldDocument => ({
    id, documentTypeId: d.type, memberId: "x", nameOnDocument: d.name || undefined, dobOnDocument: d.dob || undefined, genderOnDocument: d.gender || undefined,
  });
  return (
    <>
      <PageTitle title={t("mm.pageTitle")} sub={t("mm.pageSub")} icon="🔍" />
      <DocForm d={a} set={(x) => { setA(x); setRun(false); }} idx={0} />
      <DocForm d={b} set={(x) => { setB(x); setRun(false); }} idx={1} />
      <button className="btn btn-accent mb-4 w-full" onClick={() => setRun(true)} data-testid="compare">{t("mm.compare")}</button>
      {run && <MismatchPanel members={[{ id: "x", name: "Person", dob: "" }]} held={[toDoc(a, "a"), toDoc(b, "b")]} />}
    </>
  );
}
