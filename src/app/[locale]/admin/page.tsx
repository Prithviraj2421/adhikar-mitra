"use client";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageTitle, Rupees } from "@/components/ui";
import { SmsPhone } from "@/components/SmsPhone";
import { WARDS, buildAdminData, generateHouseholds } from "@/lib/admin/synth";
import { DOCUMENTS, schemeById } from "@/lib/data";
import { useT } from "@/lib/i18n";
import { campNotif } from "@/lib/notifications";
import { addNotifs, setState, useAppState, type Camp } from "@/lib/store";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false, loading: () => <p className="muted">…</p> });

const gapColor = (g: number) => `hsl(${Math.round(120 - 120 * Math.min(1, g))} 70% 38%)`;
const CATS = ["PENSION", "HEALTH", "HOUSING", "FARMER", "WOMEN", "STUDENT", "WORKER", "INSURANCE", "ENERGY"];

export default function AdminPage() {
  const { t, l, locale } = useT();
  const s = useAppState();
  const [wardFilter, setWardFilter] = useState("");
  const [cat, setCat] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [campWard, setCampWard] = useState("ward-7");
  const [campDoc, setCampDoc] = useState("income-certificate");
  const [campDate, setCampDate] = useState("2026-12-05");
  const [campMsg, setCampMsg] = useState("");

  const data = useMemo(
    () => buildAdminData(s.asOfDate, { wardIds: wardFilter ? [wardFilter] : undefined, category: cat || undefined }),
    [s.asOfDate, wardFilter, cat],
  );
  const sel = data.wards.find((w) => w.ward.id === (selected ?? "")) ?? [...data.wards].sort((a, b) => b.gapIndex - a.gapIndex)[0];

  const schemeRows = data.uptakeByScheme.map((x) => ({ name: l(schemeById(x.schemeId)!.name).slice(0, 22), eligible: x.eligible, applied: x.applied }))
    .sort((a, b) => b.eligible - a.eligible).slice(0, 8);
  const catRows = data.uptakeByCategory.map((x) => ({ name: t(`cat.${x.category}`), eligible: x.eligible, applied: x.applied }));

  const csv = () => {
    const head = ["ward", "households", "eligible", "applied", "not_applied", "gap_index", "value_inr", "submitted", "approved", "top_blockers"];
    const rows = data.wards.map((w) => [
      w.ward.name, w.households, w.eligibleInstances, w.appliedInstances, w.notApplied, w.gapIndex.toFixed(2), w.valueIdentifiedINR, w.submitted, w.approved,
      w.topBlockingDocs.map((d) => `${DOCUMENTS.find((x) => x.id === d.documentTypeId)?.name.en}:${d.count}`).join(" | "),
    ]);
    const text = [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
    a.download = "benefit-gap-by-ward.csv";
    a.click();
  };

  /** Creates a CampEvent and sends an SMS (simulated) to every household in that ward still missing the document. */
  const planCamp = () => {
    const ward = WARDS.find((w) => w.id === campWard)!;
    const stats = buildAdminData(s.asOfDate).wards.find((w) => w.ward.id === campWard)!;
    const affected = stats.families.filter((f) => f.missingKeys.some((k) => k.startsWith(`${campDoc}|`)));
    const id = `camp-${Date.now().toString(36)}`;
    const camp: Camp = {
      id, wardId: campWard, title: `${l(DOCUMENTS.find((d) => d.id === campDoc)!.name)} camp`, focusDocumentTypeId: campDoc,
      date: campDate, location: `${ward.name} community hall (sample)`, notified: affected.length,
    };
    setState((x) => ({ ...x, camps: [...x.camps, camp] }));
    addNotifs(affected.map((f) => campNotif({ date: campDate, place: camp.location, docId: campDoc }, locale, f.id, id)));
    setCampMsg(t("ad.campCreated", { n: affected.length, ward: ward.name }));
  };

  const hh = generateHouseholds().length;

  return (
    <>
      <PageTitle title={t("ad.title")} sub={t("ad.sub")} icon="🗺️" />
      <p className="mb-4 rounded-2xl p-3 text-sm font-bold" style={{ background: "var(--warn-soft)" }} role="note">⚠️ {t("ad.synthetic")}</p>

      <div className="mb-4 flex flex-wrap gap-3">
        <label className="text-sm font-semibold">{t("ad.ward")}
          <select value={wardFilter} onChange={(e) => setWardFilter(e.target.value)} data-testid="ward-filter"
            className="ml-2 min-h-[3rem] rounded-xl border-2 bg-[var(--card)] px-3 font-normal" style={{ borderColor: "var(--border)" }}>
            <option value="">{t("ad.allWards")}</option>
            {WARDS.map((w) => (<option key={w.id} value={w.id}>{w.name}</option>))}
          </select>
        </label>
        <label className="text-sm font-semibold">{t("ad.category")}
          <select value={cat} onChange={(e) => setCat(e.target.value)} data-testid="cat-filter"
            className="ml-2 min-h-[3rem] rounded-xl border-2 bg-[var(--card)] px-3 font-normal" style={{ borderColor: "var(--border)" }}>
            <option value="">{t("ad.allCategories")}</option>
            {CATS.map((c) => (<option key={c} value={c}>{t(`cat.${c}`)}</option>))}
          </select>
        </label>
        <button className="btn btn-ghost !min-h-[3rem] !text-base" onClick={csv} data-testid="csv">⬇ {t("ad.exportCsv")}</button>
      </div>

      <section className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4" aria-label={t("ad.stats")}>
        {[
          [t("ad.households"), String(data.totals.households), "tile-households"],
          [t("ad.value"), "", "tile-value"],
          [t("ad.submitted"), String(data.totals.submitted), "tile-submitted"],
          [t("ad.approved"), String(data.totals.approved), "tile-approved"],
        ].map(([label, v, id], i) => (
          <div key={id} className="card text-center" data-testid={id}>
            <p className="muted text-sm">{label}</p>
            <p className="text-2xl font-extrabold">{i === 1 ? <Rupees n={data.totals.valueINR} /> : v}</p>
          </div>
        ))}
      </section>
      <p className="muted -mt-2 mb-4 text-xs">{t("ad.synthTotal", { n: hh })} · {t("common.estimated")}</p>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-1 text-xl font-bold">{t("ad.gapMap")}</h2>
          <p className="muted mb-2 text-sm">{t("ad.gapHelp")}</p>
          <MapView
            ariaLabel={t("ad.gapMap")} height={380} zoom={11}
            points={data.wards.map((w) => ({
              id: w.ward.id, lat: w.ward.lat, lng: w.ward.lng, radius: 14 + w.households / 2, color: gapColor(w.gapIndex),
              label: `${w.ward.name}: ${Math.round(w.gapIndex * 100)}%`, detail: t("ad.gapIndex"), onClick: () => setSelected(w.ward.id),
            }))}
          />
          <div className="mt-2 flex items-center gap-2 text-xs" aria-hidden>
            <span>0%</span><div className="h-3 flex-1 rounded-full" style={{ background: "linear-gradient(90deg,hsl(120 70% 38%),hsl(60 70% 38%),hsl(0 70% 38%))" }} /><span>100%</span>
          </div>
        </section>

        <section className="card" data-testid="ward-detail">
          {sel ? (
            <>
              <h2 className="mb-1 text-xl font-bold">{sel.ward.name}</h2>
              <p className="text-3xl font-extrabold" style={{ color: gapColor(sel.gapIndex) }} data-testid="gap-index">{Math.round(sel.gapIndex * 100)}%</p>
              <p className="muted text-sm">{t("ad.gapIndex")} · {sel.notApplied}/{sel.eligibleInstances} {t("ad.notApplied")}</p>
              <h3 className="mb-1 mt-4 font-bold">{t("ad.topBlockers")}</h3>
              <ol className="list-decimal pl-6" data-testid="blockers">
                {sel.topBlockingDocs.map((d) => (<li key={d.documentTypeId}>{l(DOCUMENTS.find((x) => x.id === d.documentTypeId)!.name)} · {d.count}</li>))}
              </ol>
            </>
          ) : <p className="muted">{t("ben.none")}</p>}
        </section>
      </div>

      <section className="card mt-4 overflow-x-auto">
        <h2 className="mb-2 text-xl font-bold">{t("ad.wardTable")}</h2>
        <table className="w-full text-left text-sm">
          <thead><tr>{[t("ad.ward"), t("ad.households"), t("ad.gapIndex"), t("ad.submitted"), t("ad.approved"), t("ad.topBlockers")].map((h) => (<th key={h} className="p-2">{h}</th>))}</tr></thead>
          <tbody>
            {[...data.wards].sort((a, b) => b.gapIndex - a.gapIndex).map((w) => (
              <tr key={w.ward.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                <td className="p-2 font-semibold">{w.ward.name}</td><td className="p-2">{w.households}</td>
                <td className="p-2 font-bold" style={{ color: gapColor(w.gapIndex) }}>{Math.round(w.gapIndex * 100)}%</td>
                <td className="p-2">{w.submitted}</td><td className="p-2">{w.approved}</td>
                <td className="p-2">{w.topBlockingDocs.map((d) => l(DOCUMENTS.find((x) => x.id === d.documentTypeId)!.name)).join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {[[t("ad.byScheme"), schemeRows], [t("ad.byCategory"), catRows]].map(([title, rows]) => (
          <section key={title as string} className="card" aria-label={title as string}>
            <h2 className="mb-2 text-xl font-bold">{title as string}</h2>
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows as typeof schemeRows} margin={{ left: -10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" interval={0} angle={-30} textAnchor="end" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip /><Legend verticalAlign="top" />
                  <Bar dataKey="eligible" name={t("ad.eligible")} fill="#3730a3" />
                  <Bar dataKey="applied" name={t("ad.applied")} fill="#ea580c" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        ))}
      </div>

      <section className="card mt-4" aria-labelledby="camp">
        <h2 id="camp" className="mb-2 text-xl font-bold">⛺ {t("ad.planCamp")}</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <label className="text-sm font-semibold">{t("ad.ward")}
            <select value={campWard} onChange={(e) => setCampWard(e.target.value)} data-testid="camp-ward" className="mt-1 min-h-[3rem] w-full rounded-xl border-2 bg-[var(--card)] px-3 font-normal" style={{ borderColor: "var(--border)" }}>
              {WARDS.map((w) => (<option key={w.id} value={w.id}>{w.name}</option>))}
            </select>
          </label>
          <label className="text-sm font-semibold">{t("ad.focusDoc")}
            <select value={campDoc} onChange={(e) => setCampDoc(e.target.value)} data-testid="camp-doc" className="mt-1 min-h-[3rem] w-full rounded-xl border-2 bg-[var(--card)] px-3 font-normal" style={{ borderColor: "var(--border)" }}>
              {DOCUMENTS.filter((d) => ["income-certificate", "caste-certificate", "domicile-certificate", "bank-account-aadhaar-seeded", "ration-card"].includes(d.id)).map((d) => (<option key={d.id} value={d.id}>{l(d.name)}</option>))}
            </select>
          </label>
          <label className="text-sm font-semibold">{t("ad.campDate")}
            <input type="date" value={campDate} onChange={(e) => setCampDate(e.target.value)} className="mt-1 min-h-[3rem] w-full rounded-xl border-2 bg-transparent px-3 font-normal" style={{ borderColor: "var(--border)" }} />
          </label>
          <button className="btn btn-accent self-end" onClick={planCamp} data-testid="plan-camp">{t("ad.createCamp")}</button>
        </div>
        {campMsg && <p className="mt-3 font-bold" role="status" data-testid="camp-msg">{campMsg}</p>}
        {s.camps.length > 0 && (
          <ul className="mt-2 text-sm">{s.camps.map((c) => (<li key={c.id}>📍 {c.title} · {c.date} · {t("ad.notified", { n: c.notified })}</li>))}</ul>
        )}
        <div className="mt-4"><SmsPhone /></div>
      </section>
    </>
  );
}
