import { expect, test } from "@playwright/test";
import { racer, saveText } from "../fixtures/rewrite";
import { setExperimentalCareers } from "../../src/core/features";

// Covers experimental side careers, which are hidden unless this browser preference is on.
// Fixtures build experimental saves in Node, so the engine flag must be on here too.
test.beforeAll(() => setExperimentalCareers(true));
test.afterAll(() => setExperimentalCareers(false));
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("rags-to-races:experimental-careers", "on"));
});

test("Manufacturer signs one real works entry and presents its next benchmark", async ({ page }) => {
  await page.clock.install();
  const game = racer("manufacturer-browser", "go_kart");
  const car = game.run.vehicles[0];
  car.name = "Copper Comet";
  car.parts.engine!.partId = "engine_twin";
  car.parts.wheel!.partId = "wheel_sport";
  game.run.venuesOpen.push("dirt", "county_fair");
  game.run.ladder.dirt = ["sprint", "heat", "feature"];
  game.run.ladder.county_fair = ["sprint", "heat", "feature"];
  game.manufacturer = { active: null, invites: ["redwheel"], drawings: [], history: [] };
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Save text").fill(saveText(game));
  await page.getByRole("button", { name: "Import save", exact: true }).click();
  await expect(page.getByText("Save loaded. Your previous game is kept as a backup in this browser.")).toBeVisible();
  await page.getByRole("button", { name: "Manufacturer", exact: true }).click();
  await page.getByRole("button", { name: "Sign Redwheel Works deal" }).click();
  await expect(page.getByRole("heading", { name: "Redwheel Works · Copper Comet" })).toBeVisible();
  await page.getByRole("button", { name: "Sign up for works trial" }).click();
  await expect(page.getByText("On track.")).toBeVisible();
  await expect(page.getByText(/0\/2 benchmarks passed/)).toBeVisible();
  await page.clock.fastForward(240_000);
  await expect(page.getByText(/1\/2 benchmarks passed/)).toBeVisible();
  await expect(page.getByText(/Next benchmark.*County Fair Sprint/)).toBeVisible();
});
