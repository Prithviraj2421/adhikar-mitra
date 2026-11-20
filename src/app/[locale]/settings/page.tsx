"use client";
import Dexie from "dexie";
import Link from "next/link";
import { useState } from "react";
import { PageTitle } from "@/components/ui";
import { APP } from "@/config/app";
import { LOCALES, LOCALE_NAMES, useT } from "@/lib/i18n";
import { patch, resetAll, useAppState } from "@/lib/store";

export default function SettingsPage() {
  const { t, locale } = useT();
  const s = useAppState();
  const [deleted, setDeleted] = useState(false);

  /** Deletes everything this app stored on the device: families, notifications, offline queue and preferences. */
  const deleteAll = async () => {
    if (!window.confirm(t("set.deleteConfirm"))) return;
    try { await Dexie.delete("adhikar-mitra-sahayak"); } catch { /* ignore */ }
    resetAll();
    setDeleted(true);
  };

  return (
    <>
      <PageTitle title={t("set.title")} icon="⚙️" />
      <section className="card mb-4">
        <h2 className="mb-2 text-lg font-bold">{t("a11y.language")}</h2>
        <div className="flex flex-wrap gap-2">
          {LOCALES.map((l) => (
            <Link key={l} href={`/${l}/settings`} lang={l} className="btn btn-ghost !min-h-[3rem] !text-base" aria-current={l === locale ? "true" : undefined}
              style={l === locale ? { background: "var(--primary)", color: "var(--primary-fg)" } : undefined}>{LOCALE_NAMES[l]}</Link>
          ))}
        </div>
      </section>
      <section className="card mb-4 flex flex-col gap-3">
        <h2 className="text-lg font-bold">{t("set.display")}</h2>
        <label className="flex items-center gap-3 text-lg"><input type="checkbox" className="h-6 w-6" checked={s.largeText} onChange={(e) => patch({ largeText: e.target.checked })} /> {t("a11y.largeText")}</label>
        <label className="flex items-center gap-3 text-lg"><input type="checkbox" className="h-6 w-6" checked={s.highContrast} onChange={(e) => patch({ highContrast: e.target.checked })} /> {t("a11y.contrast")}</label>
      </section>
      <section className="card mb-4">
        <h2 className="mb-2 text-lg font-bold">{t("set.privacy")}</h2>
        <p>{t("set.privacyText")}</p>
        <p className="mt-2 text-sm muted">{t("set.stored", { n: s.families.length })}</p>
        <button className="btn mt-3 w-full" style={{ background: "var(--danger)", color: "#fff" }} onClick={deleteAll} data-testid="delete-data">🗑️ {t("set.delete")}</button>
        {deleted && <p className="mt-2 font-bold" role="status" data-testid="deleted">{t("set.deleted")}</p>}
      </section>
      <section className="card text-sm">
        <h2 className="mb-1 text-lg font-bold">{t("set.about")}</h2>
        <p>{APP.name} · {APP.team}</p>
        <p className="muted mt-1">{t("set.honesty")}</p>
        <p className="mt-1"><Link className="underline" href={`/${locale}/scam-check`}>{t("nav.scam")}</Link></p>
      </section>
    </>
  );
}
