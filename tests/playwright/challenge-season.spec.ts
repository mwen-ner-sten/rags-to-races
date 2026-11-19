import { expect, test } from "@playwright/test";
import { createGame, must } from "../../src/core";
import { racer, saveText } from "../fixtures/rewrite";

test("a Scrap Reset starts a challenge and keeps its goal after reload", async ({ page }) => {
  await page.clock.install();
  const game = racer("season-challenge-regression", "go_kart");
  game.run.venuesOpen.push("county_fair");
  game.run.featureWins.county_fair = 1000;
  game.run.seasonMs = 1000;

  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Save text").fill(saveText(game));
  await page.getByRole("button", { name: "Import save", exact: true }).click();
  await expect(page.getByText("Save loaded. Your previous game is kept as a backup in this browser.")).toBeVisible();

  const legacy = page.getByRole("button", { name: "Legacy", exact: true });
  await legacy.click();
  await page.getByRole("button", { name: "Plan the Scrap Reset", exact: true }).click();
  await page.getByRole("radio", { name: /^Homebuilt Relay/ }).check();
  await page.getByRole("button", { name: "End the Season: Scrap Reset", exact: true }).click();

  const status = page.getByText("Homebuilt Relay · In progress", { exact: true });
  const goal = page.getByText(/same Go-Kart and frame on Kart Slicks or Sport Tires/);
  await expect(status).toBeVisible();
  await expect(goal).toBeVisible();

  await page.clock.fastForward(6_000);
  await page.reload();
  await legacy.click();
  await expect(status).toBeVisible();
  await expect(goal).toBeVisible();
});

test("the paired perks reveal a free junkyard on a zero-Rep post-reset save", async ({ page }) => {
  const game = createGame("free-junkyard-regression");
  game.run.featureWins.county_fair = 0;
  game.meta.perks = { dirt_track_pass: 1, borrowed_trailer: 1 };
  const saved = must(game, { type: "reset", layer: "scrap", choices: {
    perks: ["dirt_track_pass", "borrowed_trailer"], tuneUp: { haul: 0, wrench: 0, build: 0, race: 0 }, dare: null, hardships: [],
  } });
  expect(saved.run.rep).toBe(0);
  expect(saved.run.revealed).not.toContain("places");

  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Save text").fill(saveText(saved));
  await page.getByRole("button", { name: "Import save", exact: true }).click();
  await expect(page.getByText("Save loaded. Your previous game is kept as a backup in this browser.")).toBeVisible();
  await page.getByRole("button", { name: "Trips", exact: true }).click();

  const junkyard = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Marisol's Junkyard", exact: true }) });
  await junkyard.getByRole("button", { name: "Open · 0 Rep", exact: true }).click();
  await expect(junkyard.getByRole("button", { name: "Go", exact: true })).toBeEnabled();
});
