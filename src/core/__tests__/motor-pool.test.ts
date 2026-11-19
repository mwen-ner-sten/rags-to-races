import { describe, expect, it } from "vitest";
import { decodeGameState } from "@/game/save";
import { apply, must } from "../actions";
import { getVehicle } from "../content/vehicles";
import { garageSpace } from "../garage";
import { motorDuration, motorLodgeBlocker, motorPoolVisible, type MotorPoolMove } from "../motorPool";
import { TEAM_LAYER, teamAward, type ScrapChoices, type TeamChoices } from "../layers";
import { nextUid } from "../rng";
import { initialConfig, newGame } from "../state";
import type { GameState, PartInstance, Vehicle } from "../types";
import { vehicleForReplay } from "../vehicleArchive";

const HOUR = 3_600_000;
const teamChoices = { ...initialConfig(), teamName: "County Garage", colors: ["#777", "#eee"], discipline: "dirt", organization: "collective" } satisfies TeamChoices;
const shopChoices = { ...initialConfig(), shopLegacy: { type: "client", client: "orchard" } } satisfies ScrapChoices;

function loose(game: GameState, partId: string, condition: PartInstance["condition"] = 2): PartInstance {
  const part = { uid: nextUid(game, "p"), partId, condition, origin: "Curbside" };
  game.run.inventory.push(part);
  return part;
}

function vehicle(game: GameState, vehicleId: string): Vehicle {
  const rig: Vehicle = {
    uid: nextUid(game, "v"), vehicleId, name: vehicleId === "beater_car" ? "Pump Truck" : "Service Mule", tune: "balanced", builtAtSeasonMs: 0,
    history: { races: 6, wins: 2, dnfs: 1, bestFinish: 1 },
    parts: Object.fromEntries(getVehicle(vehicleId).slots.filter(({ required }) => required).map(({ slot, accepts }) => [
      slot, { uid: nextUid(game, "p"), partId: accepts[0], condition: 3, origin: "Curbside" },
    ])),
  };
  game.run.vehicles.push(rig);
  return rig;
}

function ready(single = false): GameState {
  const game = newGame("depot-regression");
  game.meta.seasonsPlayed = 2;
  const wheel = { client: "marina", partId: "wheel_basic", partUid: nextUid(game, "p"), condition: 2, origin: "Curbside" } as const;
  const engine = { client: "orchard", partId: "engine_lawn", partUid: nextUid(game, "p"), condition: 3, origin: "Curbside" } as const;
  const tank = { client: "courier", partId: "fuel_tank_small", partUid: nextUid(game, "p"), condition: 3, origin: "Curbside" } as const;
  game.meta.serviceReferences = { equipment: { tool: "parts_washer", season: 1, invoice: wheel }, referral: { season: 2, invoice: engine } };
  game.run.serviceBook = { invoices: [
    { ...wheel, partUid: nextUid(game, "p") }, { ...engine, partUid: nextUid(game, "p") }, tank,
  ] };
  game.run.cash = 100;
  vehicle(game, "riding_mower");
  if (!single) vehicle(game, "beater_car");
  return game;
}

const move = (game: GameState, choice: MotorPoolMove) => must(game, { type: "motorPool", move: choice });
const parsed = (game: GameState) => decodeGameState(JSON.parse(JSON.stringify(game)));

