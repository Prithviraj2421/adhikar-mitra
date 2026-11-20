"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useT } from "@/lib/i18n";
import { useAppState, useReady } from "@/lib/store";

export default function LocaleHome() {
  const { locale, t } = useT();
  const router = useRouter();
  const s = useAppState();
  const ready = useReady();
  useEffect(() => {
    if (!ready) return;
    router.replace(`/${locale}/${s.consent ? (s.families.length ? "benefits" : "questionnaire") : "consent"}`);
  }, [ready, s.consent, s.families.length, locale, router]);
  return <p className="muted">{t("common.loading")}</p>;
}
