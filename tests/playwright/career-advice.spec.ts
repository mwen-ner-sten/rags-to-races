import { expect, test, type Page } from "@playwright/test";
import { must } from "../../src/core";
import { racer, saveText, teamRacer } from "../fixtures/rewrite";

async function openReturningCareer(page: Page, game: unknown) {
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Save text").fill(saveText(game));
  await page.getByRole("button", { name: "Import save", exact: true }).click();
  await expect(page.getByText("Save loaded. Your previous game is kept as a backup in this browser.")).toBeVisible();
  await page.getByRole("navigation", { name: "Sections" }).getByRole("button", { name: /Trips/ }).click();
  await page.getByText(/^Career opportunities · /).click();
}

test("an older Builder save can draft either Rally challenge without taking a reset", async ({ page }) => {
  const game = racer("career-saved-builder");
  game.run.revealed = ["haul"];
  game.run.featureWins.county_fair = 0;
  game.meta.stateWonEver = true;
  Reflect.deleteProperty(game.meta, "challengeRecords");
  await openReturningCareer(page, game);
  await page.getByRole("button", { name: "Plan a donor-engine Season" }).click();
  await expect(page.getByRole("heading", { name: "Plan the Scrap Reset" })).toBeVisible();
  await expect(page.locator("#reset-objective-hand_me_down")).toBeChecked();
  await expect(page.locator("#reset-objective-hand_me_down")).toBeFocused();
  await page.getByRole("button", { name: "Plan a parts-sourcing Season" }).click();
  await expect(page.locator("#reset-objective-parts_with_a_past")).toBeChecked();
  await expect(page.locator("#reset-objective-parts_with_a_past")).toBeFocused();
  await page.getByRole("button", { name: "Not yet", exact: true }).click();
  await page.getByRole("button", { name: "Plan the Scrap Reset", exact: true }).click();
  await expect(page.getByRole("radio", { name: "Standard Season" })).toBeChecked();
});

test("a recorded challenge opens the actual Stage Rally choice at first founding", async ({ page }) => {
  const game = racer("career-saved-rally");
  game.run.revealed = ["haul"];
  game.meta.stateWonEver = true;
  game.meta.challengeRecords.parts_with_a_past = { completions: 1, bestSeasonMs: 7000, bestVehicleName: "Three-Yard Special" };
  await openReturningCareer(page, game);
  await expect(page.getByText(/cleared with Three-Yard Special/)).toBeVisible();
  await page.getByRole("button", { name: "Plan a Stage Rally team" }).click();
  await expect(page.getByRole("heading", { name: "Found your team" })).toBeVisible();
  await expect(page.locator("#reset-discipline-rally")).toBeChecked();
  await expect(page.locator("#reset-discipline-rally")).toBeFocused();
  await expect(page.getByRole("button", { name: "Found the team", exact: true })).toBeDisabled();
});

test("a returning championship entrant can jump to the race controls", async ({ page }) => {
  const team = teamRacer("career-saved-owner");
  team.era!.milestones.push("state");
  team.run.vehicles = racer("career-advice-beater", "beater_car").run.vehicles;
  team.run.venuesOpen.push("county_fair");
  team.run.ladder.county_fair = ["sprint", "heat", "feature"];
  const game = must(team, { type: "owner", move: { type: "found", charter: "privateer" } });
  await openReturningCareer(page, game);
  await page.getByRole("button", { name: "Open championship round controls" }).click();
  await expect(page.getByRole("heading", { name: /^Round 1 .*County Fair Feature/ })).toBeFocused();
  await expect(page.getByRole("button", { name: "Enter round", exact: true })).toBeEnabled();
});
