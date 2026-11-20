import { describe, expect, it } from "vitest";
import { SCHEMES } from "@/lib/data";
import { RAMESH, SHANTABAI } from "@/lib/demo/personas";
import { evaluateHousehold } from "@/lib/eligibility/engine";
import { comingSoon, runEvent, timeDiff } from "@/lib/life-events";
import { render, runDailyChecks } from "@/lib/notifications";
import { moveStatus, newApplication, STATUSES } from "@/lib/tracker";
import {
  applySync, DuplicateKeyError, MemoryQueueStore, OfflineQueue, type SyncPayload, type SyncRepo, type SyncTx,
} from "@/lib/offline/sync";
import { buildAdminData, generateHouseholds } from "@/lib/admin/synth";

const today = "2026-11-20";
const shanta = { household: SHANTABAI.household, members: SHANTABAI.members };

describe("life events", () => {
  it("time travel to 60 gains the old-age pension", () => {
    const { diff } = timeDiff(shanta, SCHEMES, today, "2028-03-14");
    expect(diff.gained.some((g) => g.schemeId === "nsap-ignoaps" && g.memberId === "shanta")).toBe(true);
  });
  it("coming soon lists Shantabai's pension within 24 months", () => {
    const map = evaluateHousehold(shanta.household, shanta.members, SCHEMES, today);
    expect(comingSoon(map).map((e) => e.schemeId)).toContain("nsap-ignoaps");
  });
  it("registering a pregnancy / child event produces a diff", () => {
    const r = runEvent({ household: RAMESH.household, members: RAMESH.members }, { type: "PREGNANCY", memberId: "sunita" }, SCHEMES, today);
    expect(r.diff.gained.some((g) => g.schemeId === "pmmvy")).toBe(true);
  });
  it("spouse death makes the survivor a widow", () => {
    const r = runEvent({ household: RAMESH.household, members: RAMESH.members }, { type: "SPOUSE_DIED", memberId: "ramesh" }, SCHEMES, today);
    expect(r.next.members.find((m) => m.id === "sunita")?.maritalStatus).toBe("WIDOWED");
    // Household income (90,000) is above the widow-pension limit, so the scheme stays NOT_ELIGIBLE,
    // but the widow criterion itself now passes: the engine explains why.
    const e = r.after.entries.find((x) => x.schemeId === "sgny" && x.memberId === "sunita")!;
    expect(e.criteria.find((c) => c.id === "widow")?.result).toBe("PASS");
    expect(e.criteria.find((c) => c.id === "income")?.result).toBe("FAIL");
  });
});

describe("tracker + notifications", () => {
  it("moving through every status creates one event each", () => {
    let app = newApplication("sgny", "shanta", today);
    for (const s of STATUSES.filter((x) => x !== "NOT_STARTED" && x !== "REJECTED")) app = moveStatus(app, s, today);
    expect(app.events).toHaveLength(6);
    expect(moveStatus(app, "REJECTED", today).status).toBe("REJECTED");
  });
  it("renders SMS in three languages under 160 chars", () => {
    for (const l of ["en", "hi", "mr"] as const) {
      const s = render("expiring-doc", l, { doc: "Doc", name: "Sunil", date: "2026-12-01" });
      expect(s.length).toBeLessThan(160);
    }
  });
  it("daily check: expiring doc, deadline, and dedupe", () => {
    const app = { ...newApplication("sgny", "shanta", "2026-11-01"), deadline: "2026-11-25", status: "SUBMITTED" as const, nextAction: "Wait" };
    const input = {
      asOf: today, locale: "mr" as const, householdId: "h", members: SHANTABAI.members,
      heldDocuments: [{ id: "x", documentTypeId: "income-certificate", memberId: null, expiresOn: "2026-12-05" }],
      applications: [app], missingDocsByApp: { "sgny:shanta": ["spouse-death-certificate"] }, existingKeys: new Set<string>(),
    };
    const first = runDailyChecks(input);
    expect(first.map((n) => n.kind).sort()).toEqual(["deadline", "expiring-doc", "missing-doc", "status"].sort());
    const again = runDailyChecks({ ...input, existingKeys: new Set(first.map((n) => n.dedupeKey)) });
    expect(again).toHaveLength(0);
  });
});

/* In-memory server used to prove idempotent sync. */
function memRepo() {
  const keys = new Map<string, string>();
  const households: string[] = [];
  const repo: SyncRepo = {
    async transaction<T>(fn: (tx: SyncTx) => Promise<T>) {
      const tx: SyncTx = {
        async findByKey(k) { return keys.get(k) ?? null; },
        async insert(p) {
          if (keys.has(p.idempotencyKey)) throw new DuplicateKeyError();
          const id = `hh-${households.length + 1}`;
          households.push(id);
          keys.set(p.idempotencyKey, id);
          return id;
        },
      };
      return fn(tx);
    },
  };
  return { repo, households };
}
const payload = (key: string): SyncPayload => ({
  idempotencyKey: key, sahayakId: "s1", household: { id: "h1" }, members: [], consentMethod: "verbal-via-sahayak", consentAt: today,
});

describe("offline sync idempotency", () => {
  it("interrupted first sync then retry still yields exactly one household", async () => {
    const { repo, households } = memRepo();
    const q = new OfflineQueue(new MemoryQueueStore());
    await q.enqueue(payload("k1"));
    await q.enqueue(payload("k1")); // double tap
    // First attempt: server stores the household but the response is lost.
    await q.flush(async (p) => {
      await applySync(repo, p);
      throw new Error("network dropped");
    });
    expect(await q.summary()).toEqual({ pending: 0, failed: 1, synced: 0 });
    // Reconnect: retry with the same key.
    await q.flush((p) => applySync(repo, p));
    expect(await q.summary()).toEqual({ pending: 0, failed: 0, synced: 1 });
    expect(households).toHaveLength(1);
  });
  it("concurrent sends of the same key create one household", async () => {
    const { repo, households } = memRepo();
    const results = await Promise.all([applySync(repo, payload("k2")), applySync(repo, payload("k2"))]);
    expect(households).toHaveLength(1);
    expect(results.map((r) => r.status).sort()).toEqual(["created", "duplicate"]);
  });
});

describe("benefit gap map data", () => {
  it("generates 200 households across 10 wards with a clear high-gap ward", () => {
    expect(generateHouseholds()).toHaveLength(200);
    const d = buildAdminData();
    expect(d.wards).toHaveLength(10);
    const w7 = d.wards.find((w) => w.ward.id === "ward-7")!;
    const w2 = d.wards.find((w) => w.ward.id === "ward-2")!;
    expect(w7.gapIndex).toBeGreaterThan(w2.gapIndex);
    expect(w7.topBlockingDocs[0].documentTypeId).toBe("income-certificate");
  });
});
