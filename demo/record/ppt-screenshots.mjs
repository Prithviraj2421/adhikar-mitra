// High-resolution screenshots for the PPT deck, using the same synthetic Ramesh data as the video.
// Phone shots: 390x844 CSS px at 3x scale (1170x2532). Run: node demo/record/ppt-screenshots.mjs
import { chromium } from "@playwright/test";
import fs from "node:fs";
import { BASE, BUILD, prepState, sleep } from "./lib.mjs";

const OUT = "docs/screenshots";
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(BUILD, { recursive: true });
const browser = await chromium.launch();

const state = await prepState(browser, "ramesh-ppt", async (page) => {
  await page.getByTestId("persona-ramesh").click();
  await page.waitForURL(/benefits/);
});
const admin = await prepState(browser, "admin-ppt", async (page) => {
  await page.goto("/en/demo");
  await page.waitForSelector('body[data-hydrated="1"]');
  await page.getByTestId("role-admin").click();
  await page.waitForURL(/admin/);
});

async function phone(url, wait, file) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, baseURL: BASE, storageState: state, colorScheme: "light", locale: "en-IN" });
  const page = await ctx.newPage();
  await page.goto(url);
  await page.waitForSelector('body[data-hydrated="1"]');
  await page.getByTestId(wait).waitFor();
  await sleep(3800); // count-up + confetti have finished
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(500);
  await page.screenshot({ path: `${OUT}/${file}` });
  await ctx.close();
  console.log("wrote", `${OUT}/${file}`);
}

await phone("/en/benefits", "hero-total", "ppt-family-benefits.png");
await phone("/en/documents", "get-first", "ppt-what-to-do-first.png");

// Third: the NGO Benefit Gap Map (desktop, 2x), Ward 7 selected.
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, baseURL: BASE, storageState: admin, colorScheme: "light", locale: "en-IN" });
  const page = await ctx.newPage();
  await page.goto("/en/admin");
  await page.waitForSelector('body[data-hydrated="1"]');
  await page.getByTestId("tile-households").waitFor();
  await page.waitForSelector(".leaflet-tile-loaded", { timeout: 20000 }).catch(() => undefined);
  await sleep(1500);
  await page.locator(".leaflet-interactive").nth(6).click();
  await sleep(1200);
  await page.keyboard.press("Escape");
  await page.evaluate(() => window.scrollTo(0, 60));
  await sleep(500);
  await page.screenshot({ path: `${OUT}/ppt-benefit-gap-map.png` });
  await ctx.close();
  console.log("wrote", `${OUT}/ppt-benefit-gap-map.png`);
}
await browser.close();
