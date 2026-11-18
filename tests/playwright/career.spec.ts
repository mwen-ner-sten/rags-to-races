import { test, expect, type Page } from "@playwright/test";
import { must } from "../../src/core";
import type { GameState } from "../../src/core/types";
import { racer, teamRacer, saveText } from "../fixtures/rewrite";

async function loadGarage(page: Page, game: GameState) {
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Save text").fill(saveText(game));
  await page.getByRole("button", { name: "Import save", exact: true }).click();
  await expect(page.getByText("Save loaded. Your previous game is kept as a backup in this browser.")).toBeVisible();
}

test("a Team championship licence survives import and a signed tour survives reload", async ({ page }) => {
  const game = teamRacer();
  game.meta.stateWonEver = true;
  await loadGarage(page, game);
  const owner = page.getByRole("button", { name: "Owner", exact: true });
  await expect(owner).toHaveCount(0);
  game.era!.milestones.push("state");
  await loadGarage(page, game);
  await owner.click();
  await page.getByRole("button", { name: "Sign charter" }).first().click();
  await expect(page.getByRole("heading", { name: /^Round 1 / })).toBeVisible();
  await page.getByRole("button", { name: "Skip round" }).click();
  await expect(page.getByRole("heading", { name: /^Round 2 / })).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("rags-to-races:v2")!).game.owner?.tour.rounds.length), { timeout: 12_000 }).toBe(1);
  await page.reload();
  await owner.click();
  await expect(page.getByRole("heading", { name: /^Round 2 / })).toBeVisible();
  await expect(page.getByRole("button", { name: "Circuit", exact: true })).toHaveCount(0);
});

test("a title holder publishes and books a mower meet through the circuit office", async ({ page }) => {
  const team = teamRacer();
  team.run.vehicles = racer("mower-guest", "riding_mower").run.vehicles;
  team.era!.milestones.push("state");
  const game = must(team, { type: "owner", move: { type: "found", charter: "privateer" } });
  const owner = game.owner!;
  owner.tour.rounds = Array.from({ length: 5 }, (_, i) => ({
    raceId: `title-round-${i}`, carName: "Regression racer", vehicleUid: "fixture-vehicle", position: 1, dnf: false,
  }));
  owner.tour.status = "champion";
  owner.titles = owner.charterTitles.privateer = 1;
  await loadGarage(page, game);
  await page.getByRole("button", { name: "Circuit", exact: true }).click();
  await page.getByRole("button", { name: "Publish Homecoming Cup" }).click();
  await page.getByRole("button", { name: /Book with Nurse/i }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("rags-to-races:v2")!).game.promoter?.meet.booking?.result.call), { timeout: 12_000 }).toBe("nurse");
  await page.reload();
  await page.getByRole("button", { name: "Circuit", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Homecoming Cup", exact: true })).toBeVisible();
});
