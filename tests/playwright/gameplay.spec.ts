import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  AUTO_SCAVENGE_MANUAL_TARGET,
  MAX_OFFLINE_DURATION_MS,
  RACE_CONTROL_RACES_PER_OPPORTUNITY,
  STATION_EQUIPMENT_INVENTORY_LIMIT,
} from "../../src/config/gameplayLimits";
import { RESPONSIBILITY_RESET_REQUIREMENTS, SCRAP_RESET_REQUIREMENTS, scrapResetRequirementText } from "../../src/config/progression";
import { HIDDEN_THEMES, THEMES } from "../../src/data/themes";
import { FATIGUE_DRINK_COST, FATIGUE_DRINK_RECOVERY } from "../../src/data/workshopActions";
import { formatNumber } from "../../src/utils/format";
import fixtures from "./fixtures/gameplay.generated.json";

type FixtureName = keyof typeof fixtures;

async function loadFixture(page: Page, name: FixtureName, statePatch: Record<string, unknown> = {}, theme?: string) {
  const fixture = fixtures[name];
  const payload = structuredClone(fixture.payload);
  Object.assign(payload.state, { lastActiveTimestamp: 0, ...statePatch });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(({ key, value, selectedTheme }) => {
    if (sessionStorage.getItem("playwright-fixture-loaded") === "true") return;
    localStorage.clear();
    localStorage.setItem(key, JSON.stringify(value));
    if (selectedTheme) localStorage.setItem("rags-to-races-theme", selectedTheme);
    sessionStorage.setItem("playwright-fixture-loaded", "true");
  }, { key: fixture.storageKey, value: payload, selectedTheme: theme });
  await page.goto("/");
  await expect(page).toHaveTitle("Rags to Races");
}

async function replaceFixtureState(page: Page, name: FixtureName, statePatch: Record<string, unknown> = {}) {
  const fixture = fixtures[name];
  const payload = structuredClone(fixture.payload);
  Object.assign(payload.state, { lastActiveTimestamp: 0, ...statePatch });
  await page.evaluate(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value));
    sessionStorage.setItem("playwright-fixture-loaded", "true");
  }, { key: fixture.storageKey, value: payload });
  await page.reload();
  await expect(page).toHaveTitle("Rags to Races");
}

async function openTab(page: Page, name: string) {
  const tab = page.locator(`[data-tutorial-tab="${name}"]:visible`).first();
  if (await tab.count() === 0) {
    await page.getByRole("button", { name: "More tabs" }).click();
  }
  await page.locator(`[data-tutorial-tab="${name}"]:visible`).first().click();
  if (name === "gear") await expect(page.getByRole("heading", { name: "Salvage Workshop" })).toBeVisible();
}

async function openResetTab(page: Page) {
  await openTab(page, "upgrades");
  await page.getByRole("button", { name: "Scrap Reset", exact: true }).first().click();
}

async function persistedState(page: Page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).state as Record<string, unknown>, fixtures.fresh.storageKey);
}

async function persistedNumber(page: Page, field: string) {
  return (await persistedState(page))[field] as number;
}

async function workshopTab(page: Page, name: string) {
  const desktopTab = page.getByRole("tab", { name, exact: true }).first();
  if (await desktopTab.isVisible()) {
    await desktopTab.click();
    return;
  }
  await page.locator(".mobile-sub-nav").getByRole("button").first().click();
  await page.locator(".mobile-sub-nav").getByRole("button", { name, exact: true }).click();
}

function parseDisplayedInteger(value: string): number {
  const normalized = value.replaceAll(",", "").replaceAll("−", "-");
  const match = normalized.match(/-?\d+/);
  if (!match) throw new Error(`No integer found in \"${value}\"`);
  return Number(match[0]);
}

async function modalRowText(page: Page, label: string) {
  const modal = page.getByRole("heading", { name: "Welcome Back!" }).locator("..");
  return modal.locator("div.flex").filter({ hasText: label }).first().innerText();
}

async function optionalModalRowText(page: Page, label: string) {
  const modal = page.getByRole("heading", { name: "Welcome Back!" }).locator("..");
  const row = modal.locator("div.flex").filter({ hasText: label }).first();
  return await row.count() ? row.innerText() : "0";
}

async function installDeterministicMathRandom(page: Page, seed = 0x5eed1234) {
  await page.addInitScript((initialSeed) => {
    let state = initialSeed >>> 0;
    Math.random = () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }, seed);
}

const runtimeIssues = new WeakMap<Page, { errors: string[]; warnings: string[] }>();

test.beforeEach(async ({ page }) => {
  // Seeded campaign fixtures can legitimately trigger first-time system guides.
  // A real player must acknowledge them, so let Playwright do the same before
  // attempting the next gameplay action instead of clicking through the modal.
  await page.addLocatorHandler(
    page.getByRole("button", { name: "Okay, got it" }),
    async (button) => {
      // Multiple first-time guides may be queued from one seeded state change.
      // Drain the queue so the handler's locator actually becomes hidden.
      for (let remaining = 20; remaining > 0 && await button.isVisible(); remaining -= 1) {
        await button.click();
        await page.waitForTimeout(300);
      }
    },
  );
  const issues = { errors: [] as string[], warnings: [] as string[] };
  runtimeIssues.set(page, issues);
  page.on("pageerror", (error) => issues.errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") issues.errors.push(message.text());
    if (message.type() === "warning") issues.warnings.push(message.text());
  });
});

test.afterEach(async ({ page }) => {
  const issues = runtimeIssues.get(page);
  expect.soft(issues?.errors ?? [], `uncaught browser errors:\n${issues?.errors.join("\n") ?? ""}`).toEqual([]);
  expect.soft(issues?.warnings ?? [], `browser warnings:\n${issues?.warnings.join("\n") ?? ""}`).toEqual([]);
});

function captureErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  return errors;
}

function captureWarnings(page: Page) {
  const warnings: string[] = [];
  page.on("console", (message) => { if (message.type() === "warning") warnings.push(message.text()); });
  return warnings;
}

async function expectNoSeriousStructuralAccessibilityViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .disableRules(["color-contrast"])
    .analyze();
  const blocking = results.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious");
  expect(blocking, blocking.map((violation) => `${violation.id}: ${violation.help}`).join("\n")).toEqual([]);
}

test("@smoke fresh save exposes the first engineering loop", async ({ page }) => {
  await loadFixture(page, "fresh");
  await expect(page.getByRole("heading", { name: "Rags to Races" })).toBeVisible();
  await expect(page.getByTestId("tutorial-intro-card")).toHaveCSS("--accent", "#00e5ff");
  await expect(page.getByRole("button", { name: "Scavenge!" })).toBeVisible();
  await expectNoSeriousStructuralAccessibilityViolations(page);
});

test("portaled tutorial follows a persisted non-default theme", async ({ page }) => {
  await loadFixture(page, "fresh", {}, "outlaw");
  const tutorial = page.getByTestId("tutorial-intro-card");
  await expect(tutorial).toHaveCSS("--accent", "#c88830");
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--accent").trim())).toBe("#c88830");
});

test("@smoke full Dev save reset stays on the starting Salvage flow", async ({ page }) => {
  await loadFixture(page, "maxed", { tutorialStep: 22, tutorialDismissed: true });
  await openTab(page, "dev");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Full Save Reset" }).click();
  await expect(page.getByRole("heading", { name: "Rags to Races" })).toBeVisible();
  await page.getByRole("button", { name: "Guide me" }).click();
  await expect(page.getByRole("button", { name: "Scavenge!" })).toBeVisible();
  await expect(page.getByText("Dev Tools", { exact: true })).toHaveCount(0);
});

test("@smoke core Scavenge action works from the keyboard without duplicate input", async ({ page }) => {
  await loadFixture(page, "fresh", { tutorialStep: -1, tutorialDismissed: true });
  const scavenge = page.getByRole("button", { name: "Scavenge!" });
  await scavenge.focus();
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await persistedState(page)).manualScavengeClicks).toBe(1);
  await page.keyboard.press("Space");
  await expect.poll(async () => (await persistedState(page)).manualScavengeClicks).toBe(2);
});

test("current-version saves strip injected action names and keep Scavenge callable", async ({ page }) => {
  await loadFixture(page, "fresh", {
    tutorialStep: -1,
    tutorialDismissed: true,
    manualScavenge: "injected action",
    enterRace: null,
    prestige: { poisoned: true },
  });
  const before = await persistedState(page);
  await page.getByRole("button", { name: "Scavenge!" }).click();
  const after = await persistedState(page);
  expect(after.manualScavengeClicks).toBe((before.manualScavengeClicks as number) + 1);
  expect((after.inventory as unknown[]).length).toBe((before.inventory as unknown[]).length + 1);
  expect(after.manualScavenge).toBeUndefined();
  expect(after.enterRace).toBeUndefined();
  expect(after.prestige).toBeUndefined();
});

test("Scouting Orders are an accessible manual-only probability tradeoff", async ({ page }) => {
  await loadFixture(page, "auto_scavenge_boundary", {
    tutorialStep: -1,
    tutorialDismissed: true,
    autoScavengeUnlocked: true,
    manualScavengeClicks: AUTO_SCAVENGE_MANUAL_TARGET,
    selectedLocationId: "curbside",
    scoutingOrder: null,
  });

  const orders = page.getByRole("group", { name: "Scouting Orders" });
  await expect(orders).toBeVisible();
  await expect(orders).toContainText("3× relative chance");
  await expect(orders).toContainText("not guaranteed");
  await expect(orders).toContainText("Yield and condition stay unchanged");
  await expect(orders).toContainText("manual scavenging only");
  await expect(orders).toContainText("Auto-Scavenge keeps the normal location mix");

  const engine = orders.getByRole("button", { name: "Engine" });
  await engine.focus();
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await persistedState(page)).scoutingOrder).toBe("engine");
  await expect(engine).toHaveAttribute("aria-pressed", "true");

  await orders.getByRole("button", { name: "Misc" }).click();
  await page.getByRole("button", { name: /Industrial Surplus/ }).click();
  await expect.poll(async () => (await persistedState(page)).scoutingOrder).toBeNull();
  await expect(orders.getByRole("button", { name: "Misc" })).toHaveCount(0);
  await expect(orders.getByRole("button", { name: "Open Search" })).toHaveAttribute("aria-pressed", "true");

  const controlBounds = await orders.getByRole("button", { name: "Open Search" }).boundingBox();
  expect(controlBounds?.height).toBeGreaterThanOrEqual(44);
  await expectNoSeriousStructuralAccessibilityViolations(page);
});

