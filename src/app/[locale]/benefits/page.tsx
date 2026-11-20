"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CountUp, Disclaimer, EmptyFamily, PageTitle, Rupees, avatar, useFamily } from "@/components/ui";
import { DOCUMENTS, SCHEMES, schemeById } from "@/lib/data";
import type { Evaluation } from "@/lib/eligibility/types";
import { useT } from "@/lib/i18n";
import { comingSoon } from "@/lib/life-events";

type Tab = "eligible" | "likely" | "soon" | "not";

export default function BenefitsPage() {
  const { t, l, locale } = useT();
  const { state, family, benefits } = useFamily();
  const [tab, setTab] = useState<Tab>("eligible");

  const stats = useMemo(() => {
    if (!benefits) return null;
    const e = benefits.map.entries;
    const by = (s: Evaluation["status"]) => e.filter((x) => x.status === s);
    const cat: Record<string, number> = {};
    by("ELIGIBLE").forEach((x) => {
      const c = schemeById(x.schemeId)!.category;
      cat[c] = (cat[c] ?? 0) + 1;
    });
    return { eligible: by("ELIGIBLE"), likely: by("LIKELY_ELIGIBLE"), not: by("NOT_ELIGIBLE"), soon: comingSoon(benefits.map, 24), cat };
  }, [benefits]);

  if (!family || !benefits || !stats) return (<><PageTitle title={t("ben.title")} icon="🎁" /><EmptyFamily /></>);
  const { map, plan } = benefits;

  const list: Evaluation[] = tab === "eligible" ? stats.eligible : tab === "likely" ? stats.likely : tab === "soon" ? stats.soon : stats.not;
  const byMember = family.members
    .map((m) => ({ m, items: list.filter((e) => e.memberId === m.id) }))
    .filter((g) => g.items.length);
  const tabs: { id: Tab; label: string; n: number }[] = [
    { id: "eligible", label: t("ben.tab.eligible"), n: stats.eligible.length },
    { id: "likely", label: t("ben.tab.likely"), n: stats.likely.length },
    { id: "soon", label: t("ben.tab.soon"), n: stats.soon.length },
    { id: "not", label: t("ben.tab.not"), n: stats.not.length },
  ];

  return (
    <>
      <PageTitle title={t("ben.title")} sub={family.label} icon="🎁" />

      <section className="card mb-4 text-center" style={{ background: "var(--accent-soft)" }}>
        <p className="text-lg font-semibold">{t("ben.hero")}</p>
        <p className="my-2 text-5xl font-extrabold" style={{ color: "var(--accent)" }} data-testid="hero-total"><CountUp value={map.totalEligibleINR} /></p>
        <p className="muted">{t("ben.perYear")} · <span className="font-semibold">{t("common.estimated")}</span></p>
        {map.totalPotentialINR > map.totalEligibleINR && (
          <p className="mt-2 text-sm">{t("ben.potential", { amount: Math.round(map.totalPotentialINR).toLocaleString("en-IN") })}</p>
        )}
      </section>

      <div className="mb-4"><Disclaimer /></div>

      {plan.top && (
        <Link href={`/${locale}/documents`} className="card mb-4 flex items-center gap-3" style={{ borderColor: "var(--accent)", borderWidth: 2 }}>
          <span aria-hidden className="text-3xl">🔑</span>
          <span>
            <span className="block font-bold">{t("ben.getFirst")}</span>
            <span className="muted text-sm">{l(DOCS_NAME(plan.top.documentTypeId))}</span>
          </span>
        </Link>
      )}

      <section className="card mb-4" aria-label={t("ben.summary")}>
        <p className="mb-2 font-bold">{t("ben.summary")}</p>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="chip" style={{ background: "var(--success-soft)" }}>✓ {stats.eligible.length} {t("ben.tab.eligible")}</span>
          <span className="chip" style={{ background: "var(--warn-soft)" }}>? {stats.likely.length} {t("ben.tab.likely")}</span>
          <span className="chip">⏳ {stats.soon.length} {t("ben.tab.soon")}</span>
          {Object.entries(stats.cat).map(([c, n]) => (<span key={c} className="chip">{t(`cat.${c}`)}: {n}</span>))}
        </div>
      </section>

      <div role="tablist" aria-label={t("ben.title")} className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((x) => (
          <button
            key={x.id} role="tab" aria-selected={tab === x.id} onClick={() => setTab(x.id)} data-testid={`tab-${x.id}`}
            className="btn !min-h-[3rem] whitespace-nowrap !px-4 !text-base"
            style={tab === x.id ? { background: "var(--primary)", color: "var(--primary-fg)" } : { border: "2px solid var(--border)" }}
          >
            {x.label} ({x.n})
          </button>
        ))}
      </div>

      {tab === "likely" && stats.likely.length > 0 && (
        <Link href={`/${locale}/questionnaire?mode=followup`} className="btn btn-accent mb-4 w-full" data-testid="followup">{t("ben.answerMore")}</Link>
      )}

      {byMember.length === 0 && <p className="card muted">{t("ben.none")}</p>}
      <ul className="flex flex-col gap-4">
        {byMember.map(({ m, items }) => {
          const value = items.reduce((s, e) => s + e.estimatedAnnualValueINR, 0);
          return (
            <li key={m.id} className="card">
              <div className="mb-3 flex items-center gap-3">
                <span aria-hidden className="text-4xl">{avatar(m, state.asOfDate)}</span>
                <div className="flex-1">
                  <p className="text-lg font-bold">{m.name}</p>
                  <p className="muted text-sm">{m.relation ? t(`opt.q_relation.${m.relation}`) : ""}</p>
                </div>
                {tab !== "not" && tab !== "soon" && <p className="font-bold" style={{ color: "var(--accent)" }}><Rupees n={value} /></p>}
              </div>
              <ul className="flex flex-col gap-2">
                {items.map((e) => {
                  const s = schemeById(e.schemeId)!;
                  return (
                    <li key={e.schemeId}>
                      <Link
                        href={`/${locale}/benefits/${e.schemeId}?m=${m.id}`} data-testid={`scheme-${e.schemeId}-${m.id}`}
                        className="flex items-center justify-between gap-3 rounded-2xl border-2 p-3" style={{ borderColor: "var(--border)" }}
                      >
                        <span>
                          <span className="block font-semibold">{l(s.name)}</span>
                          <span className="muted text-sm">
                            {tab === "soon" && e.futureEligibility ? t("ben.eligibleFrom", { date: e.futureEligibility.date }) : l(s.summary)}
                          </span>
                        </span>
                        <span aria-hidden>›</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
      <p className="muted mt-4 text-center text-sm">{t("ben.schemeCount", { n: SCHEMES.length })}</p>
    </>
  );
}

function DOCS_NAME(id: string) {
  return DOCUMENTS.find((d) => d.id === id)!.name;
}