describe("County Motor Pool", () => {
  it("needs the service gate and removes a real rig, releases race habits and preserves replay lookup", () => {
    const game = ready(true);
    const rig = game.run.vehicles[0];
    game.run.habitSlots[0] = `race:${rig.uid}:dirt:sprint:nurse`;
    const revoked = structuredClone(game);
    delete revoked.meta.serviceReferences;
    expect(motorPoolVisible(revoked)).toBe(false);
    expect(motorLodgeBlocker(revoked, rig.uid)).toMatch(/both service references/);
    const lodged = move(game, { type: "lodge", vehicleUid: rig.uid });
    expect(lodged.run.vehicles).toEqual([]);
    expect(lodged.motorPool?.custody?.rig).toEqual(rig);
    expect(lodged.run.habitSlots.some((habit) => habit?.includes(rig.uid))).toBe(false);
    expect(vehicleForReplay(lodged, rig.uid)).toEqual(rig);
    expect(parsed(lodged)).not.toBeNull();
  });

  it("consumes specific tender and a fee, and settles the same physical reward live and offline", () => {
    let game = ready();
    const tender = loose(game, "wheel_basic");
    const engine = loose(game, "engine_lawn");
    game = move(game, { type: "lodge", vehicleUid: game.run.vehicles[0].uid });
    game = move(game, { type: "book", route: "ramp", tenderUid: tender.uid });
    const booked = game.motorPool!.job!;
    expect(game.run.cash).toBe(95);
    expect(game.run.inventory.some(({ uid }) => uid === tender.uid)).toBe(false);
    expect(game.motorPool?.job?.tender).toEqual(tender);
    expect(game.motorPool?.claim).toBeNull();
    expect(apply(game, { type: "motorPool", move: { type: "book", route: "pump", tenderUid: engine.uid } }).error).toMatch(/active run/);
    const halftime = must(game, { type: "advance", ms: booked.duration - 1 });
    expect(halftime.motorPool?.job?.remaining).toBe(1);
    const split = must(parsed(halftime)!, { type: "advance", ms: 1 });
    const away = must(game, { type: "advance", ms: booked.duration + HOUR, away: true });
    expect(split.motorPool).toEqual(away.motorPool);
    expect(away.motorPool?.claim?.part).toMatchObject({ uid: booked.part.uid, partId: "frame_kart", condition: 2 });
    expect(away.motorPool?.custody?.rig.parts.wheel?.condition).toBe(2);
    expect(away.run.cash).toBe(game.run.cash);
    expect(away.run.stats.hauls).toBe(game.run.stats.hauls);
    game = move(away, { type: "claim" });
    expect(game.run.inventory.find(({ uid }) => uid === booked.part.uid)).toEqual(booked.part);
    expect(apply(game, { type: "motorPool", move: { type: "claim" } }).error).toMatch(/no stock/i);
    expect(apply(game, { type: "motorPool", move: { type: "book", route: "ramp", tenderUid: tender.uid } }).error).toMatch(/booking this Season/);
  });

  it("uses actual equipment, swaps one physical part, and returns the exact rig only after both receipts", () => {
    let game = ready();
    const original = game.run.vehicles[0];
    const oldWheel = original.parts.wheel!;
    const newWheel = loose(game, "wheel_kart", 4);
    const engine = loose(game, "engine_lawn");
    game = move(game, { type: "lodge", vehicleUid: original.uid });
    const duration = motorDuration(game.motorPool!.custody!.rig, "ramp");
    game = move(game, { type: "fit", slot: "wheel", partUid: newWheel.uid });
    expect(game.motorPool?.custody?.rig.parts.wheel?.uid).toBe(newWheel.uid);
    expect(game.run.inventory.find(({ uid }) => uid === oldWheel.uid)).toEqual(oldWheel);
    expect(motorDuration(game.motorPool!.custody!.rig, "ramp")).toBeLessThan(duration);
    game = move(game, { type: "book", route: "ramp", tenderUid: oldWheel.uid });
    expect(apply(game, { type: "motorPool", move: { type: "fit", slot: "engine", partUid: engine.uid } }).error).toMatch(/cannot swap/);
    game = move(must(game, { type: "advance", ms: HOUR }), { type: "claim" });
    expect(apply(game, { type: "motorPool", move: { type: "reclaim" } }).error).toMatch(/both depot routes/);
    game = move(must(move(game, { type: "book", route: "pump", tenderUid: engine.uid }), { type: "advance", ms: HOUR }), { type: "claim" });
    game = move(game, { type: "reclaim" });
    expect(game.run.vehicles.filter(({ uid }) => uid === original.uid)).toHaveLength(1);
    expect(game.run.vehicles.find(({ uid }) => uid === original.uid)).toMatchObject({ history: original.history, parts: {
      wheel: { uid: newWheel.uid, condition: 3 }, engine: { uid: original.parts.engine!.uid, condition: 2 },
    } });
    expect(game.motorPool?.custody).toBeNull();
    expect(motorLodgeBlocker(game, original.uid)).toMatch(/one rig per Season/);
    expect(parsed(game)).not.toBeNull();
  });

  it.each(["shop", "scrap", "team"] as const)("keeps a pending run and its payment across a %s reset", (layer) => {
    let game = ready();
    game.run.featureWins.county_fair = 0;
    const original = game.run.vehicles[0];
    const wheel = loose(game, "wheel_basic");
    game = move(game, { type: "lodge", vehicleUid: original.uid });
    game = move(game, { type: "book", route: "ramp", tenderUid: wheel.uid });
    const booking = game.motorPool!.job;
    game = must(game, { type: "cancelJob", jobId: booking!.part.uid });
    expect(game.motorPool?.job).toEqual(booking);
    expect(game.run.inventory).not.toContainEqual(wheel);
    const choices = layer === "shop" ? shopChoices : layer === "team" ? teamChoices : initialConfig();
    game = must(game, { type: "reset", layer, choices });
    expect(game.motorPool?.job).toEqual(booking);
    expect(game.run.vehicles.some(({ uid }) => uid === original.uid)).toBe(false);
    expect(game.run.inventory.some(({ uid }) => uid === wheel.uid)).toBe(false);
    expect(parsed(game)).not.toBeNull();
    game = must(game, { type: "advance", ms: HOUR, away: true });
    expect(game.motorPool?.claim?.part.uid).toBe(booking!.part.uid);
    game = move(game, { type: "claim" });
    expect(game.run.inventory.some(({ uid }) => uid === booking!.part.uid)).toBe(true);
  });

  it("earns Collective founding and four extra Team Points from real collected depot receipts", () => {
    let game = ready();
    const wheel = loose(game, "wheel_basic");
    game = move(game, { type: "lodge", vehicleUid: game.run.vehicles[0].uid });
    game = move(game, { type: "book", route: "ramp", tenderUid: wheel.uid });
    game = must(game, { type: "reset", layer: "shop", choices: shopChoices });
    expect(TEAM_LAYER.gate(game).ok).toBe(false);
    game = move(must(game, { type: "advance", ms: HOUR, away: true }), { type: "claim" });
    expect(TEAM_LAYER.gate(game).ok).toBe(false);
    const bank = teamAward(game);
    game.run.cash = 20;
    const engine = loose(game, "engine_lawn");
    game = move(game, { type: "book", route: "pump", tenderUid: engine.uid });
    game = must(game, { type: "advance", ms: HOUR });
    expect(TEAM_LAYER.gate(game).ok).toBe(false);
    game = move(game, { type: "claim" });
    expect(game.run.depotReceipts).toEqual(["ramp", "pump"]);
    expect(TEAM_LAYER.gate(game).ok).toBe(true);
    expect(teamAward(game)).toBe(bank + 4);
    expect(parsed(game)).not.toBeNull();
    const founded = must(game, { type: "reset", layer: "team", choices: teamChoices });
    expect(founded.era?.organization).toBe("collective");
    expect(founded.team.tp).toBe(bank + 4);
    expect(founded.run.depotReceipts).toBeUndefined();
    expect(founded.motorPool?.custody).toEqual(game.motorPool?.custody);
    expect(parsed(founded)).not.toBeNull();
  });

  it("blocks busy rigs and temporary stock, rejects duplicate custody, and keeps a queued claim when storage is full", () => {
    let game = ready();
    const rig = game.run.vehicles[0];
    const busy = structuredClone(game);
    busy.run.raceNight = { vehicleUid: rig.uid, venueId: "dirt", call: "nurse", startsLeft: 2, stopOnFeature: true };
    expect(motorLodgeBlocker(busy, rig.uid)).toMatch(/race bookings/);
    const borrowed = structuredClone(game);
    borrowed.run.vehicles[0].parts.wheel!.origin = "Tight Infield Workshop Loan";
    expect(motorLodgeBlocker(borrowed, rig.uid)).toMatch(/loaned parts/);
    const tender = loose(game, "wheel_basic");
    game = move(game, { type: "lodge", vehicleUid: rig.uid });
    game = move(game, { type: "book", route: "ramp", tenderUid: tender.uid });
    const duplicate = structuredClone(game);
    duplicate.run.inventory.push(tender);
    expect(parsed(duplicate)).toBeNull();
    duplicate.run.vehicles.push(rig);
    expect(parsed(duplicate)).toBeNull();
    game = must(game, { type: "advance", ms: HOUR });
    while (game.run.inventory.length < garageSpace(game)) loose(game, "wheel_basic");
    expect(apply(game, { type: "motorPool", move: { type: "claim" } }).error).toMatch(/Free a garage slot/);
    expect(game.motorPool?.claim).toBeDefined();
  });

  it("holds the same return through a reset when its owner had no space to collect it", () => {
    let game = ready();
    game.run.featureWins.county_fair = 0;
    const tender = loose(game, "wheel_basic");
    game = move(game, { type: "lodge", vehicleUid: game.run.vehicles[0].uid });
    game = move(game, { type: "book", route: "ramp", tenderUid: tender.uid });
    game = must(game, { type: "advance", ms: HOUR });
    const claim = game.motorPool?.claim;
    while (game.run.inventory.length < garageSpace(game)) loose(game, "wheel_basic");
    expect(apply(game, { type: "motorPool", move: { type: "claim" } }).error).toMatch(/Free a garage slot/);
    game = must(game, { type: "reset", layer: "team", choices: teamChoices });
    expect(parsed(game)?.motorPool?.claim).toEqual(claim);
    expect(game.run.depotReceipts).toBeUndefined();
    game = move(game, { type: "claim" });
    expect(game.run.inventory.filter(({ uid }) => uid === claim?.part.uid)).toHaveLength(1);
    expect(game.run.inventory.some(({ uid }) => uid === tender.uid)).toBe(false);
    expect(game.run.depotReceipts).toEqual(["ramp"]);
  });
});