test("@smoke Auto-Scavenge unlocks on the exact final manual action", async ({ page }) => {
  await loadFixture(page, "auto_scavenge_boundary");
  await expect(page.getByText(`${AUTO_SCAVENGE_MANUAL_TARGET - 1}/${AUTO_SCAVENGE_MANUAL_TARGET} for Auto`, { exact: true })).toBeVisible();

  const before = await persistedState(page);
  expect(before.manualScavengeClicks).toBe(AUTO_SCAVENGE_MANUAL_TARGET - 1);
  expect(before.autoScavengeUnlocked).toBe(false);

  await page.getByRole("button", { name: "Scavenge!" }).click();
  await expect.poll(async () => (await persistedState(page)).manualScavengeClicks).toBe(AUTO_SCAVENGE_MANUAL_TARGET);
  const after = await persistedState(page);
  expect(after.autoScavengeUnlocked).toBe(true);
  expect((after.inventory as unknown[]).length).toBe((before.inventory as unknown[]).length + 1);
  await expect(page.getByText(/for Auto$/)).toHaveCount(0);
});

test("@smoke first Scrap Reset uses the shared exact gate and awards the previewed LP with both automations", async ({ page }) => {
  const exactGate = {
    repPoints: SCRAP_RESET_REQUIREMENTS.reputation,
    lifetimeScrapBucks: SCRAP_RESET_REQUIREMENTS.lifetimeScrapBucks,
  };
  await loadFixture(page, "first_scrap_reset_ready", {
    ...exactGate,
    lifetimeScrapBucks: SCRAP_RESET_REQUIREMENTS.lifetimeScrapBucks - 1,
  });
  await openResetTab(page);
  const resetButton = page.locator('[data-tutorial="prestige-btn"]');
  await expect(resetButton).toBeDisabled();
  await expect(page.getByText(`Requirements: ${scrapResetRequirementText()}`, { exact: true })).toBeVisible();

  await replaceFixtureState(page, "first_scrap_reset_ready", exactGate);
  await openResetTab(page);
  await expect(resetButton).toBeEnabled();
  const before = await persistedState(page);
  await resetButton.click();
  const confirm = page.getByRole("button", { name: /Prestige \(\+[\d,]+ LP\)/ });
  const award = parseDisplayedInteger(await confirm.innerText());
  expect(award).toBeGreaterThan(0);
  await confirm.click();

  const after = await persistedState(page);
  expect(after.legacyPoints).toBe((before.legacyPoints as number) + award);
  expect(after.lifetimeLPAllTime).toBe((before.lifetimeLPAllTime as number) + award);
  expect(after.prestigeCount).toBe(1);
  expect(after.autoScavengeUnlocked).toBe(true);
  expect(after.autoRaceUnlocked).toBe(true);
  expect(after.garage).toEqual([]);
});

test("offline catch-up honors the eight-hour cap and settles every part exactly once", async ({ page }) => {
  test.setTimeout(90_000);
  await installDeterministicMathRandom(page);
  const fixtureState = fixtures.auto_scavenge_boundary.payload.state;
  const initialInventory = fixtureState.inventory.length;
  const initialScrap = fixtureState.scrapBucks;
  await loadFixture(page, "auto_scavenge_boundary", {
    autoScavengeUnlocked: true,
    autoRaceUnlocked: false,
    manualScavengeClicks: AUTO_SCAVENGE_MANUAL_TARGET,
    lastActiveTimestamp: Date.now() - MAX_OFFLINE_DURATION_MS * 4,
  });

  await expect(page.getByRole("heading", { name: "Welcome Back!" })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("You were away for 8h", { exact: true })).toBeVisible();
  const scavenged = parseDisplayedInteger(await modalRowText(page, "Parts scavenged"));
  const kept = parseDisplayedInteger(await modalRowText(page, "Kept in inventory"));
  const junkFilteredText = await optionalModalRowText(page, "Junk Filter auto-sold");
  const overflowText = await optionalModalRowText(page, "Inventory overflow sold");
  const junkFiltered = parseDisplayedInteger(junkFilteredText);
  const overflow = parseDisplayedInteger(overflowText);
  const netScrapText = await modalRowText(page, "Net Scrap Bucks");
  const netScrap = parseDisplayedInteger(netScrapText.replace("$", ""));
  expect(scavenged).toBeGreaterThan(0);
  expect(scavenged).toBe(kept + junkFiltered + overflow);

  const after = await persistedState(page);
  expect((after.inventory as unknown[]).length).toBe(initialInventory + kept);
  expect(after.scrapBucks).toBe(initialScrap + netScrap);
  expect(after.manualScavengeClicks).toBe(AUTO_SCAVENGE_MANUAL_TARGET);

  await page.getByRole("button", { name: "Continue" }).click();
  const settled = await persistedState(page);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Welcome Back!" })).toHaveCount(0);
  const reloaded = await persistedState(page);
  for (const field of ["scrapBucks", "repPoints", "forgeTokens", "lifetimePartsScavengedAllTime", "gameTick"] as const) {
    expect(reloaded[field], `${field} duplicated on reload`).toEqual(settled[field]);
  }
  expect((reloaded.inventory as unknown[]).length).toBe((settled.inventory as unknown[]).length);
});

test("tutorial race forecast remains stable after its explanation", async ({ page }) => {
  await loadFixture(page, "first_race_ready", {
    tutorialStep: 9,
    tutorialDismissed: false,
    lifetimeRacesAllTime: 0,
  });
  await openTab(page, "race");
  const odds = page.locator('[data-tutorial="odds-display"]');
  const before = await odds.innerText();
  const beforeRanges = before.match(/\d+[–-]\d+%/g);
  await page.getByRole("button", { name: "Got it" }).click();
  const afterRanges = (await odds.innerText()).match(/\d+[–-]\d+%/g);
  expect(afterRanges).toEqual(beforeRanges);
  expect(before).not.toMatch(/100[–-]100% DNF/i);
});

