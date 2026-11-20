"use client";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageTitle } from "@/components/ui";
import { DOCUMENTS, SCHEMES } from "@/lib/data";
import { planDocuments } from "@/lib/doc-graph/path";
import { evaluateHousehold } from "@/lib/eligibility/engine";
import { useT } from "@/lib/i18n";
import { dexieQueueStore } from "@/lib/offline/db";
import { flushIfOnline } from "@/lib/offline/client";
import type { QueueItem } from "@/lib/offline/sync";
import { patch, updateFamily, useAppState } from "@/lib/store";

type Filter = "all" | "docs" | "progress" | "visit";

export default function SahayakPage() {
  const { t, locale } = useT();
  const router = useRouter();
  const s = useAppState();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [note, setNote] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    try { setQueue(await dexieQueueStore.all()); } catch { setQueue([]); }
  }, []);
  useEffect(() => { void refresh(); const i = setInterval(refresh, 1500); return () => clearInterval(i); }, [refresh]);

  // Real connectivity events also flip the indicator, and reconnecting triggers a sync.
  useEffect(() => {
    const on = () => { patch({ online: true }); void flushIfOnline().then(refresh); };
    const off = () => patch({ online: false });
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, [refresh]);
  useEffect(() => { if (s.online) void flushIfOnline().then(refresh); }, [s.online, refresh]);

  const rows = useMemo(
    () => s.families.map((f) => {
      const map = f.members.length ? evaluateHousehold(f.household, f.members, SCHEMES, s.asOfDate) : null;
      const plan = map ? planDocuments(map, SCHEMES, DOCUMENTS, f.heldDocuments) : null;
      const pendingDocs = plan ? new Set(plan.needs.flatMap((n) => n.missing)).size : 0;
      const inProgress = f.applications.filter((a) => !["PAYMENT_RECEIVED", "NOT_STARTED"].includes(a.status)).length;
      const lastVisit = f.visits.map((v) => v.at).sort().pop();
      const days = lastVisit ? Math.round((Date.parse(s.asOfDate) - Date.parse(lastVisit)) / 86400000) : 999;
      return { f, pendingDocs, inProgress, visitDue: pendingDocs > 0 && days > 7, qDone: f.q.phase === "done", value: map?.totalEligibleINR ?? 0 };
    }),
    [s.families, s.asOfDate],
  );

  const shown = rows.filter((r) =>
    (!q || r.f.label.toLowerCase().includes(q.toLowerCase())) &&
    (filter === "all" || (filter === "docs" && r.pendingDocs > 0) || (filter === "progress" && r.inProgress > 0) || (filter === "visit" && r.visitDue)));
  const today = rows.filter((r) => r.visitDue).slice(0, 5);

  const syncOf = (key: string) => queue.find((x) => x.key === key)?.state;
  const sum = {
    pending: queue.filter((x) => x.state === "PENDING").length,
    failed: queue.filter((x) => x.state === "FAILED").length,
    synced: queue.filter((x) => x.state === "SYNCED").length,
  };

  const open = (id: string, path: string) => { patch({ activeId: id }); router.push(`/${locale}/${path}`); };

  return (
    <>
      <PageTitle title={t("sh.title")} sub={t("sh.sub", { n: s.families.length })} icon="🧑‍🤝‍🧑" />

      <section className="card mb-4 flex flex-wrap items-center gap-3" aria-label={t("sh.syncStatus")} data-testid="sync-panel">
        <button className="btn btn-ghost !min-h-[3rem] !text-base" onClick={() => patch({ online: !s.online })} data-testid="toggle-online" aria-pressed={!s.online}>
          {s.online ? <Cloud aria-hidden /> : <CloudOff aria-hidden />} {s.online ? t("sh.online") : t("sh.offline")}
        </button>
        <span className="chip" data-testid="sync-pending">⏳ {t("sh.pending")}: {sum.pending}</span>
        <span className="chip" style={{ background: "var(--success-soft)" }} data-testid="sync-synced">✓ {t("sh.synced")}: {sum.synced}</span>
        <span className="chip" style={{ background: "var(--danger-soft)" }} data-testid="sync-failed">✗ {t("sh.failed")}: {sum.failed}</span>
        <button className="btn btn-primary !min-h-[3rem] !text-base" onClick={() => void flushIfOnline().then(refresh)} data-testid="sync-now"><RefreshCw aria-hidden size={18} /> {t("sh.retry")}</button>
      </section>
      <p className="muted mb-4 text-sm">{t("sh.offlineHelp")}</p>

      <div className="mb-4 flex flex-wrap gap-2">
        <Link href={`/${locale}/sahayak/add`} className="btn btn-accent" data-testid="add-family">＋ {t("sh.add")}</Link>
      </div>

      {today.length > 0 && (
        <section className="card mb-4" aria-labelledby="vt" style={{ borderColor: "var(--accent)", borderWidth: 2 }}>
          <h2 id="vt" className="mb-2 text-lg font-bold">📅 {t("sh.visitToday")}</h2>
          <ul className="flex flex-col gap-1">
            {today.map((r) => (<li key={r.f.id}><button className="underline" onClick={() => open(r.f.id, "documents")}>{r.f.label}</button> · {t("sh.docsPending", { n: r.pendingDocs })}</li>))}
          </ul>
        </section>
      )}

      <div className="mb-3 flex flex-wrap gap-2">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("sh.search")} aria-label={t("sh.search")}
          className="min-h-[3rem] flex-1 rounded-xl border-2 bg-transparent px-3" style={{ borderColor: "var(--border)" }} />
        {(["all", "docs", "progress", "visit"] as Filter[]).map((x) => (
          <button key={x} onClick={() => setFilter(x)} aria-pressed={filter === x} className="chip !min-h-[3rem] !px-4"
            style={filter === x ? { background: "var(--primary)", color: "var(--primary-fg)" } : undefined}>{t(`sh.filter.${x}`)}</button>
        ))}
      </div>

      {shown.length === 0 && <p className="card muted">{t("sh.none")}</p>}
      <ul className="grid gap-3 md:grid-cols-2">
        {shown.map((r) => {
          const st = syncOf(r.f.syncKey);
          return (
            <li key={r.f.id} className="card" data-testid={`family-${r.f.id}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold">{r.f.label}</p>
                {r.f.assisted && st && (
                  <span className="chip" data-testid="family-sync" data-state={st}
                    style={st === "SYNCED" ? { background: "var(--success-soft)" } : st === "FAILED" ? { background: "var(--danger-soft)" } : undefined}>
                    {st === "SYNCED" ? "✓ " + t("sh.synced") : st === "FAILED" ? "✗ " + t("sh.failed") : "⏳ " + t("sh.pending")}
                  </span>
                )}
              </div>
              <p className="muted text-sm">
                {r.f.members.length} {t("sh.members")} · {r.qDone ? `✓ ${t("sh.qDone")}` : `… ${t("sh.qOpen")}`} · {t("sh.docsPending", { n: r.pendingDocs })} · {t("sh.appsOpen", { n: r.inProgress })}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="btn btn-primary !min-h-[3rem] !text-base" onClick={() => open(r.f.id, r.qDone ? "benefits" : "questionnaire")}>{t("sh.open")}</button>
                <button className="btn btn-ghost !min-h-[3rem] !text-base" onClick={() => open(r.f.id, "documents")}>{t("nav.documents")}</button>
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer font-semibold">{t("sh.visitLog")} ({r.f.visits.length})</summary>
                <ul className="mt-2 text-sm">{r.f.visits.map((v, i) => (<li key={i}>{v.at}: {v.note}</li>))}</ul>
                <form className="mt-2 flex gap-2" onSubmit={(e) => {
                  e.preventDefault();
                  const text = (note[r.f.id] ?? "").trim();
                  if (!text) return;
                  updateFamily(r.f.id, (f) => ({ ...f, visits: [...f.visits, { at: s.asOfDate, note: text }] }));
                  setNote({ ...note, [r.f.id]: "" });
                }}>
                  <input value={note[r.f.id] ?? ""} onChange={(e) => setNote({ ...note, [r.f.id]: e.target.value })} placeholder={t("sh.visitNote")}
                    className="min-h-[2.75rem] flex-1 rounded-xl border-2 bg-transparent px-3" style={{ borderColor: "var(--border)" }} />
                  <button className="btn btn-ghost !min-h-[2.75rem] !px-4 !text-base" type="submit">{t("sh.addVisit")}</button>
                </form>
              </details>
            </li>
          );
        })}
      </ul>
    </>
  );
}
