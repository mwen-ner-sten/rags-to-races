import { expect, test, type Page } from "@playwright/test";
import { must } from "../../src/core";
import { racer, saveText, swapMeetGame, teamRacer } from "../fixtures/rewrite";

async function importGame(page: Page, game: unknown): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Save text").fill(saveText(game));
  await page.getByRole("button", { name: "Import save", exact: true }).click();
  await expect(page.getByText("Save loaded. Your previous game is kept as a backup in this browser.")).toBeVisible();
}

test("trades at the earned Swap Meet and preserves the result after reload", async ({ page }) => {
  await importGame(page, swapMeetGame());
  await page.getByRole("button", { name: /^Garage/ }).click();
  const trade = page.getByRole("region", { name: "Swap meet", exact: true });
  const submit = trade.getByRole("button", { name: "Trade three parts" });
  await expect(submit).toBeDisabled();
  for (const checkbox of await trade.getByRole("checkbox").all()) await checkbox.check();
  await trade.getByLabel("Receive at the swap meet").selectOption("engine_lawn");
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(trade.getByRole("status")).toHaveText("Received a Worn Lawn Mower Engine.");
  // Save through the public UI's export/import path, then exercise actual persistence.
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Export save", exact: true }).click();
  const exported = await page.getByLabel("Save text").inputValue();
  await page.getByRole("button", { name: "Import save", exact: true }).click();
  await page.reload();
  const saved = await page.evaluate(() => JSON.parse(window.localStorage.getItem("rags-to-races:v2")!));
  expect(saved.game.run.inventory).toHaveLength(1);
  expect(saved.game.run.inventory[0]).toMatchObject({ partId: "engine_lawn", condition: 2, origin: "Swap meet" });
  expect(exported.length).toBeGreaterThan(100);
  await page.getByRole("button", { name: /^Garage/ }).click();
  await expect(page.getByRole("heading", { name: "Swap meet", exact: true })).toBeVisible();
});

test("migrates an older save and purchases an already-earned milestone perk at reset", async ({ page }) => {
  const game = racer("older-browser-save", "beater_car");
  game.meta.records.regional = 100;
  game.run.featureWins.county_fair = 200;
  game.scrap.lp = 60;
  const older = { ...game, meta: { ...game.meta, tipsSeen: undefined }, run: { ...game.run, driveway: undefined } };
  await importGame(page, older);
  await page.getByRole("button", { name: "Legacy", exact: true }).click();
  await page.getByRole("button", { name: "Plan the Scrap Reset", exact: true }).click();
  const perk = page.getByRole("listitem").filter({ has: page.getByText("Second Bench", { exact: true }) });
  await perk.getByRole("button", { name: /^Buy/ }).click();
  await perk.getByRole("checkbox", { name: "Equip", exact: true }).check();
  await page.getByRole("button", { name: "End the Season: Scrap Reset", exact: true }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Export save", exact: true }).click();
  await page.getByRole("button", { name: "Import save", exact: true }).click();
  await page.reload();
  const saved = await page.evaluate(() => JSON.parse(window.localStorage.getItem("rags-to-races:v2")!));
  expect(saved.game.scrap.resets).toBe(1);
  expect(saved.game.config.perks).toContain("second_bench");
  expect(saved.game.meta.perks.second_bench).toBe(1);
  expect(saved.game.run.driveway).toEqual([]);
});

test("develops assigned race crew and releases their controls at the flag", async ({ page }) => {
  await page.clock.install();
  const game = must(teamRacer(), { type: "enqueue", spec: { kind: "race", vehicleUid: "fixture-vehicle", venueId: "backyard", event: "sprint", call: "nurse" } });
  await importGame(page, game);
  await page.getByRole("button", { name: /^Team/ }).click();
  const driver = page.getByRole("article").filter({ has: page.getByRole("heading", { name: /DeShawn/ }) });
  const spotter = page.getByRole("article").filter({ has: page.getByRole("heading", { name: /Pearl/ }) });
  await expect(driver.getByRole("combobox")).toBeDisabled();
  await expect(spotter.getByRole("combobox")).toBeDisabled();
  await page.clock.fastForward(60_000);
  await expect(driver.getByRole("heading")).toContainText("Lv 2");
  await expect(spotter.getByRole("heading")).toContainText("Lv 2");
  await expect(driver.getByRole("combobox")).toBeEnabled();
  await expect(spotter.getByRole("combobox")).toBeEnabled();
});

test("rejects a malformed import and exposes the browser backup", async ({ page }) => {
  await importGame(page, swapMeetGame());
  const malformed = saveText({ version: 1, run: {} });
  await page.getByLabel("Save text").fill(malformed);
  await page.getByRole("button", { name: "Import save", exact: true }).click();
  await expect(page.getByText("That doesn't look like a Rags to Races save.")).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(window.localStorage.getItem("rags-to-races:v2")!));
  expect(saved.game.seed).toBe("swap-meet-regression");
  expect(saved.game.run.inventory).toHaveLength(3);
  await page.getByRole("button", { name: "Export browser backup", exact: true }).click();
  await expect(page.getByLabel("Save text")).not.toHaveValue("");
  await expect(page.getByLabel("Save text")).not.toHaveValue(malformed);
});
