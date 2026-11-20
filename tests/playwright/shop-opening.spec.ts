import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import type { GameState } from "../../src/core/types";
import { racer, saveText } from "../fixtures/rewrite";
import { setExperimentalCareers } from "../../src/core/features";

// Covers experimental side careers, which are hidden unless this browser preference is on.
// Fixtures build experimental saves in Node, so the engine flag must be on here too.
test.beforeAll(() => setExperimentalCareers(true));
test.afterAll(() => setExperimentalCareers(false));
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("rags-to-races:experimental-careers", "on"));
});

function transferReady() {
  const earned = process.env.PLAYWRIGHT_SHOP_OPENING_SAVE;
  if (earned) return JSON.parse(Buffer.from(readFileSync(earned, "utf8"), "base64").toString("utf8")).game as GameState;
  const game = racer("shop-opening", "riding_mower");
  game.run.revealed.push("bench", "tools");
  game.run.tools.parts_washer = 1;
  game.run.serviceBook = { invoices: [
    { client: "orchard", partId: "engine_small", partUid: "paid-engine", condition: 3, origin: "Curbside" },
    { client: "marina", partId: "wheel_busted", partUid: "paid-tire", condition: 2, origin: "Curbside" },
    { client: "courier", partId: "fuel_gas_can", partUid: "paid-tank", condition: 3, origin: "Curbside" },
  ] };
  return game;
}

test("shop openings compare a tool and customer lead without moving the live garage", async ({ page }) => {
  const game = transferReady();
  await page.clock.install();
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Save text").fill(saveText(game));
  await page.getByRole("button", { name: "Import save", exact: true }).click();
  await expect(page.getByText("Save loaded. Your previous game is kept as a backup in this browser.")).toBeVisible();
  await page.getByRole("button", { name: /^Garage/ }).click();
  await page.getByRole("tab", { name: /^Customers/ }).click();
  await expect(page.getByText(/3 of 3 jobs done/)).toBeVisible();
  await page.getByText("Compare opening garages", { exact: true }).click();

  const choice = page.getByRole("group", { name: "Take one thing with you" });
  const a = page.getByRole("button", { name: "Preview in A", exact: true });
  const b = page.getByRole("button", { name: "Preview in B", exact: true });
  await expect(a).toBeDisabled();
  await expect(b).toBeDisabled();
  await expect(page.getByText("Choose which part of the business to take.", { exact: true })).toBeVisible();
  await choice.getByRole("radio", { name: /Move Parts Washer/ }).check();
  await a.click();
  await choice.getByRole("radio", { name: /Orchard grounds crew/ }).check();
  await b.click();

  await expect(page.getByRole("row", { name: /^Transferred tool/ }).getByRole("cell")).toHaveText(["Parts Washer · level 1", "None"]);
  await expect(page.getByRole("row", { name: /^Returning customer lead/ }).getByRole("cell")).toHaveText(["None", "Orchard grounds crew · focus on engine finds before Scouting"]);
  await expect(page.getByRole("row", { name: /^Opening stock/ }).getByRole("cell")).toHaveText(["Empty garage", "Empty garage"]);
  await expect(page.getByRole("row", { name: /^Curbside trip/ }).getByRole("cell")).toHaveCount(2);
  await page.getByLabel("Show differences only").check();
  await expect(page.getByRole("row", { name: /^Curbside trip/ })).toHaveCount(0);
  await expect(page.getByRole("row", { name: /^Transferred tool/ })).toBeVisible();
  await a.click();
  await expect(page.getByText("These two opening garages match in every listed detail.")).toBeVisible();
  await page.getByLabel("Show differences only").uncheck();
  await expect(page.getByRole("button", { name: "Move the shop", exact: true })).toBeDisabled();
  await choice.getByRole("radio", { name: /^Nothing yet/ }).check();
  await expect(b).toBeDisabled();
  await expect(page.getByRole("columnheader", { name: "Opening B", exact: true })).toBeVisible();
  await expect(page.getByRole("banner")).toContainText(`Season ${game.meta.seasonsPlayed + 1} ·`);
  await expect(page.getByText(/3 of 3 jobs done/)).toBeVisible();
  await page.getByRole("tab", { name: "Vehicles" }).click();
  await expect(page.getByRole("heading", { name: game.run.vehicles[0].name }).first()).toBeVisible();
});
