"use client";
import { Check, HelpCircle, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Disclaimer, EmptyFamily, PageTitle, ReadAloud, Rupees, SafeLink, useFamily } from "@/components/ui";
import { DOCUMENTS, schemeById } from "@/lib/data";
import { heldKeys, slotKey } from "@/lib/doc-graph/graph";
import { describeExpected, formatValue } from "@/lib/eligibility/format";
import { templateExplanation } from "@/lib/llm/explain";
import { useT } from "@/lib/i18n";
import { isOfficialUrl } from "@/lib/scam-shield";

function Detail({ schemeId }: { schemeId: string }) {
  const { t, l, locale } = useT();
  const { state, family, benefits } = useFamily();
  const sp = useSearchParams();
  const [simple, setSimple] = useState<{ text: string; ai: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const scheme = schemeById(schemeId);
  if (!family || !benefits) return <EmptyFamily />;
  if (!scheme) return <p>{t("common.notFound")}</p>;
  const memberId = sp.get("m") ?? family.members[0].id;
  const member = family.members.find((m) => m.id === memberId) ?? family.members[0];
  const ev = benefits.map.entries.find((e) => e.schemeId === schemeId && e.memberId === member.id);
  if (!ev) return <p>{t("common.notFound")}</p>;

  const held = heldKeys(family.heldDocuments, state.asOfDate);
  const online = scheme.application.modes.find((m) => m.type === "ONLINE");
  const officialSources = scheme.sourceUrls.some(isOfficialUrl);
  const statusKey = ev.status === "ELIGIBLE" ? "ben.tab.eligible" : ev.status === "LIKELY_ELIGIBLE" ? "ben.tab.likely" : "ben.tab.not";
  const first = member.name.split(" ")[0];
  const template = templateExplanation(scheme, ev, locale, first);

  const explain = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/explain", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          schemeId, locale, asOfDate: state.asOfDate, household: family.household, member, householdSize: family.members.length,
        }),
      });
      if (!r.ok) throw new Error("bad");
      const j = await r.json();
      setSimple({ text: j.text, ai: !!j.ai });
    } catch {
      setSimple({ text: template, ai: false });
    } finally {
      setBusy(false);
    }
  };

  const Icon = { PASS: Check, FAIL: X, UNKNOWN: HelpCircle } as const;
  const color = { PASS: "var(--success)", FAIL: "var(--danger)", UNKNOWN: "var(--accent)" } as const;
  const word = { PASS: t("why.pass"), FAIL: t("why.fail"), UNKNOWN: t("why.unknownShort") } as const;

  return (
    <>
      <PageTitle title={l(scheme.name)} sub={`${first} · ${t(statusKey)}`} icon="📄" />
      <div className="mb-4"><Disclaimer /></div>

      <section className="card mb-4">
        <p>{l(scheme.summary)}</p>
        <p className="mt-2 font-semibold">{l(scheme.benefit.description)}</p>
        {ev.status !== "NOT_ELIGIBLE" && (
          <p className="mt-1" style={{ color: "var(--accent)" }}>
            <span className="text-xl font-extrabold"><Rupees n={ev.estimatedAnnualValueINR} /></span> {t("ben.perYear")} · {t("common.estimated")}
          </p>
        )}
        {ev.futureEligibility && <p className="mt-2 font-semibold">⏳ {t("ben.eligibleFrom", { date: ev.futureEligibility.date })}</p>}
      </section>

      <section className="card mb-4" aria-labelledby="why">
        <h2 id="why" className="mb-3 text-xl font-bold">{t("sch.why")}</h2>
        <ul className="flex flex-col gap-3">
          {ev.criteria.map((c) => {
            const I = Icon[c.result];
            return (
              <li key={c.id} className="flex gap-3" data-testid={`crit-${c.id}`} data-result={c.result}>
                <span className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: color[c.result], color: "#fff" }}>
                  <I aria-hidden size={18} />
                </span>
                <span>
                  <span className="block font-semibold">{c.label[locale]} <span className="sr-only">({word[c.result]})</span></span>
                  <span className="muted block text-sm">
                    {t("sch.yours")}: {formatValue(c.field, c.actual, locale)} · {t("sch.required")}: {describeExpected(c, locale)}
                    {c.note === "VERIFY" && <> · <em>{t("sch.verifyRule")}</em></>}
                  </span>
                </span>
              </li>
            );
          })}
          {ev.failedExclusions.map((c) => (
            <li key={c.id} className="flex gap-3">
              <span className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: color.FAIL, color: "#fff" }}><X aria-hidden size={18} /></span>
              <span className="font-semibold">{c.label[locale]}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn btn-accent" onClick={explain} disabled={busy} data-testid="explain">{busy ? t("common.loading") : t("sch.explainSimple")}</button>
          <ReadAloud text={simple?.text ?? template} label={t("sch.readExplanation")} />
        </div>
        {simple && (
          <div className="mt-3 whitespace-pre-line rounded-2xl p-4" style={{ background: "var(--accent-soft)" }} data-testid="explanation">
            {simple.ai && <span className="chip mb-2" style={{ background: "var(--card)" }}>🤖 {t("sch.aiLabel")}</span>}
            <p>{simple.text}</p>
          </div>
        )}
      </section>

      <section className="card mb-4">
        <h2 className="mb-2 text-xl font-bold">{t("sch.docs")}</h2>
        <ul className="flex flex-col gap-1">
          {scheme.requiredDocuments.map((id) => {
            const d = DOCUMENTS.find((x) => x.id === id)!;
            const ok = held.has(slotKey(id, d.scope === "household" ? null : member.id));
            return <li key={id}>{ok ? "✅" : "⬜"} {l(d.name)}</li>;
          })}
        </ul>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link className="btn btn-ghost" href={`/${locale}/documents`}>{t("sch.openWallet")}</Link>
          <Link className="btn btn-primary" href={`/${locale}/guide/${scheme.id}?m=${member.id}`} data-testid="open-guide">{t("sch.howToApply")}</Link>
        </div>
      </section>

      <section className="card mb-4">
        <h2 className="mb-2 text-xl font-bold">{t("sch.sources")}</h2>
        <ul className="flex flex-col gap-2">
          {scheme.sourceUrls.map((u) => (<li key={u}><SafeLink href={u}>{new URL(u).hostname}</SafeLink></li>))}
        </ul>
        <p className="muted mt-3 text-sm">
          {scheme.verified ? t("sch.verifiedOn", { date: scheme.lastVerified ?? "" }) : t("sch.verifiedPending")}
          {!officialSources && ` · ${t("sch.sourceUnverified")}`}
        </p>
        {online && <p className="mt-2"><SafeLink href={online.url}>{t("guide.openPortal")}</SafeLink></p>}
      </section>
    </>
  );
}

export default function Page({ params }: { params: { schemeId: string } }) {
  return (<Suspense fallback={null}><Detail schemeId={params.schemeId} /></Suspense>);
}
