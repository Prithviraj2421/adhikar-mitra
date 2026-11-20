/**
 * Offline-safe sync for Sahayak mode.
 *
 * Idempotency: every queued change has a client-generated key. The server stores the key under a
 * UNIQUE constraint in the same transaction as the household, so retries (lost response, double
 * tap, two tabs) can never create a second household.
 */
import type { Household, Member } from "@/lib/eligibility/types";

export interface SyncPayload {
  idempotencyKey: string;
  sahayakId: string;
  household: Household & { wardId?: string; village?: string };
  members: Member[];
  consentMethod: "self" | "verbal-via-sahayak";
  consentAt: string;
}

export interface SyncTx {
  /** Returns the household id previously stored for this key, if any. */
  findByKey(key: string): Promise<string | null>;
  /** Must throw DuplicateKeyError if the unique key already exists (race). */
  insert(payload: SyncPayload, hash: string): Promise<string>;
}
export interface SyncRepo {
  transaction<T>(fn: (tx: SyncTx) => Promise<T>): Promise<T>;
}
export class DuplicateKeyError extends Error {}

export function hashPayload(p: SyncPayload): string {
  const s = JSON.stringify({ h: p.household, m: p.members, c: p.consentMethod });
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return String(h >>> 0);
}

export async function applySync(
  repo: SyncRepo, payload: SyncPayload,
): Promise<{ status: "created" | "duplicate"; householdId: string }> {
  try {
    return await repo.transaction(async (tx) => {
      const existing = await tx.findByKey(payload.idempotencyKey);
      if (existing) return { status: "duplicate" as const, householdId: existing };
      const id = await tx.insert(payload, hashPayload(payload));
      return { status: "created" as const, householdId: id };
    });
  } catch (e) {
    if (e instanceof DuplicateKeyError) {
      const id = await repo.transaction((tx) => tx.findByKey(payload.idempotencyKey));
      if (id) return { status: "duplicate", householdId: id };
    }
    throw e;
  }
}

/* ------------------------------------------------------------- client queue */

export type QueueState = "PENDING" | "SYNCED" | "FAILED";
export interface QueueItem {
  key: string;
  payload: SyncPayload;
  state: QueueState;
  attempts: number;
  lastError?: string;
}
export interface QueueStore {
  put(item: QueueItem): Promise<void>;
  get(key: string): Promise<QueueItem | undefined>;
  all(): Promise<QueueItem[]>;
}

export class MemoryQueueStore implements QueueStore {
  private m = new Map<string, QueueItem>();
  async put(i: QueueItem) { this.m.set(i.key, { ...i }); }
  async get(k: string) { const v = this.m.get(k); return v ? { ...v } : undefined; }
  async all() { return [...this.m.values()].map((v) => ({ ...v })); }
}

export class OfflineQueue {
  private flushing = false;
  constructor(private store: QueueStore) {}

  async enqueue(payload: SyncPayload) {
    // Same key twice (double tap) keeps a single queue entry.
    if (await this.store.get(payload.idempotencyKey)) return;
    await this.store.put({ key: payload.idempotencyKey, payload, state: "PENDING", attempts: 0 });
  }

  /** Sends every PENDING/FAILED item. A failed or interrupted send stays retryable with the same key. */
  async flush(send: (p: SyncPayload) => Promise<unknown>) {
    if (this.flushing) return;
    this.flushing = true;
    try {
      for (const item of await this.store.all()) {
        if (item.state === "SYNCED") continue;
        try {
          await send(item.payload);
          await this.store.put({ ...item, state: "SYNCED", attempts: item.attempts + 1, lastError: undefined });
        } catch (e) {
          await this.store.put({ ...item, state: "FAILED", attempts: item.attempts + 1, lastError: String(e) });
        }
      }
    } finally {
      this.flushing = false;
    }
  }

  async summary() {
    const all = await this.store.all();
    return {
      pending: all.filter((i) => i.state === "PENDING").length,
      failed: all.filter((i) => i.state === "FAILED").length,
      synced: all.filter((i) => i.state === "SYNCED").length,
    };
  }
}
