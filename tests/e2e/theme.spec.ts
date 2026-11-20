import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/** Light is the default; the toggle switches to Dark and Auto; the choice survives a reload with no flash of the wrong theme. */
test("theme: light by default, toggle to dark, persists, and dark passes the contrast audit", async ({ page }) => {
  // The phone itself prefers dark, but the app still starts in Light.
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/en/login");
  await page.waitForSelector('body[data-hydrated="1"]');
  expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(false);

  await page.getByTestId("persona-ramesh").click();
  await page.waitForURL(/benefits/);
  const toggle = page.getByTestId("theme-toggle");
  await expect(toggle).toHaveAttribute("aria-label", /Light/);
  await toggle.click(); // Light -> Dark
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(toggle).toHaveAttribute("aria-label", /Dark/);

  await page.reload();
  await page.waitForSelector('body[data-hydrated="1"]');
  await expect(page.locator("html")).toHaveClass(/dark/);

  for (const s of ["benefits", "documents", "tracker", "scam-check", "settings"]) {
    await page.goto(`/en/${s}`);
    await page.waitForSelector('body[data-hydrated="1"]');
    await page.waitForTimeout(1200);
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).exclude(".leaflet-container").analyze();
    const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical")
      .map((v) => `${s}: ${v.id} :: ${v.nodes.slice(0, 2).map((n) => `${n.target.join(" ")} ${(n.any[0]?.message ?? "").slice(0, 90)}`).join(" || ")}`);
    expect(bad, bad.join("\n")).toEqual([]);
  }

  // Auto follows the phone (which prefers dark here), then Light again.
  await page.goto("/en/settings");
  await page.waitForSelector('body[data-hydrated="1"]');
  await page.getByTestId("theme-light").click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.getByTestId("theme-system").click();
  await expect(page.locator("html")).toHaveClass(/dark/);
});
