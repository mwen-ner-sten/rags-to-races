import { expect, test } from "@playwright/test";
import { createGame } from "../../src/core";
import { racer, saveText } from "../fixtures/rewrite";
import { setExperimentalCareers } from "../../src/core/features";

// Covers experimental side careers, which are hidden unless this browser preference is on.
// Fixtures build experimental saves in Node, so the engine flag must be on here too.
test.beforeAll(() => setExperimentalCareers(true));
test.afterAll(() => setExperimentalCareers(false));
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("rags-to-races:experimental-careers", "on"));
});

test("the garage can close for a customer route with zero racing wins", async ({page}) => {
  const game=racer("service-browser","riding_mower");
  game.run.featureWins={};
  game.run.revealed.push("bench", "tools");
  game.run.tools.parts_washer=1;
  game.run.serviceBook={invoices:[
    {client:"orchard",partId:"engine_small",partUid:"paid-engine",condition:3,origin:"Yards"},
    {client:"courier",partId:"fuel_gas_can",partUid:"paid-tank",condition:3,origin:"Yards"},
  ], ticket:{client:"marina",partUid:"registered-tire",worked:true}};
  game.run.inventory.push({uid:"registered-tire",partId:"wheel_busted",condition:2,origin:"Curbside"});
  await page.goto("/");
  await page.getByRole("button",{name:"Settings",exact:true}).click();
  await page.getByLabel("Save text").fill(saveText(game));
  await page.getByRole("button",{name:"Import save",exact:true}).click();
  await page.getByRole("button",{name:/^Garage/}).first().click();
  await page.getByRole("tab",{name:/^Customers/}).click();
  await expect(page.getByText(/2 of 3 jobs done/)).toBeVisible();
  await page.getByRole("button",{name:/^Hand over · /}).click();
  await expect(page.getByText(/3 of 3 jobs done/)).toBeVisible();
  await page.getByRole("group",{name:"Take one thing with you"}).getByRole("radio",{name:/Orchard grounds crew/}).check();
  await page.getByRole("checkbox",{name:"Close this garage and begin the next Season."}).check();
  await page.getByRole("button",{name:"Move the shop",exact:true}).click();
  await page.getByRole("button",{name:/^Trips/}).first().click();
  const curb=page.getByLabel("Look for").first();
  await curb.selectOption("engine");
  await expect(curb).toHaveValue("engine");
  await expect(curb.getByRole("option",{name:"Look for wheel"})).toHaveCount(0);
  await page.getByRole("button",{name:/^Notebook/}).click();
  await page.getByRole("tab",{name:"Seasons"}).click();
  await expect(page.getByText(/Shop Move after/).first()).toBeVisible();
});

test("the first haul opens a workshop route for the engine actually found", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-11-01T18:00:00Z") });
  await page.addInitScript((game) => {
    localStorage.setItem("rags-to-races:v2", JSON.stringify({ game, savedAt: Date.now() }));
  }, createGame("service-first-haul"));
  await page.goto("/");
  const workshop = page.getByRole("button", { name: "Follow the workshop route" });
  await expect(workshop).toHaveCount(0);
  await page.getByRole("button", { name: "Go", exact: true }).click();
  await page.clock.fastForward(18_000);
  await expect(workshop).toBeVisible();
  await expect(page.getByText(/what the dealer would pay/).first()).toBeVisible();
  await workshop.click();

  const counter = page.locator("#service-counter");
  const card = (name: string) => page.getByRole("article").filter({ has: page.getByRole("heading", { name }) });
  const orchard = card("Orchard grounds crew");
  const marina = card("Mira at the landing");
  await expect(counter).toBeFocused();
  await expect(counter).toBeInViewport();
  await expect(orchard.getByRole("group", { name: "Part to fix up" })).toContainText(/Small Engine\s*Rusted\s*Curbside/);
  await expect(orchard.getByText(/Dealer offer today/)).toContainText(/clean to Worn, then repair with 1 metal and 1 wiring/);
  await expect(page.getByRole("heading", { name: "Move the shop" })).toHaveCount(0);
  await expect(orchard.getByRole("button", { name: "Take this job" })).toBeEnabled();

  // A different customer's job is still listed, even without a matching part to take on.
  await page.clock.fastForward(1_000);
  await expect(marina.getByRole("button", { name: "Take this job" })).toHaveCount(0);
  await expect(marina.getByText(/You need .* that is worse than/)).toBeVisible();

  await page.getByRole("button", { name: "Trips", exact: true }).click();
  await expect(page.getByLabel("Pin a project")).toHaveValue("paid-work");
  await expect(page.getByText(/Take the job for Orchard grounds crew/)).toBeVisible();
  await page.getByRole("button", { name: "Open customer jobs", exact: true }).click();
  await expect(counter).toBeFocused();
  await orchard.getByRole("button", { name: "Take this job" }).click();
  await expect(orchard.getByText(/Small Engine · Rusted · Curbside/)).toBeVisible();
  await expect(orchard.getByRole("button", { name: "Clean the Small Engine" })).toBeEnabled();
  await expect(orchard.getByRole("button", { name: /^Hand over · / })).toBeDisabled();

  await page.getByRole("button", { name: "Trips", exact: true }).click();
  await expect(page.getByText(/Fix up and hand over the part for Orchard grounds crew/)).toBeVisible();
});
