/**
 * Notifications: template rendering (en/hi/mr, kept short for SMS), daily checks, and SMS providers.
 * The default provider only records messages for the in-app SMS simulator; real providers are opt-in via env.
 */
import { DOCUMENTS, SCHEMES } from "@/lib/data";
import type { HeldDocument } from "@/lib/doc-graph/types";
import type { Member } from "@/lib/eligibility/types";
import { STATUS_LABEL, type AppStatus, type Application } from "@/lib/tracker";

export type Locale = "en" | "hi" | "mr";
export type NotifKind = "deadline" | "missing-doc" | "expiring-doc" | "new-eligibility" | "camp" | "status";

export interface Notif {
  id: string;
  dedupeKey: string;
  kind: NotifKind;
  locale: Locale;
  body: string;
  sentAt: string;
  channel: "SMS" | "IN_APP";
  householdId?: string;
}

const TEMPLATES: Record<NotifKind, Record<Locale, string>> = {
  "missing-doc": {
    en: "{name}: {scheme} needs {doc} before {date}. Adhikar Mitra never asks for money or OTP.",
    hi: "{name}: {scheme} के लिए {date} से पहले {doc} चाहिए। अधिकार मित्र पैसे या OTP कभी नहीं माँगता।",
    mr: "{name}: {scheme} साठी {date} पूर्वी {doc} हवे. अधिकार मित्र पैसे किंवा OTP कधीच मागत नाही.",
  },
  "expiring-doc": {
    en: "{doc} for {name} expires on {date}. Renew it soon.",
    hi: "{name} का {doc} {date} को समाप्त हो रहा है। जल्दी नवीनीकरण करें।",
    mr: "{name} चे {doc} {date} रोजी संपत आहे. लवकर नूतनीकरण करा.",
  },
  deadline: {
    en: "{scheme}: deadline in {days} days ({date}). Next step: {next}",
    hi: "{scheme}: अंतिम तिथि {days} दिन में ({date})। अगला कदम: {next}",
    mr: "{scheme}: अंतिम तारीख {days} दिवसांत ({date}). पुढची पायरी: {next}",
  },
  status: {
    en: "{scheme} for {name}: status is now {status}. {next}",
    hi: "{name} की {scheme}: स्थिति अब {status}। {next}",
    mr: "{name} ची {scheme}: स्थिती आता {status}. {next}",
  },
  "new-eligibility": {
    en: "New: {scheme} is now available for {name}. Open Adhikar Mitra to see how to apply.",
    hi: "नया: {name} के लिए अब {scheme} उपलब्ध है। आवेदन देखने के लिए अधिकार मित्र खोलें।",
    mr: "नवीन: {name} साठी आता {scheme} उपलब्ध आहे. अर्ज कसा करावा ते अधिकार मित्र मध्ये पाहा.",
  },
  camp: {
    en: "Camp on {date} at {place}: get your {doc}. Free. Bring Aadhaar.",
    hi: "{date} को {place} में शिविर: अपना {doc} बनवाएँ। निःशुल्क। आधार लाएँ।",
    mr: "{date} रोजी {place} येथे शिबिर: तुमचे {doc} काढा. मोफत. आधार आणा.",
  },
};

