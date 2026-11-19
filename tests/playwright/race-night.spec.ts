import { expect, test } from "@playwright/test";
import { racer, saveText } from "../fixtures/rewrite";

test("a reserved Race Night advances while the browser is closed", async ({ page, context }) => {
  const start = new Date("2026-11-18T07:00:00Z");
  await page.clock.install({ time: start });
  const state = racer("away-race-night");
  state.run.vehicles[0].parts.engine!.partId = "engine_lawn";
  state.run.vehicles[0].parts.wheel!.partId = "wheel_knobby";
  state.run.lastEntered["backyard:sprint"] = 0;
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Save text").fill(saveText(state, start.getTime()));
  await page.getByRole("button", { name: "Import save", exact: true }).click();
  await expect(page.getByText("Save loaded. Your previous game is kept as a backup in this browser.")).toBeVisible();
  await page.getByRole("button", { name: /^Race\b/ }).click();
  await page.getByText("Race Night", { exact: true }).click();
  await page.getByRole("button", { name: "Reserve Race Night", exact: true }).click();
  await expect(page.getByText(/3 starts left · Next Sprint/)).toBeVisible();
  await expect(page.getByText(/Race Night has reserved your hands/)).toBeVisible();
  await page.clock.fastForward(6_000);
  await page.close();

  const returning = await context.newPage();
  await returning.clock.install({ time: new Date(start.getTime() + 60 * 60_000) });
  await returning.goto("/");
  const report = returning.getByRole("dialog", { name: "While you were away" });
  await expect(report.getByText(/3 races, \d+ won/)).toBeVisible();
  await report.getByRole("button", { name: "Back to the garage" }).click();
  await returning.getByRole("button", { name: /^Race\b/ }).click();
  await expect(returning.getByRole("region", { name: "Results" }).getByRole("button", { name: "Watch" })).toHaveCount(3);
  await expect(returning.getByText(/Race Night has reserved your hands/)).toHaveCount(0);
});
