import { expect, test, type Page } from "@playwright/test";
import { must } from "../../src/core";
import { resolveRace } from "../../src/core/race";
import type { GameState } from "../../src/core/types";
import { saveText, teamRacer } from "../fixtures/rewrite";

async function importGarage(page: Page, game: GameState) {
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Save text").fill(saveText(game));
  await page.getByRole("button", { name: "Import save", exact: true }).click();
  await expect(page.getByText("Save loaded. Your previous game is kept as a backup in this browser.")).toBeVisible();
}

test("a Rally team can inspect the stages and replay its timed run on the forest map", async ({ page }) => {
  const game = teamRacer("rally-browser");
  game.era!.discipline = "rally";
  resolveRace(game, { kind: "race", venueId: "backyard", event: "sprint", vehicleUid: game.run.vehicles[0].uid, call: "nurse", call2: "recce" });
  await importGarage(page, game);
  await page.getByRole("button", { name: /^Race/ }).click();
  await expect(page.getByRole("heading", { name: "Orchard Test" })).toBeVisible();
  await expect(page.getByText(/2 timed stages/).first()).toBeVisible();
  await page.getByRole("button", { name: "Read pace notes" }).click();
  await expect(page.getByRole("button", { name: "Read pace notes" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Watch", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("img", { name: /Orchard Test/ })).toBeVisible();
  await expect.poll(() => dialog.locator(".rally-stage img").evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
});

test("two reset routes can be compared in the Notebook", async ({ page }) => {
  let game = teamRacer("compare-browser");
  for (const time of [480_000, 360_000]) {
    game.run.featureWins.county_fair = time;
    game.run.seasonMs = time + 60_000;
    game = must(game, { type: "reset", layer: "scrap", choices: game.config });
  }
  game.run.revealed.push("codex");
  await importGarage(page, game);
  await page.getByRole("button", { name: /^Notebook/ }).click();
  await page.getByRole("tab", { name: "Seasons", exact: true }).click();
  const row = page.getByRole("row", { name: /County Fair/ });
  await expect(row).toContainText("6m");
  await expect(row).toContainText("8m");
  await page.getByLabel("Season to inspect").selectOption("2");
  await expect(page.getByLabel("Compare with")).toHaveValue("3");
});
