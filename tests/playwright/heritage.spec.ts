import { expect, test } from "@playwright/test";
import { must } from "../../src/core";
import { resolveRace } from "../../src/core/race";
import { racer, saveText } from "../fixtures/rewrite";
import { setExperimentalCareers } from "../../src/core/features";

// Covers experimental side careers, which are hidden unless this browser preference is on.
// Fixtures build experimental saves in Node, so the engine flag must be on here too.
test.beforeAll(() => setExperimentalCareers(true));
test.afterAll(() => setExperimentalCareers(false));
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("rags-to-races:experimental-careers", "on"));
});

test("a returning mechanic fits an archival component, approves a museum donation and finds it after reload", async ({ page }) => {
  const original = racer("museum-browser");
  const car = original.run.vehicles[0];
  car.name = "Blue Monday";
  resolveRace(original, { kind: "race", vehicleUid: car.uid, venueId: "backyard", event: "sprint", call: "nurse" });
  original.run.featureWins.county_fair = original.run.seasonMs;
  const game = must(original, { type: "reset", layer: "scrap", choices: original.config });
  const second = structuredClone(car);
  second.name = "Blue Tuesday";
  second.uid = "second-mower";
  for (const part of Object.values(second.parts)) if (part) { part.uid += "-second"; part.condition = 3; }
  game.run.inventory.push(second.parts.wheel!);
  delete second.parts.wheel;
  game.run.vehicles.push(second);

  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Save text").fill(saveText(game));
  await page.getByRole("button", { name: "Import save", exact: true }).click();
  await page.getByRole("button", { name: /^Notebook/ }).click();
  await page.getByRole("tab", { name: "Hall of Fame" }).click();
  await expect(page.getByRole("region", { name: "Heritage register" })).toHaveCount(0);
  await page.locator("summary").filter({ hasText: "Blue Monday" }).click();
  await page.getByRole("button", { name: "Recreate for the museum" }).click();
  await expect(page.getByText("Blue Monday is being recreated. Work on it in the Workshop, under Heritage.")).toBeVisible();
  await expect(page.getByRole("region", { name: "Heritage register" })).toHaveCount(0);
  await page.getByRole("button", { name: "Open Heritage in the Workshop" }).click();
  await expect(page.getByRole("tab", { name: "Heritage" })).toHaveAttribute("aria-selected", "true");
  const desk = page.getByRole("region", { name: "Heritage register" });
  await desk.getByText("Find original components", { exact: false }).click();
  await desk.getByRole("button", { name: /^Fit / }).click();
  const deliver = desk.getByRole("button", { name: "Deliver to museum" });
  await expect(deliver).toBeDisabled();
  await desk.getByRole("checkbox", { name: /Donate Blue Tuesday/ }).check();
  await deliver.click();
  await expect(desk.getByText("Blue Tuesday entered the register this Season.")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /^Workshop/ }).click();
  await page.getByRole("tab", { name: "Heritage" }).click();
  await expect(desk.getByText("Blue Tuesday entered the register this Season.")).toBeVisible();
  await expect(desk.getByRole("button", { name: "Print drawings", exact: false })).toBeVisible();
});
