import { expect, test } from "@playwright/test";
import { racer } from "../fixtures/rewrite";

function riverGarage() {
  const game = racer("baton-ui", "go_kart");
  game.config.homeCounty = "river";
  game.meta.knowhow["tech:scouting"] = 1;
  game.meta.codex.places = { curb: 8, floodplain: 4, junkyard: 3 };
  game.meta.challengeRecords.parts_with_a_past = { completions: 1, bestSeasonMs: 1, bestVehicleName: "Parts racer" };
  game.run.seasonMs = 1000;
  game.run.venuesOpen.push("dirt", "county_fair");
  game.run.ladder.dirt = ["sprint", "heat", "feature"];
  game.run.ladder.county_fair = ["sprint", "heat", "feature"];
  game.run.featureWins.county_fair = 1000;
  game.run.inventory.push({ uid: "baton-tire", partId: "wheel_river", condition: 2, origin: "Floodplain Lots", provenance: { placeId: "floodplain", county: "river", season: 2 } });
  return game;
}

test("county freight buys back the crate slot for one reset", async ({ page }) => {
  await page.addInitScript((game) => {
    localStorage.setItem("rags-to-races:experimental-careers", "on");
    if (!localStorage.getItem("rags-to-races:v2")) localStorage.setItem("rags-to-races:v2", JSON.stringify({ game, savedAt: Date.now() }));
  }, riverGarage());
  await page.goto("/");
  const more = page.getByRole("button", { name: /^More/ });
  const legacy = page.getByRole("button", { name: "Legacy", exact: true });
  await expect(legacy.or(more).first()).toBeVisible();
  if (!(await legacy.isVisible())) await more.click();
  await legacy.click();
  await page.getByRole("button", { name: "Plan the Scrap Reset" }).click();
  await page.getByRole("radio", { name: /^River Tire/ }).check();
  const fee = page.getByRole("checkbox", { name: /Pay 8 Legacy Points for freight/ });
  await expect(fee).toHaveCount(0);
  await page.getByRole("radio", { name: /^Quarry County/ }).check();
  await expect(fee).not.toBeChecked();
  await fee.check();
  await page.getByRole("button", { name: "End the Season: Scrap Reset" }).click();
  await expect(page.getByText(/Shipping your part cost 8 Legacy Points/)).toBeVisible();
});