test("@smoke tutorial first race uses the displayed simulation", async ({ page }) => {
  test.setTimeout(30_000);
  await installDeterministicMathRandom(page, 0x1234abcd);
  await loadFixture(page, "first_race_ready", {
    tutorialStep: 9,
    tutorialDismissed: false,
    repPoints: 0,
    lifetimeRacesAllTime: 0,
    raceHistory: [],
  });
  await openTab(page, "race");
  await page.getByRole("button", { name: "Got it" }).click();
  const enterRace = page.getByRole("button", { name: "Enter Race" });
  await enterRace.click();
  await expect(enterRace).toBeEnabled({ timeout: 12_000 });
  const outcome = ((await persistedState(page)).raceHistory as Array<{ result: string; repEarned: number }>)[0];
  expect(["win", "loss", "dnf"]).toContain(outcome?.result);
  expect(outcome?.repEarned).toBeGreaterThan(0);
  await expect(page.getByRole("heading", { name: "Engineering Debrief" })).toBeVisible();
  const inspectBuild = page.getByRole("button", { name: "Inspect Build" });
  await expect(inspectBuild).toBeVisible();
  await expect(page.getByTestId("tutorial-card").getByText(/won|exploded|not first/i)).toBeVisible();
  await inspectBuild.click();

  const diagnosis = page.getByTestId("garage-diagnosis");
  await expect(diagnosis).toHaveAttribute("data-vehicle-id", "fixture_vehicle_10_push_mower");
  await expect(diagnosis).toHaveAttribute("data-slot", "wheel");
  await expect(diagnosis).toHaveAccessibleName(/race diagnosis for push mower wheel/i);
  await expect(diagnosis).toContainText("Basic Tire");
  await expect(diagnosis).toContainText(/Toolkit.*40 Rep/i);
  await expect(diagnosis).toBeFocused();
  await expect(page.getByRole("button", { name: /^Compare wheel installed part/ })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expectNoSeriousStructuralAccessibilityViolations(page);
  const dismissDiagnosis = diagnosis.getByRole("button", { name: "Dismiss" });
  if ((page.viewportSize()?.width ?? 0) <= 640) {
    expect((await dismissDiagnosis.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  }
  await dismissDiagnosis.click();
  await expect(page.getByTestId("garage-diagnosis")).toHaveCount(0);
  const focusedVehicle = page.locator('[data-vehicle-card-id="fixture_vehicle_10_push_mower"]');
  await expect(focusedVehicle).toBeFocused();
  await expect(focusedVehicle).toHaveAccessibleName(/Push Mower/i);
});

test("Race Control is an untimed keyboard-accessible optional manual call", async ({ page }) => {
  test.setTimeout(30_000);
  await installDeterministicMathRandom(page, 0x51a7c011);
  await loadFixture(page, "first_race_ready", {
    tutorialStep: -1,
    tutorialDismissed: true,
    prestigeCount: 1,
    autoRaceUnlocked: true,
    raceControlRaceProgress: RACE_CONTROL_RACES_PER_OPPORTUNITY,
    raceControlOpportunityReady: true,
    raceControlCallEscrowed: false,
  });
  await openTab(page, "race");
  const cashBeforeBriefing = (await persistedState(page)).scrapBucks;

  const useRaceControl = page.getByRole("button", { name: "Use Race Control" });
  if ((page.viewportSize()?.width ?? 0) < 640) {
    expect((await useRaceControl.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  }
  await useRaceControl.focus();
  await page.keyboard.press("Enter");
  const briefing = page.getByRole("region", { name: "Race Control briefing" });
  await expect(briefing).toBeVisible();
  await expect(briefing.getByText(/Changing weather|Mechanical warning|Pace window/)).toBeVisible();
  await expect(briefing.getByText(/reaction|timer|seconds/i)).toHaveCount(0);
  expect((await persistedState(page)).scrapBucks).toBe(cashBeforeBriefing);

  const protect = briefing.getByRole("radio", { name: /Protect/ });
  await protect.focus();
  await page.keyboard.press("Space");
  await expect(protect).toBeChecked();
  await expect(briefing.getByText(/-3% pace/i)).toBeVisible();
  await expect(briefing.getByText(/-2.5 points DNF/i)).toBeVisible();
  await expect(briefing.getByText(/-12% wear/i)).toBeVisible();
  await expectNoSeriousStructuralAccessibilityViolations(page);

  const confirm = briefing.getByRole("button", { name: "Confirm Protect" });
  const saveForLater = briefing.getByRole("button", { name: "Save call for later" });
  if ((page.viewportSize()?.width ?? 0) < 640) {
    for (const radio of await briefing.getByRole("radio").all()) {
      const label = radio.locator("xpath=ancestor::label");
      expect((await label.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    }
    expect((await confirm.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    expect((await saveForLater.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    await saveForLater.scrollIntoViewIfNeeded();
    const navBox = await page.getByTestId("mobile-nav").boundingBox();
    const saveBox = await saveForLater.boundingBox();
    expect((saveBox?.y ?? 0) + (saveBox?.height ?? 0)).toBeLessThanOrEqual(navBox?.y ?? Number.POSITIVE_INFINITY);
  }
  await confirm.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Enter Race" })).toBeEnabled({ timeout: 12_000 });

  const state = await persistedState(page);
  const calledOutcome = (state.raceHistory as Array<{ raceControlCall?: { id: string } }>)[0];
  expect(calledOutcome.raceControlCall?.id).toBe("protect");
  expect(state.raceControlOpportunityReady).toBe(false);
  expect(state.raceControlCallEscrowed).toBe(false);
  await expect(page.getByText(/Race Control: Protect/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("race diagnosis opens the exact vehicle slot comparison when Toolkit is unlocked", async ({ page }) => {
  test.setTimeout(30_000);
  await installDeterministicMathRandom(page, 0x1234abcd);
  const garage = structuredClone(fixtures.first_race_ready.payload.state.garage);
  const duplicate = structuredClone(garage[0]);
  duplicate.id = "duplicate_vehicle_with_same_parts";
  await loadFixture(page, "first_race_ready", {
    tutorialStep: 9,
    tutorialDismissed: false,
    garage: [duplicate, garage[0]],
    raceHistory: [],
    repPoints: 0,
    lifetimeRacesAllTime: 0,
    workshopLevels: { toolkit: 1 },
  });
  await openTab(page, "race");
  await page.getByRole("button", { name: "Got it" }).click();
  const enterRace = page.getByRole("button", { name: "Enter Race" });
  await enterRace.click();
  await expect(enterRace).toBeEnabled({ timeout: 12_000 });
  await page.getByRole("button", { name: "Inspect Build" }).click();

  const diagnosis = page.getByTestId("garage-diagnosis");
  await expect(diagnosis).toHaveAttribute("data-vehicle-id", garage[0].id);
  await expect(page.getByTestId("garage-diagnosis")).toHaveCount(1);
  const comparisonId = `part-comparison-${garage[0].id}-wheel`;
  const diagnosedToggle = page.locator(`[aria-controls="${comparisonId}"]`);
  await expect(diagnosedToggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(`#${comparisonId}`)).toBeVisible();
});

test("repair-priority diagnosis keeps repair intent and comparison collapsed", async ({ page }) => {
  test.setTimeout(30_000);
  await installDeterministicMathRandom(page, 7);
  const garage = structuredClone(fixtures.first_race_ready.payload.state.garage);
  garage[0].condition = 33;
  await loadFixture(page, "first_race_ready", {
    tutorialStep: -1,
    tutorialDismissed: true,
    garage,
    workshopLevels: { toolkit: 1 },
    raceHistory: [],
  });
  await openTab(page, "race");
  const enterRace = page.getByRole("button", { name: "Enter Race" });
  await enterRace.click();
  await expect(enterRace).toBeEnabled({ timeout: 12_000 });
  await expect(page.getByRole("button", { name: "Open Garage" })).toBeVisible();
  await page.getByRole("button", { name: "Open Garage" }).click();

  const diagnosis = page.getByTestId("garage-diagnosis");
  await expect(diagnosis).toContainText("Repair first");
  const diagnosedToggle = page.locator(`[aria-controls="part-comparison-${garage[0].id}-wheel"]`);
  await expect(diagnosedToggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("button", { name: /Repair to 100%/ })).toBeFocused();
});

test("repair-priority diagnosis focuses its named region when repair is unavailable", async ({ page }) => {
  test.setTimeout(30_000);
  await installDeterministicMathRandom(page, 7);
  const garage = structuredClone(fixtures.first_race_ready.payload.state.garage);
  garage[0].condition = 33;
  await loadFixture(page, "first_race_ready", {
    tutorialStep: -1,
    tutorialDismissed: true,
    scrapBucks: 0,
    garage,
    workshopLevels: { toolkit: 1 },
    raceHistory: [],
  });
  await openTab(page, "race");
  const enterRace = page.getByRole("button", { name: "Enter Race" });
  await enterRace.click();
  await expect(enterRace).toBeEnabled({ timeout: 12_000 });
  await page.getByRole("button", { name: "Open Garage" }).click();

  const diagnosis = page.getByRole("region", { name: /Race diagnosis for Push Mower wheel/ });
  await expect(diagnosis).toBeFocused();
  await expect(page.getByRole("button", { name: /Repair to 100%/ })).toBeDisabled();
});

test("race debrief preserves its stored report after the garage build changes", async ({ page }) => {
  test.setTimeout(30_000);
  await installDeterministicMathRandom(page, 0x1234abcd);
  const vehicle = structuredClone(fixtures.first_race_ready.payload.state.garage[0]);
  vehicle.stats.reliability = 100;
  const replacementWheel = structuredClone(fixtures.maxed.payload.state.inventory.find((item) => item.definitionId === "wheel_busted")!);
  await loadFixture(page, "first_race_ready", {
    tutorialStep: -1,
    tutorialDismissed: true,
    garage: [vehicle],
    inventory: [replacementWheel],
    workshopLevels: { toolkit: 1 },
  });

  await openTab(page, "race");
  const enterRace = page.getByRole("button", { name: "Enter Race" });
  await enterRace.click();
  await expect(enterRace).toBeEnabled({ timeout: 12_000 });
  await expect(page.getByText(/relevant Basic Tire/i)).toBeVisible();
  await page.getByRole("button", { name: "Inspect Build" }).click();
  await page.getByRole("button", { name: /^Install Busted Wheel/ }).click();

  await openTab(page, "race");
  await expect(page.getByText(/relevant Basic Tire/i)).toBeVisible();
  await page.getByRole("button", { name: "Inspect Build" }).click();
  await expect(page.getByTestId("garage-diagnosis")).toHaveAttribute("data-slot", "wheel");
});

test("Engineering Notebook keeps race-time evidence honest on desktop and mobile", async ({ page }) => {
  const racedVehicle = structuredClone(fixtures.first_race_ready.payload.state.garage[0]);
  const storedReport = {
    headline: "Stored race-time diagnosis",
    focus: "grip",
    priority: "component",
    component: "Basic Tire",
    componentCondition: "rusted",
    vehicleCondition: 77,
    slot: "wheel",
    observation: "Stored evidence from the raced build.",
    action: "Replace the recorded tire before the rematch.",
  };
  const baseOutcome = {
    result: "loss",
    position: 4,
    totalRacers: 8,
    scrapsEarned: 4,
    repEarned: 1,
    log: ["Fixture race"],
    circuitId: "backyard_derby",
  };
  await loadFixture(page, "first_race_ready", {
    tutorialStep: -1,
    tutorialDismissed: true,
    garage: [racedVehicle],
    activeVehicleId: racedVehicle.id,
    raceHistory: [
      { ...baseOutcome, vehicleId: racedVehicle.id, engineeringReport: storedReport },
      { ...baseOutcome, result: "dnf", position: 8, vehicleId: "sold-race-car", engineeringReport: { ...storedReport, focus: "reliability", headline: "Stored sold-car diagnosis" } },
      { ...baseOutcome, result: "win", position: 1 },
    ],
  });

  await openTab(page, "log");
  const notebook = page.getByTestId("engineering-notebook");
  await expect(notebook.getByRole("heading", { name: "Engineering Notebook" })).toBeVisible();
  await expect(notebook.getByTestId("engineering-history-entry")).toHaveCount(3);
  await expect(notebook).toContainText("Push Mower");
  await expect(notebook).toContainText(racedVehicle.id);
  await expect(notebook).toContainText("Component condition");
  await expect(notebook).toContainText("Rusted");
  await expect(notebook).toContainText("Vehicle condition");
  await expect(notebook).toContainText("77%");
  await expect(notebook).toContainText("Stored evidence from the raced build.");
  await expect(notebook).toContainText("Replace the recorded tire before the rematch.");
  await expect(notebook).toContainText("Vehicle no longer in garage");
  await expect(notebook).toContainText("Vehicle not recorded");
  await expect(notebook).toContainText("No engineering report was recorded for this race.");
  const inspectRacedBuild = notebook.getByRole("button", { name: `Inspect ${racedVehicle.id} wheel in Garage` });
  await expect(inspectRacedBuild).toHaveCount(1);
  await expectNoSeriousStructuralAccessibilityViolations(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(notebook).toBeVisible();
  expect(await notebook.evaluate((element) => element.scrollHeight <= element.clientHeight || getComputedStyle(element).overflowY === "visible")).toBe(true);
  const mobileNav = page.getByTestId("mobile-nav");
  const lastEntry = notebook.getByTestId("engineering-history-entry").last();
  await lastEntry.scrollIntoViewIfNeeded();
  const [lastBox, navBox] = await Promise.all([lastEntry.boundingBox(), mobileNav.boundingBox()]);
  expect(lastBox).not.toBeNull();
  expect(navBox).not.toBeNull();
  expect(lastBox!.y + lastBox!.height).toBeLessThanOrEqual(navBox!.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expectNoSeriousStructuralAccessibilityViolations(page);

  await inspectRacedBuild.click();
  const diagnosis = page.getByTestId("garage-diagnosis");
  await expect(diagnosis).toHaveAttribute("data-vehicle-id", racedVehicle.id);
  await expect(diagnosis).toHaveAttribute("data-slot", "wheel");
});

test("build direction and circuit fit disclose after the tutorial on desktop and mobile", async ({ page }) => {
  await loadFixture(page, "first_race_ready", {
    tutorialStep: 9,
    tutorialDismissed: false,
    workshopLevels: { toolkit: 1 },
  });
  await expect(page.locator('[data-testid^="build-direction-"]')).toHaveCount(0);

  await replaceFixtureState(page, "first_race_ready", {
    tutorialStep: -1,
    tutorialDismissed: true,
    workshopLevels: { toolkit: 1 },
    lifetimeScrapResets: 1,
  });
  await openTab(page, "garage");
  await expect(page.locator('[data-testid^="build-direction-"]').first()).toContainText(/Redline Special|Cornering Rig|Finish-First Build|No clear build direction yet/);

  await openTab(page, "race");
  await expect(page.getByTestId("circuit-fit")).toContainText(/circuit-adjusted performance/i);
  const viewport = page.viewportSize()!;
  const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(documentWidth).toBeLessThanOrEqual(viewport.width);
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical")).toEqual([]);
});

test("garage diagnosis does not steal focus after an add-on mutation", async ({ page }) => {
  test.setTimeout(30_000);
  await installDeterministicMathRandom(page, 0x1234abcd);
  const vehicle = structuredClone(fixtures.first_race_ready.payload.state.garage[0]);
  vehicle.stats.reliability = 100;
  const wheelAddon = structuredClone(fixtures.maxed.payload.state.inventory.find((item) => item.definitionId === "addon_wheel_spacers")!);
  await loadFixture(page, "first_race_ready", {
    tutorialStep: -1,
    tutorialDismissed: true,
    garage: [vehicle],
    inventory: [wheelAddon],
    workshopLevels: { toolkit: 1, addon_bench: 1 },
  });

  await openTab(page, "race");
  const enterRace = page.getByRole("button", { name: "Enter Race" });
  await enterRace.click();
  await expect(enterRace).toBeEnabled({ timeout: 12_000 });
  await page.getByRole("button", { name: "Inspect Build" }).click();
  const diagnosis = page.getByTestId("garage-diagnosis");
  const comparison = page.getByRole("button", { name: /^Compare wheel installed part/ });
  const installAddon = page.getByRole("button", { name: /Install Wheel Spacers/ });
  await expect(diagnosis).toBeFocused();
  await comparison.focus();
  await expect(comparison).toBeFocused();
  await installAddon.evaluate((button: HTMLButtonElement) => button.click());

  await expect(comparison).toBeFocused();
  await expect(diagnosis).not.toBeFocused();
});

test("tutorial interrupted first race recovers to a retry instead of an empty step", async ({ page }) => {
  await loadFixture(page, "first_race_ready", {
    tutorialStep: 11,
    tutorialDismissed: false,
    isRacing: false,
    raceHistory: [],
    lastRaceOutcome: null,
  });
  await openTab(page, "race");
  await expect(page.getByText(/interrupted|retry|enter the race again/i).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Enter Race" })).toBeEnabled();
});

test("tutorial result explanation survives reload without transient lastRaceOutcome", async ({ page }) => {
  await loadFixture(page, "first_race_ready", {
    tutorialStep: 12,
    tutorialDismissed: false,
    lastRaceOutcome: null,
    raceHistory: [{
      circuitId: "backyard_derby",
      result: "dnf",
      position: 8,
      totalRacers: 8,
      scrapsEarned: 0,
      repEarned: 1,
      log: ["Fixture interrupted result"],
    }],
  });
  await openTab(page, "race");
  await expect(page.getByTestId("tutorial-card").getByText(/exploded|broke down|repair it/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Got it" })).toBeVisible();
});

test("tutorial tab halos stay fully inside the viewport", async ({ page }) => {
  await loadFixture(page, "first_build_ready", {
    tutorialStep: 3,
    tutorialDismissed: false,
  });

  const halo = page.getByTestId("tutorial-tab-halo");
  await expect(halo).toHaveCount(1);
  expect(await halo.evaluate((element) => element.parentElement?.tagName)).toBe("BODY");
  const bounds = await halo.boundingBox();
  const viewport = page.viewportSize();

  expect(bounds).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport!.width);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport!.height);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileHalo = page.getByTestId("tutorial-tab-halo");
  const mobileNav = page.getByTestId("mobile-nav");
  await expect(mobileHalo).toBeVisible();
  expect(Number(await mobileHalo.evaluate((element) => getComputedStyle(element).zIndex)))
    .toBeGreaterThan(Number(await mobileNav.evaluate((element) => getComputedStyle(element).zIndex)));

  await page.getByRole("button", { name: "More tabs" }).click();
  expect(Number(await mobileNav.evaluate((element) => getComputedStyle(element).zIndex)))
    .toBeGreaterThan(Number(await mobileHalo.evaluate((element) => getComputedStyle(element).zIndex)));
});

test("@smoke tutorial releases navigation after the first repair", async ({ page }) => {
  const damagedGarage = structuredClone(fixtures.first_race_ready.payload.state.garage);
  damagedGarage[0].condition = 70;
  await loadFixture(page, "first_race_ready", {
    tutorialStep: 13,
    tutorialDismissed: false,
    garage: damagedGarage,
  });
  await openTab(page, "garage");
  await page.getByRole("button", { name: /Repair to 100%/ }).click();
  await expect(page.getByTestId("tutorial-card")).toHaveCount(0);
  expect((await persistedState(page)).tutorialStep).toBe(-1);
  await openTab(page, "gear");
  await expect(page.getByRole("heading", { name: "Salvage Workshop" })).toBeVisible();
});

test("part toggle names the add-on manager when only the add-on bench is unlocked", async ({ page }) => {
  await loadFixture(page, "workshop_ready", {
    workshopLevels: {
      ...fixtures.workshop_ready.payload.state.workshopLevels,
      toolkit: 0,
      addon_bench: 1,
    },
  });
  await openTab(page, "garage");

  const toggle = page.getByRole("button", { name: /^Manage engine add-ons/ }).first();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");

  const controlledId = await toggle.getAttribute("aria-controls");
  expect(controlledId).toBeTruthy();
  const controlledPanel = page.locator(`#${controlledId}`);
  await expect(controlledPanel).toHaveCount(1);
  await expect(controlledPanel).toBeVisible();
});

test("installed-part candidates expose textual condition and signed named stat deltas", async ({ page }) => {
  const garage = structuredClone(fixtures.workshop_ready.payload.state.garage);
  const inventory = structuredClone(fixtures.workshop_ready.payload.state.inventory);
  const installedAddons = inventory.filter((part) =>
    part.definitionId === "addon_air_filter" || part.definitionId === "addon_turbo_snail",
  );
  const candidateId = "e2e_comparison_candidate_engine_v4";
  const candidatePart = {
    ...inventory.find((part) => part.definitionId === "engine_v4" && part.condition === "decent")!,
    id: candidateId,
    condition: "decent" as const,
  };
  const firstVehicle = garage[0] as unknown as {
    parts: { engine: { part: { id: string }; addons: typeof installedAddons } };
  };
  firstVehicle.parts.engine.addons = installedAddons;
  await loadFixture(page, "workshop_ready", {
    garage,
    inventory: [
      ...inventory.filter((part) => part.type === "addon" && !installedAddons.some((addon) => addon.id === part.id)),
      candidatePart,
    ],
  });
  await openTab(page, "garage");

  const toggle = page.getByRole("button", { name: /^Compare engine installed part/ }).first();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  const pickerId = await toggle.getAttribute("aria-controls");
  expect(pickerId).toBeTruthy();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");

  const picker = page.locator(`#${pickerId}`);
  await expect(picker).toBeVisible();
  const candidate = picker.locator(`[data-candidate-instance-id="${candidateId}"]`);
  await expect(candidate).toBeVisible();
  await expect(candidate).toContainText("Condition: Decent");
  await expect(candidate).toContainText(/Spd [+-]\d/);
  await expect(candidate).toContainText(/Hnd [+-]\d/);
  await expect(candidate).toContainText(/Rel [+-]\d/);
  await expect(candidate).toContainText(/Perf [+-]\d/);
  await expect(candidate).toContainText(/Wgt [+-]\d/);
  await expect(candidate).toContainText("Warning: 1 add-on will return to inventory.");
  await expect(candidate).toHaveAccessibleName(/Warning: 1 add-on will return to inventory/);
  await expect(candidate).toContainText(/Without Gentle Swap.*condition/i);
  await expect(candidate).toHaveAccessibleName(/speed [+-]\d.*handling [+-]\d.*reliability [+-]\d.*performance [+-]\d.*weight [+-]\d/i);

  if ((page.viewportSize()?.width ?? 0) <= 640) {
    const toggleBox = await toggle.boundingBox();
    const candidateBox = await candidate.boundingBox();
    expect(toggleBox?.height).toBeGreaterThanOrEqual(44);
    expect(candidateBox?.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }

  const originalPartId = firstVehicle.parts.engine.part.id;
  const returnedAddonId = installedAddons[1].id;
  await candidate.click();

  await expect.poll(async () => {
    const state = await persistedState(page) as unknown as {
      garage: Array<{ id: string; parts: { engine: { part: { id: string } } } }>;
      inventory: Array<{ id: string }>;
    };
    const persistedVehicle = state.garage.find((item) => item.id === garage[0].id)!;
    const persistedInventoryIds = state.inventory.map((part) => part.id);
    return {
      installedPartId: persistedVehicle.parts.engine.part.id,
      candidateWasRemoved: !persistedInventoryIds.includes(candidateId),
      oldPartWasReturned: persistedInventoryIds.includes(originalPartId),
      displacedAddonWasReturned: persistedInventoryIds.includes(returnedAddonId),
    };
  }).toEqual({
    installedPartId: candidateId,
    candidateWasRemoved: true,
    oldPartWasReturned: true,
    displacedAddonWasReturned: true,
  });
});

test("diagnosis controls retain 44px targets at the inclusive 640px mobile boundary", async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 844 });
  await loadFixture(page, "workshop_ready");
  await openTab(page, "garage");
  const toggle = page.getByRole("button", { name: /^Compare engine installed part/ }).first();
  await toggle.click();
  const candidate = page.locator('[data-candidate-instance-id]').first();
  await expect(candidate).toBeVisible();
  for (const control of [toggle, candidate]) {
    expect((await control.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  }
});

test("optional coaching navigates without progress mutation, never locks navigation, and stays dismissed after reload", async ({ page }) => {
  await loadFixture(page, "first_race_ready", {
    tutorialStep: -1,
    tutorialCompleted: true,
    tutorialDismissed: true,
    raceHistory: [structuredClone(fixtures.first_scrap_reset_ready.payload.state.raceHistory[0])],
    repPoints: 25,
    workshopLevels: {},
    dismissedContextualCoachIds: [],
  });

  const coach = page.getByRole("status", { name: "Next step: compare your parts" });
  await expect(coach).toBeVisible();
  const coachBox = await coach.boundingBox();
  const viewport = page.viewportSize();
  expect(coachBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(coachBox!.x).toBeGreaterThanOrEqual(0);
  expect(coachBox!.x + coachBox!.width).toBeLessThanOrEqual(viewport!.width);
  const mobileNav = page.getByTestId("mobile-nav");
  if (await mobileNav.isVisible()) {
    const mobileNavBox = await mobileNav.boundingBox();
    expect(mobileNavBox).not.toBeNull();
    expect(coachBox!.y + coachBox!.height).toBeLessThanOrEqual(mobileNavBox!.y);
  }
  const before = await persistedState(page);

  await coach.getByRole("button", { name: "Open Workshop Facilities" }).click();
  await expect(page.getByRole("heading", { name: "Salvage Workshop" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Scavenging/ })).toBeVisible();

  const afterNavigation = await persistedState(page);
  for (const field of ["scrapBucks", "repPoints", "lifetimeScrapBucks", "garage", "inventory", "raceHistory"] as const) {
    expect(afterNavigation[field], `${field} changed from coaching CTA`).toEqual(before[field]);
  }

  await openTab(page, "race");
  await expect(page.getByRole("button", { name: "Enter Race" })).toBeVisible();
  await openTab(page, "gear");
  await expect(page.locator('[role="tab"]').filter({ hasText: /^Inventory$/ }).first()).toHaveAttribute("aria-selected", "true");
  await coach.getByRole("button", { name: "Dismiss compare your parts coaching" }).click();
  await expect(coach).toHaveCount(0);
  await expect.poll(async () => (await persistedState(page)).dismissedContextualCoachIds).toEqual(["toolkit"]);

  await page.reload();
  await expect(page.getByRole("status", { name: "Next step: compare your parts" })).toHaveCount(0);
  await openTab(page, "garage");
  await expect(page.getByText(/Your Garage/).first()).toBeVisible();
});

test("@smoke build to populated Garage, activate, repair, and reload stays stable", async ({ page }) => {
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

test("@smoke reloading a paid race refunds its escrow exactly once without inventing history", async ({ page }) => {
  await loadFixture(page, "workshop_ready", {
    autoScavengeUnlocked: false,
    autoRaceUnlocked: false,
  });
  await openTab(page, "race");
  const before = await persistedState(page);
  await page.getByRole("button", { name: "Enter Race" }).click();
  await expect(page.getByRole("button", { name: "Racing..." })).toBeDisabled();
  const during = await persistedState(page);
  expect(during.scrapBucks as number).toBeLessThan(before.scrapBucks as number);
  expect((during.raceHistory as unknown[]).length).toBe((before.raceHistory as unknown[]).length);

  await page.reload();
  // Hydration reconciles the interrupted escrow in memory. A normal action
  // persists that reconciled snapshot so the exact refund can be inspected.
  await page.getByRole("button", { name: "Scavenge!" }).click();
  const recovered = await persistedState(page);
  expect(recovered.scrapBucks).toBe(before.scrapBucks);
  expect((recovered.raceHistory as unknown[]).length).toBe((before.raceHistory as unknown[]).length);
  await openTab(page, "race");
  await expect(page.getByRole("button", { name: "Enter Race" })).toBeEnabled();

  await page.reload();
  const secondReload = await persistedState(page);
  expect(secondReload.scrapBucks).toBe(recovered.scrapBucks);
  expect(secondReload.raceHistory).toEqual(recovered.raceHistory);
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

test("Workshop inventory actions sell, decompose, enhance, trade up, and recover fatigue", async ({ page }) => {
  const inventory = structuredClone(fixtures.workshop_ready.payload.state.inventory);
  const template = inventory.find((part) => part.type === "part")!;
  inventory.push(
    { ...template, id: "e2e_trade_1", condition: "worn" },
    { ...template, id: "e2e_trade_2", condition: "worn" },
    { ...template, id: "e2e_trade_3", condition: "worn" },
    { ...template, id: "e2e_decompose", condition: "rusted" },
  );
  await loadFixture(page, "workshop_ready", { inventory, fatigue: 32 });
  await openTab(page, "gear");

  const beforeSell = await persistedState(page);
  await page.getByRole("button", { name: /^Sell \$/ }).first().click();
  const afterSell = await persistedState(page);
  expect((afterSell.inventory as unknown[]).length).toBe((beforeSell.inventory as unknown[]).length - 1);
  expect(afterSell.scrapBucks as number).toBeGreaterThan(beforeSell.scrapBucks as number);

  const beforeEnhance = await persistedState(page);
  await page.getByRole("button", { name: /^Enhance/ }).and(page.locator(":enabled")).first().click();
  const afterEnhance = await persistedState(page);
  expect((afterEnhance.challengeProgress as Record<string, number>).totalEnhanced).toBe(
    ((beforeEnhance.challengeProgress as Record<string, number>).totalEnhanced ?? 0) + 1,
  );

  const beforeTrade = await persistedState(page);
  await page.getByRole("button", { name: "Trade best eligible trio" }).click();
  const afterTrade = await persistedState(page);
  expect((afterTrade.challengeProgress as Record<string, number>).totalTradeUps).toBe(
    ((beforeTrade.challengeProgress as Record<string, number>).totalTradeUps ?? 0) + 1,
  );
  expect((afterTrade.inventory as unknown[]).length).toBe((beforeTrade.inventory as unknown[]).length - 2);

  const materialsBefore = Object.values(afterTrade.materials as Record<string, number>).reduce((sum, value) => sum + value, 0);
  await page.getByRole("button", { name: "Decompose", exact: true }).first().click();
  const afterDecompose = await persistedState(page);
  const materialsAfter = Object.values(afterDecompose.materials as Record<string, number>).reduce((sum, value) => sum + value, 0);
  expect(materialsAfter).toBeGreaterThan(materialsBefore);
  expect((afterDecompose.challengeProgress as Record<string, number>).totalDecomposed).toBe(
    ((afterTrade.challengeProgress as Record<string, number>).totalDecomposed ?? 0) + 1,
  );

  const beforeDrink = await persistedState(page);
  await page.getByRole("button", { name: /Fatigue Drink/ }).click();
  const afterDrink = await persistedState(page);
  expect(afterDrink.fatigue).toBe((beforeDrink.fatigue as number) - FATIGUE_DRINK_RECOVERY);
  expect(afterDrink.scrapBucks).toBe((beforeDrink.scrapBucks as number) - FATIGUE_DRINK_COST);
  expect((afterDrink.challengeProgress as Record<string, number>).fatigueDrinksPurchased).toBe(1);
});

test("Workshop fabrication, add-ons, and Dealer actions produce exact persisted deltas", async ({ page }) => {
  await installDeterministicMathRandom(page, 0x51a7e);
  await loadFixture(page, "workshop_ready");
  await openTab(page, "gear");

  await workshopTab(page, "Fabrication");
  const beforeCraft = await persistedState(page);
  await page.getByRole("button", { name: "Craft", exact: true }).first().click();
  const afterCraft = await persistedState(page);
  expect((afterCraft.inventory as unknown[]).length).toBe((beforeCraft.inventory as unknown[]).length + 1);
  expect(Object.values(afterCraft.materials as Record<string, number>)).not.toEqual(Object.values(beforeCraft.materials as Record<string, number>));

  await workshopTab(page, "Add-ons");
  const beforeInstall = await persistedState(page);
  const installButton = page.getByRole("button", { name: /^Install / }).and(page.locator(":enabled")).first();
  const addOnName = (await installButton.innerText()).replace(/^Install /, "");
  await installButton.click();
  const afterInstall = await persistedState(page);
  expect((afterInstall.inventory as unknown[]).length).toBe((beforeInstall.inventory as unknown[]).length - 1);
  await expect(page.getByRole("button", { name: `Remove ${addOnName}` })).toBeVisible();
  await page.getByRole("button", { name: `Remove ${addOnName}` }).click();
  expect(((await persistedState(page)).inventory as unknown[]).length).toBe((beforeInstall.inventory as unknown[]).length);

  await workshopTab(page, "Dealer");
  const beforeBuy = await persistedState(page);
  await page.getByRole("button", { name: /^Buy \$/ }).first().click();
  const afterBuy = await persistedState(page);
  expect((afterBuy.inventory as unknown[]).length).toBe((beforeBuy.inventory as unknown[]).length + 1);
  expect(afterBuy.scrapBucks as number).toBeLessThan(beforeBuy.scrapBucks as number);
  const boardBeforeRefresh = afterBuy.dealerBoard as Array<{ id: string }>;
  const cashBeforeRefresh = afterBuy.scrapBucks as number;
  const refreshButton = page.getByRole("button", { name: /^Refresh \$/ });
  const refreshCost = parseDisplayedInteger(await refreshButton.innerText());
  await refreshButton.click();
  const afterRefresh = await persistedState(page);
  expect(afterRefresh.scrapBucks).toBe(cashBeforeRefresh - refreshCost);
  expect((afterRefresh.dealerBoard as Array<{ id: string }>).map((entry) => entry.id)).not.toEqual(boardBeforeRefresh.map((entry) => entry.id));
});

test("Station equipment can be forged, installed, enhanced, reforged, removed, and salvaged", async ({ page }) => {
  await installDeterministicMathRandom(page, 0x57a710);
  const stationItem = {
    ...fixtures.workshop_ready.payload.state.stationEquipmentInventory[0],
    effects: [
      { type: "attribute", attribute: "engineering", value: 7 },
      { type: "bonus", bonus: "repair_cost_reduction_pct", value: 0.04 },
    ],
  };
  await loadFixture(page, "workshop_ready", { stationEquipmentInventory: [stationItem] });
  await openTab(page, "gear");
  await workshopTab(page, "Stations");
  await expect(page.getByText("No equipment owned for Pit Equipment.", { exact: true })).toBeVisible();

  const inventoryBeforeForge = (await persistedState(page)).stationEquipmentInventory as unknown[];
  const diagnostics = page.locator("section").filter({ has: page.getByRole("heading", { name: "Diagnostics" }) });
  await diagnostics.getByRole("button", { name: /^Forge Common/ }).click();
  expect(((await persistedState(page)).stationEquipmentInventory as unknown[]).length).toBe(inventoryBeforeForge.length + 1);

  const workbench = page.locator("section").filter({ has: page.getByRole("heading", { name: "Workbench" }) });
  await workbench.getByRole("button", { name: "Install", exact: true }).first().click();
  expect(((await persistedState(page)).equippedStationEquipment as Record<string, string | null>).workbench).toBe(stationItem.id);

  const cashBeforeEnhance = await persistedNumber(page, "scrapBucks");
  await workbench.getByRole("button", { name: /^Enhance to \+1/ }).click();
  const afterEnhance = await persistedState(page);
  expect((afterEnhance.stationEquipmentInventory as Array<{ id: string; enhancementLevel: number }>).find((item) => item.id === stationItem.id)?.enhancementLevel).toBe(1);
  expect(afterEnhance.scrapBucks as number).toBeLessThan(cashBeforeEnhance);

  const shardsBefore = afterEnhance.reforgeShards as number;
  await workbench.getByRole("button", { name: /^Reforge/ }).click();
  expect(await persistedNumber(page, "reforgeShards")).toBeLessThan(shardsBefore);

  await workbench.getByRole("button", { name: "Remove", exact: true }).click();
  const beforeSalvage = await persistedState(page);
  const salvageButton = workbench.getByRole("button", { name: /^Salvage/ }).first();
  await expect(salvageButton).toBeEnabled();
  await salvageButton.click();
  const afterSalvage = await persistedState(page);
  expect((afterSalvage.stationEquipmentInventory as Array<{ id: string }>).some((item) => item.id === stationItem.id)).toBe(false);
  expect(afterSalvage.reforgeShards as number).toBeGreaterThan(beforeSalvage.reforgeShards as number);
});

test("named loadouts cannot restore more add-ons than a degraded part can hold", async ({ page }) => {
  await loadFixture(page, "workshop_ready");
  await openTab(page, "gear");
  await workshopTab(page, "Add-ons");
  await page.getByRole("button", { name: "Install Clean Air Filter", exact: true }).click();
  await page.getByRole("button", { name: "Install Turbo Snail", exact: true }).click();

  await openTab(page, "garage");
  const loadoutName = page.getByLabel("New loadout name for Street Racer");
  const streetRacer = loadoutName.locator("xpath=ancestor::div[contains(@class, 'rounded-lg')][1]");
  await loadoutName.fill("Two Boosters");
  await streetRacer.getByRole("button", { name: "Save build" }).click();
  await streetRacer.getByRole("button", { name: /^Compare engine installed part/ }).click();
  const goodReplacement = streetRacer.getByRole("button", { name: /^Install V8 Engine, Good condition/ }).first();
  await goodReplacement.click();

  const stateAfterSwap = await persistedState(page);
  const active = (stateAfterSwap.garage as Array<{ id: string; parts: Record<string, { addons: unknown[] }> }>).find(
    (vehicle) => vehicle.id === stateAfterSwap.activeVehicleId,
  )!;
  expect(active.parts.engine.addons).toHaveLength(1);
  const savedLoadout = streetRacer.getByRole("button", { name: "Two Boosters", exact: true });
  await expect(savedLoadout).toBeDisabled();
  await expect(streetRacer.getByText(/uses 2 add-ons, but good condition allows 1/i)).toBeVisible();
});

test("an empty Dealer board stays empty until the player pays to refresh", async ({ page }) => {
  await loadFixture(page, "workshop_ready", {
    autoScavengeUnlocked: false,
    autoRaceUnlocked: false,
  });
  await openTab(page, "gear");
  await workshopTab(page, "Dealer");
  for (let listing = 0; listing < 3; listing += 1) {
    await page.getByRole("button", { name: /^Buy \$/ }).first().click();
  }
  await expect(page.getByText("No listings remain. Refresh the board to source new stock.", { exact: true })).toBeVisible();
  const beforeTick = await persistedState(page);
  expect(beforeTick.dealerBoard).toEqual([]);

  await openTab(page, "dev");
  await page.getByRole("button", { name: "+10 ticks" }).click();
  const afterTick = await persistedState(page);
  expect(afterTick.dealerBoard).toEqual([]);
  expect(afterTick.scrapBucks).toBe(beforeTick.scrapBucks);
});

test("Workshop add-on controls explain and enforce the active-race mutation lock", async ({ page }) => {
  await loadFixture(page, "workshop_ready");
  await openTab(page, "race");
  await page.getByRole("button", { name: "Enter Race" }).click();
  await expect(page.getByRole("button", { name: "Racing..." })).toBeDisabled();

  await openTab(page, "gear");
  await workshopTab(page, "Add-ons");
  const installButtons = page.getByRole("button", { name: /^Install / });
  expect(await installButtons.count()).toBeGreaterThan(0);
  for (let index = 0; index < await installButtons.count(); index += 1) {
    await expect(installButtons.nth(index)).toBeDisabled();
  }
  await expect(page.getByText(/currently racing|finish the current race/i).first()).toBeVisible();
});

test("Junkyard refurbishment quote matches the executable discounted store cost", async ({ page }) => {
  const part = {
    ...fixtures.workshop_ready.payload.state.inventory.find((candidate) => candidate.definitionId === "engine_turbo_v6")!,
    id: "e2e_discounted_refurb",
    condition: "worn",
  };
  await loadFixture(page, "maxed", {
    scrapBucks: 1,
    inventory: [part],
    selectedLocationId: "curbside",
    autoScavengeUnlocked: false,
    autoRaceUnlocked: false,
  });
  const fix = page.getByRole("button", { name: /^Fix \$\d+$/ }).filter({ hasText: "Fix $1" }).last();
  await expect(fix).toBeEnabled();
  const cost = parseDisplayedInteger(await fix.innerText());
  expect(cost).toBeLessThanOrEqual(1);
  await fix.click();
  const after = await persistedState(page);
  expect(after.activityLog).toEqual(expect.arrayContaining([
    expect.objectContaining({ message: expect.stringMatching(/^Refurbished part/), scrapDelta: -cost }),
  ]));
  expect((after.inventory as Array<{ id: string; condition: string }>).find((candidate) => candidate.id === part.id)?.condition).toBe("decent");
});

test("Team Reset requires an accessible operating philosophy choice", async ({ page }, testInfo) => {
  await loadFixture(page, "team_reset_ready", {
    crewRoster: [{ id: "scout_lead", name: "Jess Prime", role: "scout", level: 6, xp: 900, specialization: "treasure_hunter" }],
  });
  await openResetTab(page);
  await page.getByRole("button", { name: "Team Reset", exact: true }).click();

  const dialog = page.getByRole("alertdialog", { name: "Confirm Team Reset" });
  const choices = dialog.getByRole("group", { name: "Team Operating Philosophy" });
  const confirm = dialog.getByRole("button", { name: /^Confirm Team Reset/ });
  await expect(choices).toBeVisible();
  await expectNoSeriousStructuralAccessibilityViolations(page);
  await expect(confirm).toBeDisabled();
  await expect(choices.getByRole("radio")).toHaveCount(3);
  const gridColumns = await page.getByTestId("team-philosophy-grid").evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length);
  expect(gridColumns).toBe(testInfo.project.name.startsWith("mobile") ? 1 : 3);
  await expect(choices.getByText("Treasure Hunter or Bulk Hauler", { exact: true })).toBeVisible();
  await expect(choices.getByText("Retains Jess Prime · Scout Lv.6", { exact: true })).toBeVisible();

  await choices.getByRole("radio", { name: /Junkyard Works/ }).check();
  await expect(confirm).toBeEnabled();
  await page.reload();
  expect((await persistedState(page)).teamOperatingPhilosophy).toBeNull();
  await openResetTab(page);
  await page.getByRole("button", { name: "Team Reset", exact: true }).click();
  await expect(page.getByRole("alertdialog", { name: "Confirm Team Reset" }).getByRole("button", { name: /^Confirm Team Reset/ })).toBeDisabled();
});

test("next responsibility roadmap reveals only the immediate ineligible reset on desktop and mobile", async ({ page }) => {
  await loadFixture(page, "fresh", { tutorialStep: -1, tutorialDismissed: true });
  await openResetTab(page);
  await expect(page.getByRole("region", { name: "Next Responsibility" })).toHaveCount(0);

  const cases = [
    {
      fixture: "post_scrap_reset" as const,
      layer: "Team",
      progress: `Lifetime LP ${fixtures.post_scrap_reset.payload.state.lifetimeLPAllTime} / ${RESPONSIBILITY_RESET_REQUIREMENTS.team.lifetimeLegacyPoints}`,
      eras: null,
    },
    {
      fixture: "post_team_reset" as const,
      layer: "Owner",
      progress: `Lifetime TP ${fixtures.post_team_reset.payload.state.lifetimeTeamPoints} / ${RESPONSIBILITY_RESET_REQUIREMENTS.owner.lifetimeTeamPoints}`,
      eras: `Team eras ${fixtures.post_team_reset.payload.state.teamEraCount} / ${RESPONSIBILITY_RESET_REQUIREMENTS.owner.teamEras}`,
    },
    {
      fixture: "post_owner_reset" as const,
      layer: "Track",
      progress: `Lifetime OP ${fixtures.post_owner_reset.payload.state.lifetimeOwnerPoints} / ${RESPONSIBILITY_RESET_REQUIREMENTS.track.lifetimeOwnerPoints}`,
      eras: `Owner eras ${fixtures.post_owner_reset.payload.state.ownerEraCount} / ${RESPONSIBILITY_RESET_REQUIREMENTS.track.ownerEras}`,
    },
  ];

  for (const entry of cases) {
    await replaceFixtureState(page, entry.fixture);
    await openResetTab(page);
    const roadmap = page.getByRole("region", { name: "Next Responsibility" });
    await expect(roadmap.getByRole("heading", { name: `Next: ${entry.layer}` })).toBeVisible();
    await expect(roadmap).toContainText(entry.progress);
    if (entry.eras) await expect(roadmap).toContainText(entry.eras);
    for (const hiddenLayer of ["Team", "Owner", "Track"].filter((layer) => layer !== entry.layer)) {
      await expect(roadmap.getByText(new RegExp(`Next: ${hiddenLayer}`))).toHaveCount(0);
    }
    await expectNoSeriousStructuralAccessibilityViolations(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await openTab(page, "race");
    await expect(page.getByRole("button", { name: "Enter Race" })).toBeVisible();
  }

  for (const entry of [
    {
      fixture: "post_scrap_reset" as const,
      patch: { lifetimeLPAllTime: RESPONSIBILITY_RESET_REQUIREMENTS.team.lifetimeLegacyPoints, lifetimeLPThisTeamEra: 1 },
    },
    {
      fixture: "post_team_reset" as const,
      patch: { lifetimeTeamPoints: RESPONSIBILITY_RESET_REQUIREMENTS.owner.lifetimeTeamPoints, teamEraCount: RESPONSIBILITY_RESET_REQUIREMENTS.owner.teamEras, lifetimeTPThisOwnerEra: 1 },
    },
    {
      fixture: "post_owner_reset" as const,
      patch: { lifetimeOwnerPoints: RESPONSIBILITY_RESET_REQUIREMENTS.track.lifetimeOwnerPoints, ownerEraCount: RESPONSIBILITY_RESET_REQUIREMENTS.track.ownerEras, lifetimeOPThisTrackEra: 1 },
    },
    { fixture: "post_track_reset" as const, patch: {} },
  ]) {
    await replaceFixtureState(page, entry.fixture, entry.patch);
    await openResetTab(page);
    await expect(page.getByRole("region", { name: "Next Responsibility" })).toHaveCount(0);
  }
});

test("current Team Operating Philosophy is summarized above Fleet Programs", async ({ page }) => {
  await loadFixture(page, "team_reset_ready", {
    teamOperatingPhilosophy: "driver_led",
    crewRoster: [{ id: "driver_lead", name: "Rico Prime", role: "driver", level: 7, xp: 1_200, specialization: "safety_first" }],
  });
  await openTab(page, "upgrades");
  await page.getByRole("button", { name: "Team", exact: true }).click();

  const summary = page.getByRole("region", { name: "Team Operating Philosophy" });
  await expect(summary.getByRole("heading", { name: "Driver-Led Team" })).toBeVisible();
  await expect(summary.getByText("Change at next Team Reset", { exact: true })).toBeVisible();
  await expect(summary).toHaveText(/Rico Prime.*Driver.*Lv\.7/);
  await expect(page.getByText("Department Head", { exact: true })).toBeVisible();
  const summaryBox = await summary.boundingBox();
  const fleetBox = await page.getByRole("heading", { name: "Fleet Programs" }).boundingBox();
  expect(summaryBox!.y + summaryBox!.height).toBeLessThanOrEqual(fleetBox!.y);
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
      await expect(page.getByRole("alertdialog", { name: `Confirm ${buttonName}` })).toBeVisible();
      expect((await persistedState(page))[awardField]).toBe(before[awardField]);
      if (buttonName === "Team Reset") {
        await page.getByRole("button", { name: "Cancel", exact: true }).click();
        await expect(page.getByRole("alertdialog", { name: `Confirm ${buttonName}` })).toHaveCount(0);
        expect((await persistedState(page))[awardField]).toBe(before[awardField]);
        await page.getByRole("button", { name: buttonName, exact: true }).click();
        await page.getByRole("radio", { name: /Engineering Works/ }).check();
      }
      await page.getByRole("button", { name: new RegExp(`^Confirm ${buttonName} \\(\\+\\d+ (?:TP|OP|PT)\\)$`) }).click();
    }
    const after = await persistedState(page);
    expect(after[awardField] as number).toBeGreaterThan(before[awardField] as number);
    if (clearedField === "garage") expect(after.garage).toEqual([]);
    else expect(after[clearedField]).toBe(0);
    if (buttonName === "Team Reset") {
      expect(after.teamOperatingPhilosophy).toBe("engineering_works");
      expect(after.autoScavengeUnlocked).toBe(true);
      expect(after.autoRaceUnlocked).toBe(true);
      expect(after.crewRoster).toEqual([expect.objectContaining({ role: "mechanic" })]);
    }
    await page.reload();
    expect((await persistedState(page))[awardField]).toBe(after[awardField]);
    if (buttonName === "Team Reset") expect((await persistedState(page)).teamOperatingPhilosophy).toBe("engineering_works");
  });
}

test("Team, Owner, and Track resets cannot repeat at zero progress", async ({ page }) => {
  for (const [index, fixtureName, buttonName, currencyField, eraField] of [
    [0, "team_reset_ready", "Team Reset", "teamPoints", "teamEraCount"],
    [1, "owner_reset_ready", "Owner Reset", "ownerPoints", "ownerEraCount"],
    [2, "track_reset_ready", "Track Reset", "trackPrestigeTokens", "trackEraCount"],
  ] as const) {
    if (index === 0) await loadFixture(page, fixtureName);
    else await replaceFixtureState(page, fixtureName);
    await openResetTab(page);
    await page.getByRole("button", { name: buttonName, exact: true }).click();
    if (buttonName === "Team Reset") await page.getByRole("radio", { name: /Driver-Led Team/ }).check();
    await page.getByRole("button", { name: new RegExp(`^Confirm ${buttonName} \\(\\+\\d+ (?:TP|OP|PT)\\)$`) }).click();
    const afterReset = await persistedState(page);
    expect(afterReset[currencyField] as number).toBeGreaterThan(0);

    await page.reload();
    await openResetTab(page);
    await expect(page.getByRole("button", { name: buttonName, exact: true })).toHaveCount(0);
    const afterReload = await persistedState(page);
    expect(afterReload[currencyField], `${buttonName} currency changed without progress`).toBe(afterReset[currencyField]);
    expect(afterReload[eraField], `${buttonName} era repeated without progress`).toBe(afterReset[eraField]);
  }
});

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

test("available responsibility purchases use semantic AA text in every released theme", async ({ page }) => {
  test.setTimeout(240_000);
  await loadFixture(page, "track_reset_ready", {
    teamPoints: 1_000_000,
    ownerPoints: 1_000_000,
    trackPrestigeTokens: 1_000_000,
    teamUpgradeLevels: {},
    ownerUpgradeLevels: {},
    trackPerkLevels: {},
  });

  for (const theme of THEMES) {
    await page.evaluate((themeId) => localStorage.setItem("rags-to-races-theme", themeId), theme.id);
    await page.reload();
    await openTab(page, "upgrades");
    for (const layer of ["Team", "Owner", "Track"] as const) {
      await page.getByRole("button", { name: layer, exact: true }).evaluate((button) =>
        (button as HTMLButtonElement).click(),
      );
      const purchases = page.locator('button[data-responsibility-purchase]:enabled');
      await expect(purchases.first(), `${theme.id} ${layer} has an available purchase`).toBeVisible();
      const colors = await purchases.first().evaluate((button) => {
        const style = getComputedStyle(button);
        const shell = button.closest<HTMLElement>(".shell-content > div");
        return {
          foreground: style.color,
          semanticForeground: shell ? getComputedStyle(shell).getPropertyValue("--btn-primary-text").trim() : "",
        };
      });
      const semanticColor = await page.evaluate((value) => {
        const probe = document.createElement("span");
        probe.style.color = value;
        document.body.appendChild(probe);
        const color = getComputedStyle(probe).color;
        probe.remove();
        return color;
      }, colors.semanticForeground);
      expect(colors.foreground, `${theme.id} ${layer} purchase text token`).toBe(semanticColor);
      const results = await new AxeBuilder({ page })
        .include('button[data-responsibility-purchase]:enabled')
        .withRules(["color-contrast"])
        .analyze();
      expect(results.violations, `${theme.id} ${layer} purchase contrast`).toEqual([]);
    }
  }
});

test("Team crew lifecycle and Fleet program use selected crew and settle rewards", async ({ page }) => {
  const crew = {
    id: "fixture_crew",
    name: "Rook",
    role: "mechanic",
    level: 5,
    xp: 750,
    specialization: null,
  };
  await loadFixture(page, "team_reset_ready", {
    crewRoster: [crew],
    crewSlots: 2,
    autoScavengeUnlocked: false,
    autoRaceUnlocked: false,
  });
  await openTab(page, "upgrades");
  await page.getByRole("button", { name: "Team", exact: true }).click();

  const tpBeforeRecruit = await persistedNumber(page, "teamPoints");
  const crewSection = page.getByRole("heading", { name: "Crew Roster" }).locator("..");
  await crewSection.getByRole("button", { name: /Scout$/ }).click();
  const afterRecruit = await persistedState(page);
  expect((afterRecruit.crewRoster as unknown[]).length).toBe(2);
  expect(afterRecruit.teamPoints).toBe(tpBeforeRecruit - 1);

  const rookCard = page.locator("div.rounded-lg.border.p-3").filter({ hasText: "Rook" }).last();
  await rookCard.getByRole("button", { name: /Tuner/ }).click();
  expect((await persistedState(page)).crewRoster).toEqual(expect.arrayContaining([expect.objectContaining({ id: crew.id, specialization: "tuner" })]));

  const vehicleBefore = ((await persistedState(page)).garage as Array<{ id: string; definitionId: string; condition: number; stats: unknown }>).find((vehicle) => vehicle.definitionId === "push_mower")!;
  await page.getByLabel("Crew for Push Mower").selectOption(crew.id);
  const pushMowerProgram = page.locator("article").filter({ hasText: "Push Mower" });
  await pushMowerProgram.getByRole("button", { name: "Start program" }).click();
  const assignment = ((await persistedState(page)).fleetAssignments as Array<{ id: string; crewId: string; status: string }>)[0];
  expect(assignment.crewId).toBe(crew.id);
  expect(assignment.status).toBe("running");

  await openTab(page, "dev");
  await page.getByRole("button", { name: "+10 ticks" }).click();
  await expect(page.getByTestId("dev-simulation-summary")).toContainText("Ticks: 10");
  await openTab(page, "upgrades");
  await page.getByRole("button", { name: "Team", exact: true }).click();
  await expect(pushMowerProgram.getByRole("button", { name: "Collect rewards" })).toBeVisible();
  const beforeCollect = await persistedState(page);
  await pushMowerProgram.getByRole("button", { name: "Collect rewards" }).click();
  const afterCollect = await persistedState(page);
  expect(afterCollect.scrapBucks as number).toBeGreaterThan(beforeCollect.scrapBucks as number);
  expect((afterCollect.crewRoster as Array<{ id: string; xp: number }>).find((member) => member.id === crew.id)!.xp).toBeGreaterThan(
    (beforeCollect.crewRoster as Array<{ id: string; xp: number }>).find((member) => member.id === crew.id)!.xp,
  );
  const vehicleAfter = (afterCollect.garage as Array<{ id: string; condition: number; stats: unknown }>).find((vehicle) => vehicle.id === vehicleBefore.id)!;
  expect(vehicleAfter.condition).toBe(vehicleBefore.condition - 5);
  expect(vehicleAfter.stats).not.toEqual(vehicleBefore.stats);
  expect(afterCollect.fleetAssignments).toEqual([]);
});

test("Owner purchases unlock concrete circuits and vehicles and Material Synthesis has exact terms", async ({ page }) => {
  const base = fixtures.owner_reset_ready.payload.state;
  await loadFixture(page, "owner_reset_ready", {
    ownerUpgradeLevels: {},
    unlockedFeatures: base.unlockedFeatures.filter((id) => id !== "advanced_circuits" && id !== "vehicle_mastery"),
    unlockedCircuitIds: base.unlockedCircuitIds.filter((id) => id !== "continental_grand_prix" && id !== "endurance_series"),
    unlockedVehicleIds: base.unlockedVehicleIds.filter((id) => id !== "hypercar" && id !== "prototype_x"),
    selectedCircuitId: "world_championship",
  });
  await openTab(page, "upgrades");
  await page.getByRole("button", { name: "Owner", exact: true }).click();

  const advanced = page.locator("div.rounded-lg.border.p-3").filter({ hasText: "Advanced Circuits" });
  await advanced.getByRole("button", { name: /15 OP/ }).click();
  const mastery = page.locator("div.rounded-lg.border.p-3").filter({ hasText: "Vehicle Mastery" });
  await mastery.getByRole("button", { name: /15 OP/ }).click();
  const synthesis = page.locator("div.rounded-lg.border.p-3").filter({ hasText: "Material Synthesis" });
  await synthesis.getByRole("button", { name: /10 OP/ }).click();

  const afterPurchases = await persistedState(page);
  expect(afterPurchases.unlockedFeatures).toEqual(expect.arrayContaining(["advanced_circuits", "vehicle_mastery"]));
  expect(afterPurchases.unlockedCircuitIds).toEqual(expect.arrayContaining(["continental_grand_prix", "endurance_series"]));
  expect(afterPurchases.unlockedVehicleIds).toEqual(expect.arrayContaining(["hypercar", "prototype_x"]));

  await openTab(page, "gear");
  await workshopTab(page, "Fabrication");
  await expect(page.getByRole("button", { name: "$100 → 10 Carbon Dust", exact: true })).toBeVisible();
  const beforeSynthesis = await persistedState(page);
  await page.getByRole("button", { name: "$100 → 10 Carbon Dust", exact: true }).click();
  const afterSynthesis = await persistedState(page);
  expect(afterSynthesis.scrapBucks).toBe((beforeSynthesis.scrapBucks as number) - 100);
  expect((afterSynthesis.materials as Record<string, number>).carbonDust).toBe((beforeSynthesis.materials as Record<string, number>).carbonDust + 10);
});

test("Track configuration, perks, hosting, acceleration, and collection use the displayed terms", async ({ page }) => {
  await installDeterministicMathRandom(page, 0x7acced);
  await loadFixture(page, "track_reset_ready", {
    trackPerkLevels: {},
    hostedEvents: [],
    autoScavengeUnlocked: false,
    autoRaceUnlocked: false,
  });
  await openTab(page, "upgrades");
  await page.getByRole("button", { name: "Track", exact: true }).click();

  for (const [name, cost] of [["Custom Circuits", "10 PT"], ["Night Racing", "8 PT"], ["Endurance Mode", "12 PT"], ["Sponsor Network", "5 PT"]] as const) {
    const card = page.locator("div.rounded-lg.border.p-3").filter({ hasText: name });
    await card.getByRole("button", { name: cost, exact: true }).click();
  }
  await page.getByLabel("Surface").selectOption("asphalt");
  await page.getByLabel("Length").selectOption("long");
  await page.getByLabel("Corners").selectOption("high");
  await page.getByLabel("Conditions").selectOption("night");
  await page.getByLabel("Vehicle class").selectOption("prototype");
  await page.getByLabel("Payout tier").selectOption("5");
  await page.getByRole("checkbox", { name: /Endurance modifier/ }).check();
  const forecast = await page.getByText(/^Forecast:/).innerText();
  const durationMatch = forecast.match(/after ([\d,]+) ticks/);
  expect(durationMatch).not.toBeNull();
  const displayedDuration = Number(durationMatch![1].replaceAll(",", ""));

  await page.getByRole("button", { name: "Host event" }).click();
  const hosted = ((await persistedState(page)).hostedEvents as Array<{ reward: number; remainingTicks: number; config: Record<string, unknown> }>)[0];
  expect(forecast).toContain(`$${formatNumber(hosted.reward)}`);
  expect(hosted.remainingTicks).toBe(displayedDuration);
  expect(hosted.config).toEqual(expect.objectContaining({ surface: "asphalt", length: "long", cornerDensity: "high", timeRule: "night", vehicleClass: "prototype", riskReward: 5, endurance: true }));

  await openTab(page, "dev");
  await page.getByRole("button", { name: "+100 ticks" }).click();
  await openTab(page, "upgrades");
  await page.getByRole("button", { name: "Track", exact: true }).click();
  await expect(page.getByText(`$${formatNumber(hosted.reward)}`, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Collect", exact: true })).toBeVisible();
  const beforeCollect = await persistedNumber(page, "scrapBucks");
  await page.getByRole("button", { name: "Collect", exact: true }).click();
  const afterCollect = await persistedState(page);
  expect(afterCollect.scrapBucks).toBe(beforeCollect + hosted.reward);
  expect(afterCollect.hostedEvents).toEqual([]);
});

test("@smoke save export/import round-trip preserves the campaign checksum fields", async ({ page }) => {
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

test("malformed current-version save import is rejected without mutating the campaign", async ({ page }) => {
  await loadFixture(page, "workshop_ready");
  const before = await persistedState(page);
  await openTab(page, "settings");
  const malformed = structuredClone(fixtures.workshop_ready.payload) as unknown as {
    state: Record<string, unknown>;
  };
  Object.assign(malformed.state, {
    garage: [null],
    materials: { ...(malformed.state.materials as Record<string, number>), metalScrap: -1 },
    fatigue: "exhausted",
    vehicleLoadouts: null,
  });
  const input = page.locator('input[type="file"]');
  await input.setInputFiles({
    name: "malformed-current-save.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(malformed)),
  });
  const importArea = input.locator("..");
  await expect(importArea.locator("p").last()).toBeVisible();
  await expect(page.getByText("Save imported successfully!", { exact: true })).toHaveCount(0);

  const after = await persistedState(page);
  for (const field of ["scrapBucks", "repPoints", "activeVehicleId", "fatigue", "materials", "garage"] as const) {
    expect(after[field], `${field} changed after a rejected import`).toEqual(before[field]);
  }
});

test("@smoke maxed state visits every primary screen without crashes or viewport overflow", async ({ page }) => {
  const errors = captureErrors(page);
  const warnings = captureWarnings(page);
  await loadFixture(page, "maxed");
  for (const tab of ["junkyard", "garage", "race", "gear", "upgrades", "help", "log", "settings", "dev"]) {
    if (tab !== "junkyard") await openTab(page, tab);
    if (tab === "race") await expect(page.getByText("ENDURANCE", { exact: true })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${tab} horizontal overflow`).toBeLessThanOrEqual(1);
    await expect(page.locator("body")).not.toContainText(/NaN|Infinity/);
  }
  expect(errors.filter((error) => /Maximum update depth|getSnapshot|NaN|uncaught/i.test(error))).toEqual([]);
  expect(warnings, warnings.join("\n")).toEqual([]);
});

test("maxed acceleration stays bounded and Workshop pagination remains responsive", async ({ page }) => {
  test.setTimeout(60_000);
  await loadFixture(page, "maxed");
  const before = await persistedState(page);

  await openTab(page, "dev");
  await page.getByRole("button", { name: "+1,000 ticks", exact: true }).click();
  await expect(page.getByTestId("dev-simulation-summary")).toContainText("Ticks: 1000");

  const after = await persistedState(page);
  expect((after.inventory as unknown[]).length, "loose inventory grew during maxed acceleration")
    .toBeLessThanOrEqual((before.inventory as unknown[]).length);
  expect((after.stationEquipmentInventory as unknown[]).length, "station equipment exceeded its configured ceiling")
    .toBeLessThanOrEqual(STATION_EQUIPMENT_INVENTORY_LIMIT);

  await openTab(page, "gear");
  await workshopTab(page, "Inventory");
  const cards = page.getByTestId("workshop-inventory-item");
  const cardCount = await cards.count();
  expect(cardCount).toBeGreaterThan(0);
  expect(cardCount, "Workshop rendered more than one inventory page").toBeLessThanOrEqual(40);

  const pageStatus = page.getByTestId("workshop-inventory-page-status").first();
  const firstPageStatus = await pageStatus.innerText();
  const nextButtons = page.getByTestId("workshop-inventory-next");
  const nextButtonState = await nextButtons.evaluateAll((buttons) => buttons.map((button) => {
    const rect = button.getBoundingClientRect();
    return {
      disabled: (button as HTMLButtonElement).disabled,
      width: rect.width,
      height: rect.height,
      x: rect.x,
      y: rect.y,
    };
  }));
  expect(nextButtonState, `next inventory controls: ${JSON.stringify(nextButtonState)}`).toHaveLength(2);
  for (const state of nextButtonState) {
    expect(state.disabled, `next inventory controls: ${JSON.stringify(nextButtonState)}`).toBe(false);
    expect(state.width, `next inventory controls: ${JSON.stringify(nextButtonState)}`).toBeGreaterThan(0);
    expect(state.height, `next inventory controls: ${JSON.stringify(nextButtonState)}`).toBeGreaterThan(0);
  }
  await nextButtons.first().click();
  await expect(pageStatus).not.toHaveText(firstPageStatus);
  await expect(pageStatus).toContainText("Page 2 of");

  await workshopTab(page, "Facilities");
  await expect(page.getByText("MAX", { exact: true }).first()).toBeVisible();
  await workshopTab(page, "Stations");
  await expect(page.getByRole("heading", { name: "Station Sets", exact: true })).toBeVisible();
  await openTab(page, "race");
  await expect(page.getByText("ENDURANCE", { exact: true })).toBeVisible();
});

test("maxed upgrade and facility surfaces expose no enabled over-max purchase", async ({ page }) => {
  await loadFixture(page, "maxed");
  await openTab(page, "gear");
  await workshopTab(page, "Facilities");
  await expect(page.getByText("MAX", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /^\$[\d,]+$/ }).and(page.locator(":enabled"))).toHaveCount(0);

  await openTab(page, "upgrades");
  for (const [layer, currency] of [["Team", "TP"], ["Owner", "OP"], ["Track", "PT"]] as const) {
    await page.getByRole("button", { name: layer, exact: true }).click();
    await expect(page.getByText("MAXED", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: new RegExp(`^[\\d,]+ ${currency}$`) }).and(page.locator(":enabled"))).toHaveCount(0);
  }
});

test("all supported themes survive reload without hydration errors or horizontal overflow", async ({ page }) => {
  // This intentionally performs a full reload for every visible and hidden
  // theme. Mobile emulation can exceed the default budget on a cold dev server.
  test.setTimeout(180_000);
  await loadFixture(page, "workshop_ready");
  await openTab(page, "settings");

  for (const theme of THEMES) {
    await page.getByRole("button", { name: theme.label, exact: true }).click();
    expect(await page.evaluate(() => localStorage.getItem("rags-to-races-theme"))).toBe(theme.id);
    await expect.poll(async () => page.evaluate(() => {
      const shell = document.querySelector<HTMLElement>(".shell-content > div");
      if (!shell) return false;
      const shellAccent = getComputedStyle(shell).getPropertyValue("--accent").trim();
      const root = getComputedStyle(document.documentElement);
      const rootAccent = root.getPropertyValue("--accent").trim();
      const modalBackground = root.getPropertyValue("--modal-bg").trim();
      return rootAccent === shellAccent && modalBackground !== "" && !modalBackground.startsWith("rgba(");
    }), `${theme.id} live theme variables did not propagate`).toBe(true);
  }

  for (const theme of [...THEMES, ...HIDDEN_THEMES]) {
    await page.evaluate((themeId) => localStorage.setItem("rags-to-races-theme", themeId), theme.id);
    await page.reload();
    await openTab(page, "settings");
    await expect(page.getByRole("heading", { name: "Theme", exact: true })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("rags-to-races-theme"))).toBe(theme.id);
    const appliedTheme = await page.evaluate(() => {
      const shell = document.querySelector<HTMLElement>(".shell-content > div");
      return {
        shellAccent: shell ? getComputedStyle(shell).getPropertyValue("--accent").trim() : "",
        rootAccent: getComputedStyle(document.documentElement).getPropertyValue("--accent").trim(),
        modalBackground: getComputedStyle(document.documentElement).getPropertyValue("--modal-bg").trim(),
      };
    });
    expect(appliedTheme.shellAccent, `${theme.id} did not apply theme variables`).not.toBe("");
    expect(appliedTheme.rootAccent, `${theme.id} portal variables diverged`).toBe(appliedTheme.shellAccent);
    expect(appliedTheme.modalBackground, `${theme.id} modal surface is translucent`).not.toMatch(/^rgba\(/);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${theme.id} horizontal overflow`).toBeLessThanOrEqual(1);
    if (theme.id === "outlaw") {
      expect(overflow, "outlaw exact horizontal overflow").toBe(0);
    }
  }
});

test("@smoke desktop and mobile primary navigation keeps every critical action reachable", async ({ page }) => {
  await loadFixture(page, "workshop_ready");
  for (const [tab, text] of [["junkyard", "Scavenge!"], ["garage", "Your Garage"], ["race", "Enter Race"], ["gear", "Salvage Workshop"], ["upgrades", "Legacy"]] as const) {
    if (tab !== "junkyard") await openTab(page, tab);
    await expect(page.getByText(text, { exact: false }).first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${tab} horizontal overflow`).toBeLessThanOrEqual(1);
  }
  await expectNoSeriousStructuralAccessibilityViolations(page);
});

test("@smoke mobile Workshop dropdown uses an opaque raised surface", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loadFixture(page, "workshop_ready");
  await openTab(page, "gear");
  await page.locator(".mobile-sub-nav").getByRole("button").first().click();
  const menu = page.getByTestId("mobile-sub-nav-menu");
  await expect(menu).toBeVisible();
  await expect(menu).toHaveCSS("background-color", "rgb(4, 24, 32)");
});

test("mobile Workshop dropdown follows a persisted non-default theme", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loadFixture(page, "workshop_ready", {}, "outlaw");
  await openTab(page, "gear");
  await page.locator(".mobile-sub-nav").getByRole("button").first().click();
  await expect(page.getByTestId("mobile-sub-nav-menu")).toHaveCSS("background-color", "rgb(14, 10, 6)");
});

test("@smoke default semantic text palette preserves readable contrast", async ({ page }) => {
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
