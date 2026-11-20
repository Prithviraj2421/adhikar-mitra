"use client";
import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect } from "react";
import { translate, useLocaleOr } from "@/lib/i18n";
import { patch, useAppState } from "@/lib/store";

/**
 * Light / Dark / System switch. Light is the default. "System" follows the phone and reacts to changes.
 * The class on <html> is also set before first paint by the inline script in the root layout.
 */
export function ThemeToggle({ className = "", onDark = false }: { className?: string; onDark?: boolean }) {
  const s = useAppState();
  const locale = useLocaleOr();
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => document.documentElement.classList.toggle("dark", s.theme === "dark" || (s.theme === "system" && mq.matches));
    apply();
    if (s.theme !== "system") return;
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [s.theme]);

  const label = `${translate(locale, "a11y.theme")}: ${translate(locale, `theme.${s.theme}`)}`;
  const next = s.theme === "light" ? "dark" : s.theme === "dark" ? "system" : "light";
  const Icon = s.theme === "light" ? Sun : s.theme === "dark" ? Moon : Monitor;
  return (
    <button
      type="button" data-testid="theme-toggle" aria-label={label} title={label} onClick={() => patch({ theme: next })}
      className={`inline-flex h-11 min-w-11 items-center justify-center gap-1 rounded-full border-2 px-2 ${className}`}
      style={{ borderColor: onDark ? "rgba(255,255,255,.5)" : "var(--border)", color: onDark ? "#fff" : undefined }}
    >
      <Icon aria-hidden size={20} />
      <span className="text-xs font-extrabold">{translate(locale, `theme.${s.theme}`)}</span>
    </button>
  );
}
