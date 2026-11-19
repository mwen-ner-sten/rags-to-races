import { expect, test } from "@playwright/test";
import { racer, saveText } from "../fixtures/rewrite";

test("salvage carryover trades a perk slot for the chosen worn part", async ({ page }) => {
  await page.clock.install();
  const game = racer("carryover-browser", "go_kart");
  game.meta.challengeRecords.parts_with_a_past = { completions: 1, bestSeasonMs: 1, bestVehicleName: "Trail Kart" };
  game.meta.perks = { night_owl: 1, tow_hitch: 1 };
  game.config.perks = ["night_owl", "tow_hitch"];
  game.run.inventory.push({ uid: "wagon-engine", partId: "engine_tiller", origin: "Curbside", condition: 2 });
  game.run.featureWins.county_fair = 1000;
  game.run.seasonMs = 1000;

  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Save text").fill(saveText(game));
  await page.getByRole("button", { name: "Import save", exact: true }).click();
  await expect(page.getByText("Save loaded. Your previous game is kept as a backup in this browser.")).toBeVisible();
  await page.getByRole("button", { name: "Legacy", exact: true }).click();
  await page.getByRole("button", { name: "Plan the Scrap Reset", exact: true }).click();

  await page.getByRole("group", { name: "Part to carry" }).getByRole("radio", { name: /Tiller Engine Worn.*Garage/ }).check();
  await expect(page.getByText(/1 perk slot remains/)).toBeVisible();
  const reset = page.getByRole("button", { name: "End the Season: Scrap Reset", exact: true });
  await expect(reset).toBeDisabled();
  const tow = page.getByRole("listitem").filter({ has: page.getByText("Tow Hitch", { exact: true }) });
  await tow.getByRole("checkbox", { name: "Equip" }).uncheck();
  await expect(reset).toBeEnabled();
  await reset.click();

  await page.clock.fastForward(6_000);
  await page.reload();
  await page.getByRole("button", { name: /^Garage/ }).click();
  const part = page.getByRole("listitem").filter({ has: page.getByText("Tiller Engine", { exact: true }) });
  await expect(part.getByText("Worn", { exact: true })).toBeVisible();
  await expect(part.getByText("Carried from last Season")).toBeVisible();
});
