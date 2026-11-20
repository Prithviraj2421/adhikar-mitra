"use client";
import { Check, ExternalLink, ShieldAlert, ShieldCheck, Square, Volume2, VolumeX } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { isOfficialUrl } from "@/lib/scam-shield";
import { useT } from "@/lib/i18n";
import { speak, stopSpeaking, speechSupported } from "@/lib/voice";
import { useActiveFamily, type Family } from "@/lib/store";
import { ageOn, evaluateHousehold } from "@/lib/eligibility/engine";
import { SCHEMES, DOCUMENTS } from "@/lib/data";
import { planDocuments } from "@/lib/doc-graph/path";

/** Read-aloud: reads `text`, or the whole <main> if no text is given. Falls back to Hindi when Marathi is unavailable. */
export function ReadAloud({ text, label, compact }: { text?: string; label?: string; compact?: boolean }) {
  const { t, locale } = useT();
  const [on, setOn] = useState(false);
  const [notice, setNotice] = useState(false);
  useEffect(() => () => stopSpeaking(), []);
  if (!speechSupported() && typeof window !== "undefined") return null;
  const toggle = () => {
    if (on) {
      stopSpeaking();
      setOn(false);
      return;
    }
    const content = text ?? document.getElementById("main")?.innerText ?? "";
    const r = speak(content, locale, () => setOn(false));
    setNotice(!!r?.fellBack);
    setOn(true);
  };
  return (
    <span className="inline-flex flex-col items-start">
      <button
        type="button" onClick={toggle} aria-pressed={on}
        aria-label={label ?? t("a11y.readAloud")}
        className={compact ? "inline-flex h-11 w-11 items-center justify-center rounded-full border-2" : "btn btn-ghost"}
        style={{ borderColor: "var(--border)" }}
      >
        {on ? <VolumeX aria-hidden size={22} /> : <Volume2 aria-hidden size={22} />}
        {!compact && <span>{on ? t("a11y.stop") : (label ?? t("a11y.readAloud"))}</span>}
      </button>
      {notice && <span className="mt-1 text-sm muted">{t("a11y.noMarathiVoice")}</span>}
    </span>
  );
}

/** Every external link goes through here: shows "Official ✓" for allowlisted hosts, otherwise warns before leaving. */
export function SafeLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  const { t } = useT();
  const official = useMemo(() => isOfficialUrl(href), [href]);
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <a
        href={href} target="_blank" rel="noopener noreferrer" className={className ?? "inline-flex items-center gap-1 underline"}
        onClick={(e) => {
          if (!official && !window.confirm(t("safe.confirm"))) e.preventDefault();
        }}
      >
        {children}
        <ExternalLink aria-hidden size={16} />
      </a>
      {official ? (
        <span className="chip" style={{ background: "var(--success-soft)", color: "var(--success)" }}>
          <ShieldCheck aria-hidden size={16} /> {t("safe.official")}
        </span>
      ) : (
        <span className="chip" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
          <ShieldAlert aria-hidden size={16} /> {t("safe.notVerified")}
        </span>
      )}
    </span>
  );
}

export function Disclaimer() {
  const { t } = useT();
  return (
    <p className="rounded-2xl p-3 text-sm" style={{ background: "var(--warn-soft)" }} role="note">
      ℹ️ {t("disclaimer.guidance")}
    </p>
  );
}

export function PageTitle({ title, sub, icon }: { title: string; sub?: string; icon?: string }) {
  return (
    <header className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold leading-tight">{icon && <span aria-hidden>{icon} </span>}{title}</h1>
        {sub && <p className="muted mt-1">{sub}</p>}
      </div>
      <ReadAloud compact />
    </header>
  );
}

export function EmptyFamily() {
  const { t, locale } = useT();
  return (
    <div className="card text-center">
      <p className="mb-4 text-lg">{t("family.none")}</p>
      <Link className="btn btn-primary" href={`/${locale}/questionnaire`}>{t("family.start")}</Link>
      <p className="mt-3">
        <Link className="underline" href={`/${locale}/demo`}>{t("family.tryDemo")}</Link>
      </p>
    </div>
  );
}

export function avatar(m: { dob: string; gender?: string | null }, asOf: string): string {
  const a = m.dob ? ageOn(m.dob, asOf) : 30;
  if (a < 3) return "👶";
  if (a < 13) return m.gender === "F" ? "👧" : "👦";
  if (a < 19) return m.gender === "F" ? "👩‍🎓" : "🧑‍🎓";
  if (a >= 60) return m.gender === "F" ? "👵" : "👴";
  return m.gender === "F" ? "👩" : "👨";
}

export function Rupees({ n }: { n: number }) {
  return <>{`₹${Math.round(n).toLocaleString("en-IN")}`}</>;
}

/** Animated count-up for the hero number. */
export function CountUp({ value }: { value: number }) {
  const [v, setV] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 1200);
      setV(Math.round(from + (value - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value]);
  return <span aria-label={`₹${value}`}><Rupees n={v} /></span>;
}

export function CheckMark({ done }: { done: boolean }) {
  return done ? (
    <span className="pop inline-flex h-7 w-7 items-center justify-center rounded-full" style={{ background: "var(--success)", color: "#fff" }}>
      <Check aria-hidden size={18} />
    </span>
  ) : (
    <Square aria-hidden size={26} className="muted" />
  );
}

/** Evaluates the active family with the deterministic engine and plans documents. */
export function useBenefits(family: Family | undefined, asOf: string) {
  return useMemo(() => {
    if (!family || family.members.length === 0) return null;
    const map = evaluateHousehold(family.household, family.members, SCHEMES, asOf);
    const plan = planDocuments(map, SCHEMES, DOCUMENTS, family.heldDocuments);
    return { map, plan };
  }, [family, asOf]);
}

export function useFamily() {
  const { state, family } = useActiveFamily();
  const benefits = useBenefits(family, state.asOfDate);
  return { state, family, benefits };
}
