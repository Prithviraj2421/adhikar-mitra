// One recording per storyboard scene. Each starts from a known state and uses the real, running app.
import { chromium } from "@playwright/test";
import fs from "node:fs";
import {
  RAMESH_FAMILY, banner, brisk, serveStatic, fast, prepState, ready, recordScene, runQuestionnaire, scrollBy, sleep, slow, tap, typeInto, BUILD,
} from "./lib.mjs";

/** Scene 3: ask once for the whole family (Marathi, phone). First questions slow and real, the rest sped up. */
export async function ask() {
  return recordScene("s03-ask", "mobile", { voice: true, locale: "mr-IN" }, async ({ page, mark, speed }) => {
    await ready(page, "/");
    await sleep(500);
    mark();
    await sleep(700);
    await tap(page, page.getByTestId("lang-mr"));
    await page.waitForURL(/\/mr\/consent/);
    await sleep(1400);
    await tap(page, page.getByTestId("consent-agree"));
    await page.waitForURL(/\/mr\/login/);
    await typeInto(page, page.getByTestId("phone"), "9876543210");
    await tap(page, page.getByTestId("send-otp"));
    await sleep(900);
    await typeInto(page, page.getByTestId("otp"), "1234");
    await tap(page, page.getByTestId("verify"));
    await page.waitForURL(/\/mr\/questionnaire/);
    let n = 0;
    await runQuestionnaire(page, RAMESH_FAMILY, {
      hooks: {
        async beforeQuestion(id) {
          n++;
          if (n === 3) { fast(); speed(1.8); } // after the first few questions, fast-forward to keep the scene short
          if (id !== "q_area") return false;
          // Voice answer with the real voice UI. The recognizer is simulated in headless Chromium, so we say so on screen.
          await banner(page, "Voice input simulated for recording");
          await page.evaluate(() => { window.__voiceSays = "गाव"; });
          await sleep(500);
          await tap(page, page.getByRole("button", { name: /बोला|Speak/ }));
          await page.getByText(/मी ऐकले|I heard/).waitFor();
          await sleep(1300);
          await tap(page, page.getByRole("button", { name: /होय, हेच ठेवा|Yes, use this/ }));
          await sleep(500);
          await banner(page, "");
          return true;
        },
      },
    });
    speed(1);
    await page.waitForURL(/\/mr\/benefits/);
    await sleep(1500);
  });
}

/** Prepares the Ramesh persona (logged in, family loaded) as a reusable state. */
export async function ramesh(browser) {
  return prepState(browser, "ramesh", async (page) => {
    await page.getByTestId("persona-ramesh").click();
    await page.waitForURL(/benefits/);
  });
}

/** Scene 4: the Family Benefit Map in Marathi. */
export async function map(state) {
  return recordScene("s04-map", "mobile", { storageState: state, locale: "mr-IN" }, async ({ page, mark }) => {
    await ready(page, "/mr/benefits");
    await page.getByTestId("hero-total").waitFor();
    mark();
    await sleep(4600); // count-up + confetti + readable result
    await scrollBy(page, 560, 1800);
    await sleep(2200);
    await scrollBy(page, 520, 1800);
    await sleep(2400);
  });
}

/** Scene 5: the "Why?" explanation with the Official check mark. */
export async function explain(state) {
  return recordScene("s05-explain", "mobile", { storageState: state, locale: "en-IN" }, async ({ page, mark }) => {
    await ready(page, "/en/benefits");
    await page.getByTestId("hero-total").waitFor();
    await sleep(600);
    mark();
    await tap(page, page.getByTestId("scheme-pm-kisan-ramesh"));
    await page.waitForURL(/benefits\/pm-kisan/);
    await sleep(1800);
    await scrollBy(page, 330, 1100);
    await sleep(2200);
    await tap(page, page.getByTestId("explain"));
    await page.getByTestId("explanation").waitFor();
    await sleep(1800);
    await scrollBy(page, 900, 1400);
    await sleep(2200);
  });
}

