import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import fixtures from "./fixtures/gameplay.generated.json";

type FixtureName = keyof typeof fixtures;

async function loadFixture(page: Page, name: FixtureName) {
  const fixture = fixtures[name];
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(({ key, payload }) => {
    localStorage.setItem(key, JSON.stringify(payload));
  }, { key: fixture.storageKey, payload: fixture.payload });
  await page.goto("/");
  await expect(page).toHaveTitle("Rags to Races");
}

async function expectNoSeriousStructuralAccessibilityViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .disableRules(["color-contrast"])
    .analyze();
  const blocking = results.violations.filter((violation) =>
    violation.impact === "critical" || violation.impact === "serious",
  );
  expect(blocking, blocking.map((violation) => `${violation.id}: ${violation.help}`).join("\n")).toEqual([]);
}

test("fresh save exposes the first engineering loop", async ({ page }) => {
  await loadFixture(page, "fresh");
  await expect(page.getByRole("heading", { name: "Rags to Races" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Scavenge!" })).toBeVisible();
  await expectNoSeriousStructuralAccessibilityViolations(page);
});

test("workshop and strategic race preparation are reachable", async ({ page }) => {
  await loadFixture(page, "scrap_ready");
  await page.locator('[data-tutorial-tab="gear"]:visible').click();
  await expect(page.getByText("Salvage Workshop", { exact: true })).toBeVisible();
  await page.locator('[data-tutorial-tab="race"]:visible').click();
  await expect(page.getByText(/Race Preparation|Race Plan/i).first()).toBeVisible();
  await expectNoSeriousStructuralAccessibilityViolations(page);
});

for (const [fixtureName, layerName, heading] of [
  ["team", "Team", /Team, Crew & Fleet/i],
  ["owner", "Owner", /Facilities & Supply Chains/i],
  ["track", "Track", /Track Perks/i],
] as const) {
  test(`${layerName} responsibility layer is reachable from its milestone`, async ({ page }, testInfo) => {
    await loadFixture(page, fixtureName);
    await page.locator('[data-tutorial-tab="upgrades"]:visible').click();
    await page.getByRole("button", { name: layerName, exact: true }).click();
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
    await expectNoSeriousStructuralAccessibilityViolations(page);
    await page.screenshot({ path: testInfo.outputPath(`${fixtureName}-${testInfo.project.name}.png`), fullPage: true });
  });
}

test("maxed state remains navigable without horizontal viewport overflow", async ({ page }) => {
  await loadFixture(page, "maxed");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("default semantic text palette preserves readable contrast", async ({ page }) => {
  await loadFixture(page, "scrap_ready");
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
      const value = getComputedStyle(probe).color;
      probe.remove();
      const foreground = luminance(parse(value));
      return [variable, (foreground + 0.05) / 0.05];
    }));
  });
  for (const [variable, ratio] of Object.entries(ratios)) {
    expect(ratio, `${variable} contrast`).toBeGreaterThanOrEqual(4.5);
  }
});
