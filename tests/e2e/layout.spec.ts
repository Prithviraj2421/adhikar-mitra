import { expect, test } from "@playwright/test";

/** Layout at 360, 768 and 1440 px: no sideways scrolling and no console errors on the main screens. */
const SCREENS = ["benefits", "documents", "tracker", "guide/sgny?m=shanta", "decoder", "mismatch", "scam-check", "demo", "settings", "sahayak", "admin"];

for (const width of [360, 768, 1440]) {
  test(`no horizontal overflow and no console errors at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" && !/favicon|tile\.openstreetmap|Failed to load resource|tessdata|jsdelivr/i.test(m.text())) errors.push(m.text());
    });
    page.on("pageerror", (e) => errors.push(String(e)));

    await page.goto("/en/login");
    await page.waitForSelector('body[data-hydrated="1"]');
    await page.getByTestId("persona-shantabai").click();
    await page.waitForURL(/benefits/);

    const wide: string[] = [];
    for (const s of SCREENS) {
      await page.goto(`/en/${s}`);
      await page.waitForSelector('body[data-hydrated="1"]');
      await page.waitForTimeout(1200);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (over > 1) wide.push(`${s}: +${over}px`);
    }
    expect(wide, wide.join("\n")).toEqual([]);
    expect(errors, errors.join("\n")).toEqual([]);
  });
}
