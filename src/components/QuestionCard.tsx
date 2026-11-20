"use client";
import { ArrowLeft, HelpCircle, Mic } from "lucide-react";
import { useState } from "react";
import { translate, useT, type Locale } from "@/lib/i18n";
import { dobFromAge, type Opt, type Question } from "@/lib/questionnaire/questions";
import { listen, matchSpokenOption, parseSpokenNumber, recognitionSupported } from "@/lib/voice";
import { ReadAloud } from "./ui";

type Value = string | number | boolean | null;

export function optionLabel(q: Question, o: Opt, locale: Locale): string {
  const t = (k: string, v?: Record<string, string | number>) => translate(locale, k, v);
  const n = Number(o.value);
  switch (q.unit) {
    case "rupees": return t("unit.upTo", { amount: `₹${n.toLocaleString("en-IN")}` });
    case "acres": return n === 0 ? t("opt.q_land.0") : t("unit.acres", { n });
    case "years": return t("unit.years", { n });
    case "class": return n === 0 ? t("opt.q_class.0") : t("unit.class", { n });
    default: return t(`opt.${q.id}.${String(o.value)}`);
  }
}

export function QuestionCard({
  q, memberName, initial, asOf, onAnswer, onBack, progress,
}: {
  q: Question; memberName?: string; initial?: Value; asOf: string; progress?: number;
  onAnswer: (v: Value) => void; onBack?: () => void;
}) {
  const { t, locale } = useT();
  const [text, setText] = useState(typeof initial === "string" ? initial : "");
  const [num, setNum] = useState("");
  const [age, setAge] = useState("");
  const [useAge, setUseAge] = useState(false);
  const [heard, setHeard] = useState<{ text: string; value: Value } | null>(null);
  const [voiceMsg, setVoiceMsg] = useState("");

  const title = q.id === "q_name" || !memberName ? t(`q.${q.id}.title`) : `${memberName}: ${t(`q.${q.id}.title`)}`;
  const options = q.options ?? [];
  const labelsFor = (o: Opt) => [optionLabel(q, o, locale), optionLabel(q, o, "en"), optionLabel(q, o, "hi"), optionLabel(q, o, "mr")];

  const startVoice = async () => {
    setVoiceMsg(t("q.listening"));
    try {
      const said = await listen(locale);
      let value: Value | undefined;
      if (q.unit || q.allowNumber) {
        const n = parseSpokenNumber(said);
        if (n !== null) value = n;
      }
      if (value === undefined && q.kind === "choice") {
        const yes = /\b(yes|yeah|haan|ho)\b|हाँ|हां|होय|हो\b/i.test(said);
        const no = /\b(no|nahi|nahin)\b|नहीं|नाही|नको/i.test(said);
        if (q.options === undefined) value = undefined;
        else if (q.options.some((o) => typeof o.value === "boolean")) value = yes ? true : no ? false : undefined;
        else {
          const m = matchSpokenOption(said, options.map((o) => ({ value: String(o.value), labels: labelsFor(o), raw: o })));
          if (m) value = (m as unknown as { raw: Opt }).raw.value;
        }
      }
      if (q.kind === "text") value = said;
      if (value === undefined) setVoiceMsg(t("q.notUnderstood"));
      else {
        setHeard({ text: said, value });
        setVoiceMsg("");
      }
    } catch {
      setVoiceMsg(t("q.voiceUnavailable"));
    }
  };

  return (
    <section aria-labelledby="qtitle" className="card" data-qid={q.id}>
      {progress !== undefined && (
        <div className="mb-4 h-3 w-full rounded-full" style={{ background: "var(--border)" }} role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-3 rounded-full" style={{ width: `${Math.round(progress * 100)}%`, background: "var(--accent)" }} />
        </div>
      )}
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 id="qtitle" className="text-2xl font-extrabold leading-snug">{title}</h2>
        <ReadAloud compact text={title} />
      </div>

      {q.kind === "choice" && (
        <div className="grid grid-cols-2 gap-3">
          {options.map((o) => (
            <button
              key={String(o.value)} type="button" onClick={() => onAnswer(o.value)}
              className="btn btn-ghost !flex-col !py-4 text-center" data-testid={`opt-${String(o.value)}`}
            >
              <span aria-hidden className="text-4xl">{o.icon}</span>
              <span className="text-base">{optionLabel(q, o, locale)}</span>
            </button>
          ))}
        </div>
      )}

      {q.allowNumber && (
        <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (num !== "") onAnswer(Number(num)); }}>
          <input
            inputMode="decimal" aria-label={t("q.typeNumber")} placeholder={t("q.typeNumber")} value={num}
            onChange={(e) => setNum(e.target.value.replace(/[^\d.]/g, ""))}
            className="min-h-[3.5rem] flex-1 rounded-2xl border-2 bg-transparent px-4 text-lg" style={{ borderColor: "var(--border)" }}
          />
          <button className="btn btn-primary" type="submit" disabled={num === ""}>{t("actions.ok")}</button>
        </form>
      )}

      {q.kind === "text" && (
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) onAnswer(text.trim()); }}>
          <input
            autoFocus aria-label={t(`q.${q.id}.title`)} value={text} onChange={(e) => setText(e.target.value)}
            className="min-h-[3.5rem] flex-1 rounded-2xl border-2 bg-transparent px-4 text-lg" style={{ borderColor: "var(--border)" }}
          />
          <button className="btn btn-primary" type="submit" disabled={!text.trim()}>{t("actions.next")}</button>
        </form>
      )}

      {q.kind === "date" && (
        <div>
          {!useAge ? (
            <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); if (text) onAnswer(text); }}>
              <input
                type="date" aria-label={t("q.q_dob.title")} value={text} max={asOf} onChange={(e) => setText(e.target.value)}
                className="min-h-[3.5rem] rounded-2xl border-2 bg-transparent px-4 text-lg" style={{ borderColor: "var(--border)" }}
              />
              <button className="btn btn-primary" type="submit" disabled={!text}>{t("actions.next")}</button>
              <button type="button" className="underline" onClick={() => setUseAge(true)}>{t("q.onlyAge")}</button>
            </form>
          ) : (
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (age) onAnswer(dobFromAge(Number(age), asOf)); }}>
              <input
                inputMode="numeric" aria-label={t("q.ageYears")} placeholder={t("q.ageYears")} value={age}
                onChange={(e) => setAge(e.target.value.replace(/\D/g, "").slice(0, 3))}
                className="min-h-[3.5rem] flex-1 rounded-2xl border-2 bg-transparent px-4 text-lg" style={{ borderColor: "var(--border)" }}
              />
              <button className="btn btn-primary" type="submit" disabled={!age}>{t("actions.next")}</button>
            </form>
          )}
        </div>
      )}

      {heard && (
        <div className="mt-4 rounded-2xl p-3" style={{ background: "var(--accent-soft)" }} role="status">
          <p>{t("q.heard", { text: heard.text })}</p>
          <div className="mt-2 flex gap-2">
            <button type="button" className="btn btn-accent" onClick={() => onAnswer(heard.value)}>{t("q.confirm")}</button>
            <button type="button" className="btn btn-ghost" onClick={() => setHeard(null)}>{t("q.retry")}</button>
          </div>
        </div>
      )}
      {voiceMsg && <p className="mt-3 muted" role="status">{voiceMsg}</p>}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {onBack && (
          <button type="button" className="btn btn-ghost" onClick={onBack}><ArrowLeft aria-hidden size={20} />{t("actions.back")}</button>
        )}
        {recognitionSupported() && (
          <button type="button" className="btn btn-ghost" onClick={startVoice} aria-label={t("q.mic")}><Mic aria-hidden size={20} />{t("q.mic")}</button>
        )}
        {q.canSkip && (
          <button type="button" className="btn btn-ghost ml-auto" onClick={() => onAnswer(null)} data-testid="idk">
            <HelpCircle aria-hidden size={20} />{t("q.dontKnow")}
          </button>
        )}
      </div>
    </section>
  );
}
