"use client";
import Dexie, { type Table } from "dexie";
import type { QueueItem, QueueStore } from "./sync";

class SahayakDb extends Dexie {
  queue!: Table<QueueItem, string>;
  constructor() {
    super("adhikar-mitra-sahayak");
    this.version(1).stores({ queue: "key,state" });
  }
}

let db: SahayakDb | null = null;
const get = () => (db ??= new SahayakDb());

/** IndexedDB-backed queue store (browser only). */
export const dexieQueueStore: QueueStore = {
  put: async (i) => void (await get().queue.put(i)),
  get: (k) => get().queue.get(k),
  all: () => get().queue.toArray(),
};