/** Scene 6: Unlock Graph, "Get this first", the plan, and the name mismatch. */
export async function unlock(state) {
  return recordScene("s06-unlock", "mobile", { storageState: state, locale: "en-IN" }, async ({ page, mark }) => {
    await ready(page, "/en/documents");
    await page.getByTestId("get-first").waitFor();
    await sleep(500);
    mark();
    await sleep(3200);
    await scrollBy(page, 640, 1500);
    await sleep(2200);
    await page.getByTestId("doc-graph").scrollIntoViewIfNeeded();
    await sleep(1200);
    const node = page.locator(".react-flow__node", { hasText: "Income certificate" }).first();
    await tap(page, node);
    await sleep(2800);
    await page.getByTestId("mismatch-panel").scrollIntoViewIfNeeded();
    await scrollBy(page, 120, 600);
    await sleep(3400);
  });
}

/** Scene 7: guide, tracker statuses, Marathi SMS, rejection decoder. */
export async function track(state) {
  return recordScene("s07-track", "mobile", { storageState: state, locale: "mr-IN" }, async ({ page, mark, speed }) => {
    await ready(page, "/mr/guide/ladki-bahin?m=sunita");
    await page.getByTestId("start-tracking").waitFor();
    await sleep(500);
    mark();
    brisk();
    await sleep(1200);
    await scrollBy(page, 480, 1100);
    await sleep(900);
    await tap(page, page.getByTestId("start-tracking"));
    await page.waitForURL(/\/mr\/tracker/);
    const card = page.getByTestId("app-ladki-bahin-sunita");
    await card.waitFor();
    await sleep(900);
    const sel = card.getByTestId("status-select");
    for (const s of ["SUBMITTED", "UNDER_VERIFICATION", "REJECTED"]) {
      await tap(page, sel);
      await sel.selectOption(s);
      await sleep(1100);
    }
    await page.getByTestId("sms-phone").scrollIntoViewIfNeeded();
    await sleep(2200);
    await tap(page, card.getByTestId("decode"));
    await page.waitForURL(/\/mr\/decoder/);
    await sleep(800);
    await tap(page, page.getByTestId("sample-aadhaar"));
    // The notice is read by the real on-device OCR; wait for its text (fast-forwarded: dead time).
    speed(5);
    await page.waitForFunction(() => document.querySelector('[data-testid="ocr-text"]')?.value?.length > 10, null, { timeout: 60000 });
    speed(1);
    await sleep(900);
    await tap(page, page.getByTestId("decode-btn"));
    await page.getByTestId("decoded").waitFor();
    await sleep(600);
    await scrollBy(page, 420, 1000);
    await sleep(2400);
  });
}

/** Scene 8: time travel (Shantabai turns 60) and Scam Shield. */
export async function proactive() {
  return recordScene("s08-proactive", "mobile", { locale: "en-IN" }, async ({ page, mark, speed }) => {
    await ready(page, "/en/demo");
    await sleep(500);
    mark();
    await sleep(800);
    await tap(page, page.getByTestId("jump-60"));
    await page.getByTestId("diff").waitFor();
    await sleep(2800);
    await scrollBy(page, 700, 1300);
    await sleep(1600);
    await ready(page, "/en/scam-check");
    await tap(page, page.getByTestId("scam-input"));
    speed(3); // typing the message is dead time: fast-forward it
    await page.keyboard.type("Pay Rs 500 processing fee to release your Ladki Bahin amount. Share OTP.", { delay: 40 });
    speed(1);
    await tap(page, page.getByTestId("scam-check"));
    await page.getByTestId("scam-result").waitFor();
    await sleep(3000);
  });
}

/** Prepares the Sahayak role (15 families, logged in). */
export async function sahayakState(browser) {
  return prepState(browser, "sahayak", async (page) => {
    await page.goto("/en/demo");
    await page.waitForSelector('body[data-hydrated="1"]');
    await page.getByTestId("role-sahayak").click();
    await page.waitForURL(/sahayak/);
  });
}

