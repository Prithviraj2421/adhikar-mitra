"use client";
import { PhoneCall } from "lucide-react";
import { useState } from "react";
import { PageTitle, SafeLink } from "@/components/ui";
import { useT } from "@/lib/i18n";
import { CYBER_HELPLINE, checkMessage, type ScamResult } from "@/lib/scam-shield";

const EXAMPLES = [
  "Your Ladki Bahin amount is blocked. Pay ₹500 processing fee at http://ladki-bahin-yojana.in now",
  "PM-KISAN: check your status at https://pmkisan.gov.in/",
  "Share your OTP to receive pension. Urgent, last date today!",
];

export default function ScamCheckPage() {
  const { t, locale } = useT();
  const [text, setText] = useState("");
  const [res, setRes] = useState<ScamResult | null>(null);

  const style = res && {
    SAFE: { c: "var(--success)", bg: "var(--success-soft)", icon: "✅", label: t("sc.safe") },
    SUSPICIOUS: { c: "var(--accent)", bg: "var(--warn-soft)", icon: "⚠️", label: t("sc.suspicious") },
    DANGEROUS: { c: "var(--danger)", bg: "var(--danger-soft)", icon: "⛔", label: t("sc.dangerous") },
  }[res.verdict];

  return (
    <>
      <PageTitle title={t("sc.title")} sub={t("sc.sub")} icon="🛡️" />
      <section className="card mb-4">
        <label htmlFor="msg" className="mb-2 block text-lg font-bold">{t("sc.paste")}</label>
        <textarea id="msg" rows={5} value={text} onChange={(e) => { setText(e.target.value); setRes(null); }} data-testid="scam-input"
          className="w-full rounded-xl border-2 bg-transparent p-3" style={{ borderColor: "var(--border)" }} />
        <button className="btn btn-primary mt-3 w-full" disabled={!text.trim()} onClick={() => setRes(checkMessage(text))} data-testid="scam-check">{t("sc.check")}</button>
        <p className="mt-3 text-sm font-semibold">{t("sc.try")}</p>
        <ul className="mt-1 flex flex-col gap-2">
          {EXAMPLES.map((e) => (<li key={e}><button className="chip !whitespace-normal text-left" onClick={() => { setText(e); setRes(null); }}>{e}</button></li>))}
        </ul>
      </section>

      {res && style && (
        <section className="card mb-4" style={{ background: style.bg }} data-testid="scam-result" data-verdict={res.verdict} role="status">
          <p className="text-2xl font-extrabold" style={{ color: style.c }}>{style.icon} {style.label}</p>
          {res.reasons.length > 0 && (
            <>
              <h2 className="mb-1 mt-3 font-bold">{t("sc.reasons")}</h2>
              <ul className="list-disc pl-6">{res.reasons.map((r) => (<li key={r.id}>{r.text[locale]}</li>))}</ul>
            </>
          )}
          {res.urls.length > 0 && (
            <>
              <h2 className="mb-1 mt-3 font-bold">{t("sc.links")}</h2>
              <ul className="flex flex-col gap-1">
                {res.urls.map((u) => (<li key={u.url} className="break-all">{u.official ? "✅" : "❌"} {u.host ?? u.url}</li>))}
              </ul>
            </>
          )}
          {res.verdict === "SAFE" && <p className="muted mt-3 text-sm">{t("sc.safeCaveat")}</p>}
        </section>
      )}

      <section className="card">
        <p className="flex items-center gap-2 text-lg font-bold"><PhoneCall aria-hidden /> {t("sc.helpline", { n: CYBER_HELPLINE.number })}</p>
        <p className="mt-1"><SafeLink href={CYBER_HELPLINE.site}>cybercrime.gov.in</SafeLink></p>
        <p className="mt-3 font-semibold">🛡️ {t("footer.noMoney")}</p>
      </section>
    </>
  );
}
