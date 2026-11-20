"use client";
import Link from "next/link";
import { EmptyFamily, PageTitle, useFamily } from "@/components/ui";
import { SmsPhone } from "@/components/SmsPhone";
import { schemeById } from "@/lib/data";
import { useT } from "@/lib/i18n";
import { statusNotif } from "@/lib/notifications";
import { addNotifs, updateFamily } from "@/lib/store";
import { moveStatus, newApplication, nextActionFor, STATUSES, STATUS_LABEL, type AppStatus, type Application } from "@/lib/tracker";

export default function TrackerPage() {
  const { t, l, locale } = useT();
  const { state, family, benefits } = useFamily();
  if (!family) return (<><PageTitle title={t("trk.title")} icon="📋" /><EmptyFamily /></>);
  const asOf = state.asOfDate;

  const patchApp = (id: string, fn: (a: Application) => Application) =>
    updateFamily(family.id, (f) => ({ ...f, applications: f.applications.map((a) => (a.id === id ? fn(a) : a)) }));

  const setStatus = (a: Application, to: AppStatus) => {
    const next = moveStatus(a, to, asOf);
    patchApp(a.id, () => next);
    const m = family.members.find((x) => x.id === a.memberId);
    addNotifs([statusNotif(next, locale, m?.name ?? "", asOf, family.household.id)]);
  };

  const startable = (benefits?.map.entries ?? []).filter(
    (e) => e.status !== "NOT_ELIGIBLE" && !family.applications.some((a) => a.schemeId === e.schemeId && a.memberId === e.memberId),
  );

  return (
    <>
      <PageTitle title={t("trk.title")} sub={family.label} icon="📋" />
      <p className="mb-4 rounded-2xl p-3 text-sm font-semibold" style={{ background: "var(--warn-soft)" }} role="note">ℹ️ {t("trk.noSync")}</p>

      {family.applications.length === 0 && <p className="card muted mb-4">{t("trk.none")}</p>}
      <ul className="flex flex-col gap-4">
        {family.applications.map((a) => {
          const s = schemeById(a.schemeId);
          const m = family.members.find((x) => x.id === a.memberId);
          const idx = STATUSES.indexOf(a.status);
          return (
            <li key={a.id} className="card" data-testid={`app-${a.schemeId}-${a.memberId}`}>
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-bold">{s ? l(s.name) : a.schemeId}</p>
                  <p className="muted text-sm">{m?.name}</p>
                </div>
                <span className="chip" style={a.status === "REJECTED" ? { background: "var(--danger-soft)", color: "var(--danger)" } : a.status === "PAYMENT_RECEIVED" ? { background: "var(--success-soft)", color: "var(--success)" } : undefined} data-testid="status-chip">
                  {a.status === "REJECTED" ? "✗" : "●"} {l(STATUS_LABEL[a.status])}
                </span>
              </div>

              <ol className="my-3 flex flex-wrap gap-1 text-xs" aria-label={t("trk.timeline")}>
                {STATUSES.filter((x) => x !== "REJECTED").map((st, i) => (
                  <li key={st} className="rounded-full px-2 py-1" style={{ background: a.status !== "REJECTED" && i <= idx ? "var(--success-soft)" : "var(--border)" }}>
                    {a.status !== "REJECTED" && i <= idx ? "✓ " : ""}{l(STATUS_LABEL[st])}
                  </li>
                ))}
              </ol>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-semibold">{t("trk.reference")}
                  <input value={a.referenceNumber ?? ""} onChange={(e) => patchApp(a.id, (x) => ({ ...x, referenceNumber: e.target.value }))}
                    className="mt-1 min-h-[3rem] w-full rounded-xl border-2 bg-transparent px-3 font-normal" style={{ borderColor: "var(--border)" }} />
                </label>
                <label className="text-sm font-semibold">{t("trk.deadline")}
                  <input type="date" value={a.deadline ?? ""} onChange={(e) => patchApp(a.id, (x) => ({ ...x, deadline: e.target.value || undefined }))}
                    className="mt-1 min-h-[3rem] w-full rounded-xl border-2 bg-transparent px-3 font-normal" style={{ borderColor: "var(--border)" }} />
                </label>
                <label className="text-sm font-semibold sm:col-span-2">{t("trk.nextAction")}
                  <input
                    value={a.nextAction ?? ""} placeholder={nextActionFor(a.status)?.[locale] ?? ""}
                    onChange={(e) => patchApp(a.id, (x) => ({ ...x, nextAction: e.target.value }))}
                    className="mt-1 min-h-[3rem] w-full rounded-xl border-2 bg-transparent px-3 font-normal" style={{ borderColor: "var(--border)" }} />
                </label>
              </div>

              <label className="mt-3 block text-sm font-semibold">{t("trk.updateStatus")}
                <select
                  value={a.status} onChange={(e) => setStatus(a, e.target.value as AppStatus)} data-testid="status-select"
                  className="mt-1 min-h-[3.25rem] w-full rounded-xl border-2 bg-[var(--card)] px-3 font-normal" style={{ borderColor: "var(--border)" }}>
                  {STATUSES.map((st) => (<option key={st} value={st}>{l(STATUS_LABEL[st])}</option>))}
                </select>
              </label>

              {a.status === "REJECTED" && (
                <Link className="btn btn-accent mt-3 w-full" href={`/${locale}/decoder?app=${a.id}`} data-testid="decode">🔎 {t("trk.decode")}</Link>
              )}

              <details className="mt-3">
                <summary className="cursor-pointer font-semibold">{t("trk.history")}</summary>
                <ul className="mt-2 text-sm">
                  {a.events.map((e, i) => (<li key={i}>{e.at} · {e.from ? `${l(STATUS_LABEL[e.from])} → ` : ""}{l(STATUS_LABEL[e.to])}</li>))}
                </ul>
              </details>
            </li>
          );
        })}
      </ul>

      {startable.length > 0 && (
        <section className="card mt-4">
          <h2 className="mb-2 text-lg font-bold">{t("trk.startNew")}</h2>
          <ul className="flex flex-col gap-2">
            {startable.slice(0, 8).map((e) => {
              const m = family.members.find((x) => x.id === e.memberId)!;
              return (
                <li key={`${e.schemeId}${e.memberId}`}>
                  <button className="btn btn-ghost w-full !justify-between text-left !text-base"
                    onClick={() => updateFamily(family.id, (f) => ({ ...f, applications: [...f.applications, newApplication(e.schemeId, e.memberId, asOf)] }))}>
                    <span>{l(schemeById(e.schemeId)!.name)} · {m.name.split(" ")[0]}</span><span aria-hidden>＋</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="mt-6"><SmsPhone householdId={family.household.id} /></section>
    </>
  );
}