/** Scene 9: offline Sahayak flow with idempotent sync (desktop). */
export async function sahayak(state) {
  return recordScene("s09-sahayak", "desktop", { storageState: state, locale: "en-IN" }, async ({ page, mark, speed }) => {
    await ready(page, "/en/sahayak");
    await page.getByTestId("sync-panel").waitFor();
    await sleep(500);
    mark();
    brisk();
    await sleep(1200);
    await tap(page, page.getByTestId("toggle-online")); // go offline
    await sleep(800);
    await tap(page, page.getByTestId("add-family"));
    await page.waitForURL(/sahayak\/add/);
    await typeInto(page, page.getByTestId("family-label"), "Neighbour family (offline)");
    await tap(page, page.getByTestId("verbal-consent"));
    await tap(page, page.getByTestId("create-family"));
    await page.waitForURL(/questionnaire/);
    fast();
    speed(3); // the questionnaire itself was shown in scene 1: fast-forward it here
    await runQuestionnaire(page, {
      household: { q_area: "URBAN", q_ration: "BPL", q_income: 48000, q_land: 0, q_house: "KUTCHA", q_lpg: "false", q_resident: 30 },
      members: [{ q_name: "Meena Gaikwad", q_dob: "1990-03-12", q_gender: "F", q_marital: "MARRIED", q_occupation: "domestic-worker", q_caste: "SC", q_bank: "true", q_pregnant: "false", q_tax: "false" }],
    }, { finishAfter: 1 });
    await page.waitForURL(/\/en\/sahayak$/);
    speed(1);
    brisk();
    await page.getByTestId("sync-pending").filter({ hasText: "Pending: 1" }).waitFor();
    await sleep(2200); // Pending 1 while offline
    await tap(page, page.getByTestId("toggle-online"));
    await page.getByTestId("sync-synced").filter({ hasText: "Synced: 1" }).waitFor({ timeout: 20000 });
    await sleep(1000);
    await tap(page, page.getByTestId("sync-now")); // pressing sync again never creates a second record
    await sleep(500);
    await tap(page, page.getByTestId("sync-now"));
    await sleep(2400);
  });
}

/** Prepares the NGO admin role. */
export async function adminState(browser) {
  return prepState(browser, "admin", async (page) => {
    await page.goto("/en/demo");
    await page.waitForSelector('body[data-hydrated="1"]');
    await page.getByTestId("role-admin").click();
    await page.waitForURL(/admin/);
  });
}

/** Scene 10: Benefit Gap Map and camp planner (desktop). */
export async function ngo(state) {
  return recordScene("s10-ngo", "desktop", { storageState: state, locale: "en-IN" }, async ({ page, mark, speed }) => {
    await ready(page, "/en/admin");
    await page.getByTestId("tile-households").waitFor();
    await page.waitForSelector(".leaflet-tile-loaded", { timeout: 20000 }).catch(() => undefined);
    await sleep(600);
    mark();
    brisk();
    await sleep(2200);
    await tap(page, page.locator(".leaflet-interactive").nth(6)); // Ward 7: the story ward
    await sleep(2400);
    speed(2); // scrolling down to the camp planner is dead time
    await scrollBy(page, 1500, 1500);
    await page.getByTestId("plan-camp").scrollIntoViewIfNeeded();
    speed(1);
    await sleep(900);
    await tap(page, page.getByTestId("plan-camp"));
    await page.getByTestId("camp-msg").waitFor();
    await sleep(700);
    await scrollBy(page, 420, 800);
    await sleep(2200);
  });
}

/** The animated "problem" card (HTML in demo/assets, rendered as video). */
export async function problem() {
  const server = await serveStatic();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, recordVideo: { dir: `${BUILD}/raw-problem`, size: { width: 1920, height: 1080 } } });
  const page = await ctx.newPage();
  const url = `${server.url}/demo/assets/problem.html`;
  await page.goto(url);
  await page.waitForTimeout(12500);
  const v = page.video();
  await ctx.close();
  await browser.close();
  await server.close();
  fs.copyFileSync(await v.path(), `${BUILD}/s02-problem.webm`);
  fs.writeFileSync(`${BUILD}/s02-problem.json`, JSON.stringify({ name: "s02-problem", kind: "card", startMs: 150, endMs: 12600, errors: [] }));
  fs.rmSync(`${BUILD}/raw-problem`, { recursive: true, force: true });
  console.log("  recorded s02-problem");
}

export async function states() {
  const browser = await chromium.launch();
  const out = { ramesh: await ramesh(browser), sahayak: await sahayakState(browser), admin: await adminState(browser) };
  await browser.close();
  return out;
}
