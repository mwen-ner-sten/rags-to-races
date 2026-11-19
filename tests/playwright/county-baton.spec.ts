import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { must } from "../../src/core";
import { CLUB_CHARTERS, startClubSeason } from "../../src/core/club";
import { WORKS_FAMILIES } from "../../src/core/manufacturer";
import type { GameState } from "../../src/core/types";
import { archiveVehicle } from "../../src/core/vehicleArchive";
import { clubCandidate } from "../fixtures/club";
import { racer, saveText } from "../fixtures/rewrite";

function riverGarage(qualified: boolean) {
  const game = racer("baton-ui", "go_kart");
  game.config.homeCounty = "river";
  game.meta.knowhow["tech:scouting"] = 1;
  game.meta.codex.places = { curb: 8, floodplain: 4, junkyard: 3 };
  game.meta.challengeRecords.parts_with_a_past = { completions: 2, bestSeasonMs: 1, bestVehicleName: "Parts racer" };
  game.run.seasonMs = 1000;
  game.run.venuesOpen.push("dirt", "county_fair");
  game.run.ladder.dirt = ["sprint", "heat", "feature"];
  game.run.ladder.county_fair = ["sprint", "heat", "feature"];
  game.run.featureWins.county_fair = 1000;
  game.run.countyBaton = { leg: "qualify", from: "river", ...(qualified ? { qualified: { uid: "baton-tire", at: 500 } } : {}) };
  game.run.inventory.push({ uid: "baton-tire", partId: "wheel_river", condition: 2, origin: "Floodplain Lots", provenance: { placeId: "floodplain", county: "river", season: 2 } });
  return game;
}

function combinedGarage(): GameState {
  const earned = process.env.PLAYWRIGHT_BATON_VETERAN_SAVE;
  if (earned) return JSON.parse(Buffer.from(readFileSync(earned, "utf8"), "base64").toString("utf8")).game as GameState;
  let game = riverGarage(true);
  const champion = clubCandidate();
  game.era = champion.era;
  game.owner = champion.owner;
  game.promoter = champion.promoter;
  game.config.club = "yard_co_op";
  game.run.inventory[0].batonGuard = true;
  startClubSeason(game);
  const kart = game.run.vehicles[0];
  archiveVehicle(game, { ...kart, name: "First Kart", history: { races: 1, wins: 0, dnfs: 0, bestFinish: 2 } });
  game.meta.hallOfFame[0].season = game.meta.seasonsPlayed;
  game.manufacturer = { invites: ["redwheel"], drawings: [], active: null, history: [] };
  game = must(game, { type: "owner", move: { type: "start", charter: "privateer", sponsor: "reliable" } });
  game = must(game, { type: "works", move: { type: "sign", family: "redwheel", vehicleUid: kart.uid } });
  return must(game, { type: "heritage", move: { type: "start", kind: "exhibit", archiveIndex: 0 } });
}

async function openSave(page: Page, game: GameState) {
  await page.clock.install();
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Save text").fill(saveText(game));
  await page.getByRole("button", { name: "Import save", exact: true }).click();
  await expect(page.getByText("Save loaded. Your previous game is kept as a backup in this browser.")).toBeVisible();
}

test("the exact baton can be safeguarded, deliberately released by keyboard, and transferred at reset", async ({ page }) => {
  await openSave(page, riverGarage(true));
  const garage = page.getByRole("button", { name: /^Garage/ });
  await garage.click();
  await page.getByRole("tab", { name: /^Parts/ }).click();
  const tire = page.getByRole("listitem").filter({ has: page.getByText("Qualifying baton", { exact: true }) });
  await expect(tire.getByText(/Floodplain Lots · River County/)).toBeVisible();
  await tire.getByRole("button", { name: "Safeguard baton" }).press("Enter");
  await expect(tire.getByText("Safeguarded from sale and stripping")).toBeVisible();
  await expect(tire.getByRole("button", { name: /^(Sell|Strip)/ })).toHaveCount(0);
  const release = tire.getByRole("button", { name: "Release baton protection…" });
  await release.press("Enter");
  await expect(release).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Tab");
  await expect(tire.getByRole("button", { name: "Confirm release" })).toBeFocused();
  await page.keyboard.press("Enter");
  const safeguard = tire.getByRole("button", { name: "Safeguard baton" });
  await expect(safeguard).toBeFocused();
  await expect(tire.getByRole("button", { name: /^Sell/ })).toBeEnabled();
  await safeguard.press("Space");

  await page.getByRole("button", { name: "Legacy", exact: true }).click();
  await page.getByRole("button", { name: "Plan the Scrap Reset", exact: true }).click();
  const confirmation = page.getByRole("checkbox", { name: "I’m ready to scrap the safeguarded part" });
  const reset = page.getByRole("button", { name: "End the Season: Scrap Reset", exact: true });
  await expect(confirmation).toBeVisible();
  await expect(reset).toBeDisabled();
  const plan = page.getByRole("group", { name: "County Baton", exact: true });
  await expect(plan.getByText("River Tire · Worn", { exact: true })).toBeVisible();
  const carry = plan.getByRole("radio", { name: "Carry this baton to Quarry County for one perk slot" });
  await carry.check();
  await expect(confirmation).toHaveCount(0);
  const carried = page.getByRole("group", { name: "Part to carry" });
  await expect(carried.getByRole("radio", { name: /^None/ })).toBeDisabled();
  await expect(carried.getByRole("radio", { name: /River Tire/ })).toBeDisabled();
  await expect(page.getByRole("radio", { name: /^Quarry County/ })).toBeChecked();
  await page.getByRole("radio", { name: "Standard Season" }).check();
  await expect(carried.getByRole("radio", { name: /^None/ })).toBeChecked();
  await expect(page.getByRole("radio", { name: /^River County/ })).toBeChecked();
  await expect(confirmation).toBeVisible();
  await carried.getByRole("radio", { name: /River Tire/ }).check();
  await expect(page.getByText("The River Tire crosses in the ordinary crate. Its County Baton protection ends.", { exact: true })).toBeVisible();
  await carry.check();
  await reset.click();
  await expect(page.getByText(/Fit your inherited River Tire to a Beater/)).toBeVisible();
  await page.getByRole("button", { name: "Trips", exact: true }).click();
  await expect(page.getByText("Home county · Quarry County", { exact: true })).toBeVisible();
  await page.clock.fastForward(6_000);
  await page.reload();
  await garage.click();
  // The new Season's garage holds no vehicles yet, so Parts is its only section and there is no tablist.
  await expect(page.getByRole("tablist", { name: "Garage sections" })).toHaveCount(0);
  await expect(page.getByRole("listitem").filter({ has: page.getByText("Transferred baton", { exact: true }) }).getByText("Safeguarded from sale and stripping")).toBeVisible();
});

