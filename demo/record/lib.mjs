// Shared helpers for the demo recordings. Everything here lives in the recording scripts, never in the app:
// the visible cursor + click ripple, smooth movement, the scene recorder, and a questionnaire driver.
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

export const BASE = process.env.BASE_URL ?? "http://localhost:3000";
export const BUILD = "demo/build";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const KINDS = {
  // Phone scenes: 390x844 CSS px at 2x for crisp text.
  mobile: { viewport: { width: 390, height: 844 }, dsf: 2, size: { width: 390, height: 844 } },
  // Desktop scenes: 1600x1000 so that it fills the 1920x1080 canvas without up-scaling blur.
  desktop: { viewport: { width: 1600, height: 1000 }, dsf: 1, size: { width: 1600, height: 1000 } },
};

/* ------------------------------------------------------------------ cursor */
// Injected into the page by the recording context only. A dot that follows the pointer, with a ripple on click.
const CURSOR_JS = `(() => {
  let dot;
  const make = () => {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;z-index:2147483647;width:24px;height:24px;border-radius:50%;background:rgba(200,90,18,.9);border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.45);pointer-events:none;left:-60px;top:-60px;transform:translate(-50%,-50%);transition:transform .1s';
    document.documentElement.appendChild(d);
    return d;
  };
  addEventListener('mousemove', (e) => { dot ??= make(); dot.style.left = e.clientX + 'px'; dot.style.top = e.clientY + 'px'; }, true);
  addEventListener('mousedown', (e) => {
    dot ??= make(); dot.style.transform = 'translate(-50%,-50%) scale(.7)';
    const r = document.createElement('div');
    r.style.cssText = 'position:fixed;z-index:2147483646;left:' + e.clientX + 'px;top:' + e.clientY + 'px;width:24px;height:24px;border-radius:50%;border:4px solid rgba(26,62,158,.75);transform:translate(-50%,-50%) scale(.3);pointer-events:none;transition:transform .55s ease-out,opacity .55s ease-out;opacity:1';
    document.documentElement.appendChild(r);
    requestAnimationFrame(() => { r.style.transform = 'translate(-50%,-50%) scale(3)'; r.style.opacity = '0'; });
    setTimeout(() => r.remove(), 700);
  }, true);
  addEventListener('mouseup', () => { if (dot) dot.style.transform = 'translate(-50%,-50%)'; }, true);
})();`;

// SIMULATED speech recognition. Headless Chromium has no microphone, so for the recording we replace the browser's
// SpeechRecognition with a stub that "hears" window.__voiceSays after a short delay. The app's real voice UI then runs
// unchanged (listening -> "I heard ..." -> confirm). The recording labels this on screen.
const VOICE_STUB_JS = `(() => {
  window.__voiceSays = '';
  class FakeRecognition {
    start() { setTimeout(() => { this.onresult && this.onresult({ results: [[{ transcript: window.__voiceSays }]] }); this.onend && this.onend(); }, 1500); }
    stop() {}
  }
  window.SpeechRecognition = FakeRecognition; window.webkitSpeechRecognition = FakeRecognition;
})();`;

/* ------------------------------------------------------------- pacing */
export const pace = { pause: 380, steps: 20, typeDelay: 60, settle: 120, click: 60 };
export const slow = () => Object.assign(pace, { pause: 380, steps: 20, typeDelay: 60, settle: 120, click: 60 });
export const brisk = () => Object.assign(pace, { pause: 220, steps: 11, typeDelay: 35, settle: 60, click: 40 });
export const fast = () => Object.assign(pace, { pause: 25, steps: 3, typeDelay: 8, settle: 25, click: 20 });

