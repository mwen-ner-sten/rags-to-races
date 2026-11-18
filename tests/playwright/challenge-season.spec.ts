import { expect, test } from "@playwright/test";
import { racer, saveText } from "../fixtures/rewrite";

test("a Scrap Reset starts a challenge and keeps its goal after reload", async ({ page }) => {
  await page.clock.install();
  const game = racer("season-challenge-regression", "go_kart");
  game.run.venuesOpen.push("county_fair");
  game.run.featureWins.county_fair = 1000;
  game.run.seasonMs = 1000;

  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Save text").fill(saveText(game));
  await page.getByRole("button", { name: "Import save", exact: true }).click();
  await expect(page.getByText("Save loaded. Your previous game is kept as a backup in this browser.")).toBeVisible();

  const legacy = page.getByRole("button", { name: "Legacy", exact: true });
  await legacy.click();
  await page.getByRole("button", { name: "Plan the Scrap Reset", exact: true }).click();
  await page.getByRole("radio", { name: /^Homebuilt Relay/ }).check();
  await page.getByRole("button", { name: "End the Season: Scrap Reset", exact: true }).click();

  const status = page.getByText("Homebuilt Relay · In progress", { exact: true });
  const goal = page.getByText(/same Go-Kart and frame on Kart Slicks or Sport Tires/);
  await expect(status).toBeVisible();
  await expect(goal).toBeVisible();

  await page.clock.fastForward(6_000);
  await page.reload();
  await legacy.click();
  await expect(status).toBeVisible();
  await expect(goal).toBeVisible();
});
