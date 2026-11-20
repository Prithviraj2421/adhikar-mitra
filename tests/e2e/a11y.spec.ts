import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Automated WCAG 2.x A/AA audit (axe-core, the engine Lighthouse uses) on the main citizen screens,
 * in all three languages, plus large-text mode. Fails on serious or critical violations.
 * Automated checks catch only part of accessibility: manual screen-reader testing is still needed.
 */
const SCREENS = ["benefits", "documents", "tracker", "scam-check", "decoder", "questionnaire", "settings", "demo"];

async function load(page: Page, locale: string) {
  await page.goto("/en/login");
  await page.waitForSelector('body[data-hydrated="1"]');
  await page.getByTestId("persona-ramesh").click();
  await page.waitForURL(/benefits/);
  if (locale !== "en") await page.goto(`/${locale}/benefits`);
}

for (const locale of ["en", "mr", "hi"]) {
  test(`axe: main screens (${locale})`, async ({ page }) => {
    await load(page, locale);
    const bad: string[] = [];
    for (const s of SCREENS) {
      await page.goto(`/${locale}/${s}`);
      await page.waitForSelector('body[data-hydrated="1"]');
      await page.waitForTimeout(1500);
      const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).exclude(".leaflet-container").analyze();
      for (const v of r.violations.filter((x) => x.impact === "serious" || x.impact === "critical")) {
        bad.push(`${locale}/${s}: ${v.id} (${v.impact}) x${v.nodes.length}: ${v.nodes.slice(0, 3).map((n) => `${n.target.join(" ")} :: ${(n.any[0]?.message ?? "").slice(0, 110)}`).join(" || ")}`);
      }
    }
    expect(bad, bad.join("\n")).toEqual([]);
  });
}

test("large text mode keeps buttons at least 56px and body at least 20px", async ({ page }) => {
  await load(page, "en");
  await page.getByRole("button", { name: "Large text" }).click();
  const rootPx = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
  expect(rootPx).toBeGreaterThanOrEqual(20);
  await page.goto("/en/scam-check");
  await page.waitForSelector('body[data-hydrated="1"]');
  const h = await page.getByTestId("scam-check").boundingBox();
  expect(h!.height).toBeGreaterThanOrEqual(56);
});
