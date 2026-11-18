import { expect, test } from "@playwright/test";
import { racer, saveText } from "../fixtures/rewrite";

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
  await page.getByText(/Customer repairs · 2\/3 paid invoices/).click();
  await page.getByRole("button",{name:"Deliver part and collect payment"}).click();
  await page.getByLabel("Take one thing with you").selectOption("Orchard grounds crew");
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
