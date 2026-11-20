import { afterEach, beforeEach, expect, it } from "vitest";
import { decodeGameState } from "../../game/save";
import { apply, createGame, must } from "../index";
import { initialConfig } from "../state";
import { LAYERS } from "../layers";
import { racer } from "../../../tests/fixtures/rewrite";
import { careerOpportunities } from "../careerAdvice";
import type { CustomerId, Invoice } from "../serviceShop";
import { setExperimentalCareers } from "../features";

// These systems are experimental and off by default; switch them on for this file only.
beforeEach(() => setExperimentalCareers(true));
afterEach(() => setExperimentalCareers(false));

const invoice = (client: CustomerId, partId: string): Invoice => ({ client, partId, partUid: "paid-"+client, condition: 3, origin: "Curbside" });

it("pays only for a registered physical part after real bench service, once", () => {
  let game=createGame("invoice-actions");
  game.run.inventory.push({uid:"rusty-tire",partId:"wheel_busted",condition:1,origin:"Curbside"});
  const deliver = {type:"service",move:{type:"deliver"}} as const;
  game=must(game,{type:"service",move:{type:"register",client:"marina",partUid:"rusty-tire"}});
  expect(apply(game,deliver).error).toBeTruthy();
  game=must(game,{type:"enqueue",spec:{kind:"clean",partUid:"rusty-tire"}});
  expect(decodeGameState(game)?.run.serviceBook?.ticket?.partUid).toBe("rusty-tire");
  game=must(game,{type:"advance",ms:600_000,away:true});
  game=must(game,deliver);
  expect(game.run.cash).toBe(24);
  expect(game.run.rep).toBe(2);
  expect(game.run.inventory).toHaveLength(0);
  expect(apply(game,deliver).error).toBeTruthy();
  expect(decodeGameState(game)?.run.serviceBook?.invoices[0].partUid).toBe("rusty-tire");
});

it("carries precisely one business asset through a shop move and offers a distinct founding charter", () => {
  let game=racer("service-tender","riding_mower");
  game.run.tools.parts_washer=1;
  const receipts=[invoice("marina","wheel_basic"),invoice("orchard","engine_small"),invoice("courier","fuel_gas_can")];
  game.run.serviceBook={invoices:receipts};
  expect(LAYERS.scrap.gate(game).ok).toBe(false);
  const equipment=must(game,{type:"reset",layer:"shop",choices:{...initialConfig(),shopLegacy:{type:"tool",tool:"parts_washer"}}});
  expect(equipment.run.tools.parts_washer).toBe(1);
  expect(equipment.scrap.tuneUpPoints).toBe(0);
  expect(equipment.scrap.lp).toBe(0);
  expect(equipment.meta.seasonLog?.at(-1)?.serviceInvoices).toHaveLength(3);
  const referral=must(game,{type:"reset",layer:"shop",choices:{...initialConfig(),shopLegacy:{type:"client",client:"orchard"}}});
  expect(referral.run.tools.parts_washer).toBeUndefined();
  expect(apply(referral,{type:"enqueue",spec:{kind:"haul",placeId:"curb",focus:"engine"}}).error).toBeNull();
  expect(apply(referral,{type:"enqueue",spec:{kind:"haul",placeId:"curb",focus:"wheel"}}).error).toMatch(/Scouting/);
  expect(LAYERS.team.gate(game).ok).toBe(false);
  game.meta.serviceReferences={equipment:{tool:"parts_washer",season:1,invoice:receipts[0]},referral:{season:2,invoice:receipts[1]}};
  expect(careerOpportunities(game)[0].id).toBe("service-charter");
  const choices={...initialConfig(),teamName:"Friday Rebuilders",discipline:"dirt" as const,colors:["#444","#aaa"] as [string,string]};
  expect(apply(game,{type:"reset",layer:"team",choices}).error).toMatch(/Collective/);
  game=must(game,{type:"reset",layer:"team",choices:{...choices,organization:"collective"}});
  expect(decodeGameState(game)?.era?.organization).toBe("collective");
  expect(game.meta.stateWonEver).toBe(false);
});
