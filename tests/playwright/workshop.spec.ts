import { expect, test } from "@playwright/test";
import { racer, saveText } from "../fixtures/rewrite";

test("the Workshop holds what you learn and buy, and the Notebook only keeps records", async ({ page }) => {
  const game = racer("workshop-tab");
  game.run.cash = 200;
  game.run.revealed.push("tools");
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Save text").fill(saveText(game));
  await page.getByRole("button", { name: "Import save", exact: true }).click();
  await expect(page.getByText("Save loaded. Your previous game is kept as a backup in this browser.")).toBeVisible();

  await page.getByRole("button", { name: /^Workshop/ }).click();
  await page.getByRole("tab", { name: "Tools" }).click();
  await expect(page.getByRole("heading", { name: "Tools counter", exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Parts counter" }).click();
  await expect(page.getByRole("heading", { name: "Parts counter", exact: true })).toBeVisible();

  await page.getByRole("button", { name: /^Trips/ }).click();
  await expect(page.getByRole("heading", { name: "Tools counter", exact: true })).toHaveCount(0);
  await expect(page.getByText(/Lv \d · \d+(\/\d+)? trips/).first()).toBeVisible();

  await page.getByRole("button", { name: /^Notebook/ }).click();
  await expect(page.getByRole("tab", { name: "Journal" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Know-how" })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Habits" })).toHaveCount(0);
});