export function render(kind: NotifKind, locale: Locale, vars: Record<string, string | number>): string {
  return TEMPLATES[kind][locale].replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

const schemeName = (id: string, l: Locale) => SCHEMES.find((s) => s.id === id)?.name[l] ?? id;
const docName = (id: string, l: Locale) => DOCUMENTS.find((d) => d.id === id)?.name[l] ?? id;
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

export interface CheckInput {
  asOf: string;
  locale: Locale;
  householdId: string;
  members: Member[];
  heldDocuments: HeldDocument[];
  applications: Application[];
  /** Docs missing per application (schemeId:memberId -> doc ids), supplied by the caller from the doc plan. */
  missingDocsByApp?: Record<string, string[]>;
  existingKeys: Set<string>;
}

/** Runs all time-based checks. Dedupes against existingKeys so re-running the same day is safe. */
export function runDailyChecks(i: CheckInput): Notif[] {
  const out: Notif[] = [];
  const nameOf = (id: string) => i.members.find((m) => m.id === id)?.name.split(" ")[0] ?? "";
  const push = (kind: NotifKind, key: string, vars: Record<string, string | number>) => {
    const dedupeKey = `${kind}:${key}:${i.asOf}`;
    if (i.existingKeys.has(dedupeKey) || out.some((o) => o.dedupeKey === dedupeKey)) return;
    out.push({
      id: `n-${dedupeKey}`, dedupeKey, kind, locale: i.locale, body: render(kind, i.locale, vars),
      sentAt: i.asOf, channel: "SMS", householdId: i.householdId,
    });
  };

  for (const h of i.heldDocuments) {
    if (!h.expiresOn) continue;
    const left = daysBetween(i.asOf, h.expiresOn);
    if (left >= 0 && left <= 30) {
      push("expiring-doc", h.id, { doc: docName(h.documentTypeId, i.locale), name: h.memberId ? nameOf(h.memberId) : "", date: h.expiresOn });
    }
  }
  for (const a of i.applications) {
    if (a.status === "PAYMENT_RECEIVED") continue;
    const scheme = schemeName(a.schemeId, i.locale);
    if (a.deadline) {
      const left = daysBetween(i.asOf, a.deadline);
      if (left >= 0 && left <= 7) {
        push("deadline", a.id, { scheme, days: left, date: a.deadline, next: a.nextAction ?? "" });
      }
      const missing = i.missingDocsByApp?.[`${a.schemeId}:${a.memberId}`] ?? [];
      if (left >= 0 && missing.length) {
        push("missing-doc", a.id, { name: nameOf(a.memberId), scheme, doc: docName(missing[0], i.locale), date: a.deadline });
      }
    }
    if (a.nextAction && daysBetween(a.updatedOn, i.asOf) > 7 && a.status !== "NOT_STARTED") {
      push("status", `pending-${a.id}`, {
        scheme, name: nameOf(a.memberId), status: STATUS_LABEL[a.status][i.locale], next: a.nextAction,
      });
    }
  }
  return out;
}

export function statusNotif(
  a: Application, locale: Locale, memberName: string, asOf: string, householdId: string,
): Notif {
  const to = a.status as AppStatus;
  const key = `status:${a.id}:${to}:${asOf}`;
  return {
    id: `n-${key}`, dedupeKey: key, kind: "status", locale, channel: "SMS", sentAt: asOf, householdId,
    body: render("status", locale, {
      scheme: schemeName(a.schemeId, locale), name: memberName.split(" ")[0], status: STATUS_LABEL[to][locale], next: "",
    }).trim(),
  };
}

export function eligibilityNotif(
  schemeId: string, memberName: string, locale: Locale, asOf: string, householdId: string,
): Notif {
  const key = `new-eligibility:${schemeId}:${memberName}:${asOf}`;
  return {
    id: `n-${key}`, dedupeKey: key, kind: "new-eligibility", locale, channel: "SMS", sentAt: asOf, householdId,
    body: render("new-eligibility", locale, { scheme: schemeName(schemeId, locale), name: memberName.split(" ")[0] }),
  };
}

export function campNotif(
  vars: { date: string; place: string; docId: string }, locale: Locale, householdId: string, campId: string,
): Notif {
  const key = `camp:${campId}:${householdId}`;
  return {
    id: `n-${key}`, dedupeKey: key, kind: "camp", locale, channel: "SMS", sentAt: vars.date, householdId,
    body: render("camp", locale, { date: vars.date, place: vars.place, doc: docName(vars.docId, locale) }),
  };
}

/* ------------------------------------------------------------ providers */

export interface SmsProvider {
  readonly name: string;
  send(to: string, n: Notif): Promise<void>;
}

/** Default: no real SMS. Messages are surfaced by the in-app simulator. */
export class ConsoleSmsProvider implements SmsProvider {
  readonly name = "console";
  readonly outbox: { to: string; n: Notif }[] = [];
  async send(to: string, n: Notif) {
    this.outbox.push({ to, n });
  }
}

export class Msg91Provider implements SmsProvider {
  readonly name = "msg91";
  constructor(private authKey = process.env.MSG91_AUTH_KEY ?? "") {}
  async send(to: string, n: Notif) {
    if (!this.authKey) throw new Error("MSG91_AUTH_KEY is not set");
    await fetch("https://api.msg91.com/api/v2/sendsms", {
      method: "POST",
      headers: { authkey: this.authKey, "content-type": "application/json" },
      body: JSON.stringify({ sender: "ADHKAR", route: "4", country: "91", unicode: 1, sms: [{ message: n.body, to: [to] }] }),
    });
  }
}

export class TwilioProvider implements SmsProvider {
  readonly name = "twilio";
  async send(to: string, n: Notif) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM;
    if (!sid || !token || !from) throw new Error("Twilio env vars are not set");
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`, "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: `+91${to}`, From: from, Body: n.body }),
    });
  }
}

export function providerFromEnv(): SmsProvider {
  switch (process.env.SMS_PROVIDER) {
    case "msg91": return new Msg91Provider();
    case "twilio": return new TwilioProvider();
    default: return new ConsoleSmsProvider();
  }
}
