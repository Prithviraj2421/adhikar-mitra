"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageTitle } from "@/components/ui";
import { useT } from "@/lib/i18n";
import { newFamily, patch, setState } from "@/lib/store";

/** A Sahayak adds a family and records the family's verbal consent (checkbox + timestamp) before any data is collected. */
export default function AddFamilyPage() {
  const { t, locale } = useT();
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [consent, setConsent] = useState(false);

  const create = () => {
    const f = newFamily(label.trim() || t("sh.newFamily"), true, "verbal-via-sahayak");
    setState((s) => ({ ...s, role: "SAHAYAK", consent: true, families: [...s.families, f], activeId: f.id }));
    patch({ activeId: f.id });
    router.push(`/${locale}/questionnaire`);
  };

  return (
    <>
      <PageTitle title={t("sh.add")} icon="🏠" />
      <form className="card flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); if (consent) create(); }}>
        <label className="text-lg font-semibold">{t("sh.familyName")}
          <input value={label} onChange={(e) => setLabel(e.target.value)} data-testid="family-label"
            className="mt-1 min-h-[3.5rem] w-full rounded-2xl border-2 bg-transparent px-4 font-normal" style={{ borderColor: "var(--border)" }} />
        </label>
        <label className="flex items-start gap-3 rounded-2xl p-4 text-lg" style={{ background: "var(--accent-soft)" }}>
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} data-testid="verbal-consent" className="mt-1 h-7 w-7" />
          <span>{t("sh.consentVerbal")}</span>
        </label>
        <p className="muted text-sm">{t("sh.consentNote")}</p>
        <button className="btn btn-accent" type="submit" disabled={!consent} data-testid="create-family">{t("sh.startQuestions")}</button>
      </form>
    </>
  );
}
