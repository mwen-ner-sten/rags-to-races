import { describe, expect, it } from "vitest";
import { decodeGameState } from "../../game/save";
import { haulOriginsOn } from "../challenges";
import { getVehicle } from "../content/vehicles";
import { carryFor } from "../haul";
import { apply, createGame, must } from "../index";
import { baseDuration } from "../jobs";
import { nextSeasonPerkSlots, perkSlots, type ScrapChoices } from "../layers";
import { salvageCarryCandidates } from "../salvageCarry";
import type { GameState, JobSpec, PartInstance, Vehicle } from "../types";

const CHOICES: ScrapChoices = { perks: ["night_owl"], tuneUp: { haul: 0, wrench: 0, build: 0, race: 0 }, dare: null, hardships: [] };
const ENGINE: PartInstance = { uid: "original-engine", partId: "engine_tiller", origin: "Curbside", condition: 2, protected: true };

function gameAtReset(seed = "salvage-carry") {
  const game = createGame(seed);
  game.run.featureWins.county_fair = 1000;
  game.run.seasonMs = 1000;
  game.meta.challengeRecords.parts_with_a_past = { completions: 1, bestSeasonMs: 1000, bestVehicleName: "Ditch Kart" };
  game.meta.perks = { night_owl: 1, tow_hitch: 1 };
  game.meta.codex.places.curb = 8;
  game.run.inventory.push({ ...ENGINE });
  return game;
}

function job(game: GameState, spec: JobSpec) {
  const queued = must(game, { type: "enqueue", spec });
  return must(queued, { type: "advance", ms: Math.ceil(baseDuration(game, spec)) });
}

function firstMower(game: GameState) {
  const [engineSlot, wheelSlot] = getVehicle("push_mower").slots;
  let trips = 0;
  while (trips < 20) {
    const engine = game.run.inventory.find((part) => engineSlot.accepts.includes(part.partId) && part.condition > 0);
    const wheel = game.run.inventory.find((part) => wheelSlot.accepts.includes(part.partId) && part.condition > 0);
    if (engine && wheel) {
      const ready = job(game, { kind: "assemble", vehicleId: "push_mower", name: "Opening mower", partUids: { engine: engine.uid, wheel: wheel.uid } });
      return { ready, trips };
    }
    if (game.run.inventory.length >= 10) {
      const spare = game.run.inventory.filter((part) => part !== engine && part !== wheel);
      game = must(game, { type: "sell", partUids: spare.map((part) => part.uid) });
    }
    game = job(game, { kind: "haul", placeId: "curb" });
    trips += 1;
  }
  throw new Error("No opening mower within 20 trips");
}

describe("salvage carryover", () => {
  it("uses one slot, retains installed wear and origin, and releases the slot the next standard Season", () => {
    const game = gameAtReset();
    const donor: Vehicle = { uid: "mower", vehicleId: "push_mower", name: "Donor", parts: { engine: game.run.inventory.pop()! }, tune: "balanced", history: { races: 0, wins: 0, dnfs: 0, bestFinish: null }, builtAtSeasonMs: 0 };
    game.run.vehicles.push(donor);
    expect(salvageCarryCandidates(game)[0].location).toBe("Donor · engine");
    const retained = { ...CHOICES, retainedPartUid: ENGINE.uid };
    expect(apply(game, { type: "reset", layer: "scrap", choices: { ...retained, perks: ["night_owl", "tow_hitch"] } }).error).toBe("Only 1 perk slot");
    const next = must(game, { type: "reset", layer: "scrap", choices: retained });
    expect(next.run.inventory).toEqual([{ ...ENGINE, inherited: true }]);
    expect(next.run.vehicles).toEqual([]);
    expect(perkSlots(next)).toBe(1);
    expect(nextSeasonPerkSlots(next)).toBe(2);
    expect(next.scrap.lp).toBe(12);
    const loaded = decodeGameState(next)!;
    expect(loaded.run.inventory).toEqual(next.run.inventory);
    expect(loaded.config.salvageSlot).toBe(true);
    loaded.run.featureWins.county_fair = 0;
    expect(apply(loaded, { type: "reset", layer: "scrap", choices: retained }).error).toMatch(/no longer eligible/);
    const standard = must(loaded, { type: "reset", layer: "scrap", choices: { ...CHOICES, perks: ["night_owl", "tow_hitch"] } });
    expect(standard.run.inventory).toEqual([]);
    expect(standard.config.salvageSlot).toBeUndefined();
    expect(perkSlots(standard)).toBe(2);
  });

  it("preserves old saves, rejects impossible carryovers and excludes the carried origin from a fresh challenge", () => {
    let game = gameAtReset();
    const retained = { ...CHOICES, retainedPartUid: ENGINE.uid };
    expect(decodeGameState(game)?.config.salvageSlot).toBeUndefined();
    const locked = structuredClone(game);
    locked.meta.challengeRecords = {};
    expect(apply(locked, { type: "reset", layer: "scrap", choices: retained }).error).toMatch(/Complete Parts With a Past/);
    const busy = must(game, { type: "enqueue", spec: { kind: "strip", partUid: ENGINE.uid } });
    expect(apply(busy, { type: "reset", layer: "scrap", choices: retained }).error).toMatch(/no longer eligible/);
    expect(apply(game, { type: "reset", layer: "scrap", choices: { ...retained, hardships: ["rookie_plates"] } }).error).toMatch(/Rookie Plates disables/);
    game.meta.stateWonEver = true;
    const team = { ...retained, teamName: "No crate", colors: ["#111", "#fff"] as [string, string], discipline: "dirt" as const };
    expect(apply(game, { type: "reset", layer: "team", choices: team }).error).toMatch(/only available on Scrap Reset/);
    game = must(game, { type: "reset", layer: "scrap", choices: retained });
    const carried = game.run.inventory[0];
    const car: Vehicle = { uid: "mower", vehicleId: "push_mower", name: "Carry", parts: { engine: carried }, tune: "balanced", history: { races: 0, wins: 0, dnfs: 0, bestFinish: null }, builtAtSeasonMs: 0 };
    expect(haulOriginsOn(car)).toEqual([]);
    expect(decodeGameState({ ...game, config: { ...game.config, salvageSlot: undefined } })).toBeNull();
  });

  it("runs both openings through real Curbside hauling and first mower assembly", () => {
    for (let seed = 0; seed < 8; seed += 1) {
      const start = gameAtReset(`salvage-opening-${seed}`);
      const full = must(start, { type: "reset", layer: "scrap", choices: { ...CHOICES, perks: ["night_owl", "tow_hitch"] } });
      const crate = must(start, { type: "reset", layer: "scrap", choices: { ...CHOICES, retainedPartUid: ENGINE.uid } });
      const standard = firstMower(full);
      const inherited = firstMower(crate);
      expect(carryFor(full)).toBe(4);
      expect(carryFor(crate)).toBe(2);
      expect(standard.ready.run.vehicles[0].parts.engine?.inherited).toBeUndefined();
      expect(inherited.ready.run.vehicles[0].parts.engine).toEqual({ ...ENGINE, inherited: true });
      expect(inherited.ready.run.rep).toBe(0);
      expect(inherited.ready.run.races).toEqual([]);
    }
  });
});
