"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageTitle } from "@/components/ui";
import { useT } from "@/lib/i18n";
import { PERSONAS } from "@/lib/demo/personas";
import { loadPersona, patch } from "@/lib/store";

/** Mock login for the demo only: any 10-digit number, fixed OTP 1234. No real authentication. */
export default function LoginPage() {
  const { t, locale } = useT();
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [err, setErr] = useState(false);

  const verify = () => {
    if (otp === "1234") {
      patch({ phone: phone.replace(/\d(?=\d{4})/g, "•"), role: "CITIZEN" });
      router.push(`/${locale}/questionnaire`);
    } else setErr(true);
  };

  return (
    <>
      <PageTitle title={t("login.title")} icon="📱" />
      <div className="card flex flex-col gap-4">
        <p className="rounded-xl p-3 text-sm font-semibold" style={{ background: "var(--warn-soft)" }}>{t("login.demoNote")}</p>
        {!sent ? (
          <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); if (phone.length === 10) setSent(true); }}>
            <label className="text-lg font-semibold" htmlFor="phone">{t("login.phone")}</label>
            <input
              id="phone" inputMode="numeric" autoComplete="tel" maxLength={10} value={phone} data-testid="phone"
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              className="min-h-[3.5rem] rounded-2xl border-2 bg-transparent px-4 text-xl tracking-widest" style={{ borderColor: "var(--border)" }}
            />
            <button className="btn btn-primary" type="submit" disabled={phone.length !== 10} data-testid="send-otp">{t("login.sendOtp")}</button>
          </form>
        ) : (
          <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); verify(); }}>
            <p className="text-lg font-bold" style={{ color: "var(--accent)" }}>{t("login.demoOtp")}</p>
            <label className="text-lg font-semibold" htmlFor="otp">{t("login.otp")}</label>
            <input
              id="otp" inputMode="numeric" maxLength={4} value={otp} data-testid="otp"
              onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); setErr(false); }}
              className="min-h-[3.5rem] rounded-2xl border-2 bg-transparent px-4 text-xl tracking-widest" style={{ borderColor: "var(--border)" }}
            />
            {err && <p role="alert" style={{ color: "var(--danger)" }}>{t("login.wrong")}</p>}
            <button className="btn btn-primary" type="submit" data-testid="verify">{t("login.verify")}</button>
          </form>
        )}
      </div>

      <div className="card mt-4">
        <h2 className="mb-3 text-xl font-bold">{t("login.tryDemo")}</h2>
        <div className="flex flex-col gap-3">
          {PERSONAS.map((p) => (
            <button
              key={p.id} className="btn btn-ghost !justify-start text-left" data-testid={`persona-${p.id}`}
              onClick={() => { loadPersona(p); router.push(`/${locale}/benefits`); }}
            >
              <span aria-hidden className="text-2xl">{p.id === "shantabai" ? "👵" : "🧑‍🌾"}</span>
              <span className="text-base">{p.title}</span>
            </button>
          ))}
        </div>
        <p className="muted mt-3 text-sm">
          <Link href={`/${locale}/scam-check`} className="underline">{t("login.scamLink")}</Link>
        </p>
      </div>
    </>
  );
}