export async function moveTo(page, loc) {
  // Centre the target so the floating bottom dock never covers it.
  await loc.evaluate((el) => el.scrollIntoView({ block: "center", inline: "center", behavior: "instant" }));
  await sleep(pace.settle);
  const b = await loc.boundingBox();
  if (!b) throw new Error("element has no box");
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: pace.steps });
}
export async function tap(page, loc) {
  await moveTo(page, loc);
  await sleep(pace.pause);
  await page.mouse.down();
  await sleep(pace.click);
  await page.mouse.up();
}
export async function typeInto(page, loc, text) {
  await tap(page, loc);
  await page.keyboard.type(text, { delay: pace.typeDelay });
}
/** Smooth scroll by wheel steps so viewers can follow. */
export async function scrollBy(page, px, ms = 1200) {
  const steps = Math.max(4, Math.round(ms / 40));
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, px / steps);
    await sleep(ms / steps);
  }
}
export async function banner(page, text) {
  await page.evaluate((t) => {
    document.getElementById("__rec_banner")?.remove();
    if (!t) return;
    const d = document.createElement("div");
    d.id = "__rec_banner";
    d.textContent = t;
    d.style.cssText = "position:fixed;z-index:2147483647;left:50%;top:10px;transform:translateX(-50%);background:#1F2430;color:#fff;font:700 13px system-ui;padding:6px 12px;border-radius:999px;pointer-events:none;max-width:92%;text-align:center";
    document.documentElement.appendChild(d);
  }, text);
}

/* --------------------------------------------------------------- state prep */
/** Prepare a logged-in state (not recorded) and return a Playwright storageState file path. */
export async function prepState(browser, name, fn) {
  const file = path.join(BUILD, `state-${name}.json`);
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 }, baseURL: BASE });
  const page = await ctx.newPage();
  await page.goto("/en/login");
  await page.waitForSelector('body[data-hydrated="1"]');
  await fn(page);
  await page.waitForTimeout(800);
  await ctx.storageState({ path: file });
  await ctx.close();
  return file;
}

/* ------------------------------------------------------------ scene runner */
export async function recordScene(name, kind, { storageState, voice = false, locale } = {}, body) {
  fs.mkdirSync(BUILD, { recursive: true });
  const k = KINDS[kind];
  const browser = await chromium.launch();
  const dir = path.join(BUILD, `raw-${name}`);
  fs.rmSync(dir, { recursive: true, force: true });
  const ctx = await browser.newContext({
    viewport: k.viewport, deviceScaleFactor: k.dsf, baseURL: BASE, storageState,
    locale: locale ?? "en-IN", colorScheme: "light", recordVideo: { dir, size: k.size },
  });
  await ctx.addInitScript(CURSOR_JS);
  if (voice) await ctx.addInitScript(VOICE_STUB_JS);
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error" && !/favicon|tile\.openstreetmap|Failed to load resource|tessdata|jsdelivr|Parameter not found/i.test(m.text())) errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));
  const t0 = Date.now();
  const meta = { name, kind, startMs: 0, endMs: 0, errors, segments: [] };
  const api = {
    page,
    mark: () => (meta.startMs = Math.max(0, Date.now() - t0 - 150)),
    // Fast-forward from now on (1 = normal). Used only for dead time: typing, OCR waits, the offline questionnaire.
    speed: (f) => meta.segments.push({ ms: Date.now() - t0, speed: f }),
  };
  slow();
  try {
    await body(api);
  } catch (e) {
    // Keep a picture of where it stopped: invaluable when a scene fails.
    await page.screenshot({ path: path.join(BUILD, `error-${name}.png`) }).catch(() => undefined);
    console.error(`  scene ${name} failed at ${page.url()}`);
    throw e;
  } finally {
    meta.endMs = Date.now() - t0;
    const video = page.video();
    await ctx.close();
    await browser.close();
    const src = await video.path();
    fs.copyFileSync(src, path.join(BUILD, `${name}.webm`));
    fs.writeFileSync(path.join(BUILD, `${name}.json`), JSON.stringify(meta, null, 2));
    fs.rmSync(dir, { recursive: true, force: true });
  }
  if (errors.length) console.warn(`  ! console errors in ${name}:`, errors.slice(0, 3));
  console.log(`  recorded ${name}: ${((meta.endMs - meta.startMs) / 1000).toFixed(1)}s`);
  return meta;
}

export async function ready(page, url) {
  await page.goto(url);
  await page.waitForSelector('body[data-hydrated="1"]');
}

