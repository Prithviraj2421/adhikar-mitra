"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageTitle, useFamily } from "@/components/ui";
import { SmsPhone } from "@/components/SmsPhone";
import { confetti } from "@/components/fx";
import { generateHouseholds } from "@/lib/admin/synth";
import { SCHEMES, schemeById } from "@/lib/data";
import { PERSONAS, SHANTABAI } from "@/lib/demo/personas";
import { applyEvent, runDaily, travelTo } from "@/lib/demo/actions";
import type { EligibilityDiff, LifeEventType } from "@/lib/life-events";
import { LIFE_EVENT_TYPES } from "@/lib/life-events";
import { useT } from "@/lib/i18n";
import { DEMO_TODAY, loadPersona, patch, resetAll, setState, newFamily, type Family, type Role } from "@/lib/store";
import { QUESTIONS } from "@/lib/questionnaire/questions";

const DAY = 86400000;
const toDays = (d: string) => Math.round((Date.parse(d) - Date.parse(DEMO_TODAY)) / DAY);
const fromDays = (n: number) => new Date(Date.parse(DEMO_TODAY) + n * DAY).toISOString().slice(0, 10);

/** The Sahayak's 15 assigned families come from the synthetic ward data. */
function seedSahayakFamilies(): Family[] {
  return generateHouseholds().slice(0, 15).map((h, i) => {
    const base = newFamily(`${h.household.wardId.replace("ward-", "Ward ")} · Family ${i + 1}`, true, "verbal-via-sahayak");
    return {
      ...base, id: `syn-${h.household.id}`, syncKey: `sync-${h.household.id}`,
      household: { ...h.household, villageOrWard: h.household.wardId }, members: h.members, heldDocuments: h.held,
      q: { phase: "done" as const, idx: 0 },
      visits: i % 3 === 0 ? [{ at: "2026-11-10", note: "First visit: documents explained." }] : [],
    };
  });
}

