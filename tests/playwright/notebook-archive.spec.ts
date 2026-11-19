import { expect, test } from "@playwright/test";
import { racer, saveText } from "../fixtures/rewrite";
import { resolveRace } from "../../src/core/race";

function archivist() {
  const game = racer("notebook-archive", "go_kart");
  const car = game.run.vehicles[0];
  game.meta.codex.parts.wheel_dirt = 4;
  game.meta.codex.places.junkyard = 10;
  game.meta.journal.push({ id: "early-season", season: 1, seasonMs: 20_000, text: "Marisol found the missing frame." },
    { id: "late-season", season: 2, seasonMs: 30_000, text: "Lou repainted the hauler." });
  game.meta.hallOfFame = Array.from({ length: 34 }, (_, i) => ({
    season: i+1, vehicleId: "go_kart", name: "Retired Kart " + (i+1), history: { ...car.history },
    parts: [{ slot: "wheel", partId: "wheel_dirt", condition: 2, origin: "Marisol's Junkyard" }],
  }));
  for (let n = 0; n < 14; n++) {
    game.run.seasonMs += 600_000;
    const r = resolveRace(game, { kind: "race", vehicleUid: car.uid, venueId: "backyard", event: "feature", call: "nurse" });
    if (!r) throw new Error("Fixture race did not settle");
  }
  return game;
}

test("a veteran can look up discovered art, recover an old build and find a season entry", async ({ page }) => {
  const game = archivist();
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Save text").fill(saveText(game));
  await page.getByRole("button", { name: "Import save", exact: true }).click();
  await page.getByRole("button", { name: /^Notebook/ }).click();
  await page.getByLabel("Search journal").fill("repainted");
  await expect(page.getByText("Lou repainted the hauler.")).toBeVisible();
  await page.getByRole("combobox", { name: "Season", exact: true }).selectOption("1");
  await expect(page.getByText("No matching journal entries.")).toBeVisible();
  await page.getByRole("tab", { name: "Hall of Fame" }).click();
  await page.getByLabel("Find a retired vehicle").fill("Retired Kart 1");
  await page.locator("summary").filter({ has: page.getByText("Retired Kart 1", { exact: true }) }).click();
  await expect(page.locator("details[open]").getByText("Dirt Tire", { exact: true })).toBeVisible();
  await expect(page.locator("details[open]").getByText(/Worn · Marisol's Junkyard/)).toBeVisible();
  await page.getByRole("tab", { name: "Codex" }).click();
  await page.getByLabel("Find a part").fill("Dirt Tire");
  const art = page.getByRole("img", { name: "Dirt Tire" });
  await expect(art).toBeVisible();
  await expect.poll(() => art.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByText(/Found at Marisol's Junkyard/)).toBeVisible();
});

test("rival replay controls and race history expose earlier races without resettling them", async ({ page }) => {
  const game = archivist();
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Save text").fill(saveText(game));
  await page.getByRole("button", { name: "Import save", exact: true }).click();
  await page.getByRole("button", { name: /^Notebook/ }).click();
  await page.getByRole("tab", { name: "Rivals" }).click();
  await page.getByText(/Recent meetings this season/).first().click();
  await page.getByRole("button", { name: "Watch meeting" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Pause replay" }).click();
  await dialog.getByRole("group", { name: "Replay speed" }).getByRole("button", { name: "2×" }).click();
  await dialog.getByRole("slider", { name: "Race progress" }).fill("540");
  await expect(dialog.getByRole("button", { name: "Resume replay" })).toBeVisible();
  await dialog.getByRole("button", { name: "Skip to the flag" }).click();
  await dialog.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("button", { name: /^Race/ }).first().click();
  const results = page.getByRole("region", { name: "Results" });
  await expect(results.getByRole("button", { name: "Watch", exact: true })).toHaveCount(12);
  await results.getByRole("button", { name: "Show older races" }).click();
  await expect(results.getByRole("button", { name: "Watch", exact: true })).toHaveCount(14);
  await results.getByRole("group", { name: "Race outcome" }).getByRole("button", { name: "Wins" }).click();
  await expect(results.getByRole("button", { name: "Watch", exact: true })).toHaveCount(Math.min(12,game.run.races.filter((r) => !r.dnf && r.position === 1).length));
});
