import { expect, test } from "@playwright/test";
import { must } from "../../src/core";
import { resolveRace } from "../../src/core/race";
import { racer, saveText } from "../fixtures/rewrite";

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
  const hall = async () => {
    await page.getByRole("button", { name: /^Notebook/ }).click();
    await page.getByRole("tab", { name: "Hall of Fame" }).click();
  };
  await hall();
  await page.locator("summary").filter({ hasText: "Blue Monday" }).click();
  await page.getByRole("button", { name: "Recreate for the museum" }).click();
  const desk = page.getByRole("region", { name: "Heritage register" });
  await desk.getByText("Find original components", { exact: false }).click();
  await desk.getByRole("button", { name: /^Fit / }).click();
  const deliver = desk.getByRole("button", { name: "Deliver to museum" });
  await expect(deliver).toBeDisabled();
  await desk.getByRole("checkbox", { name: /Donate Blue Tuesday/ }).check();
  await deliver.click();
  await expect(desk.getByText("Blue Tuesday entered the register this Season.")).toBeVisible();
  await page.reload();
  await hall();
  await expect(desk.getByText("Blue Tuesday entered the register this Season.")).toBeVisible();
  await expect(desk.getByRole("button", { name: "Print drawings", exact: false })).toBeVisible();
});
