"use client";
import { useT } from "@/lib/i18n";
import { useAppState } from "@/lib/store";

/** Phone-frame SMS inbox. Messages are simulated: no real SMS is sent unless a provider is configured server-side. */
export function SmsPhone({ householdId }: { householdId?: string }) {
  const { t } = useT();
  const s = useAppState();
  const list = s.notifications
    .filter((n) => !householdId || n.householdId === householdId)
    .slice()
    .sort((a, b) => (a.sentAt < b.sentAt ? 1 : -1));
  return (
    <div
      className="mx-auto w-full max-w-[20rem] rounded-[2.5rem] border-[10px] p-3" style={{ borderColor: "#1c1b2e", background: "var(--card)" }}
      role="region" aria-label={t("sms.title")} data-testid="sms-phone"
    >
      <div className="mx-auto mb-2 h-1.5 w-16 rounded-full" style={{ background: "#1c1b2e" }} />
      <p className="mb-2 text-center text-sm font-bold">📩 {t("sms.title")}</p>
      <ul className="flex max-h-[26rem] min-h-[14rem] flex-col gap-2 overflow-y-auto">
        {list.length === 0 && <li className="muted p-3 text-center text-sm">{t("sms.empty")}</li>}
        {list.map((n) => (
          <li key={n.id} className="rounded-2xl rounded-tl-sm p-3 text-sm" style={{ background: "var(--accent-soft)" }} data-kind={n.kind} lang={n.locale}>
            <p>{n.body}</p>
            <p className="muted mt-1 text-xs">ADHKAR · {n.sentAt} · {n.kind}</p>
          </li>
        ))}
      </ul>
      <p className="muted mt-2 text-center text-xs">{t("sms.simulated")}</p>
    </div>
  );
}
