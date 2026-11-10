import { expect, test, type Page } from "@playwright/test";
import { racer, saveText, teamRacer } from "../fixtures/rewrite";

async function importGame(page: Page, game: unknown): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Save text").fill(saveText(game));
  await page.getByRole("button", { name: "Import save", exact: true }).click();
  await expect(page.getByText("Save loaded. Your previous game is kept as a backup in this browser.")).toBeVisible();
}

test("@smoke a finished trip is announced and listed under Lately", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: "Go", exact: true }).click();
  const lately = page.getByRole("region", { name: "Lately" });
  await expect(lately.getByText(/Curbside trip brought home Small Engine \(Rusted\)/)).toBeVisible({ timeout: 25_000 });
  // The same news passes by as a toast, and the first find is a Journal moment.
  await expect(page.getByRole("status").filter({ hasText: /Curbside trip brought home/ }).first()).toBeVisible();
  await expect(lately.getByText(/Trash night/)).toBeVisible();
});

test("the Race tab says what each track rewards and how the rival races", async ({ page }) => {
  await importGame(page, racer());
  await page.getByRole("button", { name: /^Race/ }).click();
  await expect(page.getByText("Tight and twisty. Handling matters most; power has nowhere to go.")).toBeVisible();
  await expect(page.getByText(/Handling: counts more/)).toBeVisible();
  await expect(page.getByText(/His Snapper quits about one race in five/)).toBeVisible();
  await expect(page.getByText(/You haven.t raced them yet/)).toBeVisible();
});

test("the Garage scores a vehicle at the track you pick", async ({ page }) => {
  const game = racer("garage-depth", "riding_mower");
  game.run.venuesOpen.push("dirt");
  game.run.ladder.dirt = ["sprint"];
  game.run.revealed.push("garage");
  await importGame(page, game);
  await page.getByRole("button", { name: /^Garage/ }).click();
  const racingAt = page.getByLabel(/Racing at/).first();
  await expect(racingAt).toHaveValue("dirt");
  await expect(page.getByText(/Score at Dirt Track/i)).toBeVisible();
  await expect(page.getByText("Rough and rutted. Reliability matters most: it shakes weak parts to bits.")).toBeVisible();
  await racingAt.selectOption("backyard");
  await expect(page.getByText(/Score at Backyard Derby/i)).toBeVisible();
});

test("a Drag team sees elimination rounds, not laps", async ({ page }) => {
  const game = teamRacer("drag-depth");
  game.era!.discipline = "drag";
  await importGame(page, game);
  await page.getByRole("button", { name: /^Race/ }).click();
  await expect(page.getByText("A drag strip rewards power, tyre grip and low weight.").first()).toBeVisible();
  await expect(page.getByText(/1 pass/).first()).toBeVisible();
  await expect(page.getByText("Win to open the Heat.")).toBeVisible();
  await expect(page.getByText(/laps/)).toHaveCount(0);
});

test("no horizontal overflow on a phone in the Garage or on the Race tab", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const game = racer("phone-depth", "riding_mower");
  game.run.venuesOpen.push("dirt");
  game.run.ladder.dirt = ["sprint"];
  game.run.revealed.push("garage");
  await importGame(page, game);
  for (const tab of [/^Garage/, /^Race/, /^Trips/]) {
    await page.getByRole("button", { name: tab }).click();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  }
});
