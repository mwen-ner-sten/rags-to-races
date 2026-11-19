import { expect, test, type Page } from "@playwright/test";
import { garageSpace } from "../../src/core/garage";
import type { GameState } from "../../src/core/types";
import { HOUR, pendingBaton, pendingDepotAndRepair, pendingHeritage, pendingWorksFinal } from "../fixtures/workshopAway";

async function returnFromAbsence(page: Page, game: GameState) {
  const now = new Date("2026-11-01T18:00:00Z");
  await page.clock.install({ time: now });
  await page.addInitScript(({ game, savedAt }) => {
    if (!localStorage.getItem("rags-to-races:v2")) localStorage.setItem("rags-to-races:v2", JSON.stringify({ game, savedAt }));
  }, { game, savedAt: now.getTime() - 2 * HOUR });
  await page.goto("/");
  return page.getByRole("dialog", { name: "While you were away" });
}

test("depot arrival opens the ordinary pickup and reports it only once after a reload", async ({ page }) => {
  const game = pendingDepotAndRepair();
  const partUid = game.motorPool!.job!.part.uid;
  const away = await returnFromAbsence(page, game);
  await expect(away.getByRole("heading", { name: "Depot stock ready for pickup" })).toBeVisible();
  await expect(away.getByRole("heading", { name: "Customer repair ready for delivery" })).toBeVisible();
  await away.getByRole("button", { name: "Open depot pickup" }).click();
  await expect(away).toHaveCount(0);
  const pickup = page.getByRole("button", { name: "Collect depot stock" });
  await expect(pickup).toBeFocused();
  await expect(pickup).toBeInViewport();
  await pickup.click();
  await expect(pickup).toHaveCount(0);
  await expect.poll(() => page.evaluate((uid) => {
    const save = JSON.parse(localStorage.getItem("rags-to-races:v2")!).game as GameState;
    return save.run.inventory.filter((part) => part.uid === uid).length;
  }, partUid), { timeout: 12_000 }).toBe(1);
  await page.reload();
  await expect(away).toHaveCount(0);
  await page.clock.fastForward(HOUR);
  await expect(away).toBeVisible();
  await expect(away.getByRole("heading", { name: "Depot stock ready for pickup" })).toHaveCount(0);
  await expect(away.getByRole("heading", { name: "Customer repair ready for delivery" })).toHaveCount(0);
});

test("registered repair opens its disclosure and focuses the payment action", async ({ page }) => {
  const away = await returnFromAbsence(page, pendingDepotAndRepair());
  await away.getByRole("button", { name: "Open customer repair" }).click();
  const deliver = page.getByRole("button", { name: "Deliver part and collect payment" });
  await expect(deliver).toBeFocused();
  await expect(deliver).toBeInViewport();
  await deliver.click();
  await expect(deliver).toHaveCount(0);
  await expect(page.getByText(/Customer repairs · 1\/3 paid invoices/)).toBeVisible();
});

test("a full garage shows the pickup blocker without losing the parked reward", async ({ page }) => {
  const game = pendingDepotAndRepair();
  while (game.run.inventory.length < garageSpace(game)) {
    game.run.inventory.push({ uid: `loose-${game.run.inventory.length}`, partId: "wheel_basic", condition: 2, origin: "Curbside" });
  }
  const away = await returnFromAbsence(page, game);
  await expect(away.getByText("Free a garage slot, then collect the stock at the depot.")).toBeVisible();
  await away.getByRole("button", { name: "Open depot pickup" }).click();
  await expect(page.getByText("Worn Kart Chassis ready for pickup.", { exact: true })).toBeFocused();
  await expect(page.getByRole("button", { name: "Collect depot stock" })).toBeDisabled();
  await expect(page.getByText("Free a garage slot to collect. The part stays at the depot through a reset.")).toBeVisible();
});

test("museum shakedown opens Hall of Fame with the actual car already selected", async ({ page }) => {
  const away = await returnFromAbsence(page, pendingHeritage("exhibit"));
  await away.getByRole("button", { name: "Inspect the museum car" }).click();
  await expect(page.getByRole("tab", { name: "Hall of Fame" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Heritage register" })).toBeFocused();
  await expect(page.getByLabel("Inspect garage car")).toHaveValue("museum-mower");
  await expect(page.getByRole("button", { name: "Deliver to museum" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Deliver to museum" })).toBeDisabled();
});

test("Works proof opens the homologated deal without repeating it in the return feed", async ({ page }) => {
  const away = await returnFromAbsence(page, pendingWorksFinal());
  await expect(away.getByRole("heading", { name: "Works article homologated" })).toBeVisible();
  await expect(away.getByText(/homologated Copper Comet/i)).toHaveCount(0);
  await away.getByRole("button", { name: "Open Works report" }).click();
  await expect(page.getByRole("heading", { name: /Copper Comet/ })).toBeFocused();
  await expect(page.getByRole("button", { name: "File works report" })).toBeVisible();
});

test("the first baton leg opens Legacy before the Scrap Reset gate is available", async ({ page }) => {
  const away = await returnFromAbsence(page, pendingBaton("qualify"));
  await away.getByRole("button", { name: "Open County Baton" }).click();
  await expect(page.getByRole("heading", { name: "County Baton" })).toBeFocused();
  await expect(page.getByText(/Qualified\. Carry the same part to Quarry County/)).toBeVisible();
});
