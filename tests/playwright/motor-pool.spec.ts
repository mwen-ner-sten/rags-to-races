import { expect, test, type Page } from "@playwright/test";
import { must } from "../../src/core";
import { garageSpace } from "../../src/core/garage";
import type { GameState } from "../../src/core/types";
import { racer } from "../fixtures/rewrite";
import { setExperimentalCareers } from "../../src/core/features";

// Covers experimental side careers, which are hidden unless this browser preference is on.
// Fixtures build experimental saves in Node, so the engine flag must be on here too.
test.beforeAll(() => setExperimentalCareers(true));
test.afterAll(() => setExperimentalCareers(false));
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("rags-to-races:experimental-careers", "on"));
});

const HOUR = 3_600_000;
const RUNABOUT = "Elm Street Runner";
const REGRESSION_WHEEL = "depot-fit-wheel";
const REGRESSION_TENDER = "depot-ramp-tender";
const now = new Date("2026-11-01T18:00:00Z");

function permittedDepot() {
  const game = racer("depot-garage-browser", "service_runabout");
  game.run.vehicles[0].name = RUNABOUT;
  game.run.vehicles[0].parts.rear_wheel!.condition = 1;
  const mower = racer("other-hauler", "riding_mower").run.vehicles[0];
  mower.uid = "other-hauler";
  mower.name = "Early Mower";
  for (const part of Object.values(mower.parts)) if (part) part.uid = `mower-${part.uid}`;
  game.run.vehicles.unshift(mower);
  game.meta.serviceReferences = {
    equipment: { season: 1, tool: "parts_washer",
      invoice: { client: "marina", condition: 2, partId: "wheel_basic", partUid: "workshop-invoice", origin: "Curbside" } },
    referral: { season: 2,
      invoice: { client: "orchard", condition: 3, partId: "engine_lawn", partUid: "referral-invoice", origin: "Curbside" } },
  };
  game.meta.seasonsPlayed = 2;
  game.motorPool = { lastLodgedSeason: 2, ledger: { season: 2, booked: [] }, custody: null, job: null, claim: null };
  game.run.inventory.push({ uid: REGRESSION_WHEEL, partId: "wheel_knobby", condition: 3, origin: "Neighbourhood Yards" },
    { uid: REGRESSION_TENDER, partId: "wheel_basic", condition: 2, origin: "Curbside" });
  return game;
}

async function openSave(page: Page, game: GameState, away = false) {
  await page.clock.install({ time: now });
  await page.addInitScript(({ game, savedAt }) => {
    if (!localStorage.getItem("rags-to-races:v2")) localStorage.setItem("rags-to-races:v2", JSON.stringify({ game, savedAt }));
  }, { game, savedAt: now.getTime() - (away ? HOUR : 0) });
  await page.goto("/");
}

test("garage exposes the depot and a named Runabout can be lodged, fitted and sent to Ramp depot", async ({ page }) => {
  await openSave(page, permittedDepot());
  await page.getByRole("navigation", { name: "Sections" }).getByRole("button", { name: /^Garage/ }).click();
  const heading = page.getByRole("heading", { name: "County Motor Pool", exact: true });
  await expect(heading).toBeVisible();
  const shortcut = page.getByRole("button", { name: "Open County Motor Pool" });
  await expect(shortcut).toBeInViewport();
  await shortcut.focus();
  await page.keyboard.press("Enter");
  await expect(heading).toBeFocused();

  await page.getByLabel("Rig to lodge").selectOption("fixture-vehicle");
  await page.getByRole("button", { name: "Lodge rig at depot" }).click();
  const confirm = page.getByRole("button", { name: `Confirm lodging ${RUNABOUT}` });
  await expect(confirm).toHaveAccessibleDescription(/leaves your garage/i);
  await page.getByRole("button", { name: "Keep in the garage" }).click();
  await expect(page.getByRole("heading", { name: new RegExp(RUNABOUT) })).toBeVisible();
  const lodge = page.getByRole("button", { name: "Lodge rig at depot" });
  await expect(lodge).toBeFocused();
  await lodge.click();
  await confirm.click();
  await expect(heading).toBeFocused();
  await expect(page.getByRole("heading", { name: new RegExp(RUNABOUT) })).toHaveCount(0);

  const depot = page.getByRole("region", { name: "County Motor Pool" });
  await expect(depot.getByText(/Rear wheel · Rusted/)).toBeVisible();
  await expect(depot.getByRole("button", { name: "Book Ramp depot" })).toBeDisabled();
  await depot.getByLabel("Replace Rear wheel").selectOption(REGRESSION_WHEEL);
  await depot.getByRole("button", { name: "Fit Rear wheel" }).click();
  await expect(depot.getByText(/Rear wheel · Good Knobby Tire/)).toBeVisible();
  await expect(depot.getByText(/Front wheel · Restored Turf Tire/)).toBeVisible();
  await depot.getByRole("button", { name: "Book Ramp depot" }).click();
  await expect(heading).toBeFocused();
  await expect(depot.getByText(/Expected return · Worn Kart Chassis/)).toBeVisible();
  await expect(depot.getByRole("progressbar", { name: "Depot run progress" })).toBeVisible();
  for (let step = 0; step < 10; step++) await page.clock.fastForward(4 * 60_000);
  await expect(depot.getByRole("button", { name: "Collect depot stock" })).toBeVisible();
  await expect(depot.getByText(/Rear wheel · Worn Knobby Tire/)).toBeVisible();
});

test("a full garage exposes the waiting return and gives a route to free space before collecting", async ({ page }) => {
  let game = permittedDepot();
  game = must(game, { type: "motorPool", move: { type: "lodge", vehicleUid: "other-hauler" } });
  game = must(game, { type: "motorPool", move: { type: "book", route: "ramp", tenderUid: REGRESSION_TENDER } });
  while (game.run.inventory.length < garageSpace(game)) {
    game.run.inventory.push({ uid: `filler-${game.run.inventory.length}`, partId: "junk_misc", condition: 1, origin: "Curbside" });
  }
  await openSave(page, game, true);
  const away = page.getByRole("dialog", { name: "While you were away" });
  await away.getByRole("button", { name: "Open depot pickup" }).click();
  const ready = page.getByText("Worn Kart Chassis ready for pickup.");
  await expect(ready).toBeFocused();
  await expect(ready).toBeInViewport();
  const claim = page.getByRole("button", { name: "Collect depot stock" });
  await expect(claim).toBeDisabled();
  await page.getByRole("button", { name: "Manage garage parts" }).click();
  await expect(page.getByRole("heading", { name: "Parts", exact: true })).toBeFocused();
  await page.getByRole("button", { name: /Sell all junk/ }).click();
  const shortcut = page.getByRole("button", { name: "Open depot pickup" });
  await shortcut.click();
  await expect(claim).toBeFocused();
  await claim.click();
  await expect(claim).toHaveCount(0);
  await expect(page.getByText("from County Motor Pool · Ramp depot", { exact: true })).toBeVisible();
});