/* ------------------------------------------------------------ questionnaire */
// Answers for a family, in member order. Choice values are the option `value`s used by the app.
export const RAMESH_FAMILY = {
  household: { q_area: "RURAL", q_ration: "PHH", q_income: 90000, q_land: 1.8, q_house: "PUCCA", q_lpg: "true", q_resident: 42 },
  members: [
    { q_name: "Ramesh Wankhede", q_dob: "1984-05-10", q_gender: "M", q_marital: "MARRIED", q_occupation: "farmer", q_caste: "OBC", q_bank: "true", q_tax: "false" },
    { preset: "SPOUSE", q_name: "Sunita Wankhede", q_dob: "1988-02-17", q_gender: "F", q_marital: "MARRIED", q_occupation: "homemaker", q_caste: "OBC", q_bank: "true", q_pregnant: "false", q_tax: "false" },
    { preset: "DAUGHTER", q_name: "Priya Wankhede", q_dob: "2010-07-09", q_occupation: "student", q_class: 11 },
    { preset: "SON", q_name: "Rohan Wankhede", q_dob: "2014-01-25", q_class: 7 },
  ],
};

async function qid(page) {
  return page.evaluate(() => document.querySelector("section[data-qid]")?.getAttribute("data-qid") ?? (document.querySelector('[data-testid="finish"]') ? "FINISH" : ""));
}

/**
 * Drives the real questionnaire UI from the first question to the finish button.
 * `hooks.beforeQuestion(qid)` lets a scene do something special (e.g. the simulated voice answer) and return true if it handled it.
 */
export async function runQuestionnaire(page, family, { hooks = {}, finishAfter = family.members.length } = {}) {
  let mi = -1;
  let added = 0;
  for (let guard = 0; guard < 120; guard++) {
    await page.waitForFunction(() => document.querySelector("section[data-qid]") || document.querySelector('[data-testid="finish"]') || location.pathname.endsWith("/benefits") || location.pathname.endsWith("/sahayak"), null, { timeout: 20000 });
    if (/\/(benefits|sahayak)$/.test(new URL(page.url()).pathname)) return;
    const id = await qid(page);
    if (id === "FINISH") {
      if (added < finishAfter - 1) {
        const preset = family.members[added + 1].preset;
        await tap(page, page.getByTestId(`add-${preset}`));
        added++;
      } else {
        await tap(page, page.getByTestId("finish"));
        return;
      }
      continue;
    }
    if (id === "q_name") mi++;
    const m = family.members[Math.max(mi, 0)];
    const answers = { ...family.household, ...m };
    const key = id;
    if (hooks.beforeQuestion && (await hooks.beforeQuestion(id))) {
      await page.waitForFunction((prev) => (document.querySelector("section[data-qid]")?.getAttribute("data-qid") ?? "FINISH") !== prev || location.pathname.endsWith("/benefits"), id, { timeout: 15000 });
      continue;
    }
    const v = answers[key];
    const sec = page.locator(`section[data-qid="${id}"]`);
    if (id === "q_name") await typeInto(page, sec.locator("input"), String(v)), await tap(page, sec.locator('button[type="submit"]'));
    else if (id === "q_dob") { await moveTo(page, sec.locator('input[type="date"]')); await sec.locator('input[type="date"]').fill(String(v)); await sleep(pace.pause); await tap(page, sec.locator('button[type="submit"]').first()); }
    else if (typeof v === "number" && ["q_income", "q_land", "q_resident"].includes(id)) { await typeInto(page, sec.locator('input[inputmode="decimal"]'), String(v)); await tap(page, sec.locator('button[type="submit"]')); }
    else if (v !== undefined) await tap(page, page.getByTestId(`opt-${v}`));
    else if (id === "q_class") await tap(page, page.getByTestId("opt-0"));
    else await tap(page, page.getByTestId("idk"));
    await page.waitForFunction((prev) => (document.querySelector("section[data-qid]")?.getAttribute("data-qid") ?? (document.querySelector('[data-testid="finish"]') ? "FINISH" : "")) !== prev || location.pathname.endsWith("/benefits") || location.pathname.endsWith("/sahayak"), id, { timeout: 15000 });
  }
  throw new Error("questionnaire did not finish");
}

/* ------------------------------------------------------------ static server */
// The title/problem/closing cards use local fonts. Chromium cannot open very long Windows paths via file://,
// so the cards are served over a tiny localhost HTTP server (Node handles long paths fine).
import http from "node:http";
export async function serveStatic(root = process.cwd()) {
  const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".woff2": "font/woff2", ".woff": "font/woff", ".js": "text/javascript", ".png": "image/png", ".svg": "image/svg+xml" };
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent((req.url ?? "/").split("?")[0]);
    const file = path.join(root, rel);
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end("not found"); return; }
    res.writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream", "access-control-allow-origin": "*" });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((r) => server.close(r)) };
}