export default function DemoPage() {
  const { t, locale, l } = useT();
  const router = useRouter();
  const { state, family } = useFamily();
  const [diff, setDiff] = useState<EligibilityDiff | null>(null);
  const [evType, setEvType] = useState<LifeEventType>("PREGNANCY");
  const [evMember, setEvMember] = useState("");
  const [evValue, setEvValue] = useState("");
  const [msg, setMsg] = useState("");

  const setRole = (role: Role) => {
    if (role === "SAHAYAK") {
      setState((s) => ({
        ...s, role, consent: true,
        families: s.families.some((f) => f.id.startsWith("syn-")) ? s.families : [...s.families, ...seedSahayakFamilies()],
      }));
      router.push(`/${locale}/sahayak`);
    } else if (role === "ADMIN") {
      patch({ role, consent: true });
      router.push(`/${locale}/admin`);
    } else patch({ role });
  };

  const evDef = LIFE_EVENT_TYPES.find((x) => x.id === evType)!;
  const member = family?.members.find((m) => m.id === (evMember || family.members[0]?.id));
  const days = toDays(state.asOfDate);

  const show = (d: EligibilityDiff | null) => {
    setDiff(d);
    if (d && d.gained.length + d.upgraded.length > 0) confetti();
  };

  const doEvent = () => {
    if (!family) return;
    const mid = evDef.needsMember ? (evMember || family.members[0]?.id) : undefined;
    const d = applyEvent({ type: evType, memberId: mid, value: evValue || (evDef.valueKind === "age" ? 60 : evDef.valueKind === "class" ? 8 : evDef.valueKind === "percent" ? 45 : evDef.valueKind === "occupation" ? "construction" : evDef.valueKind === "district" ? "Wardha" : undefined) }, locale);
    show(d);
  };

  const Btn = ({ children, onClick, testid }: { children: React.ReactNode; onClick: () => void; testid?: string }) => (
    <button className="btn btn-ghost !justify-start text-left !text-base" onClick={onClick} data-testid={testid}>{children}</button>
  );

  return (
    <>
      <PageTitle title={t("dm.title")} sub={t("dm.sub")} icon="🧪" />

      <section className="card mb-4">
        <h2 className="mb-2 text-lg font-bold">{t("dm.roles")}</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {PERSONAS.map((p, i) => (
            <Btn key={p.id} testid={`role-${p.id}`} onClick={() => { loadPersona(p); setDiff(null); router.push(`/${locale}/benefits`); }}>
              <span aria-hidden>{i === 0 ? "👵" : "🧑‍🌾"}</span> {t("dm.citizenN", { n: i + 1 })}: {p.title.split("·")[0]}
            </Btn>
          ))}
          <Btn testid="role-sahayak" onClick={() => setRole("SAHAYAK")}>🧑‍🤝‍🧑 {t("dm.sahayak")}</Btn>
          <Btn testid="role-admin" onClick={() => setRole("ADMIN")}>🗺️ {t("dm.admin")}</Btn>
        </div>
        <p className="muted mt-2 text-sm">{t("dm.noPasswords")}</p>
      </section>

      <section className="card mb-4" aria-labelledby="tt">
        <h2 id="tt" className="mb-1 text-lg font-bold">⏳ {t("dm.timeTravel")}</h2>
        <p className="muted mb-2 text-sm">{t("dm.timeHelp")}</p>
        <p className="grad-text mb-3 text-5xl font-extrabold tracking-tight" data-testid="asof">{state.asOfDate}</p>
        <input
          type="range" min={0} max={365 * 5} step={1} value={Math.max(0, days)} aria-label={t("dm.timeTravel")} data-testid="time-slider"
          className="track w-full" onChange={(e) => show(travelTo(fromDays(Number(e.target.value)), locale))}
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <button className="btn btn-ghost !min-h-[3rem] !text-base" onClick={() => patch({ asOfDate: DEMO_TODAY })}>{t("dm.today")}</button>
          <button className="btn btn-accent !min-h-[3rem] !text-base" data-testid="jump-60"
            onClick={() => { loadPersona(SHANTABAI); patch({ asOfDate: DEMO_TODAY }); show(travelTo("2028-03-14", locale)); }}>
            🎂 {t("dm.jump60")}
          </button>
        </div>
        {diff && (
          <div className="mt-3 rounded-2xl p-3" style={{ background: "var(--success-soft)" }} data-testid="diff" role="status">
            <p className="font-bold">{t("le.title")}</p>
            {diff.gained.length + diff.upgraded.length + diff.lost.length === 0 ? <p>{t("le.nothing")}</p> : (
              <ul className="list-disc pl-5">
                {[...diff.gained, ...diff.upgraded].map((g) => (
                  <li key={g.schemeId + g.memberId}>✅ {t("le.new", { scheme: l(schemeById(g.schemeId)!.name), name: family?.members.find((m) => m.id === g.memberId)?.name.split(" ")[0] ?? "" })}</li>
                ))}
                {diff.lost.map((g) => (<li key={`l${g.schemeId}${g.memberId}`}>⚠️ {t("le.lost", { scheme: l(schemeById(g.schemeId)!.name) })}</li>))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section className="card mb-4" aria-labelledby="le">
        <h2 id="le" className="mb-2 text-lg font-bold">🎯 {t("dm.eventSim")}</h2>
        {!family ? <p className="muted">{t("family.none")}</p> : (
          <div className="grid gap-3">
            <label className="text-sm font-semibold">{t("dm.eventType")}
              <select value={evType} onChange={(e) => { setEvType(e.target.value as LifeEventType); setEvValue(""); }} data-testid="event-type"
                className="mt-1 min-h-[3rem] w-full rounded-xl border-2 bg-[var(--card)] px-3 font-normal" style={{ borderColor: "var(--border)" }}>
                {LIFE_EVENT_TYPES.map((x) => (<option key={x.id} value={x.id}>{x.icon} {x.label[locale]}</option>))}
              </select>
            </label>
            {evDef.needsMember && (
              <label className="text-sm font-semibold">{t("dm.eventMember")}
                <select value={evMember || family.members[0]?.id} onChange={(e) => setEvMember(e.target.value)} data-testid="event-member"
                  className="mt-1 min-h-[3rem] w-full rounded-xl border-2 bg-[var(--card)] px-3 font-normal" style={{ borderColor: "var(--border)" }}>
                  {family.members.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
                </select>
              </label>
            )}
            {["age", "class", "percent", "district"].includes(evDef.valueKind) && (
              <label className="text-sm font-semibold">{t(`dm.value.${evDef.valueKind}`)}
                <input value={evValue} onChange={(e) => setEvValue(e.target.value)} data-testid="event-value"
                  placeholder={evDef.valueKind === "age" ? "60" : evDef.valueKind === "class" ? "8" : evDef.valueKind === "percent" ? "45" : "Wardha"}
                  className="mt-1 min-h-[3rem] w-full rounded-xl border-2 bg-transparent px-3 font-normal" style={{ borderColor: "var(--border)" }} />
              </label>
            )}
            {evDef.valueKind === "occupation" && (
              <label className="text-sm font-semibold">{t("dm.value.occupation")}
                <select value={evValue || "construction"} onChange={(e) => setEvValue(e.target.value)}
                  className="mt-1 min-h-[3rem] w-full rounded-xl border-2 bg-[var(--card)] px-3 font-normal" style={{ borderColor: "var(--border)" }}>
                  {QUESTIONS.q_occupation.options!.map((o) => (<option key={String(o.value)} value={String(o.value)}>{t(`opt.q_occupation.${o.value}`)}</option>))}
                </select>
              </label>
            )}
            <button className="btn btn-accent" onClick={doEvent} data-testid="apply-event">{t("dm.applyEvent")}{member && evDef.needsMember ? ` · ${member.name.split(" ")[0]}` : ""}</button>
          </div>
        )}
        {state.lifeLog.length > 0 && (
          <ul className="mt-3 text-sm" aria-label={t("le.log")}>
            {state.lifeLog.slice(0, 5).map((x) => (<li key={x.at}>🕒 {x.asOf}: {x.text}</li>))}
          </ul>
        )}
      </section>

      <section className="card mb-4">
        <h2 className="mb-2 text-lg font-bold">🔔 {t("dm.daily")}</h2>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" data-testid="run-daily" onClick={() => {
            const n = runDaily(locale);
            setMsg(t("dm.dailyDone", { n: n.length }));
          }}>{t("dm.runDaily")}</button>
          <button className="btn btn-ghost" data-testid="reset" onClick={() => { if (window.confirm(t("dm.resetConfirm"))) { resetAll(); window.location.href = "/"; } }}>{t("dm.reset")}</button>
        </div>
        {msg && <p className="mt-2 font-semibold" role="status">{msg}</p>}
        <p className="muted mt-2 text-sm">{t("dm.schemes", { n: SCHEMES.length })}</p>
      </section>

      <SmsPhone householdId={family?.household.id} />
    </>
  );
}
