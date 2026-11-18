import { describe, expect, it } from "vitest";
import { decodeGameState } from "../../game/save";
import { apply, createGame, must } from "../index";
import { counterBlocker, swapMeetBlocker } from "../actions";
import { countyPassport, homeCounty } from "../counties";
import { haulOriginsOn } from "../challenges";
import { getPlace } from "../content/places";
import { baseDuration, jobBlocker } from "../jobs";
import { partOriginLabel } from "../provenance";
import type { GameState, HomeCounty, JobSpec, PartInstance, Vehicle } from "../types";

const TUNE = { haul: 0, wrench: 0, build: 0, race: 0 };
const CHOICES = { perks: [], tuneUp: TUNE, dare: null, hardships: [] };

function job(state: GameState, spec: JobSpec) {
  return must(must(state, { type: "enqueue", spec }), { type: "advance", ms: Math.ceil(baseDuration(state, spec)) });
}

function visit(state: GameState, placeId: string) {
  return job(state, { kind: "haul", placeId });
}

function readyScout(seed: string) {
  const state = createGame(seed);
  state.run.featureWins.county_fair = 0;
  state.meta.knowhow["tech:scouting"] = 1;
  state.meta.codex.places = { curb: 28, yards: 1, junkyard: 1 };
  return state;
}

function move(state: GameState, county: HomeCounty) {
  return must(state, { type: "reset", layer: "scrap", choices: { ...CHOICES, homeCounty: county } });
}

function part(uid: string, partId: string, origin: string): PartInstance {
  return { uid, partId, condition: 3, origin };
}

