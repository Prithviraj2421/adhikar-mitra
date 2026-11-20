"use client";
import { Volume2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { APP } from "@/config/app";
import { LOCALES, LOCALE_NAMES, translate, type Locale } from "@/lib/i18n";
import { patch, useAppState } from "@/lib/store";
import { speak } from "@/lib/voice";

/** First screen: three huge language buttons, each with a speaker that reads the option aloud. */
export default function LanguagePage() {
  const router = useRouter();
  const s = useAppState();
  const choose = (l: Locale) => {
    patch({ locale: l });
    const hasFamily = s.consent && s.families.length > 0;
    router.push(`/${l}/${hasFamily ? "benefits" : "consent"}`);
  };
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 px-5 py-8">
      <div className="text-center">
        <div aria-hidden className="text-6xl">🤝</div>
        <h1 className="mt-2 text-3xl font-extrabold" style={{ color: "var(--primary)" }}>{APP.nameLocal}</h1>
        <p className="text-xl font-semibold">{APP.name}</p>
        <p className="muted mt-2">{APP.tagline}</p>
      </div>
      <p className="text-center text-lg font-semibold" lang="mr">भाषा निवडा · भाषा चुनें · Choose your language</p>
      <ul className="flex flex-col gap-4">
        {LOCALES.map((l) => (
          <li key={l} className="flex gap-3">
            <button
              onClick={() => choose(l)} lang={l} data-testid={`lang-${l}`}
              className="btn btn-primary flex-1 !min-h-[5rem] !text-3xl"
            >
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
      <p className="text-center text-sm font-semibold">🛡️ {translate("en", "footer.noMoney")}</p>
    </main>
  );
}
