import { expect, test, type Page } from "@playwright/test";
import { createGame, must } from "../../src/core";
import type { GameState } from "../../src/core/types";
import { racer, saveText } from "../fixtures/rewrite";

async function importBuilderSave(page: Page, state: GameState) {
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Save text").fill(saveText(state));
  await page.getByRole("button", { name: "Import save", exact: true }).click();
  await expect(page.getByText("Save loaded. Your previous game is kept as a backup in this browser.")).toBeVisible();
}

test("the Auction Bidder loadout opens an early paid trip at zero Rep", async ({ page }) => {
  const state = createGame("early-auction-browser");
  state.meta.challengeRecords.parts_with_a_past = { completions: 3, bestSeasonMs: 1000, bestVehicleName: "Provenance Kart" };
  state.run.featureWins.county_fair = 1000;
  state.run.seasonMs = 1000;
  state.scrap.lp = 4;
  const saved = must(state, { type: "reset", layer: "scrap", choices: {
    buy: ["auction_bidder"], perks: ["auction_bidder"], tuneUp: { haul: 0, wrench: 0, build: 0, race: 0 }, dare: null, hardships: [],
  } });
  await importBuilderSave(page, saved);
  await page.getByRole("button", { name: /^Trips/ }).click();
  const auction = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Salvage Auction", exact: true }) });
  await auction.getByRole("button", { name: "Open · 0 Rep" }).click();
  await expect(auction.getByRole("button", { name: "Go", exact: true })).toBeDisabled();
  await expect(auction.getByText("Needs 40 Scrap Bucks")).toBeVisible();
});

test("founding shows an earned LP budget and forfeits only the remainder", async ({ page }) => {
  const state = racer("founding-budget-browser", "go_kart");
  state.meta.stateWonEver = true;
  state.run.revealed.push("team");
  state.run.featureWins.county_fair = 1000;
  state.run.seasonMs = 1000;
  await importBuilderSave(page, state);
  await page.getByRole("button", { name: /^Team/ }).click();
  await page.getByRole("button", { name: "Found the team", exact: true }).click();
  await page.getByLabel("Team name").fill("Budget Builders");
  await expect(page.getByText(/12 unspent Legacy Points will expire/)).toBeVisible();
  const perk = page.getByRole("listitem").filter({ has: page.getByText("Night Owl", { exact: true }) });
  await perk.getByRole("button", { name: /^Buy/ }).click();
  await perk.getByRole("checkbox", { name: "Equip", exact: true }).check();
  await expect(page.getByText(/4 unspent Legacy Points will expire/)).toBeVisible();
  await page.getByRole("button", { name: "Found the team", exact: true }).click();
  await expect(page.getByText(/Budget Builders · Season/)).toBeVisible();
});

test("a protected part stays marked after reload and batch cleaning starts normal jobs", async ({ page }) => {
  await page.clock.install();
  const state = racer("protected-parts-browser");
  state.run.inventory.push(
    { uid: "green-engine", partId: "engine_lawn", condition: 1, origin: "Curbside" },
    { uid: "rusted-wheel", partId: "wheel_basic", condition: 1, origin: "Curbside" },
  );
  await importBuilderSave(page, state);
  const garage = page.getByRole("button", { name: /^Garage/ });
  await garage.click();
  const partsTab = page.getByRole("tab", { name: /^Parts/ });
  await partsTab.click();
  const engine = page.getByRole("listitem").filter({ has: page.getByText("Lawn Mower Engine", { exact: true }) });
  await engine.getByRole("button", { name: "Keep", exact: true }).click();
  await expect(engine.getByRole("button", { name: "Keep", pressed: true })).toBeVisible();
  await page.clock.fastForward(6_000);
  await page.reload();
  await garage.click();
  await partsTab.click();
  await expect(engine.getByRole("button", { name: "Keep", pressed: true })).toBeVisible();
  await page.getByRole("button", { name: "Queue cleaning for 2 shown parts" }).click();
  await expect(page.getByText("Queued, waiting for a free bench", { exact: true })).toBeVisible();
});
