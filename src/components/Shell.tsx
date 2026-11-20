"use client";
import { FileText, Gift, ListChecks, Settings, ShieldCheck, Type, Contrast, Users, LayoutDashboard, FlaskConical } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { APP } from "@/config/app";
import { LOCALES, LOCALE_NAMES, useT } from "@/lib/i18n";
import { patch, useAppState } from "@/lib/store";

export function Shell({ children }: { children: ReactNode }) {
  const { t, locale } = useT();
  const s = useAppState();
  const path = usePathname() ?? "";
  const rest = path.replace(/^\/(en|hi|mr)/, "") || "";

  useEffect(() => {
    document.documentElement.classList.toggle("large-text", s.largeText);
    document.documentElement.classList.toggle("high-contrast", s.highContrast);
  }, [s.largeText, s.highContrast]);

  useEffect(() => {
    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  const L = (p: string) => `/${locale}${p}`;
  const nav =
    s.role === "SAHAYAK"
      ? [
          { href: L("/sahayak"), icon: Users, label: t("nav.families") },
          { href: L("/benefits"), icon: Gift, label: t("nav.benefits") },
          { href: L("/documents"), icon: FileText, label: t("nav.documents") },
          { href: L("/tracker"), icon: ListChecks, label: t("nav.tracker") },
          { href: L("/demo"), icon: FlaskConical, label: t("nav.demo") },
        ]
      : s.role === "ADMIN"
        ? [
            { href: L("/admin"), icon: LayoutDashboard, label: t("nav.admin") },
            { href: L("/scam-check"), icon: ShieldCheck, label: t("nav.scam") },
            { href: L("/demo"), icon: FlaskConical, label: t("nav.demo") },
          ]
        : [
            { href: L("/benefits"), icon: Gift, label: t("nav.benefits") },
            { href: L("/documents"), icon: FileText, label: t("nav.documents") },
            { href: L("/tracker"), icon: ListChecks, label: t("nav.tracker") },
            { href: L("/scam-check"), icon: ShieldCheck, label: t("nav.scam") },
            { href: L("/demo"), icon: FlaskConical, label: t("nav.demo") },
          ];
  const wide = s.role !== "CITIZEN";

  return (
    <div className="flex min-h-dvh flex-col">
      {APP.demoMode && (
        <div className="px-3 py-1 text-center text-xs font-bold tracking-widest text-white" style={{ background: "var(--accent)" }} role="status">
          {t("demo.ribbon")}
        </div>
      )}
      <header className="sticky top-0 z-30 border-b bg-[var(--card)]" style={{ borderColor: "var(--border)" }}>
        <div className={`mx-auto flex items-center gap-2 px-3 py-2 ${wide ? "max-w-6xl" : "max-w-2xl"}`}>
          <Link href={L("/benefits")} className="flex items-center gap-2 font-extrabold" style={{ color: "var(--primary)" }}>
            <span aria-hidden className="text-2xl">🤝</span>
            <span className="leading-tight">{locale === "en" ? APP.name : APP.nameLocal}</span>
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-full border-2" style={{ borderColor: "var(--border)" }}
              aria-pressed={s.largeText} aria-label={t("a11y.largeText")} title={t("a11y.largeText")}
              onClick={() => patch({ largeText: !s.largeText })}
            >
              <Type aria-hidden size={20} />
            </button>
            <button
              type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-full border-2" style={{ borderColor: "var(--border)" }}
              aria-pressed={s.highContrast} aria-label={t("a11y.contrast")} title={t("a11y.contrast")}
              onClick={() => patch({ highContrast: !s.highContrast })}
            >
              <Contrast aria-hidden size={20} />
            </button>
            <Link
              href={L("/settings")} aria-label={t("nav.settings")}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border-2" style={{ borderColor: "var(--border)" }}
            >
              <Settings aria-hidden size={20} />
            </Link>
          </div>
        </div>
        <div className={`mx-auto flex gap-1 px-3 pb-2 ${wide ? "max-w-6xl" : "max-w-2xl"}`} role="group" aria-label={t("a11y.language")}>
          {LOCALES.map((l) => (
            <Link
              key={l} href={`/${l}${rest}`} hrefLang={l} lang={l} aria-current={l === locale ? "true" : undefined}
              className="rounded-full px-3 py-1 text-sm font-semibold"
              style={l === locale ? { background: "var(--primary)", color: "var(--primary-fg)" } : { border: "1px solid var(--border)" }}
            >
              {LOCALE_NAMES[l]}
            </Link>
          ))}
        </div>
      </header>

      <main id="main" className={`mx-auto w-full flex-1 px-4 pb-28 pt-4 ${wide ? "max-w-6xl" : "max-w-2xl"}`}>{children}</main>

      <footer className="border-t px-4 pb-24 pt-3 text-center text-sm" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
        <p className="font-semibold">🛡️ {t("footer.noMoney")}</p>
        <p className="muted">{t("footer.cyber")}</p>
      </footer>

      <nav
        aria-label={t("a11y.mainNav")}
        className="fixed inset-x-0 bottom-0 z-30 border-t bg-[var(--card)]" style={{ borderColor: "var(--border)" }}
      >
        <ul className={`mx-auto flex ${wide ? "max-w-6xl" : "max-w-2xl"}`}>
          {nav.map((n) => {
            const active = path.startsWith(n.href);
            const Icon = n.icon;
            return (
              <li key={n.href} className="flex-1">
                <Link
                  href={n.href} aria-current={active ? "page" : undefined}
                  className="flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 py-1 text-xs font-semibold"
                  style={active ? { color: "var(--accent)" } : undefined}
                >
                  <Icon aria-hidden size={22} />
                  <span>{n.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
