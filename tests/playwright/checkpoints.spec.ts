import { expect, test, type Page } from "@playwright/test";
import type { GameState } from "../../src/core/types";
import { CHECKPOINT_PREFIX } from "../../src/game/checkpoints";
import { createGame } from "../../src/core";
import { racer } from "../fixtures/rewrite";
import { setExperimentalCareers } from "../../src/core/features";

// Covers experimental side careers, which are hidden unless this browser preference is on.
// Fixtures build experimental saves in Node, so the engine flag must be on here too.
test.beforeAll(() => setExperimentalCareers(true));
test.afterAll(() => setExperimentalCareers(false));
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("rags-to-races:experimental-careers", "on"));
});

const LIVE = "rags-to-races:v2";
const SLOT = CHECKPOINT_PREFIX + "1";
const NOW = new Date("2026-11-01T18:00:00Z");
const HOUR = 3_600_000;

async function openGame(page: Page, game?: GameState) {
  await page.clock.install({ time: NOW });
  await page.clock.pauseAt(new Date(NOW.getTime() + 1_000));
  if (game) {
    await page.addInitScript(({ game, key }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ game, savedAt: Date.now() }));
    }, { game, key: LIVE });
  }
  await page.goto("/");
}

async function openSettingsShelf(page: Page) {
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByText("Garage checkpoints", { exact: true }).click();
  await expect(page.getByLabel("Checkpoint slot")).toBeVisible();
}

async function saveSlot(page: Page, name: string) {
  await page.getByLabel("Checkpoint name").fill(name);
  await page.getByRole("button", { name: "Save checkpoint", exact: true }).click();
  await expect(page.getByText(`Saved ${name} in slot 1.`)).toBeVisible();
}

async function restoreSlot(page: Page, name: string) {
  await page.getByRole("button", { name: "Open checkpoint", exact: true }).click();
  await page.getByRole("button", { name: "Confirm opening" }).click();
  await expect(page.getByText(`Opened ${name}. The checkpoint is still saved.`)).toBeVisible();
}

async function activeFile(page: Page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)! as string) as { game: GameState; savedAt: number }, LIVE);
}

function unpack(text: string) {
  return JSON.parse(Buffer.from(text, "base64").toString("utf8")) as { game: GameState; savedAt: number };
}

test("Settings restores the frozen moment twice and protects unsaved live changes", async ({ page }) => {
  await openGame(page, createGame("frozen-checkpoint"));
  await openSettingsShelf(page);
  await saveSlot(page, "Before settling in");
  const raw = (await page.evaluate((key) => localStorage.getItem(key), SLOT))!;
  const frozen = unpack(JSON.parse(raw).text);
  const guide = page.getByRole("checkbox", { name: "Show the first-Season guide" });

  await page.clock.fastForward(2 * HOUR);
  await page.getByRole("button", { name: "Back to the garage" }).click();
  expect((await activeFile(page)).game.run.seasonMs).toBeGreaterThan(frozen.game.run.seasonMs);
  await guide.uncheck();
  expect((await activeFile(page)).game.meta.guideOff).toBeFalsy();
  await restoreSlot(page, "Before settling in");
  await expect(guide).toBeChecked();
  const restored = await activeFile(page);
  expect(restored.game.run.seasonMs).toBe(frozen.game.run.seasonMs);
  expect(restored.savedAt - frozen.savedAt).toBeGreaterThanOrEqual(2 * HOUR);
  await page.getByRole("button", { name: "Export browser backup" }).click();
  const backup = unpack(await page.getByLabel("Save text").inputValue());
  expect(backup.game.meta.guideOff).toBe(true);
  expect(backup.game.run.seasonMs).toBeGreaterThan(frozen.game.run.seasonMs);

  await page.reload();
  await expect(page.getByRole("dialog", { name: "While you were away" })).toHaveCount(0);
  await openSettingsShelf(page);
  await restoreSlot(page, "Before settling in");
  expect(await page.evaluate((key) => localStorage.getItem(key), SLOT)).toBe(raw);
  expect((await activeFile(page)).game.run.seasonMs).toBe(frozen.game.run.seasonMs);
});

