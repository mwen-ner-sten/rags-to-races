import { expect, test } from "@playwright/test";
import { settleRace } from "../../src/core/race";
import { racer, saveText } from "../fixtures/rewrite";

test("the mower exchange previews its fee and archives the retired racer", async ({ page }) => {
  await page.clock.install();
  const game = racer("retirement-browser");
  settleRace(game, { kind: "race", venueId: "backyard", event: "sprint", vehicleUid: game.run.vehicles[0].uid, call: "nurse" }, {
    position: 1, fieldSize: 6, dnf: false, margin: 1, rivalBeaten: false,
    weakestSlot: null, wearSteps: {}, durationMs: 60_000, laps: 1, beats: [],
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Save text").fill(saveText(game));
  await page.getByRole("button", { name: "Import save", exact: true }).click();
  await expect(page.getByText("Save loaded. Your previous game is kept as a backup in this browser.")).toBeVisible();
  await page.getByRole("button", { name: /^Garage/ }).click();
  await page.getByText("Retire Regression racer", { exact: true }).click();
  await page.getByRole("group", { name: "Retirement route" }).getByRole("button", { name: "Trade for a Push Mower kit" }).click();
  await expect(page.getByText(/12 Scrap Bucks for a Worn Tiller Engine and Worn Knobby Tire/)).toBeVisible();
  await page.getByRole("button", { name: "Confirm mower exchange" }).click();
  await expect(page.getByRole("button", { name: "Assemble", exact: true })).toBeEnabled();

  await page.clock.fastForward(6_000);
  await page.reload();
  await page.getByRole("button", { name: /^Race\b/ }).click();
  const results = page.getByRole("region", { name: "Results", exact: true });
  await expect(results.getByText(/Regression racer/)).toBeVisible();
  await expect(results.getByRole("button", { name: "Watch", exact: true })).toBeEnabled();
  if (await page.getByRole("button", { name: /^More/ }).isVisible()) await page.getByRole("button", { name: /^More/ }).click();
  await page.getByRole("button", { name: /^Notebook/ }).click();
  await page.getByRole("tab", { name: "Hall of Fame", exact: true }).click();
  await page.getByText("Regression racer", { exact: true }).click();
  await expect(page.getByText(/1 wins from 1 races/)).toBeVisible();
  await expect(page.getByText(/Traded at the mower exchange/)).toBeVisible();
});
