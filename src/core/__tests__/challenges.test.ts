import { describe, expect, it } from "vitest";
import { decodeGameState } from "../../game/save";
import { channel } from "../channels";
import { getPlace } from "../content/places";
import { getVehicle } from "../content/vehicles";
import { stripYield } from "../garage";
import { apply, createGame, must } from "../index";
import { baseDuration, jobBlocker } from "../jobs";
import { settleRace } from "../race";
import type { GameState, JobSpec, RaceRoll, Vehicle } from "../types";

const WIN: RaceRoll = {
  position: 1, fieldSize: 6, dnf: false, margin: 1, rivalBeaten: true,
  weakestSlot: null, wearSteps: {}, laps: 1, durationMs: 60_000, beats: [],
};

const KART = { engine: "engine_v4", frame: "frame_kart", wheel: "wheel_dirt", fuel: "fuel_gas_can" };
const [CURB, YARDS, JUNKYARD, AUCTION] = ["curb", "yards", "junkyard", "auction"].map((place) => getPlace(place).name);

function addKart(state: GameState, uid: string): Vehicle {
  const kart: Vehicle = {
    uid, vehicleId: "go_kart", name: uid, tune: "balanced", builtAtSeasonMs: 0,
    history: { races: 0, wins: 0, dnfs: 0, bestFinish: null },
    parts: Object.fromEntries(Object.entries(KART).map(([slot, partId]) => [slot, { uid: `${uid}:${slot}`, partId, condition: 4, origin: JUNKYARD }])),
  };
  state.run.vehicles.push(kart);
  return kart;
}

function race(state: GameState, kart: Vehicle, venueId: string, seasonMs: number, roll = WIN) {
  state.run.seasonMs = seasonMs;
  settleRace(state, { kind: "race", vehicleUid: kart.uid, venueId, event: "feature", call: "push" }, roll);
}

function newAttempt(state: GameState, dare: string) {
  state.run.featureWins.county_fair ??= 0;
  return must(state, { type: "reset", layer: "scrap", choices: { perks: [], tuneUp: { haul: 0, wrench: 0, build: 0, race: 0 }, dare, hardships: [] } });
}

function finishJob(state: GameState, spec: JobSpec): GameState {
  const queued = must(state, { type: "enqueue", spec });
  return must(queued, { type: "advance", ms: Math.ceil(baseDuration(state, spec)) });
}

