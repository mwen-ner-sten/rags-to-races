import { expect, test } from "@playwright/test";
import { racer, saveText } from "../fixtures/rewrite";

test("an earned county choice changes the available salvage source after reload", async ({ page }) => {
  await page.clock.install();
  const state = racer("earned-county-browser", "go_kart");
  state.meta.knowhow["tech:scouting"] = 1;
  state.meta.codex.places = { curb: 28, yards: 1, junkyard: 1 };
  state.run.featureWins.county_fair = 1000;
  state.run.seasonMs = 1000;
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Save text").fill(saveText(state));
  await page.getByRole("button", { name: "Import save", exact: true }).click();
  await expect(page.getByText("Save loaded. Your previous game is kept as a backup in this browser.")).toBeVisible();
  await page.getByRole("button", { name: "Legacy", exact: true }).click();
  await page.getByRole("button", { name: "Plan the Scrap Reset", exact: true }).click();
  const county = page.getByRole("group", { name: "Home county" });
  await expect(county.getByText(/charges 14 Scrap Bucks per trip/)).toBeVisible();
  await county.getByRole("radio", { name: /^River County/ }).check();
  await page.getByRole("button", { name: "End the Season: Scrap Reset", exact: true }).click();
  await page.clock.fastForward(6_000);
  await page.reload();
  await expect(page.getByText("Home county · River County", { exact: true })).toBeVisible();
  const lots = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Floodplain Lots", exact: true }) });
  await expect(lots.getByRole("button", { name: "Open · 5 Rep", exact: true })).toBeDisabled();
  await expect(page.getByRole("heading", { name: "Neighbourhood Yards", exact: true })).toHaveCount(0);
});
