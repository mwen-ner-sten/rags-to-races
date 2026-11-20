import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { decodeGameState } from "../../game/save";
import { FREIGHT_COST } from "../salvageCarry";
import { getPlace } from "../content/places";
import { apply, createGame, must } from "../index";
import { perkSlots, scrapAward, type ScrapChoices } from "../layers";
import type { GameState, PartInstance } from "../types";
import { EXPERIMENTAL_OFF, setExperimentalCareers } from "../features";

// These systems are experimental and off by default; switch them on for this file only.
beforeEach(() => setExperimentalCareers(true));
afterEach(() => setExperimentalCareers(false));

const STANDARD = { perks: [], tuneUp: { haul: 0, wrench: 0, build: 0, race: 0 }, dare: null, hardships: [] } satisfies ScrapChoices;
function ready() {
  const state = createGame("baton-test");
  state.run.featureWins.county_fair = 0;
  state.meta.knowhow["tech:scouting"] = 1;
  state.meta.codex.places = { curb: 1, yards: 1, junkyard: 1 };
  state.meta.challengeRecords.parts_with_a_past = { completions: 1, bestSeasonMs: 1, bestVehicleName: "Past winner" };
  return state;
}

function reset(state: GameState, choices: ScrapChoices): GameState {
  return must(state, { type: "reset", layer: "scrap", choices });
}

function tire(uid: string, season: number): PartInstance {
  return { uid, partId: "wheel_river", condition: 2, origin: getPlace("floodplain").name, provenance: { county: "river", placeId: "floodplain", season } };
}

describe("County freight", () => {
  it("spends the exact freight fee instead of a perk slot, with no way to carry it twice", () => {
    const state = ready();
    state.config.homeCounty = "river";
    const part = tire("freight", 1);
    state.run.inventory.push(part);
    const crate = { ...STANDARD, homeCounty: "quarry", retainedPartUid: part.uid } satisfies ScrapChoices;
    const fee = { ...crate, countyFreight: true } satisfies ScrapChoices;
    setExperimentalCareers(false);
    expect(apply(state, { type: "reset", layer: "scrap", choices: fee }).error).toBe(EXPERIMENTAL_OFF);
    const normal = reset(state, crate);
    setExperimentalCareers(true);
    const freight = reset(state, fee);
    expect(freight.scrap.lp).toBe(state.scrap.lp + scrapAward(state) - FREIGHT_COST);
    expect(freight.scrap.lifetimeLp).toBe(normal.scrap.lifetimeLp);
    expect(perkSlots(freight)).toBe(perkSlots(normal) + 1);
    expect(freight.run.inventory).toEqual(normal.run.inventory);
    setExperimentalCareers(false);
    expect(decodeGameState(freight)?.config.countyFreight).toBe(true);
    setExperimentalCareers(true);
    expect(apply(state, { type: "reset", layer: "scrap", choices: { ...fee, homeCounty: "river" } }).error).toContain("foreign county component");
    expect(apply(state, { type: "reset", layer: "scrap", choices: { ...fee, hardships: ["rookie_plates"] } }).error).toContain("Rookie Plates");
    freight.run.featureWins.county_fair = 10;
    expect(apply(freight, { type: "reset", layer: "scrap", choices: fee }).error).toContain("foreign county component");
  });

  it("imports a delivered baton as ordinary inherited salvage when careers are hidden", () => {
    const state = ready();
    state.config.homeCounty = "river";
    state.run.inventory.push(tire("past-tire", 1));
    const delivery = reset(state, { ...STANDARD, homeCounty: "quarry", retainedPartUid: "past-tire" });
    const oldSave = {
      ...delivery,
      meta: { ...delivery.meta, countyFreight: { quarry: 1 } },
      run: { ...delivery.run, countyBaton: { leg: "deliver", from: "river", qualified: { uid: "past-tire", at: 0 } },
        inventory: delivery.run.inventory.map((part) => ({ ...part, batonGuard: true })) },
    };
    setExperimentalCareers(false);
    const loaded = decodeGameState(oldSave);
    expect(loaded?.run.inventory).toEqual(delivery.run.inventory);
    expect(loaded?.config).toEqual(delivery.config);
    expect(loaded?.run).not.toHaveProperty("countyBaton");
    expect(loaded?.meta).not.toHaveProperty("countyFreight");
  });
});
