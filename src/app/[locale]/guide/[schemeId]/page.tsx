"use client";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Disclaimer, EmptyFamily, PageTitle, ReadAloud, SafeLink, useFamily } from "@/components/ui";
import { DOCUMENTS, schemeById } from "@/lib/data";
import { newApplication } from "@/lib/tracker";
import { useT } from "@/lib/i18n";
import { updateFamily } from "@/lib/store";
import centres from "@data/help-centres.json";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false, loading: () => <p className="muted">…</p> });

function Guide({ schemeId }: { schemeId: string }) {
  const { t, l, locale } = useT();
  const router = useRouter();
  const sp = useSearchParams();
  const { state, family } = useFamily();
  const scheme = schemeById(schemeId);
  if (!family) return <EmptyFamily />;
  if (!scheme) return <p>{t("common.notFound")}</p>;
  const memberId = sp.get("m") ?? family.members[0].id;
  const member = family.members.find((m) => m.id === memberId) ?? family.members[0];
  const online = scheme.application.modes.find((m) => m.type === "ONLINE");
  const offline = scheme.application.modes.find((m) => m.type === "OFFLINE");
  const existing = family.applications.find((a) => a.schemeId === schemeId && a.memberId === member.id);
  const relevantTypes = new Set(offline && "officeTypes" in offline ? offline.officeTypes : []);
  const nearby = centres.centres.filter((c) => relevantTypes.has(c.type) || ["CSC", "AAPLE_SARKAR_KENDRA"].includes(c.type));

  const speakText = [
    l(scheme.name),
    ...scheme.application.steps.map((s, i) => `${i + 1}. ${l(s)}`),
    t("guide.counterText", { scheme: l(scheme.name) }),
  ].join(". ");

  const start = () => {
    if (!existing) updateFamily(family.id, (f) => ({ ...f, applications: [...f.applications, newApplication(schemeId, member.id, state.asOfDate)] }));
    router.push(`/${locale}/tracker`);
  };

  return (
    <>
      <PageTitle title={t("guide.title", { scheme: l(scheme.name) })} sub={member.name} icon="🧭" />
      <div className="mb-4"><Disclaimer /></div>

      <section className="card mb-4">
        <div className="mb-2 flex items-center justify-between"><h2 className="text-xl font-bold">{t("guide.steps")}</h2><ReadAloud compact text={speakText} /></div>
        <ol className="flex flex-col gap-3">
          {scheme.application.steps.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold" style={{ background: "var(--primary)", color: "var(--primary-fg)" }}>{i + 1}</span>
              <span className="text-lg">{l(s)}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 rounded-2xl p-3 font-semibold" style={{ background: "var(--success-soft)" }}>🛡️ {t("footer.noMoney")} {t("guide.free")}</p>
      </section>

      <section className="card mb-4">
        <h2 className="mb-2 text-xl font-bold">{t("guide.where")}</h2>
        {online && <p className="mb-2"><span className="font-semibold">{t("guide.online")}: </span><SafeLink href={online.url}>{t("guide.openPortal")}</SafeLink></p>}
        {offline && "officeTypes" in offline && (
          <p><span className="font-semibold">{t("guide.offline")}: </span>{offline.officeTypes.map((o) => t(`office.${o}`)).join(", ")}</p>
        )}
      </section>

      <section className="card mb-4">
        <h2 className="mb-2 text-xl font-bold">{t("guide.carry")}</h2>
        <ul className="list-disc pl-6">
          {scheme.requiredDocuments.map((id) => (<li key={id}>{l(DOCUMENTS.find((d) => d.id === id)!.name)}</li>))}
        </ul>
      </section>

      <section className="card mb-4">
        <h2 className="mb-2 text-xl font-bold">🗣️ {t("guide.counter")}</h2>
        <p className="text-lg italic">“{t("guide.counterText", { scheme: l(scheme.name) })}”</p>
      </section>

      <section className="card mb-4">
        <h2 className="mb-1 text-xl font-bold">{t("guide.helpCentres")}</h2>
        <p className="mb-3 rounded-xl p-2 text-sm font-semibold" style={{ background: "var(--warn-soft)" }}>{t("guide.sampleNote")}</p>
        <MapView
          ariaLabel={t("guide.helpCentres")}
          points={nearby.map((c) => ({ id: c.id, lat: c.lat, lng: c.lng, label: c.name, detail: t(`office.${c.type}`), color: "#ea580c" }))}
        />
        <ul className="mt-3 text-sm">{nearby.map((c) => (<li key={c.id}>📍 {c.name} · {t(`office.${c.type}`)}</li>))}</ul>
      </section>

      <button className="btn btn-accent w-full" onClick={start} data-testid="start-tracking">
        {existing ? t("guide.viewTracker") : t("guide.startTracking")}
      </button>
    </>
  );
}

export default function Page({ params }: { params: { schemeId: string } }) {
  return (<Suspense fallback={null}><Guide schemeId={params.schemeId} /></Suspense>);
}
