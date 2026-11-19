import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { decodeGameState } from "../../game/save";
import { racer } from "../../../tests/fixtures/rewrite";
import { batonRaceSetup, batonTransferBlocker, FREIGHT_COST } from "../countyBaton";
import { getPlace } from "../content/places";
import { stowFinds } from "../garage";
import { apply, createGame, must } from "../index";
import { nextSeasonPerkSlots, perkSlots, scrapAward, type ScrapChoices } from "../layers";
import { settleRace } from "../race";
import type { GameState, PartInstance, RaceRoll, Vehicle } from "../types";
import { setExperimentalCareers } from "../features";

// These systems are experimental and off by default; switch them on for this file only.
beforeEach(() => setExperimentalCareers(true));
afterEach(() => setExperimentalCareers(false));

const STANDARD = { perks: [], tuneUp: { haul: 0, wrench: 0, build: 0, race: 0 }, dare: null, hardships: [] } satisfies ScrapChoices;
const WIN: RaceRoll = {
  position: 1, fieldSize: 6, dnf: false, margin: 1, rivalBeaten: true,
  weakestSlot: null, wearSteps: {}, laps: 1, durationMs: 60_000, beats: [],
};

function ready() {
  const state = createGame("baton-test");
  state.run.featureWins.county_fair = 0;
  state.meta.knowhow["tech:scouting"] = 1;
  state.meta.codex.places = { curb: 1, yards: 1, junkyard: 1 };
  state.meta.challengeRecords.parts_with_a_past = { completions: 2, bestSeasonMs: 1, bestVehicleName: "Past winner" };
  return state;
}

function reset(state: GameState, choices: ScrapChoices): GameState {
  return must(state, { type: "reset", layer: "scrap", choices });
}

function tire(uid: string, season: number): PartInstance {
  return { uid, partId: "wheel_river", condition: 2, origin: getPlace("floodplain").name, provenance: { county: "river", placeId: "floodplain", season } };
}

function car(state: GameState, model: string, part: PartInstance): Vehicle {
  const vehicle: Vehicle = {
    uid: model, vehicleId: model, name: model, tune: "balanced", builtAtSeasonMs: 0,
    history: { races: 0, wins: 0, dnfs: 0, bestFinish: null }, parts: { wheel: part },
  };
  state.run.vehicles.push(vehicle);
  return vehicle;
}

function win(state: GameState, vehicle: Vehicle, venueId: string, at: number) {
  state.run.seasonMs = at;
  settleRace(state, { kind: "race", vehicleUid: vehicle.uid, venueId, event: "feature", call: "push" }, WIN);
}

