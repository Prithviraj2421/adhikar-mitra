"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, type MouseEvent } from "react";
import { Ring, confetti } from "@/components/fx";
import { CheckMark, EmptyFamily, PageTitle, ReadAloud, useFamily } from "@/components/ui";
import { MismatchPanel } from "@/components/MismatchPanel";
import { DOCUMENTS, schemeById } from "@/lib/data";
import { heldKeys, parseKey, slotKey } from "@/lib/doc-graph/graph";
import { useT } from "@/lib/i18n";
import { updateFamily } from "@/lib/store";

const DocGraph = dynamic(() => import("@/components/DocGraph"), { ssr: false, loading: () => <p className="muted">…</p> });

const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

export default function DocumentsPage() {
  const { t, l, locale } = useT();
  const { state, family, benefits } = useFamily();
  const asOf = state.asOfDate;

  const wallet = useMemo(() => {
    if (!family || !benefits) return [];
    const keys = new Set<string>();
    benefits.plan.needs.forEach((n) => n.required.forEach((k) => keys.add(k)));
    // Also show anything already held, so expiry dates can be edited.
    family.heldDocuments.forEach((h) => keys.add(slotKey(h.documentTypeId, h.memberId)));
    return [...keys].map(parseKey).sort((a, b) => a.documentTypeId.localeCompare(b.documentTypeId));
  }, [family, benefits]);

  if (!family || !benefits) return (<><PageTitle title={t("docs.title")} icon="🗂️" /><EmptyFamily /></>);
  const { plan } = benefits;
  const heldSet = heldKeys(family.heldDocuments, asOf);
  const nameOf = (id: string | null) => (id ? family.members.find((m) => m.id === id)?.name.split(" ")[0] ?? "" : t("docs.family"));
  const doc = (id: string) => DOCUMENTS.find((d) => d.id === id)!;

  const toggle = (k: string, e?: MouseEvent) => {
    const s = parseKey(k);
    const marking = !family.heldDocuments.some((h) => slotKey(h.documentTypeId, h.memberId) === k);
    if (marking && e) {
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      confetti({ x: r.left + r.width / 2, y: r.top + r.height / 2 }, 38);
    }
    updateFamily(family.id, (f) => {
      const has = f.heldDocuments.some((h) => slotKey(h.documentTypeId, h.memberId) === k);
      const members = f.members.map((m) =>
        s.documentTypeId === "bank-account-aadhaar-seeded" && m.id === s.memberId ? { ...m, bankAadhaarSeeded: !has } : m);
      return {
        ...f, members,
        heldDocuments: has
          ? f.heldDocuments.filter((h) => slotKey(h.documentTypeId, h.memberId) !== k)
          : [...f.heldDocuments, { id: `h-${Date.now()}-${k}`, documentTypeId: s.documentTypeId, memberId: s.memberId, status: "held", issuedOn: asOf }],
      };
    });
  };
  const setExpiry = (k: string, date: string) =>
    updateFamily(family.id, (f) => ({
      ...f,
      heldDocuments: f.heldDocuments.map((h) => (slotKey(h.documentTypeId, h.memberId) === k ? { ...h, expiresOn: date || null } : h)),
    }));

  const top = plan.top;
  const topDoc = top ? doc(top.documentTypeId) : null;
  const ready = plan.readyEntries.length;
  const needs = plan.needs.length;
  const stepsText = plan.path
    .map((s, i) => `${i + 1}. ${l(doc(s.documentTypeId).name)} (${nameOf(s.memberId)}), ${t("docs.days", { n: s.effortDays })}`)
    .join(". ");

  return (
    <>
      <PageTitle title={t("docs.title")} sub={family.label} icon="🗂️" />

      <section className="dark-tile rise mb-4 flex items-center gap-4 p-4" aria-label={t("ben.readyBar", { a: ready, b: needs })}>
        <Ring value={ready} max={Math.max(needs, 1)} size={84} stroke={10} color="#4ade80"><span className="text-lg text-white">{needs ? Math.round((ready / needs) * 100) : 0}%</span></Ring>
        <p className="text-base font-bold leading-snug">{t("ben.readyBar", { a: ready, b: needs })}</p>
      </section>

      {top && topDoc ? (
        <section className="shimmer-border rise rise-1 mb-4" data-testid="get-first">
          <div className="inner" style={{ background: "var(--card)" }}>
            <div className="flex items-start gap-3">
              <span aria-hidden className="bob text-5xl">🔑</span>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-widest" style={{ color: "var(--accent)" }}>{t("docs.getFirst")}</p>
                <p className="text-2xl font-extrabold leading-tight">{l(topDoc.name)} {top.memberId ? `(${nameOf(top.memberId)})` : ""}</p>
              </div>
            </div>
            <p className="mt-2 text-lg font-bold">
              {t("docs.unlocks", {
                n: top.fullyUnlocked.length, m: new Set(top.fullyUnlocked.map((x) => x.memberId)).size,
                v: Math.round(top.fullValueINR).toLocaleString("en-IN"),
              })}
            </p>
            {top.partial.length > 0 && <p className="muted text-sm font-semibold">{t("docs.partial", { n: top.partial.length })}</p>}
            <p className="mt-1 font-semibold">⏱ {t("docs.takes", { d: top.effortDays, office: topDoc.issuingOffice })}</p>
            {top.obtain.length > 1 && (
              <p className="mt-1 text-sm font-semibold">{t("docs.needsFirst")}: {top.obtain.slice(0, -1).map((k) => l(doc(parseKey(k).documentTypeId).name)).join(", ")}</p>
            )}
            <p className="muted mt-1 text-xs">{t("common.estimated")}</p>
          </div>
        </section>
      ) : (
        <p className="card mb-4 text-lg font-bold" style={{ background: "var(--success-soft)" }} data-testid="all-ready">🎉 {t("docs.allReady")}</p>
      )}

      {plan.path.length > 0 && (
        <section className="card rise rise-2 mb-4" aria-labelledby="steps">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 id="steps" className="text-xl font-extrabold">{t("docs.steps")}</h2>
            <ReadAloud compact text={stepsText} label={t("docs.readSteps")} />
          </div>
          <ol className="journey flex flex-col gap-3" data-testid="path-steps">
            {plan.path.map((s, i) => {
              const d = doc(s.documentTypeId);
              return (
                <li key={s.key} className="relative flex gap-3 pl-0">
                  <span
                    className="z-10 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold text-white"
                    style={{ background: i === 0 ? "var(--grad-sun)" : "linear-gradient(135deg,#3730a3,#7c3aed)", color: i === 0 ? "#3a1500" : "#fff", boxShadow: "0 4px 12px rgba(0,0,0,.25)" }}
                  >{i + 1}</span>
                  <span className="flex-1 rounded-2xl border p-3" style={{ borderColor: i === 0 ? "var(--accent)" : "var(--border)", background: i === 0 ? "var(--accent-soft)" : "var(--card)" }}>
                    <span className="block font-extrabold">{l(d.name)} · {nameOf(s.memberId)}</span>
                    <span className="muted block text-sm">
                      {d.issuingOffice} · {t("docs.days", { n: s.effortDays })}
                      {s.isPrerequisite && ` · ${t("docs.prereq")}`}
                    </span>
                    {s.unlocksFully.length > 0 && (
                      <span className="mt-1 block text-sm font-bold" style={{ color: "var(--success)" }}>
                        🔓 {t("docs.thenReady")}: {s.unlocksFully.map((id) => l(schemeById(id.split(":")[0])!.name)).filter((v, j, a) => a.indexOf(v) === j).join(", ")}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <section className="card rise rise-3 mb-4">
        <h2 className="mb-1 text-xl font-extrabold">{t("docs.graph")}</h2>
        <p className="muted mb-3 text-sm">{t("docs.graphHelp")}</p>
        {plan.needs.length > 0 ? <DocGraph plan={plan} members={family.members} held={family.heldDocuments} asOf={asOf} /> : <p className="muted">{t("ben.none")}</p>}
      </section>

      <section className="card mb-4" aria-labelledby="wallet">
        <h2 id="wallet" className="mb-3 text-xl font-extrabold">{t("docs.wallet")}</h2>
        <ul className="flex flex-col gap-3">
          {wallet.map((s) => {
            const d = doc(s.documentTypeId);
            const h = family.heldDocuments.find((x) => slotKey(x.documentTypeId, x.memberId) === s.key);
            const isHeld = !!h && heldSet.has(s.key);
            const expired = !!h?.expiresOn && h.expiresOn < asOf;
            const soon = !!h?.expiresOn && !expired && daysBetween(asOf, h.expiresOn) <= 30;
            return (
              <li key={s.key} className="flex flex-wrap items-center gap-3 rounded-2xl border p-3 transition" style={{ borderColor: isHeld ? "var(--success)" : "var(--border)", background: isHeld ? "var(--success-soft)" : "var(--card)" }} data-testid={`wallet-${s.key}`}>
                <CheckMark done={isHeld} />
                <span className="min-w-[10rem] flex-1">
                  <span className="block font-extrabold">{l(d.name)}</span>
                  <span className="muted text-sm">{nameOf(s.memberId)}{!isHeld && !expired ? ` · ${t("docs.missing")}` : ""}</span>
                  {expired && <span className="block text-sm font-bold" style={{ color: "var(--danger)" }}>⚠ {t("docs.expired", { date: h!.expiresOn! })}</span>}
                  {soon && <span className="block text-sm font-bold" style={{ color: "var(--accent)" }}>⏰ {t("docs.expiring", { date: h!.expiresOn! })}</span>}
                </span>
                {h && (
                  <label className="text-sm">
                    <span className="sr-only">{t("docs.setExpiry")}</span>
                    <input
                      type="date" value={h.expiresOn ?? ""} onChange={(e) => setExpiry(s.key, e.target.value)} aria-label={t("docs.setExpiry")}
                      className="min-h-[2.75rem] rounded-xl border-2 bg-transparent px-2" style={{ borderColor: "var(--border)" }}
                    />
                  </label>
                )}
                <button className={`btn !min-h-[3rem] !px-4 !text-base ${isHeld ? "btn-ghost" : "btn-primary"}`} onClick={(e) => toggle(s.key, e)}>
                  {isHeld ? t("docs.unmark") : t("docs.markHeld")}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <MismatchPanel members={family.members} held={family.heldDocuments} />
      <p className="mt-3 text-center">
        <Link className="underline" href={`/${locale}/mismatch`}>{t("mm.checkOwn")}</Link>
      </p>
      <p className="muted mt-2 text-center text-sm">{t("docs.valueNote")}</p>
    </>
  );
}
