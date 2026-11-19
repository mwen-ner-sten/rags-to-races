import { expect, test } from "@playwright/test";
import { racer, saveText } from "../fixtures/rewrite";

test("a regional starter finds the authored rival and runs a real local Sprint", async ({ page }) => {
  await page.clock.install();
  const game = racer("regional-browser");
  game.config.homeCounty = "river";
  game.meta.knowhow["tech:scouting"] = 1;
  game.meta.codex.places = { curb: 1, junkyard: 1, yards: 1 };
  const car = game.run.vehicles[0];
  car.parts.engine!.partId = "engine_lawn";
  car.parts.engine!.origin = "Curbside";
  car.parts.engine!.provenance = { county: "river", placeId: "curb", season: game.meta.seasonsPlayed + 1 };
  car.parts.wheel!.partId = "wheel_knobby";
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Save text").fill(saveText(game));
  await page.getByRole("button", { name: "Import save", exact: true }).click();
  await expect(page.getByText("Save loaded. Your previous game is kept as a backup in this browser.")).toBeVisible();
  await page.getByRole("button", { name: "Trips", exact: true }).click();
  await expect(page.getByText(/Fit a part from a local haul.*Inez Marsh/)).toBeVisible();
  await page.getByRole("button", { name: /^Race/ }).click();
  const match = page.getByRole("region", { name: "River County matchup · Inez Marsh" });
  await match.getByRole("group", { name: "Race pace" }).getByRole("button", { name: "Push" }).click();
  await match.getByRole("button", { name: "Sign up against Inez Marsh" }).click();
  await expect(match.getByText("County match on track.")).toBeVisible();
  await page.clock.fastForward(90_000);
  await expect(match.getByText(/(earned this offer|Last attempt)/)).toBeVisible();
});
