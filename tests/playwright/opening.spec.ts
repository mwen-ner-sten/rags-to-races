import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

test("@smoke the opening: one button, then the garage", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Trips" })).toBeVisible();
  // Era 1 opens with one place and nothing else.
  await expect(page.getByRole("button", { name: "Garage" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Team" })).toHaveCount(0);

  await page.getByRole("button", { name: "Go", exact: true }).click();
  // A curb trip takes 15 seconds; the scripted first find is a seized engine.
  await expect(page.getByRole("button", { name: "Garage" })).toBeVisible({ timeout: 25_000 });
  await page.getByRole("button", { name: "Garage" }).click();
  await expect(page.getByText("Small Engine")).toBeVisible();
  await expect(page.getByText("Rusted", { exact: true }).first()).toBeVisible();
});

test("@smoke the game saves and survives a reload", async ({ page }) => {
  await page.getByRole("button", { name: "Go", exact: true }).click();
  await expect(page.getByText("Your hands are free")).toHaveCount(0);
  await page.waitForTimeout(6000);
  await page.reload();
  const saved = await page.evaluate(() => window.localStorage.getItem("rags-to-races:v2"));
  expect(saved).toBeTruthy();
});

test("no horizontal overflow on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