describe("County Baton", () => {
  it("qualifies fresh local salvage, delivers the exact physical part and banks a county permit once", () => {
    const checkpoint = ready();
    const request = { ...STANDARD, countyBaton: "start", homeCounty: "river" } as const;
    const locked = structuredClone(checkpoint);
    locked.meta.challengeRecords.parts_with_a_past!.completions = 1;
    expect(apply(locked, { type: "reset", layer: "scrap", choices: { ...request } }).error).toContain("Complete Parts With a Past twice");
    expect(apply(checkpoint, { type: "reset", layer: "scrap", choices: { ...request, dare: "parts_with_a_past" } }).error).toContain("or another Season objective");
    const tracker = reset(checkpoint, { ...request });
    const season = tracker.meta.seasonsPlayed + 1;
    const kart = car(tracker, "go_kart", tire("old", season - 1));
    win(tracker, kart, "dirt", 2);
    expect(tracker.run.countyBaton).toEqual({ leg: "qualify", from: "river" });
    const baton = tire("baton", season);
    kart.parts.wheel = baton;
    win(tracker, kart, "dirt", 3);
    win(tracker, kart, "county_fair", 5);
    const transfer = { ...STANDARD, countyBaton: "carry", homeCounty: "quarry", retainedPartUid: baton.uid } as const;
    expect(apply(tracker, { type: "reset", layer: "scrap", choices: { ...transfer, homeCounty: "river" } }).error).toContain("Quarry County");
    expect(apply(tracker, { type: "reset", layer: "scrap", choices: { ...transfer, retainedPartUid: "other" } }).error).toContain("same physical part");
    expect(apply(tracker, { type: "reset", layer: "scrap", choices: { ...transfer, countyFreight: true } }).error).toContain("ordinary one-slot crate");
    const abandoned = reset(tracker, { ...STANDARD, dare: "parts_with_a_past" });
    expect(abandoned.run.countyBaton).toBeUndefined();
    expect(abandoned.config.dare).toBe("parts_with_a_past");
    expect(abandoned.meta.challengeRecords.parts_with_a_past?.completions).toBe(2);
    const incoming = reset(decodeGameState(tracker)!, { ...transfer });
    expect(incoming.run.inventory).toContainEqual({ ...baton, inherited: true });
    expect(incoming.config.salvageSlot).toBe(true);
    expect(perkSlots(incoming)).toBe(nextSeasonPerkSlots(tracker, true));
    const corrupted = structuredClone(incoming);
    corrupted.run.inventory[0].uid = "substitute";
    expect(decodeGameState(corrupted)).toBeNull();
    const lost = structuredClone(incoming);
    lost.run.inventory = [];
    expect(decodeGameState(lost)?.run.countyBaton?.leg).toBe("deliver");
    const beater = car(incoming, "beater_car", tire("other", season));
    win(incoming, beater, "county_fair", 6);
    expect(incoming.meta.countyFreight).toBeUndefined();
    const inherited = incoming.run.inventory.pop()!;
    const laterKart = car(incoming, "go_kart", inherited);
    win(incoming, laterKart, "county_fair", 7);
    expect(incoming.meta.countyFreight).toBeUndefined();
    delete laterKart.parts.wheel;
    beater.parts.wheel = inherited;
    win(incoming, beater, "county_fair", 8);
    win(incoming, beater, "county_fair", 9);
    expect(incoming.meta.countyFreight).toEqual({ quarry: 1 });
    expect(decodeGameState(incoming)?.run.countyBaton).toMatchObject({ leg: "deliver", completedAt: 8 });
    const standard = reset(incoming, { ...STANDARD, dare: "parts_with_a_past" });
    expect(standard.run.countyBaton).toBeUndefined();
    expect(standard.config.dare).toBe("parts_with_a_past");
    expect(standard.meta.countyFreight).toEqual({ quarry: 1 });
  });

  it("spends the exact freight fee instead of a perk slot, with no way to carry it twice", () => {
    const state = ready();
    state.config.homeCounty = "river";
    state.meta.countyFreight = { quarry: 1 };
    const part = tire("freight", 1);
    state.run.inventory.push(part);
    const crate = { ...STANDARD, homeCounty: "quarry", retainedPartUid: part.uid } satisfies ScrapChoices;
    const fee = { ...crate, countyFreight: true } satisfies ScrapChoices;
    const normal = reset(state, crate);
    const freight = reset(state, fee);
    expect(freight.scrap.lp).toBe(state.scrap.lp + scrapAward(state) - FREIGHT_COST);
    expect(freight.scrap.lifetimeLp).toBe(normal.scrap.lifetimeLp);
    expect(perkSlots(freight)).toBe(perkSlots(normal) + 1);
    expect(freight.run.inventory).toEqual(normal.run.inventory);
    expect(decodeGameState(freight)?.config.countyFreight).toBe(true);
    expect(apply(state, { type: "reset", layer: "scrap", choices: { ...fee, homeCounty: "river" } }).error).toContain("foreign county component");
    expect(apply(state, { type: "reset", layer: "scrap", choices: { ...fee, hardships: ["rookie_plates"] } }).error).toContain("Rookie Plates");
    freight.run.featureWins.county_fair = 10;
    expect(apply(freight, { type: "reset", layer: "scrap", choices: fee }).error).toContain("foreign county component");
  });

  it("protects only the exact opted-in physical part, including away sorting and reset transfer", () => {
    let state = reset(ready(), { ...STANDARD, countyBaton: "start", homeCounty: "river" });
    const baton = tire("guarded", state.meta.seasonsPlayed + 1);
    const standIn = tire("stand-in", state.meta.seasonsPlayed + 1);
    const kart = car(state, "go_kart", baton);
    win(state, kart, "dirt", 1);
    win(state, kart, "county_fair", 2);
    state.run.inventory.push(standIn);
    expect(apply(state, { type: "guardBaton", partUid: standIn.uid, keep: true }).error).toContain("qualifying Feature");
    state = must(state, { type: "guardBaton", partUid: baton.uid, keep: true });
    const clone = structuredClone(state);
    clone.run.inventory = [clone.run.vehicles[0].parts.wheel!];
    clone.run.vehicles[0].parts.wheel = standIn;
    win(clone, clone.run.vehicles[0], "dirt", 3);
    expect(clone.run.countyBaton?.qualified?.uid).toBe(baton.uid);
    state = must(state, { type: "uninstall", vehicleUid: kart.uid, slot: "wheel" });
    expect(state.run.inventory.find((part) => part.uid === baton.uid)?.batonGuard).toBe(true);
    expect(apply(state, { type: "sell", partUids: [baton.uid, standIn.uid] }).error).toContain("Release County Baton protection");
    expect(apply(state, { type: "enqueue", spec: { kind: "strip", partUid: baton.uid } }).error).toContain("Release County Baton protection");
    const guarded = state.run.inventory.find((part) => part.uid === baton.uid)!;
    state.run.inventory = Array.from({ length: 30 }, (_, index) => tire(`stored-${index}`, state.meta.seasonsPlayed + 1));
    state.run.driveway.push(guarded);
    stowFinds(state, Array.from({ length: 9 }, (_, index) => tire(`new-${index}`, state.meta.seasonsPlayed + 1)));
    expect(state.run.driveway.some((part) => part.uid === baton.uid)).toBe(true);
    const transfer = reset(decodeGameState(state)!, { ...STANDARD, countyBaton: "carry", homeCounty: "quarry", retainedPartUid: baton.uid });
    expect(decodeGameState(transfer)?.run.inventory[0]).toMatchObject({ uid: baton.uid, batonGuard: true, inherited: true });
    const abandoned = reset(state, { ...STANDARD, homeCounty: "quarry", retainedPartUid: baton.uid });
    expect(abandoned.run.inventory[0].batonGuard).toBeUndefined();
    const released = must(transfer, { type: "guardBaton", partUid: baton.uid, keep: false });
    expect(must(released, { type: "sell", partUids: [baton.uid] }).run.inventory).toHaveLength(0);
  });

  it("reports queued work, driveway storage and missing parts instead of an ambiguous disabled transfer", () => {
    const state = reset(ready(), { ...STANDARD, countyBaton: "start", homeCounty: "river" });
    const baton = tire("find-me", state.meta.seasonsPlayed + 1);
    const kart = car(state, "go_kart", baton);
    win(state, kart, "dirt", 1);
    win(state, kart, "county_fair", 2);
    delete kart.parts.wheel;
    expect(batonTransferBlocker(state, baton.uid)).toContain("missing");
    state.run.driveway.push(baton);
    state.run.queue.push({ kind: "strip", partUid: baton.uid });
    expect(batonTransferBlocker(state, baton.uid)).toContain("queued work");
    state.run.queue = [];
    const delivery = reset(state, { ...STANDARD, countyBaton: "carry", homeCounty: "quarry", retainedPartUid: baton.uid });
    const beater = car(delivery, "beater_car", tire("substitute", 1));
    delivery.run.driveway.push(delivery.run.inventory.pop()!);
    expect(batonRaceSetup(delivery, "county_fair", beater)?.text).toContain("Swap the transferred baton in from the driveway");
    beater.parts.wheel = delivery.run.driveway.pop()!;
    expect(batonRaceSetup(delivery, "county_fair", beater)?.ready).toBe(true);
    expect(batonRaceSetup(delivery, "county_fair", beater, true)?.ready).toBe(false);
  });

  it("requires pulling or releasing a safeguarded baton before a matching museum donation", () => {
    const checkpoint = ready();
    checkpoint.config.homeCounty = "river";
    const original = racer("museum-original", "go_kart").run.vehicles[0];
    original.parts.wheel = tire("museum-original-tire", 1);
    checkpoint.run.vehicles.push(original);
    win(checkpoint, original, "county_fair", 1);
    let state = reset(checkpoint, { ...STANDARD, countyBaton: "start", homeCounty: "river" });
    const replica = racer("museum-replica", "go_kart").run.vehicles[0];
    replica.parts.wheel = tire("museum-new-tire", state.meta.seasonsPlayed + 1);
    state.run.vehicles.push(replica);
    win(state, replica, "dirt", 2);
    state = must(state, { type: "heritage", move: { type: "start", kind: "exhibit", archiveIndex: 0 } });
    state = must(state, { type: "guardBaton", partUid: replica.parts.wheel.uid, keep: true });
    const donation = { type: "heritage", move: { type: "donate", vehicleUid: replica.uid } } as const;
    expect(apply(state, donation).error).toContain("Pull the safeguarded County Baton part");
    expect(decodeGameState(state)?.run.vehicles[0].parts.wheel?.batonGuard).toBe(true);
    const released = must(state, { type: "guardBaton", partUid: replica.parts.wheel.uid, keep: false });
    expect(must(released, donation).run.heritageProject?.completed).toBe(replica.name);
  });
});
