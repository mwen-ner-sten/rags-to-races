import { test, expect, type Page } from "@playwright/test";
import { must } from "../../src/core";
import type { GameState } from "../../src/core/types";
import { pendingCircuitFinal, pendingOwnerFinal, racer, teamRacer, saveText } from "../fixtures/rewrite";

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

async function resumeAway(page: Page, game: GameState, gap = 60 * 60_000) {
  const now = new Date("2026-11-01T18:00:00Z");
  await page.clock.install({ time: now });
  await page.addInitScript(({ game, savedAt }) => {
    if (!localStorage.getItem("rags-to-races:v2")) localStorage.setItem("rags-to-races:v2", JSON.stringify({ game, savedAt }));
  }, { game, savedAt: now.getTime() - gap });
  await page.goto("/");
  return page.getByRole("dialog", { name: "While you were away" });
}

test("away return shows the settled Owner title once and opens the championship report", async ({ page }) => {
  const away = await resumeAway(page, pendingOwnerFinal());
  await expect(away.getByRole("heading", { name: "Won the Homegrown Cup" })).toBeVisible();
  await expect(away.getByText(/Won the Homegrown Cup/)).toHaveCount(1);
  await expect(away.getByText("The Circuit Office is open.")).toBeVisible();
  await expect(away.getByRole("button", { name: "Open Circuit Office" })).toBeVisible();
  await away.getByRole("button", { name: "Open championship report" }).click();
  await expect(away).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Sections" }).getByRole("button", { name: "Owner" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name: /^Championships · 1 title$/ })).toBeVisible();
  await page.clock.fastForward(60 * 60_000);
  await expect(away).toBeVisible();
  await expect(away.getByRole("heading", { name: "Won the Homegrown Cup" })).toHaveCount(0);
});

test("away return reports a missed Circuit field target and opens the calendar report", async ({ page }) => {
  const away = await resumeAway(page, pendingCircuitFinal());
  await expect(away.getByRole("heading", { name: "Homecoming Cup" })).toBeVisible();
  await expect(away.getByText(/1 meeting ran/)).toBeVisible();
  await expect(away.getByText(/Certification missed on close finishes/)).toBeVisible();
  await expect(away.getByText(/Won the Homegrown Cup/)).toHaveCount(0);
  await away.getByRole("button", { name: "Open circuit report" }).click();
  await expect(away).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Sections" }).getByRole("button", { name: "Circuit" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("This calendar missed its certification targets. Review the results before starting another.")).toBeVisible();
});
