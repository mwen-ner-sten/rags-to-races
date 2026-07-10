import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import fixtures from "./fixtures/gameplay.generated.json";

type FixtureName = keyof typeof fixtures;

async function loadFixture(page: Page, name: FixtureName, statePatch: Record<string, unknown> = {}) {
  const fixture = fixtures[name];
  const payload = structuredClone(fixture.payload);
  Object.assign(payload.state, { lastActiveTimestamp: 0, ...statePatch });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(({ key, value }) => {
    if (sessionStorage.getItem("playwright-fixture-loaded") === "true") return;
    localStorage.clear();
    localStorage.setItem(key, JSON.stringify(value));
    sessionStorage.setItem("playwright-fixture-loaded", "true");
  }, { key: fixture.storageKey, value: payload });
  await page.goto("/");
  await expect(page).toHaveTitle("Rags to Races");
}

async function openTab(page: Page, name: string) {
  const tab = page.locator(`[data-tutorial-tab="${name}"]:visible`).first();
  if (await tab.count() === 0) {
    await page.getByRole("button", { name: "More tabs" }).click();
  }
  await page.locator(`[data-tutorial-tab="${name}"]:visible`).first().click();
}

async function openResetTab(page: Page) {
  await openTab(page, "upgrades");
  await page.getByRole("button", { name: "Scrap Reset", exact: true }).first().click();
}

async function persistedState(page: Page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).state as Record<string, unknown>, fixtures.fresh.storageKey);
}

function captureErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  return errors;
}

async function expectNoSeriousStructuralAccessibilityViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .disableRules(["color-contrast"])
    .analyze();
  const blocking = results.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious");
  expect(blocking, blocking.map((violation) => `${violation.id}: ${violation.help}`).join("\n")).toEqual([]);
}

test("fresh save exposes the first engineering loop", async ({ page }) => {
  await loadFixture(page, "fresh");
  await expect(page.getByRole("heading", { name: "Rags to Races" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Scavenge!" })).toBeVisible();
  await expectNoSeriousStructuralAccessibilityViolations(page);
});

test("build to populated Garage, activate, repair, and reload stays stable", async ({ page }) => {
  const errors = captureErrors(page);
  await loadFixture(page, "first_build_ready", { scrapBucks: 1_000, lifetimeScrapBucks: 1_000 });
  await openTab(page, "garage");
  await page.getByRole("button", { name: "Build Push Mower" }).click();
  await expect(page.getByText("Your Garage (1)")).toBeVisible();
  await page.getByRole("button", { name: "Activate" }).click();
  await expect(page.getByText("Active", { exact: true })).toBeVisible();

  await openTab(page, "race");
  await page.getByRole("button", { name: "Enter Race" }).click();
  await expect(page.getByRole("button", { name: "Enter Race" })).toBeEnabled({ timeout: 12_000 });
  await openTab(page, "garage");
  await page.getByRole("button", { name: /Repair to 100%/ }).click();
  await expect(page.getByText("100%", { exact: true })).toBeVisible();

  await page.reload();
  await openTab(page, "garage");
  await expect(page.getByText("Your Garage (1)")).toBeVisible();
  await expect(page.getByText("100%", { exact: true })).toBeVisible();
  expect(errors.filter((error) => /Maximum update depth|getSnapshot|uncaught/i.test(error))).toEqual([]);
});

test("DEV scenario loader replaces the save using the shared campaign fixture", async ({ page }) => {
  await loadFixture(page, "fresh", { tutorialStep: -1, tutorialDismissed: true });
  await openTab(page, "dev");
  await expect(page.getByTestId("dev-playtest-harness")).toBeVisible();
  await page.getByTestId("dev-scenario-select").selectOption("workshop_ready");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByTestId("dev-load-scenario").click();
  await openTab(page, "garage");
  await expect(page.getByText("Your Garage (3)")).toBeVisible();
  const state = await persistedState(page);
  expect(state.repPoints).toBe(250_000);
  expect((state.garage as unknown[]).length).toBe(3);
});

test("seeded DEV acceleration reports and persists production-engine deltas", async ({ page }) => {
  await loadFixture(page, "workshop_ready");
  const before = await persistedState(page);
  await openTab(page, "dev");
  await page.getByTestId("dev-simulation-seed").fill("e2e-acceleration");
  await page.getByRole("button", { name: "+100 ticks" }).click();
  await expect(page.getByTestId("dev-simulation-summary")).toContainText("Ticks: 100");
  await expect(page.getByTestId("dev-simulation-summary")).toContainText("Scavenges: 100");
  const after = await persistedState(page);
  expect((after.gameTick as number)).toBeGreaterThan(before.gameTick as number);
  expect((after.inventory as unknown[]).length).toBeGreaterThan((before.inventory as unknown[]).length);
});

for (const [fixtureName, buttonName, awardField, clearedField] of [
  ["first_scrap_reset_ready", "Scrap Reset", "legacyPoints", "garage"],
  ["team_reset_ready", "Team Reset", "teamPoints", "garage"],
  ["owner_reset_ready", "Owner Reset", "ownerPoints", "teamPoints"],
  ["track_reset_ready", "Track Reset", "trackPrestigeTokens", "ownerPoints"],
] as const) {
  test(`${buttonName} executes, awards currency, and persists`, async ({ page }) => {
    await loadFixture(page, fixtureName);
    const before = await persistedState(page);
    await openResetTab(page);
    if (buttonName === "Scrap Reset") {
      await page.getByRole("button", { name: "Scrap Reset", exact: true }).last().click();
      await page.getByRole("button", { name: /Prestige \(\+\d+ LP\)/ }).click();
    } else {
      await page.getByRole("button", { name: buttonName, exact: true }).click();
    }
    const after = await persistedState(page);
    expect(after[awardField] as number).toBeGreaterThan(before[awardField] as number);
    if (clearedField === "garage") expect(after.garage).toEqual([]);
    else expect(after[clearedField]).toBe(0);
    await page.reload();
    expect((await persistedState(page))[awardField]).toBe(after[awardField]);
  });
}

for (const [fixtureName, layerName, heading] of [
  ["team_reset_ready", "Team", /Team, Crew & Fleet/i],
  ["owner_reset_ready", "Owner", /Facilities & Supply Chains/i],
  ["track_reset_ready", "Track", /Track Perks/i],
] as const) {
  test(`${layerName} responsibility layer is reachable from its milestone`, async ({ page }, testInfo) => {
    await loadFixture(page, fixtureName);
    await openTab(page, "upgrades");
    await page.getByRole("button", { name: layerName, exact: true }).click();
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
    await expectNoSeriousStructuralAccessibilityViolations(page);
    await page.screenshot({ path: testInfo.outputPath(`${fixtureName}-${testInfo.project.name}.png`), fullPage: true });
  });
}

test("save export/import round-trip preserves the campaign checksum fields", async ({ page }) => {
  await loadFixture(page, "workshop_ready");
  const before = await persistedState(page);
  await openTab(page, "settings");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export Save File/ }).first().click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).toBeTruthy();

  await page.evaluate((key) => localStorage.removeItem(key), fixtures.fresh.storageKey);
  await page.locator('input[type="file"]').setInputFiles(path!);
  await expect(page.getByText("Save imported successfully!")).toBeVisible();
  const after = await persistedState(page);
  for (const field of ["scrapBucks", "repPoints", "activeVehicleId", "selectedLocationId", "selectedCircuitId"] as const) expect(after[field]).toEqual(before[field]);
  expect((after.garage as unknown[]).length).toBe((before.garage as unknown[]).length);
});