describe("repeatable Season challenges", () => {
  it("keeps older saves loadable and rejects objectives that conflict with the next Season", () => {
    const state = createGame("compatible");
    const older = structuredClone(state);
    Reflect.deleteProperty(older.run, "challenge");
    Reflect.deleteProperty(older.meta, "challengeRecords");
    const loaded = decodeGameState(older);
    expect(loaded?.run.challenge).toEqual({});
    expect(loaded?.meta.challengeRecords).toEqual({});

    state.run.featureWins.county_fair = 0;
    state.meta.stateWonEver = true;
    const teamChoices = {
      teamName: "New Team", colors: ["#000", "#fff"] as [string, string], perks: [],
      tuneUp: { haul: 0, wrench: 0, build: 0, race: 0 },
    };
    const drag = apply(state, { type: "reset", layer: "team", choices: { ...teamChoices, discipline: "drag", dare: "homebuilt_relay", hardships: [] } });
    expect(drag.error).toBe("Homebuilt Relay is a Dirt Oval challenge");
    const oneYard = apply(state, { type: "reset", layer: "team", choices: { ...teamChoices, discipline: "dirt", dare: "parts_with_a_past", hardships: ["one_yard"] } });
    expect(oneYard.error).toContain("three different haul locations");
  });

  it("qualifies the same kart and frame, lets a later Fair win count, and banks once", () => {
    const state = newAttempt(createGame("relay"), "homebuilt_relay");
    const kart = addKart(state, "Blue Kart");
    const other = addKart(state, "Red Kart");
    race(state, kart, "dirt", 1);
    expect(decodeGameState(state)?.run.challenge.relay).toEqual([{ vehicleUid: kart.uid, frameUid: kart.parts.frame?.uid }]);
    race(state, kart, "county_fair", 2);
    other.parts.wheel!.partId = "wheel_kart";
    race(state, other, "county_fair", 3);
    kart.parts.wheel!.partId = "wheel_sport";
    const frame = kart.parts.frame!;
    kart.parts.frame = { ...frame, uid: "replacement" };
    race(state, kart, "county_fair", 4);
    expect(state.meta.challengeRecords).toEqual({});

    kart.parts.frame = frame;
    race(state, kart, "county_fair", 5);
    race(state, kart, "county_fair", 6);
    expect(state.run.featureWins.county_fair).toBe(2);
    expect(state.run.challenge.completedAt).toBe(5);
    expect(state.meta.challengeRecords.homebuilt_relay).toEqual({ completions: 1, bestSeasonMs: 5, bestVehicleName: kart.name });
    expect(decodeGameState(state)?.meta.challengeRecords).toEqual(state.meta.challengeRecords);
    expect(channel(state, "practice")).toBeCloseTo(1.05);

    const next = newAttempt(state, "homebuilt_relay");
    expect(next.run.challenge).toEqual({});
    expect(next.meta.challengeRecords).toEqual(state.meta.challengeRecords);
    expect(next.config.dare).toBe("homebuilt_relay");
  });

  it("counts distinct hauled origins, excludes purchases, and retains the fastest result", () => {
    let state = newAttempt(createGame("origins"), "parts_with_a_past");
    const kart = addKart(state, "Junkyard Special");
    kart.parts.fuel!.origin = CURB;
    kart.parts.wheel = { ...kart.parts.wheel!, partId: "wheel_kart", origin: "Parts counter" };
    kart.parts.body = { uid: "shell", partId: "beater_shell", condition: 4, origin: AUCTION };
    race(state, kart, "county_fair", 5);
    expect(state.meta.challengeRecords).toEqual({});

    delete kart.parts.body;
    kart.parts.wheel.origin = YARDS;
    race(state, kart, "county_fair", 10, { ...WIN, dnf: true });
    expect(state.meta.challengeRecords).toEqual({});
    race(state, kart, "county_fair", 15);
    for (const [index, at] of [20, 11, 25].entries()) {
      state = newAttempt(state, "parts_with_a_past");
      const next = addKart(state, `Kart ${index}`);
      next.parts.wheel = { ...next.parts.wheel!, partId: "wheel_kart", origin: YARDS };
      next.parts.fuel!.origin = CURB;
      race(state, next, "county_fair", at);
    }
    expect(state.meta.challengeRecords.parts_with_a_past).toEqual({ completions: 4, bestSeasonMs: 11, bestVehicleName: "Kart 1" });
    expect(channel(state, "haul_speed", { placeId: "junkyard" })).toBeCloseTo(1.15);
    expect(channel(state, "haul_speed", { placeId: "auction" })).toBe(1);
    expect(state.meta.daresCompleted).toEqual([]);
  });

  it("opens a Go-Kart-first route after three Relay clears and respects Rookie Plates", () => {
    let state = createGame("dirt-track-pass");
    for (let clear = 1; clear <= 3; clear += 1) {
      state = newAttempt(state, "homebuilt_relay");
      const kart = addKart(state, `Relay Kart ${clear}`);
      race(state, kart, "dirt", 1);
      kart.parts.wheel!.partId = "wheel_kart";
      race(state, kart, "county_fair", 2);
      expect(state.meta.perksUnlocked.includes("dirt_track_pass")).toBe(clear === 3);
    }
    const restored = decodeGameState(state);
    expect(restored?.meta.perksUnlocked).toContain("dirt_track_pass");

    const perks = ["dirt_track_pass", "borrowed_trailer"];
    const choices = { buy: perks, perks, tuneUp: { haul: 0, wrench: 0, build: 0, race: 0 }, dare: null, hardships: [] };
    const standard = must(state, { type: "reset", layer: "scrap", choices: { ...choices, buy: [], perks: [] } });
    const blocked = apply(standard, { type: "openPlace", knowhowId: "place:dirt" });
    expect(blocked.error).toBe("Own a Riding Mower");

    const trailerOnly = must(state, { type: "reset", layer: "scrap", choices: { ...choices, buy: ["borrowed_trailer"], perks: ["borrowed_trailer"] } });
    expect(apply(trailerOnly, { type: "openPlace", knowhowId: "place:junkyard" }).error).toBe("Needs 40 Rep");

    const reset = must(state, { type: "reset", layer: "scrap", choices });
    let withPass = decodeGameState(reset)!;
    expect(withPass.run.venuesOpen).toContain("dirt");
    expect(withPass.run.ladder.dirt).toEqual(["sprint"]);
    expect(withPass.run.vehicles).toEqual([]);
    expect(withPass.run.inventory).toEqual([]);
    expect(withPass.run.rep).toBe(0);
    expect(withPass.run.cash).toBe(0);
    expect(withPass.run.available).not.toContain("blueprint:go_kart");
    expect(channel(withPass, "practice")).toBeCloseTo(1.15);

    withPass = must(withPass, { type: "openPlace", knowhowId: "place:junkyard" });
    const slots = getVehicle("go_kart").slots.filter((slot) => slot.required);
    const partUids: Record<string, string> = {};
    const kitReady = (game: GameState) => slots.every((slot) => !!partUids[slot.slot]) && game.run.cash >= 305
      && game.run.materials.metal >= 6 && game.run.materials.rubber >= 2;
    for (let trips = 0; trips < 60 && !kitReady(withPass); trips += 1) {
      withPass = finishJob(withPass, { kind: "haul", placeId: "junkyard" });
      for (const slot of slots) {
        const best = withPass.run.inventory.filter((part) => part.condition > 0 && slot.accepts.includes(part.partId))
          .sort((a, b) => b.condition - a.condition)[0];
        if (best) partUids[slot.slot] = best.uid;
      }
      const spares = withPass.run.inventory.filter((part) => !Object.values(partUids).includes(part.uid));
      const sales: string[] = [];
      for (const part of spares) {
        const yield_ = stripYield(part);
        if ((withPass.run.materials.rubber < 2 && yield_.rubber) || (withPass.run.materials.metal < 6 && yield_.metal)) {
          withPass = finishJob(withPass, { kind: "strip", partUid: part.uid });
        } else {
          sales.push(part.uid);
        }
      }
      if (sales.length) withPass = must(withPass, { type: "sell", partUids: sales });
    }
    expect(kitReady(withPass)).toBe(true);
    expect(withPass.run.rep).toBe(0);
    expect(withPass.run.revealed).toEqual(expect.arrayContaining(["garage", "build", "tools", "materials"]));
    withPass = must(withPass, { type: "buyTool", toolId: "welder" });
    withPass = finishJob(withPass, { kind: "study", knowhowId: "tech:welding" });
    withPass = finishJob(withPass, { kind: "study", knowhowId: "blueprint:go_kart" });
    withPass = finishJob(withPass, { kind: "assemble", vehicleId: "go_kart", name: "First Kart", partUids });
    expect(withPass.run.vehicles.map((vehicle) => vehicle.vehicleId)).toEqual(["go_kart"]);
    expect(withPass.run.races).toEqual([]);
    expect(withPass.run.rep).toBe(0);
    expect(jobBlocker(withPass, { kind: "race", venueId: "dirt", event: "sprint", call: "push", vehicleUid: withPass.run.vehicles[0].uid }, true)).toBeNull();

    state.meta.stateWonEver = true;
    const rookie = must(state, { type: "reset", layer: "team", choices: {
      ...choices, hardships: ["rookie_plates"], teamName: "Rookie team", colors: ["#000", "#fff"], discipline: "dirt",
    } });
    expect(rookie.meta.perks.dirt_track_pass).toBe(1);
    expect(rookie.run.venuesOpen).toEqual(["backyard"]);
    expect(apply(rookie, { type: "openPlace", knowhowId: "place:junkyard" }).error).toBe("Own a Riding Mower");

    const oneYard = must(state, { type: "reset", layer: "team", choices: {
      ...choices, hardships: ["one_yard"], teamName: "One Yard team", colors: ["#000", "#fff"], discipline: "dirt",
    } });
    const onlyJunkyard = must(oneYard, { type: "openPlace", knowhowId: "place:junkyard" });
    expect(onlyJunkyard.run.placesOpen).toEqual(["curb", "junkyard"]);
    expect(apply(onlyJunkyard, { type: "openPlace", knowhowId: "place:yards" }).error).toContain("One Yard");
  });
});
