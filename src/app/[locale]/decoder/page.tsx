"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { PageTitle, ReadAloud, useFamily } from "@/components/ui";
import { DOCUMENTS, schemeById } from "@/lib/data";
import { heldKeys, slotKey } from "@/lib/doc-graph/graph";
import { useT } from "@/lib/i18n";
import { ocrImage } from "@/lib/ocr";
import { decodeRejection, type Decoded } from "@/lib/rejection";
import { SAMPLE_NOTICES } from "@/lib/rejection/samples";

function Decoder() {
  const { t, l, locale } = useT();
  const { state, family } = useFamily();
  const sp = useSearchParams();
  const app = family?.applications.find((a) => a.id === sp.get("app"));
  const scheme = app ? schemeById(app.schemeId) : undefined;

  const [preview, setPreview] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Decoded | null | undefined>(undefined);

  const runOcr = async (src: string | File, fallback?: string) => {
    setError(""); setResult(undefined); setProgress(0);
    try {
      const out = await ocrImage(src, (p) => setProgress(p));
      setText(out);
    } catch {
      setError(t("dec.ocrFailed"));
      if (fallback) setText(fallback);
    } finally {
      setProgress(null);
    }
  };
  const onFile = (f: File | undefined) => {
    if (!f) return;
    if (f.type === "application/pdf") { setError(t("dec.pdfNote")); return; }
    setPreview(URL.createObjectURL(f));
    void runOcr(f);
  };

  const held = family ? heldKeys(family.heldDocuments, state.asOfDate) : new Set<string>();
  const memberId = app?.memberId;

  return (
    <>
      <PageTitle title={t("dec.title")} sub={scheme ? l(scheme.name) : t("dec.sub")} icon="🔎" />

      <section className="card mb-4">
        <label className="btn btn-primary w-full cursor-pointer">
          📷 {t("dec.upload")}
          <input type="file" accept="image/*" capture="environment" className="sr-only" data-testid="notice-file" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        <p className="muted mt-2 text-sm">{t("dec.privacy")}</p>
        <p className="mt-3 font-semibold">{t("dec.samples")}</p>
        <div className="mt-2 flex flex-col gap-2">
          {SAMPLE_NOTICES.map((s, i) => (
            <button key={s.id} className="btn btn-ghost !justify-start !text-base" data-testid={`sample-${s.id}`}
              onClick={() => { setPreview(s.file); void runOcr(s.file, s.text); }}>
              🧾 {t("dec.sample", { n: i + 1 })}
            </button>
          ))}
        </div>
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={t("dec.previewAlt")} className="mt-3 w-full rounded-xl border" />
        )}
        {progress !== null && (
          <div className="mt-3" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-label={t("dec.reading")}>
            <p className="text-sm">{t("dec.reading")} {Math.round(progress * 100)}%</p>
            <div className="h-3 rounded-full" style={{ background: "var(--border)" }}><div className="h-3 rounded-full" style={{ width: `${progress * 100}%`, background: "var(--accent)" }} /></div>
          </div>
        )}
        {error && <p className="mt-3 rounded-xl p-3 text-sm" style={{ background: "var(--warn-soft)" }} role="alert">{error}</p>}
      </section>

      <section className="card mb-4">
        <label htmlFor="ocr" className="mb-1 block text-lg font-bold">{t("dec.ocrText")}</label>
        <p className="muted mb-2 text-sm">{t("dec.editHint")}</p>
        <textarea
          id="ocr" value={text} onChange={(e) => { setText(e.target.value); setResult(undefined); }} rows={6} data-testid="ocr-text"
          className="w-full rounded-xl border-2 bg-transparent p-3" style={{ borderColor: "var(--border)" }}
        />
        <button className="btn btn-accent mt-3 w-full" disabled={!text.trim()} data-testid="decode-btn" onClick={() => setResult(decodeRejection(text))}>
          {t("dec.decode")}
        </button>
      </section>

      {result === null && (
        <section className="card mb-4" data-testid="no-match" style={{ background: "var(--warn-soft)" }}>
          <p className="font-bold">{t("dec.noMatch")}</p>
          <p className="mt-1">{t("dec.noMatchHelp")}</p>
          <Link className="btn btn-primary mt-3" href={`/${locale}/guide/${scheme?.id ?? "pm-kisan"}`}>{t("dec.findCentre")}</Link>
        </section>
      )}

      {result && (
        <section className="card mb-4" data-testid="decoded" data-reason={result.reason.id}>
          <div className="mb-2 flex items-start justify-between gap-2">
            <h2 className="text-xl font-bold">{t("dec.reason")}</h2>
            <ReadAloud compact text={`${result.reason.explanation[locale]}. ${result.reason.fixSteps.map((s, i) => `${i + 1}. ${s[locale]}`).join(". ")}`} />
          </div>
          <p className="text-lg font-semibold">{result.reason.explanation[locale]}</p>
          <h3 className="mb-1 mt-4 font-bold">{t("dec.fixSteps")}</h3>
          <ol className="list-decimal pl-6">{result.reason.fixSteps.map((s, i) => (<li key={i}>{s[locale]}</li>))}</ol>
          <p className="muted mt-2 text-xs">{t("dec.verifyGeneric")}</p>
          {result.reason.relatedDocumentId && (
            <Link className="btn btn-ghost mt-3 w-full" href={`/${locale}/documents`}>
              🔑 {t("dec.openGraph", { doc: l(DOCUMENTS.find((d) => d.id === result.reason.relatedDocumentId)!.name) })}
            </Link>
          )}
          {scheme && family && (
            <div className="mt-4">
              <h3 className="mb-1 font-bold">{t("dec.reapply")}</h3>
              <ul>
                {scheme.requiredDocuments.map((id) => {
                  const d = DOCUMENTS.find((x) => x.id === id)!;
                  const ok = held.has(slotKey(id, d.scope === "household" ? null : memberId ?? null));
                  return <li key={id}>{ok ? "✅" : "⬜"} {l(d.name)}</li>;
                })}
              </ul>
            </div>
          )}
        </section>
      )}
    </>
  );
}

export default function Page() {
  return (<Suspense fallback={null}><Decoder /></Suspense>);
}
