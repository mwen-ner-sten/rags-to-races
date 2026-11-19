import { expect, test, type Page } from "@playwright/test";
import { must } from "../../src/core";
import type { GameState } from "../../src/core/types";
import { clubCandidate } from "../fixtures/club";
import { saveText } from "../fixtures/rewrite";

async function importGarage(page: Page, game: GameState): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Save text").fill(saveText(game));
  await page.getByRole("button", { name: "Import save", exact: true }).click();
  await expect(page.getByText("Save loaded. Your previous game is kept as a backup in this browser.")).toBeVisible();
}

test("the Club tab opens an optional real Scrap plan and signs a grassroots race", async ({ page }) => {
  await page.clock.install();
  const game = clubCandidate("browser-club");
  await importGarage(page, game);
  await page.getByRole("button", { name: "Club", exact: true }).click();
  await page.getByRole("button", { name: "Plan a Club Season" }).click();
  await expect(page.getByRole("radio", { name: /Backyard Co-op/ })).toBeChecked();
  await expect(page.getByRole("radio", { name: "Race without a club" })).toBeEnabled();
  await page.getByRole("button", { name: "End the Season: Scrap Reset" }).click();
  await expect(page.getByRole("heading", { name: "Backyard Co-op" })).toBeVisible();
  await expect(page.getByText("Build a Push Mower to enter.")).toBeVisible();

  let prepared = must(game, { type: "reset", layer: "scrap", choices: { ...game.config, club: "yard_co_op" } });
  const [engine, wheel] = prepared.run.inventory;
  prepared = must(prepared, { type: "enqueue", spec: { kind: "assemble", vehicleId: "push_mower", partUids: { engine: engine.uid, wheel: wheel.uid }, name: "Club Special" } });
  prepared = must(prepared, { type: "advance", ms: 120_000 });
  await importGarage(page, prepared);
  await page.getByRole("button", { name: "Club", exact: true }).click();
  await page.getByLabel("Admission").selectOption("public");
  await page.getByRole("button", { name: "Sign up for club meeting" }).click();
  await expect(page.getByText("On track.")).toBeVisible();
  await page.clock.fastForward(90_000);
  await expect(page.getByText(/Club Special · .* · Free gates/)).toBeVisible();
});

test("a certified club can choose a new track and carry one earned workshop loan", async ({ page }) => {
  const game = clubCandidate("browser-track-club");
  game.club = { active: null, history: [], hasCertifiedClub: true, trackLicenses: ["tight_infield"] };
  await importGarage(page, game);
  await page.getByRole("button", { name: "Club", exact: true }).click();
  await page.getByRole("button", { name: "Plan a Club Season" }).click();
  await page.getByRole("radio", { name: /Fast Straight/ }).check();
  await page.getByLabel("Workshop loan").selectOption("tight_infield");
  await page.getByRole("button", { name: "End the Season: Scrap Reset" }).click();
  await expect(page.getByText("Fast Straight · 0/2 Push podiums")).toBeVisible();
  await expect(page.getByRole("option", { name: "Ticketed gates · 3 Scrap Bucks" })).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("rags-to-races:v2")!).game.config.clubLoan), { timeout: 12_000 }).toBe("tight_infield");
  await page.reload();
  await page.getByRole("button", { name: "Club", exact: true }).click();
  await expect(page.getByText("Fast Straight · 0/2 Push podiums")).toBeVisible();
  const loans = await page.evaluate(() => JSON.parse(localStorage.getItem("rags-to-races:v2")!).game.run.inventory.filter(({ origin }: { origin: string }) => origin.endsWith("Workshop Loan")));
  expect(loans).toHaveLength(1);
  expect(loans[0]).toMatchObject({ partId: "wheel_knobby", origin: "Tight Infield Workshop Loan" });
});