test("the race setup identifies the eligible part and abandoning requires an explicit choice", async ({ page }) => {
  await openSave(page, riverGarage(false));
  const race = page.getByRole("navigation", { name: "Sections" }).getByRole("button", { name: /^Race/ });
  await race.click();
  await expect(page.getByText(/Fit a River Tire from River County hauled this Season/)).toBeVisible();
  await page.getByRole("button", { name: /^Garage/ }).click();
  await page.getByRole("tab", { name: /^Parts/ }).click();
  await expect(page.getByText("Eligible baton candidate", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Vehicles" }).click();
  const car = page.getByRole("article").filter({ has: page.getByRole("heading", { name: /Regression racer/ }) });
  await car.locator("summary", { hasText: "for wheel" }).click();
  await car.getByRole("button", { name: "Install River Tire" }).click();
  await race.click();
  await expect(page.getByText(/River Tire fitted. A Feature win counts/)).toBeVisible();
  await page.getByRole("button", { name: "Legacy", exact: true }).click();
  await page.getByRole("button", { name: "Plan the Scrap Reset", exact: true }).click();
  const reset = page.getByRole("button", { name: "End the Season: Scrap Reset", exact: true });
  await expect(reset).toBeDisabled();
  const abandon = page.getByRole("checkbox", { name: "I’m ready to end this attempt" });
  await abandon.press("Space");
  await expect(reset).toBeEnabled();
  await reset.press("Enter");
  await expect(page.getByText("Start a two-Season attempt in River or Quarry County at Scrap Reset.", { exact: true })).toBeVisible();
  await expect(page.getByText(/Parts With a Past · 2×/)).toBeVisible();
});

test("a guarded baton handoff stays legal alongside a sponsored tour, works deal and museum project", async ({ page }) => {
  const game = combinedGarage();
  await openSave(page, game);
  await page.getByRole("button", { name: "Legacy", exact: true }).click();
  await page.getByRole("button", { name: "Plan the Scrap Reset", exact: true }).click();
  await expect(page.getByText(/lose the 150 Scrap Bucks stake with Reliable Parts/)).toBeVisible();
  await expect(page.getByText(`This reset retires the ${WORKS_FAMILIES[game.manufacturer!.active!.family].name} deal`, { exact: false })).toBeVisible();
  await expect(page.getByText(`ends the open museum exhibit for ${game.run.heritageProject!.originalName}`, { exact: false })).toBeVisible();
  if (game.club?.active) await expect(page.getByText(`retires the ${CLUB_CHARTERS[game.club.active.charter].name} calendar`, { exact: false })).toBeVisible();
  await expect(page.getByText("The safeguarded River Tire will be scrapped.", { exact: true })).toBeVisible();
  await page.getByRole("radio", { name: "Carry this baton to Quarry County for one perk slot" }).check();
  await expect(page.getByText("The safeguarded River Tire will be scrapped.", { exact: true })).toHaveCount(0);
  const reset = page.getByRole("button", { name: "End the Season: Scrap Reset", exact: true });
  if (game.config.perks.length >= 2 && await reset.isDisabled()) {
    await page.locator(".perk-actions input:checked").last().uncheck();
  }
  await reset.click();
  await expect(page.getByText(/Fit your inherited River Tire to a Beater/)).toBeVisible();
  await page.getByRole("button", { name: /^Garage/ }).click();
  await expect(page.getByText("Transferred baton", { exact: true })).toBeVisible();
});
