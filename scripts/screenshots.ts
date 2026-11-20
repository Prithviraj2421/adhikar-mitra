/**
 * Captures key screens at 390x844 (phone) and 1440x900 (desktop) into docs/screenshots/.
 * Needs the app running on http://localhost:3000 (npm run dev, or build + start). Run: npm run screenshots
 */
import { chromium, type Page } from "@playwright/test";
import fs from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = "docs/screenshots";
fs.mkdirSync(OUT, { recursive: true });
const SIZES = [
  { tag: "mobile", width: 390, height: 844 },
  { tag: "desktop", width: 1440, height: 900 },
];

async function ready(page: Page, path: string) {
  await page.goto(`${BASE}${path}`);
  await page.waitForSelector('body[data-hydrated="1"]');
  await page.waitForTimeout(1800); // let count-up and map tiles settle
}

async function run(size: (typeof SIZES)[number]) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: size.width, height: size.height }, colorScheme: "light" });
  const page = await ctx.newPage();
  const shot = async (name: string, full = false) => page.screenshot({ path: `${OUT}/${name}-${size.tag}.png`, fullPage: full });

  await ready(page, "/");
  await shot("01-language");
  await page.getByTestId("lang-en").click();
  await page.waitForURL(/consent/);
  await page.waitForTimeout(800);
  await shot("02-consent");
  await page.getByTestId("consent-agree").click();
  await page.waitForURL(/login/);
  await page.getByTestId("persona-shantabai").click();
  await page.waitForURL(/benefits/);
  await page.waitForTimeout(2200);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await shot("04-family-benefit-map");

  await page.getByTestId("scheme-sgny-shanta").click();
  await page.waitForURL(/benefits\/sgny/);
  await page.waitForTimeout(800);
  await shot("05-why-eligibility", true);

  await ready(page, "/en/documents");
  await shot("06-document-unlock-path");
  await page.getByTestId("doc-graph").scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await shot("06b-unlock-graph");
  await page.getByTestId("mismatch-panel").scrollIntoViewIfNeeded();
  await shot("07-mismatch-detector");

  await ready(page, "/en/guide/sgny?m=shanta");
  await shot("08-application-guide", true);

  await ready(page, "/en/tracker");
  await shot("09-tracker-and-sms", true);

  await page.getByTestId("decode").click();
  await page.getByTestId("ocr-text").fill("Application REJECTED. Reason: Aadhaar is not seeded with bank account.");
  await page.getByTestId("decode-btn").click();
  await page.waitForTimeout(500);
  await shot("10-rejection-decoder", true);

  await ready(page, "/en/scam-check");
  await page.getByTestId("scam-input").fill("Pay Rs 500 processing fee and share your OTP to release your pension");
  await page.getByTestId("scam-check").click();
  await page.waitForTimeout(400);
  await shot("11-scam-shield");

  await ready(page, "/en/demo");
  await page.getByTestId("jump-60").click();
  await page.getByTestId("run-daily").click();
  await page.waitForTimeout(500);
  await shot("12-demo-hub-time-travel", true);

  await page.getByTestId("role-sahayak").click();
  await page.waitForURL(/sahayak/);
  await page.waitForTimeout(2500);
  await shot("13-sahayak-dashboard");

  await ready(page, "/en/demo");
  await page.getByTestId("role-admin").click();
  await page.waitForURL(/admin/);
  await page.waitForTimeout(3500);
  await shot("14-benefit-gap-map");

  await browser.close();
}

(async () => {
  for (const s of SIZES) await run(s);
  console.log(`Screenshots written to ${OUT}/`);
})();
