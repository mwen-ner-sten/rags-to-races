import { expect, test, type Page } from "@playwright/test";
import { saveText, teamRacer } from "../fixtures/rewrite";

const MORE = /^More( · .*)?$/;

async function loadTeamSave(page: Page) {
  const game = teamRacer("mobile-nav");
  game.run.revealed.push("tools", "knowhow");
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Save text").fill(saveText(game));
  await page.getByRole("button", { name: "Import save", exact: true }).click();
  await expect(page.getByText("Save loaded. Your previous game is kept as a backup in this browser.")).toBeVisible();
}

test("on a phone the sections live in a bottom bar with a More sheet", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loadTeamSave(page);
  await page.setViewportSize({ width: 390, height: 844 });

  const nav = page.getByRole("navigation", { name: "Sections" });
  const box = await nav.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y + box!.height).toBeGreaterThan(844 - 4);
  expect(box!.y).toBeGreaterThan(844 / 2);

  const more = page.getByRole("button", { name: MORE });
  await expect(more).toBeVisible();
  await expect(more).toHaveAttribute("aria-expanded", "false");

  await more.click();
  await expect(more).toHaveAttribute("aria-expanded", "true");
  const sheet = page.getByRole("group", { name: "Other sections" });
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: /^Team/ }).click();

  await expect(sheet).toBeHidden();
  await expect(page.getByRole("button", { name: /^More · Team$/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Regression team/i }).first()).toBeVisible();

  await page.getByRole("button", { name: /^More/ }).click();
  await expect(sheet).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(page.getByRole("button", { name: /^More/ })).toBeFocused();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  expect(overflow).toBe(true);
});

test("the end of a long panel scrolls clear of the bottom bar", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loadTeamSave(page);
  await page.setViewportSize({ width: 390, height: 844 });

  await page.getByRole("button", { name: /^Garage/ }).click();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const barTop = (await page.getByRole("navigation", { name: "Sections" }).boundingBox())!.y;
  const lastBottom = await page.evaluate(() => {
    const main = document.querySelector("main.main");
    return main ? main.getBoundingClientRect().bottom : 0;
  });
  expect(lastBottom).toBeLessThanOrEqual(barTop + 1);
});

test("on a desktop the tab bar stays at the top with no More button", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loadTeamSave(page);

  await expect(page.getByRole("button", { name: MORE })).toBeHidden();
  const box = await page.getByRole("navigation", { name: "Sections" }).boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y).toBeLessThan(200);
});