describe("Scrap home counties", () => {
  it("earns the county choice by scouting and actually hauling from three places", () => {
    let state = createGame("county-passport-actions");
    state.run.featureWins.county_fair = 0;
    const raceReady: Vehicle = {
      uid: "trailer-car", vehicleId: "riding_mower", name: "Carrier", tune: "balanced", parts: {}, builtAtSeasonMs: 0,
      history: { races: 0, wins: 0, dnfs: 0, bestFinish: null },
    };
    state.run.vehicles.push(raceReady);
    state.run.rep = 45;
    state = must(state, { type: "openPlace", knowhowId: "place:yards" });
    state = must(state, { type: "openPlace", knowhowId: "place:junkyard" });
    expect(countyPassport(state).visited).toBe(0);
    expect(apply(state, { type: "reset", layer: "scrap", choices: { ...CHOICES, homeCounty: "river" } }).error).toMatch(/three different sources/);
    for (let i = 0; i < 28; i += 1) state = visit(state, "curb");
    state = visit(visit(state, "yards"), "junkyard");
    expect(countyPassport(state)).toEqual({ visited: 3, scouting: false, earned: false });
    state = job(state, { kind: "study", knowhowId: "tech:scouting" });
    expect(countyPassport(state).earned).toBe(true);
    expect(homeCounty(move(state, "river"))).toBe("river");
    expect(homeCounty(move(state, "home"))).toBe("home");
  });

  it("gives the River Tire a physical source that survives fitting, Hall of Fame, donor selection and reload", () => {
    let river = move(readyScout("river-county-tire"), "river");
    river.run.rep = 5;
    expect(apply(river, { type: "openPlace", knowhowId: "place:yards" }).error).toBe("Unavailable in River County");
    river = must(river, { type: "openPlace", knowhowId: "place:floodplain" });
    expect(river.run.rep).toBe(0);
    let tire: PartInstance | undefined;
    for (let trip = 0; trip < 20 && !tire; trip += 1) {
      if (river.run.inventory.length >= 8) river = must(river, { type: "sell", partUids: river.run.inventory.map(({ uid }) => uid) });
      river = visit(river, "floodplain");
      tire = river.run.inventory.find((piece) => piece.partId === "wheel_river" && piece.condition > 0);
    }
    expect(tire).toBeDefined();
    const native = tire!;
    expect(native.provenance).toEqual({ county: "river", placeId: "floodplain", season: 2 });
    expect(partOriginLabel(native)).toBe("Floodplain Lots · River County");
    river.run.inventory.push(part("plain-engine", "engine_lawn", "Curbside"));
    river = job(river, { kind: "assemble", vehicleId: "push_mower", name: "River runner", partUids: { engine: "plain-engine", wheel: native.uid } });
    expect(haulOriginsOn(river.run.vehicles[0], 2)).toEqual(["Curbside", "Floodplain Lots · River County"]);
    river.run.featureWins.county_fair = river.run.seasonMs;
    river.meta.challengeRecords.parts_with_a_past = { completions: 1, bestVehicleName: "River runner", bestSeasonMs: river.run.seasonMs };
    const carried = must(river, { type: "reset", layer: "scrap", choices: { ...CHOICES, homeCounty: "home", retainedPartUid: native.uid } });
    const reloaded = decodeGameState(carried)!;
    expect(reloaded.run.inventory[0]).toEqual({ ...native, inherited: true });
    expect(reloaded.config.donor?.provenance).toEqual(native.provenance);
    expect(reloaded.meta.hallOfFame.at(-1)?.parts.find(({ slot }) => slot === "wheel")?.provenance).toEqual(native.provenance);
    expect(homeCounty(reloaded)).toBe("home");
  });

  it("charges Quarry fees once, labels local curb salvage and preserves the shared deep sources", () => {
    let quarry = move(readyScout("quarry-county-fees"), "quarry");
    const local = visit(quarry, "curb").run.inventory[0];
    expect(local.provenance).toEqual({ county: "quarry", placeId: "curb", season: 2 });
    expect(partOriginLabel(local)).toBe("Curbside · Quarry County");
    quarry.run.rep = 20;
    expect(apply(quarry, { type: "openPlace", knowhowId: "place:junkyard" }).error).toBe("Unavailable in Quarry County");
    expect(apply(quarry, { type: "openPlace", knowhowId: "place:quarry_breakers" }).error).toBe("Own a Riding Mower");
    quarry.config.perks.push("borrowed_trailer");
    quarry.meta.perks.borrowed_trailer = 1;
    quarry = must(quarry, { type: "openPlace", knowhowId: "place:quarry_breakers" });
    expect(quarry.run.rep).toBe(0);
    const breakers: JobSpec = { kind: "haul", placeId: "quarry_breakers" };
    expect(jobBlocker(quarry, breakers)).toBe("Needs 14 Scrap Bucks");
    while (quarry.run.cash < getPlace("quarry_breakers").fee) {
      quarry = visit(quarry, "curb");
      quarry = must(quarry, { type: "sell", partUids: quarry.run.inventory.map(({ uid }) => uid) });
    }
    const cash = quarry.run.cash;
    quarry = job(quarry, breakers);
    expect(quarry.run.cash).toBe(cash - 14);
    expect(quarry.run.inventory[0].provenance?.county).toBe("quarry");
    expect(counterBlocker(quarry, "engine_quarry")).toMatch(/Quarry County/);
    quarry.config.perks.push("swap_meet");
    quarry.meta.perks.swap_meet = 1;
    expect(swapMeetBlocker(quarry, [], "wheel_river")).toMatch(/River County/);
    quarry.config.perks.pop();
    quarry.run.venuesOpen.push("dirt");
    quarry.run.rep = 90;
    quarry = must(quarry, { type: "openPlace", knowhowId: "place:auction" });
    expect(quarry.run.placesOpen).toContain("auction");
    expect(decodeGameState(quarry)).toBeTruthy();
  });

  it("continues to count legacy named origins and rejects inconsistent county tags", () => {
    const state = createGame("old-source-labels");
    state.run.vehicles.push({ uid: "old-kart", vehicleId: "go_kart", name: "Old", tune: "balanced", builtAtSeasonMs: 0,
      history: { races: 0, wins: 0, dnfs: 0, bestFinish: null }, parts: {
        engine: part("o-engine", "engine_v4", "Marisol's Junkyard"),
        wheel: part("o-wheel", "wheel_kart", "Neighbourhood Yards"),
        fuel: part("o-fuel", "fuel_gas_can", "Curbside"),
      } });
    const old = decodeGameState(state)!;
    expect(haulOriginsOn(old.run.vehicles[0], 1)).toEqual(["Marisol's Junkyard", "Neighbourhood Yards", "Curbside"]);
    old.run.vehicles[0].parts.fuel!.provenance = { county: "quarry", placeId: "yards", season: 1 };
    expect(decodeGameState(old)).toBeNull();
  });
});
