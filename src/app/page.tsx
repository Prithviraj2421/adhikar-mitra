"use client";
import { Volume2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { HeroOrbit, Logo } from "@/components/fx";
import { APP } from "@/config/app";
import { LOCALES, LOCALE_NAMES, translate, type Locale } from "@/lib/i18n";
import { patch, useAppState } from "@/lib/store";
import { speak } from "@/lib/voice";

const GLYPH: Record<Locale, string> = { mr: "म", hi: "हि", en: "En" };
const FIVE = ["🔎", "💬", "🗂️", "🧭", "🔔"];

/** First screen: a sunrise hero and three huge language buttons, each with a speaker that reads the option aloud. */
export default function LanguagePage() {
  const router = useRouter();
  const s = useAppState();
  useEffect(() => {
    document.body.dataset.hydrated = "1"; // end-to-end tests wait for this
  }, []);
  const choose = (l: Locale) => {
    patch({ locale: l });
    const hasFamily = s.consent && s.families.length > 0;
    router.push(`/${l}/${hasFamily ? "benefits" : "consent"}`);
  };
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-5 px-4 py-5">
      <section className="hero rise px-5 pb-6 pt-6 text-center">
        <div className="mb-1 flex items-center justify-center gap-3">
          <Logo size={46} />
          <div className="text-left leading-tight">
            <h1 className="text-3xl font-extrabold">{APP.nameLocal}</h1>
            <p className="text-sm font-semibold opacity-90">{APP.name}</p>
          </div>
        </div>
        <HeroOrbit size={290} />
        <p className="mx-auto -mt-1 max-w-sm text-lg font-bold leading-snug" style={{ textShadow: "0 2px 12px rgba(0,0,0,.35)" }}>{APP.tagline}</p>
        <div className="mt-4 flex justify-center gap-2 text-2xl" aria-hidden>
          {FIVE.map((e, i) => (<span key={e} className="bob inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/20" style={{ animationDelay: `${i * 0.25}s` }}>{e}</span>))}
        </div>
        <p className="mt-2 text-xs font-semibold opacity-90">{translate("en", "land.five")}</p>
      </section>

      <p className="rise rise-1 text-center text-lg font-extrabold" lang="mr">भाषा निवडा · भाषा चुनें · Choose your language</p>
      <ul className="flex flex-col gap-3">
        {LOCALES.map((l, i) => (
          <li key={l} className={`rise rise-${i + 2} flex gap-3`}>
            <button
              onClick={() => choose(l)} lang={l} data-testid={`lang-${l}`}
              className="btn btn-primary flex-1 !min-h-[5rem] !justify-start gap-4 !px-4 !text-3xl"
            >
              <span aria-hidden className="inline-flex h-14 w-14 items-center justify-center rounded-2xl text-2xl" style={{ background: "var(--grad-sun)" }}>{GLYPH[l]}</span>
              {LOCALE_NAMES[l]}
            </button>
            <button
              onClick={() => speak(`${LOCALE_NAMES[l]}`, l)} aria-label={`${translate(l, "a11y.readAloud")}: ${LOCALE_NAMES[l]}`}
              className="btn btn-ghost !min-h-[5rem] !min-w-[5rem]"
            >
              <Volume2 aria-hidden size={30} />
            </button>
          </li>
        ))}
      </ul>
      <p className="rise rise-4 text-center text-sm font-bold">🛡️ {translate("en", "footer.noMoney")}</p>
    </main>
  );
}
