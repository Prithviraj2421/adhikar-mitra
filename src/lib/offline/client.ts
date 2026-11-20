"use client";
import { dexieQueueStore } from "./db";
import { OfflineQueue, type SyncPayload } from "./sync";
import { getState, type Family } from "@/lib/store";

export const queue = new OfflineQueue(dexieQueueStore);
export const SAHAYAK_ID = "9000000001"; // synthetic demo sahayak (never a real phone number)

export function payloadOf(f: Family): SyncPayload {
  return {
    idempotencyKey: f.syncKey,
    sahayakId: SAHAYAK_ID,
    household: f.household as SyncPayload["household"],
    members: f.members,
    consentMethod: f.consent?.method ?? "verbal-via-sahayak",
    consentAt: f.consent?.at ?? new Date().toISOString(),
  };
}

async function send(p: SyncPayload) {
  const r = await fetch("/api/sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(p) });
  if (!r.ok) throw new Error(`sync ${r.status}`);
  return r.json();
}

export const isOnline = () => getState().online && (typeof navigator === "undefined" || navigator.onLine);

/** Queue a family change (works offline: it lands in IndexedDB) and try to send it if we are online. */
export async function enqueueFamily(f: Family) {
  await queue.enqueue(payloadOf(f));
  await flushIfOnline();
}
export async function flushIfOnline() {
  if (isOnline()) await queue.flush(send);
}
