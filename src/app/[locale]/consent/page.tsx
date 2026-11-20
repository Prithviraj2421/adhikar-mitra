"use client";
import { ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { PageTitle } from "@/components/ui";
import { useT } from "@/lib/i18n";
import { patch } from "@/lib/store";

export default function ConsentPage() {
  const { t, locale } = useT();
  const router = useRouter();
  const items = ["consent.i1", "consent.i2", "consent.i3", "consent.i4"];
  return (
    <>
      <PageTitle title={t("consent.title")} icon="📝" />
      <div className="card flex flex-col gap-4">
        <p className="text-lg">{t("consent.intro")}</p>
        <ul className="flex flex-col gap-3">
          {items.map((k) => (
            <li key={k} className="flex gap-3 text-lg"><span aria-hidden>✔️</span><span>{t(k)}</span></li>
          ))}
        </ul>
        <p className="flex gap-3 rounded-2xl p-4 font-semibold" style={{ background: "var(--success-soft)" }}>
          <ShieldCheck aria-hidden className="shrink-0" /> {t("consent.promise")}
        </p>
        <button
          className="btn btn-accent" data-testid="consent-agree"
          onClick={() => { patch({ consent: true }); router.push(`/${locale}/login`); }}
        >{t("consent.agree")}</button>
        <button className="btn btn-ghost" onClick={() => router.push("/")}>{t("consent.decline")}</button>
      </div>
    </>
  );
}
