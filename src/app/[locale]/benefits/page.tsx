"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CategoryBadge, HeroOrbit, Ring, confetti } from "@/components/fx";
import { CountUp, Disclaimer, EmptyFamily, PageTitle, Rupees, avatar, useFamily } from "@/components/ui";
import { DOCUMENTS, SCHEMES, schemeById } from "@/lib/data";
import type { Evaluation } from "@/lib/eligibility/types";
import { useT } from "@/lib/i18n";
import { comingSoon } from "@/lib/life-events";

type Tab = "eligible" | "likely" | "soon" | "not";
const RING = ["#6366f1", "#ec4899", "#f59e0b", "#14b8a6", "#8b5cf6"];

export default function BenefitsPage() {
  const { t, l, locale } = useT();
  const { state, family, benefits } = useFamily();
  const [tab, setTab] = useState<Tab>("eligible");
  const heroRef = useRef<HTMLElement>(null);
  const fired = useRef(false);

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

  // A little celebration the first time the family sees their total.
  const total = benefits?.map.totalEligibleINR ?? 0;
  useEffect(() => {
    if (fired.current || total <= 0 || !heroRef.current) return;
    fired.current = true;
    const r = heroRef.current.getBoundingClientRect();
    const t0 = setTimeout(() => confetti({ x: r.left + r.width / 2, y: r.top + r.height * 0.55 }), 700);
    return () => clearTimeout(t0);
  }, [total]);

  if (!family || !benefits || !stats) return (<><PageTitle title={t("ben.title")} icon="🎁" /><EmptyFamily /></>);
  const { map, plan } = benefits;

  const list: Evaluation[] = tab === "eligible" ? stats.eligible : tab === "likely" ? stats.likely : tab === "soon" ? stats.soon : stats.not;
  const byMember = family.members
    .map((m) => ({ m, items: list.filter((e) => e.memberId === m.id) }))
    .filter((g) => g.items.length);
  const memberValue = (id: string) => stats.eligible.filter((e) => e.memberId === id).reduce((s, e) => s + e.estimatedAnnualValueINR, 0);
  const tabs: { id: Tab; label: string; n: number }[] = [
    { id: "eligible", label: t("ben.tab.eligible"), n: stats.eligible.length },
    { id: "likely", label: t("ben.tab.likely"), n: stats.likely.length },
    { id: "soon", label: t("ben.tab.soon"), n: stats.soon.length },
    { id: "not", label: t("ben.tab.not"), n: stats.not.length },
  ];
  const ready = plan.readyEntries.length;
  const needs = plan.needs.length;

  return (
    <>
      <PageTitle title={t("ben.title")} sub={family.label} icon="🎁" />

      <section ref={heroRef} className="hero rise mb-4 px-5 pb-5 pt-5">
        <div className="pointer-events-none absolute -right-10 -top-8 opacity-30" aria-hidden><HeroOrbit size={200} /></div>
        <p className="max-w-[16rem] text-base font-bold leading-snug opacity-95">{t("ben.hero")}</p>
        <p className="my-1 text-5xl font-extrabold tracking-tight" style={{ textShadow: "0 4px 24px rgba(0,0,0,.35)" }} data-testid="hero-total">
          <CountUp value={map.totalEligibleINR} />
        </p>
        <p className="text-sm font-semibold opacity-95">{t("ben.perYear")} · <span className="rounded-full bg-white/20 px-2 py-0.5">{t("common.estimated")}</span></p>
        {map.totalPotentialINR > map.totalEligibleINR && (
          <p className="mt-2 text-sm font-semibold opacity-95">{t("ben.potential", { amount: Math.round(map.totalPotentialINR).toLocaleString("en-IN") })}</p>
        )}
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-black/25 p-3">
          <Ring value={ready} max={Math.max(needs, 1)} size={64} stroke={8} color="#4ade80"><span className="text-white">{needs ? Math.round((ready / needs) * 100) : 0}%</span></Ring>
          <p className="text-sm font-bold leading-snug">{t("ben.readyBar", { a: ready, b: needs })}</p>
        </div>
      </section>

      <div className="rise rise-1 mb-4"><Disclaimer /></div>

      {plan.top && (
        <Link href={`/${locale}/documents`} className="shimmer-border rise rise-2 mb-4 block">
          <span className="inner flex items-center gap-3">
            <span aria-hidden className="bob text-4xl">🔑</span>
            <span className="flex-1">
              <span className="block text-lg font-extrabold">{t("ben.getFirst")}</span>
              <span className="muted text-sm font-semibold">{l(DOCUMENTS.find((d) => d.id === plan.top!.documentTypeId)!.name)}</span>
            </span>
            <span aria-hidden className="text-2xl">›</span>
          </span>
        </Link>
      )}

      <section aria-label={t("ben.members")} className="rise rise-2 mb-4">
        <h2 className="mb-2 text-lg font-extrabold">{t("ben.members")}</h2>
        <ul tabIndex={0} className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
          {family.members.map((m, i) => (
            <li key={m.id} className="glass flex w-28 shrink-0 flex-col items-center rounded-3xl border p-3 text-center" style={{ borderColor: "var(--border)" }}>
              <span className="rounded-full p-1" style={{ background: `conic-gradient(${RING[i % RING.length]}, #fbbf24, ${RING[i % RING.length]})` }}>
                <span className="flex h-14 w-14 items-center justify-center rounded-full text-3xl" style={{ background: "var(--card)" }} aria-hidden>{avatar(m, state.asOfDate)}</span>
              </span>
              <span className="mt-1 w-full truncate text-sm font-extrabold">{m.name.split(" ")[0]}</span>
              <span className="text-xs font-bold" style={{ color: "var(--accent)" }}><Rupees n={memberValue(m.id)} /></span>
            </li>
          ))}
        </ul>
      </section>

      {Object.keys(stats.cat).length > 0 && (
        <section aria-label={t("ben.summary")} className="rise rise-3 mb-4">
          <h2 className="mb-2 text-lg font-extrabold">{t("ben.summary")}</h2>
          <ul tabIndex={0} className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
            {Object.entries(stats.cat).map(([c, n]) => (
              <li key={c} className="glass flex shrink-0 items-center gap-2 rounded-2xl border p-2 pr-4" style={{ borderColor: "var(--border)" }}>
                <CategoryBadge category={c} size={40} />
                <span className="leading-tight"><span className="block text-xs font-bold">{t(`cat.${c}`)}</span><span className="text-lg font-extrabold">{n}</span></span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div role="tablist" aria-label={t("ben.title")} className="glass rise rise-3 mb-4 flex gap-1 overflow-x-auto rounded-3xl border p-1.5" style={{ borderColor: "var(--border)" }}>
        {tabs.map((x) => (
          <button
            key={x.id} role="tab" aria-selected={tab === x.id} onClick={() => setTab(x.id)} data-testid={`tab-${x.id}`}
            className="min-h-[3rem] flex-1 whitespace-nowrap rounded-2xl px-3 text-sm font-extrabold transition"
            style={tab === x.id ? { background: "linear-gradient(135deg,#3730a3,#5b21b6)", color: "#fff" } : undefined}
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
        {byMember.map(({ m, items }, mi) => {
          const value = items.reduce((s, e) => s + e.estimatedAnnualValueINR, 0);
          return (
            <li key={m.id} className="card rise" style={{ animationDelay: `${mi * 0.06}s` }}>
              <div className="mb-3 flex items-center gap-3">
                <span aria-hidden className="text-4xl">{avatar(m, state.asOfDate)}</span>
                <div className="flex-1">
                  <p className="text-lg font-extrabold">{m.name}</p>
                  <p className="muted text-sm">{m.relation ? t(`opt.q_relation.${m.relation}`) : ""}</p>
                </div>
                {tab !== "not" && tab !== "soon" && (
                  <p className="rounded-full px-3 py-1 font-extrabold text-white" style={{ background: "var(--grad-sun)", color: "#3a1500" }}><Rupees n={value} /></p>
                )}
              </div>
              <ul className="flex flex-col gap-2">
                {items.map((e) => {
                  const s = schemeById(e.schemeId)!;
                  return (
                    <li key={e.schemeId}>
                      <Link
                        href={`/${locale}/benefits/${e.schemeId}?m=${m.id}`} data-testid={`scheme-${e.schemeId}-${m.id}`}
                        className="flex items-center gap-3 rounded-2xl border-2 p-3 transition hover:-translate-y-0.5 hover:shadow-lg" style={{ borderColor: "var(--border)", background: "var(--card)" }}
                      >
                        <CategoryBadge category={s.category} />
                        <span className="flex-1">
                          <span className="block font-extrabold leading-snug">{l(s.name)}</span>
                          <span className="muted text-sm">
                            {tab === "soon" && e.futureEligibility ? t("ben.eligibleFrom", { date: e.futureEligibility.date }) : l(s.summary)}
                          </span>
                        </span>
                        {tab !== "not" && tab !== "soon" && (
                          <span className="chip shrink-0" style={{ background: "var(--success-soft)", color: "var(--success)" }}><Rupees n={e.estimatedAnnualValueINR} /></span>
                        )}
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
