"use client";
import { Contrast, FileText, FlaskConical, Gift, LayoutDashboard, ListChecks, Settings, ShieldCheck, Type, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { APP } from "@/config/app";
import { Logo } from "@/components/fx";
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
    document.body.dataset.hydrated = "1"; // lets end-to-end tests wait until click handlers are attached
  }, []);

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
  const maxW = wide ? "max-w-6xl" : "max-w-2xl";

  return (
    <div className="flex min-h-dvh flex-col">
      {APP.demoMode && (
        <div
          className="px-3 py-1 text-center text-xs font-extrabold tracking-widest"
          style={{ background: "linear-gradient(90deg,#c2410c,#9a3412)", color: "#fff" }} role="status"
        >
          {t("demo.ribbon")}
        </div>
      )}
      <header className="glass sticky top-0 z-30 border-b" style={{ borderColor: "var(--border)" }}>
        <div className={`mx-auto flex items-center gap-2 px-3 py-2 ${maxW}`}>
          <Link href={L("/benefits")} className="flex items-center gap-2 font-extrabold">
            <Logo size={38} />
            <span className="grad-text text-lg leading-tight">{locale === "en" ? APP.name : APP.nameLocal}</span>
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
        <div className={`mx-auto flex gap-1 px-3 pb-2 ${maxW}`} role="group" aria-label={t("a11y.language")}>
          {LOCALES.map((l) => (
            <Link
              key={l} href={`/${l}${rest}`} hrefLang={l} lang={l} aria-current={l === locale ? "true" : undefined}
              className="rounded-full px-3 py-1 text-sm font-bold"
              style={l === locale ? { background: "linear-gradient(135deg,#3730a3,#5b21b6)", color: "#fff" } : { border: "1px solid var(--border)" }}
            >
              {LOCALE_NAMES[l]}
            </Link>
          ))}
        </div>
      </header>

      <main id="main" className={`mx-auto w-full flex-1 px-4 pb-36 pt-4 ${maxW}`}>{children}</main>

      <footer className="px-4 pb-28 pt-3 text-center text-sm">
        <p className="mx-auto inline-flex max-w-md items-center gap-2 rounded-full px-4 py-2 font-bold" style={{ background: "var(--success-soft)", color: "var(--success)" }}>
          🛡️ {t("footer.noMoney")}
        </p>
        <p className="muted mt-2">{t("footer.cyber")}</p>
      </footer>

      {/* Floating dock navigation */}
      <nav aria-label={t("a11y.mainNav")} className="pointer-events-none fixed inset-x-0 bottom-3 z-30 px-3">
        <ul
          className={`glass pointer-events-auto mx-auto flex gap-1 rounded-[1.75rem] border p-1.5 ${wide ? "max-w-2xl" : "max-w-md"}`}
          style={{ borderColor: "var(--border)", boxShadow: "0 18px 40px -14px rgba(55,48,163,.55)" }}
        >
          {nav.map((n) => {
            const active = path.startsWith(n.href);
            const Icon = n.icon;
            return (
              <li key={n.href} className="flex-1">
                <Link
                  href={n.href} aria-current={active ? "page" : undefined}
                  className="flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 rounded-2xl py-1 text-[0.7rem] font-extrabold transition"
                  style={active ? { background: "linear-gradient(135deg,#c2410c,#ea580c)", color: "#fff", boxShadow: "0 8px 18px -8px rgba(194,65,12,.9)" } : undefined}
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
