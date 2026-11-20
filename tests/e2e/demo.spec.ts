import { expect, test, type Page } from "@playwright/test";

/** Follows docs/DEMO_SCRIPT.md for persona 1 (Shantabai). */
const ready = async (page: Page, url: string) => {
  await page.goto(url);
  await page.waitForSelector('body[data-hydrated="1"]');
};

test("Shantabai demo flow", async ({ page }) => {
  // 1. Language -> consent -> login
  await ready(page, "/");
  await page.getByTestId("lang-en").click();
  await page.getByTestId("consent-agree").click();
  await expect(page).toHaveURL(/\/en\/login/);

  // 2. Load the demo family and see the Family Benefit Map
  await page.getByTestId("persona-shantabai").click();
  await expect(page).toHaveURL(/\/en\/benefits/);
  await expect(page.getByTestId("hero-total")).not.toHaveText("₹0", { timeout: 15_000 });
  await expect(page.getByTestId("tab-eligible")).toContainText("Eligible");

  // 3. Why? checklist for the widow pension
  await page.getByTestId("scheme-sgny-shanta").click();
  await expect(page.getByTestId("crit-widow")).toHaveAttribute("data-result", "PASS");
  await expect(page.getByText("This is guidance, not an official decision").first()).toBeVisible();
  await page.getByTestId("explain").click();
  await expect(page.getByTestId("explanation")).toContainText("Shantabai");

  // 4. Unlock graph and Mismatch flag
  await page.goto("/en/documents");
  await page.waitForSelector('body[data-hydrated="1"]');
  await expect(page.getByTestId("get-first")).toBeVisible();
  await expect(page.getByTestId("doc-graph")).toBeVisible();
  await expect(page.getByTestId("mismatch-panel")).toContainText("Small difference");

  // 5. Guide shows an Official check mark; start tracking
  await page.goto("/en/guide/sgny?m=shanta");
  await page.waitForSelector('body[data-hydrated="1"]');
  await expect(page.getByText("Official ✓").first()).toBeVisible();

  // 6. Tracker -> rejected application -> Rejection Decoder
  await page.goto("/en/tracker");
  await page.waitForSelector('body[data-hydrated="1"]');
  await page.getByTestId("decode").click();
  await page.getByTestId("decode-btn").waitFor();
  const ta = page.getByTestId("ocr-text");
  await ta.fill("Application REJECTED. Reason: Aadhaar is not seeded with bank account.");
  await page.getByTestId("decode-btn").click();
  await expect(page.getByTestId("decoded")).toHaveAttribute("data-reason", "aadhaar-not-seeded");

  // 7. Scam Shield
  await page.goto("/en/scam-check");
  await page.waitForSelector('body[data-hydrated="1"]');
  await page.getByTestId("scam-input").fill("Pay Rs 500 processing fee to release your pension");
  await page.getByTestId("scam-check").click();
  await expect(page.getByTestId("scam-result")).toHaveAttribute("data-verdict", "DANGEROUS");

  // 8. Time travel to Shantabai's 60th birthday
  await page.goto("/en/demo");
  await page.waitForSelector('body[data-hydrated="1"]');
  await page.getByTestId("jump-60").click();
  await expect(page.getByTestId("asof")).toHaveText("2028-03-14");
  await expect(page.getByTestId("diff")).toContainText("Old Age Pension");
  await page.getByTestId("run-daily").click();
  await expect(page.getByTestId("sms-phone")).toContainText("Old Age Pension");

  // 9. Footer promise is on every screen
  await expect(page.getByText("never asks for money or OTP").first()).toBeVisible();
});

test("Benefit Gap Map and camp planner", async ({ page }) => {
  await ready(page, "/en/login");
  await page.goto("/en/demo");
  await page.waitForSelector('body[data-hydrated="1"]');
  await page.getByTestId("role-admin").click();
  await expect(page).toHaveURL(/\/en\/admin/);
  await expect(page.getByTestId("tile-households")).toContainText("200");
  await expect(page.getByTestId("blockers")).toContainText("Income certificate");
  await page.getByTestId("plan-camp").click();
  await expect(page.getByTestId("camp-msg")).toContainText("SMS sent");
});
