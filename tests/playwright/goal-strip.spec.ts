import { expect, test, type Page } from "@playwright/test";
import { racer, saveText, teamRacer } from "../fixtures/rewrite";
import type { GameState } from "../../src/core/types";

async function load(page: Page, game: GameState) {
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Save text").fill(saveText(game));
  await page.getByRole("button", { name: "Import save", exact: true }).click();
  await expect(page.getByText("Save loaded. Your previous game is kept as a backup in this browser.")).toBeVisible();
}

test("the next-goal strip shows the top goal, expands, and stays clear of the bottom bar", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const game = racer("goal-strip");
  await load(page, game);
  await page.getByRole("button", { name: /^Trips/ }).first().click();

  const strip = page.getByRole("region", { name: "Next goals" });
  await expect(strip).toContainText("Win the Backyard Derby Feature");
  await expect(strip.getByRole("progressbar").first()).toBeVisible();
  await strip.getByRole("button", { name: /Win the Backyard Derby Feature/ }).click();
  await expect(strip.getByRole("list", { name: "Season track" })).toBeVisible();
  await expect(strip.getByRole("button", { name: "Go" }).first()).toBeVisible();

  for (const size of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(size);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const nav = await page.getByRole("navigation", { name: "Sections" }).boundingBox();
    expect(nav).not.toBeNull();
    const lastBottom = await page.locator(".layout").evaluate((el) => el.getBoundingClientRect().bottom);
    if (size.width <= 640) expect(lastBottom).toBeLessThanOrEqual(nav!.y + 1);  }
});

test("the team era strip follows the team accent", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await load(page, teamRacer("goal-strip-team"));
  const strip = page.getByRole("region", { name: "Next goals" });
  await expect(strip).toBeVisible();
  const border = await strip.evaluate((el) => getComputedStyle(el).borderLeftColor);
  const team = await page.locator(".game").evaluate((el) => getComputedStyle(el).getPropertyValue("--team-a").trim());
  expect(team).not.toBe("");
  expect(border).not.toBe("rgb(0, 229, 255)");
});