test("stale confirmations leave the other tab’s active checkpoint intact", async ({ page, context }) => {
  await openGame(page, createGame("checkpoint-stale"));
  await openSettingsShelf(page);
  await saveSlot(page, "Original");
  const other = await context.newPage();
  try {
    await openGame(other);
    await openSettingsShelf(other);

    for (const operation of [
      { action: "Replace checkpoint", confirmation: "Confirm replacement", message: "This slot changed in another tab. Review its current garage." },
      { action: "Clear slot", confirmation: "Confirm removal", message: "This slot changed in another tab. Review its current garage." },
      { action: "Open checkpoint", confirmation: "Confirm opening", message: "The saved garage changed. Review it again." },
    ]) {
      await page.getByRole("button", { name: operation.action, exact: true }).click();
      await other.getByLabel("Checkpoint name").fill(operation.confirmation);
      await other.getByRole("button", { name: "Replace checkpoint", exact: true }).click();
      await other.getByRole("button", { name: "Confirm replacement" }).click();
      await expect(other.getByText(`Saved ${operation.confirmation} in slot 1.`)).toBeVisible();

      const otherRaw = await other.evaluate((key) => localStorage.getItem(key), SLOT);
      await page.getByRole("button", { name: operation.confirmation }).click();
      await expect(page.getByText(operation.message)).toBeVisible();
      expect(await page.evaluate((key) => localStorage.getItem(key), SLOT)).toBe(otherRaw);
    }
  } finally {
    await other.close();
  }
});

test("Start over starts a fresh active save and leaves checkpoints available", async ({ page }) => {
  await openGame(page, racer("checkpoint-start-over"));
  await openSettingsShelf(page);
  await saveSlot(page, "Keep my racer");
  await expect(page.getByText(/Your garage checkpoints stay saved\./)).toBeVisible();
  await page.getByRole("button", { name: "Start a new game", exact: true }).click();
  await page.getByRole("button", { name: "Yes, start a new game" }).click();
  await expect(page.getByText(/New game started/)).toBeVisible();
  expect((await activeFile(page)).game.run.vehicles).toHaveLength(0);
  await restoreSlot(page, "Keep my racer");
  expect((await activeFile(page)).game.run.vehicles[0].name).toBe("Regression racer");
});

test("the shop exposes the shared shelf when its Move gate opens", async ({ page }) => {
  const game = racer("checkpoint-shop", "riding_mower");
  game.run.revealed.push("bench");
  game.run.serviceBook = {
    invoices: [
      { client: "orchard", partId: "engine_small", partUid: "paid-engine", condition: 3, origin: "Yards" },
      { client: "courier", partId: "fuel_gas_can", partUid: "paid-tank", condition: 3, origin: "Yards" },
    ],
    ticket: { client: "marina", partUid: "registered-tire", worked: true },
  };
  game.run.inventory.push({ uid: "registered-tire", partId: "wheel_busted", condition: 2, origin: "Curbside" });
  await openGame(page, game);
  await page.getByRole("button", { name: /^Garage/ }).click();
  await page.getByRole("tab", { name: /^Customers/ }).click();
  await expect(page.getByText(/2 of 3 jobs done/)).toBeVisible();
  await expect(page.getByText("Garage checkpoints", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: /^Hand over · / }).click();
  await expect(page.getByText(/3 of 3 jobs done/)).toBeVisible();
  await page.getByText("Garage checkpoints", { exact: true }).click();
  await saveSlot(page, "After the third invoice");
  await page.getByRole("group", { name: "Take one thing with you" }).getByRole("radio", { name: /Orchard grounds crew/ }).check();
  await page.getByRole("checkbox", { name: "Close this garage and begin the next Season." }).check();
  await page.getByRole("button", { name: "Move the shop", exact: true }).click();
  await expect(page.getByText("Garage checkpoints", { exact: true })).toHaveCount(0);
  await openSettingsShelf(page);
  await restoreSlot(page, "After the third invoice");
  expect((await activeFile(page)).game.run.serviceBook?.invoices).toHaveLength(3);
});
