"use client";
/**
 * Tiny persistent store (localStorage). Citizen mode and Sahayak mode share one model:
 * a list of "families"; the citizen's own household is simply the active family.
 * Server render uses the empty default; the provider calls hydrate() after mount to avoid mismatches.
 */
import { useEffect, useSyncExternalStore } from "react";
import type { HeldDocument } from "@/lib/doc-graph/types";
import type { Household, Member } from "@/lib/eligibility/types";
import type { Notif } from "@/lib/notifications";
import type { Application } from "@/lib/tracker";
import type { Persona } from "@/lib/demo/personas";
import type { Locale } from "@/lib/i18n";

export const DEMO_TODAY = "2026-11-20";
export type Role = "CITIZEN" | "SAHAYAK" | "ADMIN";

export interface QProgress {
  phase: "household" | "members" | "done";
  idx: number; // household question index
  memberId?: string;
  asked?: string[]; // member questions already shown for memberId (in order)
  skip?: string[]; // member questions known up front (preset relation etc.)
}
export interface Visit {
  at: string;
  note: string;
}
export interface Family {
  id: string;
  label: string;
  household: Household & { wardId?: string; villageOrWard?: string };
  members: Member[];
  heldDocuments: HeldDocument[];
  applications: Application[];
  q: QProgress;
  visits: Visit[];
  consent?: { method: "self" | "verbal-via-sahayak"; at: string; recordedBy?: string };
  syncKey: string;
  createdOn: string;
  assisted: boolean;
}
export interface Camp {
  id: string; wardId: string; title: string; focusDocumentTypeId: string; date: string; location: string; notified: number;
}
export interface LifeLogItem {
  at: string; asOf: string; text: string;
}
export interface AppState {
  v: 1;
  locale: Locale | null;
  consent: boolean;
  phone?: string;
  role: Role;
  largeText: boolean;
  highContrast: boolean;
  theme: "light" | "dark" | "system";
  asOfDate: string;
  families: Family[];
  activeId: string | null;
  notifications: Notif[];
  camps: Camp[];
  lifeLog: LifeLogItem[];
  online: boolean; // simulated connectivity toggle for the Sahayak demo
}

const KEY = "adhikar-mitra:v1";
const today = () => new Date().toISOString().slice(0, 10);
export const initialState = (): AppState => ({
  v: 1, locale: null, consent: false, role: "CITIZEN", largeText: false, highContrast: false, theme: "light",
  asOfDate: today(), families: [], activeId: null, notifications: [], camps: [], lifeLog: [], online: true,
});

let state: AppState = initialState();
let hydrated = false;
let ready = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage may be unavailable (private mode); app keeps working in memory */
  }
}

export function hydrate() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed?.v === 1) state = { ...initialState(), ...parsed };
    }
  } catch {
    /* ignore corrupt storage */
  }
  ready = true;
  emit();
}

export const getState = () => state;
export function setState(fn: (s: AppState) => AppState) {
  state = fn(state);
  persist();
  emit();
}
export const patch = (p: Partial<AppState>) => setState((s) => ({ ...s, ...p }));

export function updateFamily(id: string, fn: (f: Family) => Family) {
  setState((s) => ({ ...s, families: s.families.map((f) => (f.id === id ? fn(f) : f)) }));
}
export function addNotifs(list: Notif[]) {
  if (!list.length) return;
  setState((s) => {
    const have = new Set(s.notifications.map((n) => n.dedupeKey));
    return { ...s, notifications: [...s.notifications, ...list.filter((n) => !have.has(n.dedupeKey))] };
  });
}

export function newFamily(label: string, assisted = false, consentMethod?: "self" | "verbal-via-sahayak"): Family {
  const id = `fam-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  return {
    id, label, assisted, createdOn: today(), syncKey: `sync-${id}`,
    household: { id: `hh-${id}` }, members: [], heldDocuments: [], applications: [], visits: [],
    q: { phase: "household", idx: 0 },
    consent: consentMethod ? { method: consentMethod, at: new Date().toISOString() } : undefined,
  };
}

/** Loads a demo persona as the active family. */
export function loadPersona(p: Persona) {
  setState((s) => {
    const fam: Family = {
      id: p.id, label: p.title, assisted: false, createdOn: DEMO_TODAY, syncKey: `sync-${p.id}`,
      household: { ...p.household }, members: p.members.map((m) => ({ ...m })),
      heldDocuments: p.heldDocuments.map((d) => ({ ...d })), applications: personaApps(p.id),
      q: { phase: "done", idx: 0 }, visits: [], consent: { method: "self", at: DEMO_TODAY },
    };
    return {
      ...s, consent: true, asOfDate: DEMO_TODAY, activeId: p.id, role: "CITIZEN",
      families: [...s.families.filter((f) => f.id !== p.id), fam],
    };
  });
}

function personaApps(id: string): Application[] {
  const ev = (to: Application["status"], at: string, from: Application["status"] | null = null) => ({ from, to, at });
  if (id === "shantabai")
    return [{
      id: "app-ladki-bahin-shanta", schemeId: "ladki-bahin", memberId: "shanta", status: "REJECTED", referenceNumber: "SAMPLE-LB-0042",
      submittedOn: "2026-10-02", updatedOn: "2026-11-02", nextAction: "Decode the rejection and fix the reason",
      events: [ev("NOT_STARTED", "2026-09-28"), ev("SUBMITTED", "2026-10-02", "NOT_STARTED"), ev("REJECTED", "2026-11-02", "SUBMITTED")],
    }, {
      id: "app-e-shram-sunil", schemeId: "e-shram", memberId: "sunil", status: "SUBMITTED", referenceNumber: "SAMPLE-ES-1180",
      submittedOn: "2026-11-05", deadline: "2026-11-25", updatedOn: "2026-11-05", nextAction: "Wait for verification; keep your reference number",
      events: [ev("NOT_STARTED", "2026-11-04"), ev("SUBMITTED", "2026-11-05", "NOT_STARTED")],
    }];
  if (id === "ramesh")
    return [{
      id: "app-pm-kisan-ramesh", schemeId: "pm-kisan", memberId: "ramesh", status: "PAYMENT_RECEIVED", referenceNumber: "SAMPLE-PK-7731",
      submittedOn: "2026-05-10", updatedOn: "2026-08-01",
      events: [ev("NOT_STARTED", "2026-05-01"), ev("SUBMITTED", "2026-05-10", "NOT_STARTED"), ev("APPROVED", "2026-06-12", "SUBMITTED"), ev("PAYMENT_RECEIVED", "2026-08-01", "APPROVED")],
    }];
  return [];
}

export function resetAll() {
  state = initialState();
  hydrated = true;
  ready = true;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  emit();
}

/* ----------------------------------------------------------------- hooks */

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => void listeners.delete(cb);
};
const serverSnapshot = initialState();

export function useAppState(): AppState {
  useEffect(() => hydrate(), []);
  return useSyncExternalStore(subscribe, getState, () => serverSnapshot);
}

/** True once localStorage has been read (client only). */
export function useReady(): boolean {
  useEffect(() => hydrate(), []);
  return useSyncExternalStore(subscribe, () => ready, () => false);
}

export function useActiveFamily(): { state: AppState; family: Family | undefined } {
  const s = useAppState();
  return { state: s, family: s.families.find((f) => f.id === s.activeId) };
}