test("maxed state visits every primary screen without crashes or viewport overflow", async ({ page }) => {
  const errors = captureErrors(page);
  await loadFixture(page, "maxed");
  for (const tab of ["junkyard", "garage", "race", "gear", "upgrades", "help", "log", "settings", "dev"]) {
    if (tab !== "junkyard") await openTab(page, tab);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${tab} horizontal overflow`).toBeLessThanOrEqual(1);
  }
  expect(errors.filter((error) => /Maximum update depth|getSnapshot|NaN|uncaught/i.test(error))).toEqual([]);
});

test("desktop and mobile primary navigation keeps every critical action reachable", async ({ page }) => {
  await loadFixture(page, "workshop_ready");
  for (const [tab, text] of [["junkyard", "Scavenge!"], ["garage", "Your Garage"], ["race", "Enter Race"], ["gear", "Salvage Workshop"], ["upgrades", "Legacy"]] as const) {
    if (tab !== "junkyard") await openTab(page, tab);
    await expect(page.getByText(text, { exact: false }).first()).toBeVisible();
  }
  await expectNoSeriousStructuralAccessibilityViolations(page);
});

test("default semantic text palette preserves readable contrast", async ({ page }) => {
  await loadFixture(page, "workshop_ready");
  const ratios = await page.evaluate(() => {
    const shell = document.querySelector<HTMLElement>(".shell-content > div");
    if (!shell) throw new Error("Theme shell not found");
    const variables = ["--text-primary", "--text-secondary", "--text-muted", "--text-heading", "--text-white", "--accent"];
    const parse = (value: string) => {
      const components = value.match(/[\d.]+/g)?.map(Number) ?? [];
      return { r: components[0] ?? 0, g: components[1] ?? 0, b: components[2] ?? 0, a: components[3] ?? 1 };
    };
    const luminance = ({ r, g, b, a }: ReturnType<typeof parse>) => {
      const channels = [r * a, g * a, b * a].map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    };
    return Object.fromEntries(variables.map((variable) => {
      const probe = document.createElement("span");
      probe.style.color = `var(${variable})`;
      shell.appendChild(probe);
      const foreground = luminance(parse(getComputedStyle(probe).color));
      probe.remove();
      return [variable, (foreground + 0.05) / 0.05];
    }));
  });
  for (const [variable, ratio] of Object.entries(ratios)) expect(ratio, `${variable} contrast`).toBeGreaterThanOrEqual(4.5);
});
