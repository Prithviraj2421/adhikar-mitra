"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { QuestionCard } from "@/components/QuestionCard";
import { PageTitle, useFamily } from "@/components/ui";
import { useT } from "@/lib/i18n";
import {
  QUESTIONS, autoDefaults, householdQuestions, memberQuestions, presetSkips, relationGender,
} from "@/lib/questionnaire/questions";
import { enqueueFamily } from "@/lib/offline/client";
import { newFamily, setState, updateFamily, useReady } from "@/lib/store";
import type { Member } from "@/lib/eligibility/types";

type Value = string | number | boolean | null;
const PRESETS = ["SPOUSE", "SON", "DAUGHTER", "MOTHER", "FATHER"] as const;

function blankMember(n: number, relation?: string): Member {
  return { id: `m${n}-${Math.random().toString(36).slice(2, 6)}`, name: "", dob: "", relation, gender: relationGender(relation) };
}

function Wizard() {
  const { t, locale } = useT();
  const router = useRouter();
  const sp = useSearchParams();
  const followup = sp.get("mode") === "followup";
  const { state, family, benefits } = useFamily();
  const asOf = state.asOfDate;
  const ready = useReady();

  // Follow-up queue is frozen at mount so it does not shift while answering.
  const [queue, setQueue] = useState<{ memberId: string | null; qid: string }[] | null>(null);
  const [qi, setQi] = useState(0);
  const hhQs = useMemo(() => householdQuestions(), []);

  // First visit: need consent, then create this household.
  useEffect(() => {
    if (followup || family || !ready) return;
    if (!state.consent) {
      router.replace(`/${locale}/consent`);
      return;
    }
    const f = newFamily("My family", false, "self");
    setState((s) => ({ ...s, families: [...s.families, f], activeId: f.id }));
  }, [followup, family, ready, state.consent, router, locale]);

  useEffect(() => {
    if (!followup || queue || !benefits || !family) return;
    const seen = new Set<string>();
    const out: { memberId: string | null; qid: string }[] = [];
    for (const e of benefits.map.entries) {
      if (e.status !== "LIKELY_ELIGIBLE") continue;
      for (const qid of e.missingQuestions) {
        const q = QUESTIONS[qid];
        if (!q) continue;
        const mid = q.scope === "household" ? null : e.memberId;
        const k = `${mid}|${qid}`;
        if (!seen.has(k)) {
          seen.add(k);
          out.push({ memberId: mid, qid });
        }
      }
    }
    setQueue(out);
  }, [followup, queue, benefits, family]);

  if (!family) return <p className="muted">{t("common.loading")}</p>;

  const finish = () => {
    updateFamily(family.id, (f) => ({ ...f, q: { phase: "done", idx: 0 } }));
    // Assisted (Sahayak) families are queued for sync; this works offline and is idempotent per family.
    if (family.assisted) void enqueueFamily(family);
    router.push(`/${locale}/${family.assisted ? "sahayak" : "benefits"}`);
  };

  /* ------------------------------------------------------------ follow-up */
  if (followup) {
    if (!queue) return <p className="muted">{t("common.loading")}</p>;
    if (qi >= queue.length) {
      return (
        <div className="card text-center">
          <p className="mb-4 text-xl font-bold">{t("q.followupDone")}</p>
          <button className="btn btn-primary" onClick={() => router.push(`/${locale}/benefits`)}>{t("q.finish")}</button>
        </div>
      );
    }
    const item = queue[qi];
    const q = QUESTIONS[item.qid];
    const m = family.members.find((x) => x.id === item.memberId);
    const answer = (v: Value) => {
      updateFamily(family.id, (f) => {
        if (q.scope === "household") return { ...f, household: { ...f.household, [q.field]: v } };
        return {
          ...f,
          members: f.members.map((x) => (x.id === item.memberId ? { ...x, [q.field]: q.field === "dob" && v === null ? "" : v } : x)),
        };
      });
      setQi(qi + 1);
    };
    return (
      <>
        <PageTitle title={t("q.followupTitle")} sub={t("q.followupSub", { n: queue.length - qi })} icon="🔎" />
        <QuestionCard key={`${item.memberId}-${item.qid}`} q={q} memberName={m?.name.split(" ")[0]} asOf={asOf} onAnswer={answer} progress={qi / queue.length} />
      </>
    );
  }

  /* ----------------------------------------------------------- main flow */
  const phase = family.q.phase;
  const hhTotal = hhQs.length;

  if (phase === "household") {
    const q = hhQs[family.q.idx];
    if (!q) return null;
    const answer = (v: Value) => {
      updateFamily(family.id, (f) => {
        const household = { ...f.household, [q.field]: v };
        const next = f.q.idx + 1;
        if (next >= hhTotal && f.members.length > 0) return { ...f, household, q: { phase: "done", idx: 0 } }; // re-doing household facts
        if (next >= hhTotal) {
          // Household facts done: start with the first family member (Self).
          const first = blankMember(1, "SELF");
          return { ...f, household, members: [first], q: { phase: "members", idx: 0, memberId: first.id, asked: [], skip: presetSkips("SELF") } };
        }
        return { ...f, household, q: { ...f.q, idx: next } };
      });
    };
    const back = family.q.idx > 0 ? () => updateFamily(family.id, (f) => ({ ...f, q: { ...f.q, idx: f.q.idx - 1 } })) : undefined;
    return (
      <>
        <PageTitle title={t("q.household")} icon="🏠" />
        <QuestionCard key={q.id} q={q} asOf={asOf} onAnswer={answer} onBack={back} progress={family.q.idx / (hhTotal + 8)} />
      </>
    );
  }

  if (phase === "members") {
    const m = family.members.find((x) => x.id === family.q.memberId);
    if (!m) return null;
    const asked = family.q.asked ?? [];
    const qs = memberQuestions(m, asOf, asked, family.q.skip ?? []);

    if (qs.length === 0) {
      // "Add another member?" screen with quick presets.
      const used = new Set(family.members.map((x) => x.relation));
      const addPreset = (rel?: string) => {
        const nm = blankMember(family.members.length + 1, rel);
        updateFamily(family.id, (f) => ({
          ...f, members: [...f.members, nm], q: { phase: "members", idx: 0, memberId: nm.id, asked: [], skip: presetSkips(rel) },
        }));
      };
      return (
        <>
          <PageTitle title={t("q.addMember")} icon="👨‍👩‍👧" />
          <div className="card">
            <p className="mb-3 text-lg">
              {t("q.membersSoFar", { n: family.members.length })}: {family.members.map((x) => x.name.split(" ")[0]).join(", ")}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {PRESETS.filter((p) => (p === "SPOUSE" ? !used.has("SPOUSE") : true)).map((p) => (
                <button key={p} className="btn btn-ghost !flex-col !py-3" onClick={() => addPreset(p)} data-testid={`add-${p}`}>
                  <span aria-hidden className="text-3xl">{QUESTIONS.q_relation.options!.find((o) => o.value === p)!.icon}</span>
                  <span>{t(`opt.q_relation.${p}`)}</span>
                </button>
              ))}
              <button className="btn btn-ghost !flex-col !py-3" onClick={() => addPreset(undefined)}>
                <span aria-hidden className="text-3xl">👤</span><span>{t("q.otherMember")}</span>
              </button>
            </div>
            <button className="btn btn-accent mt-4 w-full" onClick={finish} data-testid="finish">{t("q.seeBenefits")}</button>
          </div>
        </>
      );
    }

    const q = qs[0];
    const first = m.name.split(" ")[0] || undefined;
    const answer = (v: Value) => {
      updateFamily(family.id, (f) => {
        const head = f.members.find((x) => x.relation === "SELF" && x.id !== m.id);
        const cur = f.members.find((x) => x.id === m.id)!;
        let nm = { ...cur, [q.field]: q.field === "dob" && v === null ? "" : v } as Member;
        if (q.id === "q_relation" && v === "SELF" && head) nm.relation = undefined; // only one "Self"
        nm = autoDefaults(nm, head, asOf);
        return {
          ...f, members: f.members.map((x) => (x.id === m.id ? nm : x)),
          q: { ...f.q, asked: [...(f.q.asked ?? []), q.id] },
        };
      });
    };
    const back = asked.length > 0
      ? () => updateFamily(family.id, (f) => ({ ...f, q: { ...f.q, asked: (f.q.asked ?? []).slice(0, -1) } }))
      : undefined;
    const total = qs.length + asked.length;
    return (
      <>
        <PageTitle title={t("q.memberN", { n: family.members.findIndex((x) => x.id === m.id) + 1 })} icon="🧑" />
        <QuestionCard
          key={`${m.id}-${q.id}`} q={q} memberName={q.id === "q_name" ? undefined : first} asOf={asOf}
          onAnswer={answer} onBack={back} progress={(hhTotal + asked.length) / (hhTotal + total + 1)}
        />
      </>
    );
  }

  // phase === "done"
  return (
    <div className="card text-center">
      <p className="mb-4 text-xl font-bold">{t("q.alreadyDone")}</p>
      <div className="flex flex-col gap-3">
        <button className="btn btn-primary" onClick={() => router.push(`/${locale}/benefits`)}>{t("q.seeBenefits")}</button>
        <button className="btn btn-ghost" onClick={() => updateFamily(family.id, (f) => ({ ...f, q: { phase: "household", idx: 0 } }))}>
          {t("q.redo")}
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => {
            const nm = blankMember(family.members.length + 1);
            updateFamily(family.id, (f) => ({ ...f, members: [...f.members, nm], q: { phase: "members", idx: 0, memberId: nm.id, asked: [], skip: [] } }));
          }}
        >{t("q.addMember")}</button>
      </div>
    </div>
  );
}

export default function QuestionnairePage() {
  return (
    <Suspense fallback={null}>
      <Wizard />
    </Suspense>
  );
}
