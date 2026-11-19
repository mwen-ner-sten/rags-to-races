import { must } from "../../src/core";
import { getVehicle } from "../../src/core/content/vehicles";
import { BATON_PART } from "../../src/core/countyBaton";
import type { GameState, PartInstance } from "../../src/core/types";
import { racer } from "./rewrite";

export const HOUR = 3_600_000;

function addCar(game: GameState, model: string, uid: string) {
  const car = racer(uid, model).run.vehicles[0];
  car.uid = uid;
  car.name = getVehicle(model).name + " " + uid;
  for (const part of Object.values(car.parts)) if (part) part.uid = `${uid}-${part.uid}`;
  game.run.vehicles.push(car);
  return car;
}

export function pendingCustomerRepair(game = racer()): GameState {
  const wheel: PartInstance = { uid: "customer-wheel", partId: "wheel_basic", condition: 1, origin: "Curbside" };
  game.run.revealed.push("garage", "bench");
  game.run.inventory.push(wheel);
  game = must(game, { type: "service", move: { type: "register", client: "marina", partUid: wheel.uid } });
  return must(game, { type: "enqueue", spec: { kind: "clean", partUid: wheel.uid } });
}

export function pendingDepotAndRepair(): GameState {
  let game = racer("county-workshop-away", "riding_mower");
  const wheel = { client: "marina", partId: "wheel_basic", partUid: "first-invoice", condition: 2, origin: "Curbside" } as const;
  const engine = { client: "orchard", partId: "engine_lawn", partUid: "second-invoice", condition: 3, origin: "Curbside" } as const;
  game.meta.serviceReferences = { equipment: { tool: "parts_washer", season: 1, invoice: wheel }, referral: { season: 2, invoice: engine } };
  game.meta.seasonsPlayed = 2;
  game.run.serviceBook = { invoices: [
    { ...wheel, partUid: "current-wheel-invoice" },
    { ...engine, partUid: "current-engine-invoice" },
    { client: "courier", partId: "fuel_tank_small", partUid: "current-tank-invoice", condition: 3, origin: "Curbside" },
  ] };
  const hauler = game.run.vehicles[0];
  addCar(game, "riding_mower", "second-hauler");
  game.run.inventory.push({ uid: "depot-tender", partId: "wheel_basic", condition: 2, origin: "Curbside" });
  game = must(game, { type: "motorPool", move: { type: "lodge", vehicleUid: hauler.uid } });
  game = must(game, { type: "motorPool", move: { type: "book", route: "ramp", tenderUid: "depot-tender" } });
  game = must(game, { type: "reset", layer: "shop", choices: { ...game.config, shopLegacy: { type: "client", client: "orchard" } } });
  return pendingCustomerRepair(game);
}

export function pendingWorksFinal(): GameState {
  let game = racer("maker-redwheel", "go_kart");
  const car = game.run.vehicles[0];
  car.name = "Copper Comet";
  const setup = { engine: "engine_twin", wheel: "wheel_sport", drivetrain: "drive_chain", exhaust: "exhaust_glasspack" };
  for (const [slot, partId] of Object.entries(setup)) car.parts[slot]!.partId = partId;
  game.run.venuesOpen.push("dirt", "county_fair");
  game.run.ladder.dirt = ["sprint", "heat", "feature"];
  game.run.ladder.county_fair = ["sprint", "heat", "feature"];
  const scout = addCar(game, "beater_car", "works-scout");
  scout.parts.engine!.partId = "engine_turbo4";
  scout.parts.frame!.partId = "frame_tube";
  scout.parts.wheel!.partId = "wheel_sport";
  game = must(game, { type: "enqueue", spec: { kind: "race", venueId: "county_fair", event: "feature", vehicleUid: scout.uid, call: "nurse" } });
  game = must(game, { type: "advance", ms: HOUR });
  game = must(game, { type: "works", move: { type: "sign", family: "redwheel", vehicleUid: car.uid } });
  game = must(game, { type: "works", move: { type: "enter" } });
  game = must(game, { type: "advance", ms: HOUR });
  return must(game, { type: "works", move: { type: "enter" } });
}

export function pendingHeritage(kind: "exhibit" | "special"): GameState {
  let game = racer("heritage-start");
  const baseline = addCar(game, "push_mower", "old-lawn-car");
  const sprint = { kind: "race", venueId: "backyard", event: "sprint", call: "nurse", vehicleUid: baseline.uid } as const;
  game = must(game, { type: "enqueue", spec: sprint });
  game = must(game, { type: "advance", ms: HOUR });
  game.run.featureWins.county_fair = game.run.seasonMs;
  game = must(game, { type: "reset", layer: "scrap", choices: game.config });
  game.run.revealed.push("garage");
  game.run.cash = 100;
  game.run.materials.metal = 1;
  game.run.materials.rubber = 1;
  addCar(game, "push_mower", "another-mower");
  const car = addCar(game, "push_mower", "museum-mower");
  car.name = "Meadow II";
  const archiveIndex = game.meta.hallOfFame.findIndex((entry) => entry.name === baseline.name);
  game = must(game, { type: "heritage", move: { type: "start", kind, archiveIndex } });
  if (kind === "special") game.run.vehicles.find((v) => v.uid === car.uid)!.parts.wheel!.partId = "wheel_knobby";
  game.run.ladder.backyard = ["sprint", "heat", "feature"];
  return must(game, { type: "enqueue", spec: { ...sprint, event: kind === "exhibit" ? "sprint" : "feature", vehicleUid: car.uid } });
}

export function pendingBaton(leg: "qualify" | "deliver"): GameState {
  let game = racer("baton-away-setup");
  game.meta.knowhow["tech:scouting"] = 1;
  game.meta.codex.places = { curb: 8, floodplain: 4, junkyard: 3 };
  game.meta.challengeRecords.parts_with_a_past = { completions: 2, bestSeasonMs: 1, bestVehicleName: "Parts racer" };
  game.run.featureWins.county_fair = 0;
  game = must(game, { type: "reset", layer: "scrap", choices: { ...game.config, countyBaton: "start", homeCounty: "river" } });
  game.run.cash = 100;
  const kart = addCar(game, "go_kart", "baton-kart");
  kart.parts.engine!.partId = "engine_v4";
  kart.parts.wheel = { uid: "baton-tire", partId: BATON_PART.river, condition: 4, origin: "Floodplain Lots",
    provenance: { placeId: "floodplain", county: "river", season: game.meta.seasonsPlayed + 1 } };
  game.run.venuesOpen.push("dirt");
  game.run.ladder.dirt = ["sprint", "heat", "feature"];
  game = must(game, { type: "enqueue", spec: { kind: "race", vehicleUid: kart.uid, venueId: "dirt", event: "feature", call: "nurse" } });
  if (leg === "qualify") return game;
  game = must(game, { type: "advance", ms: HOUR });
  game.run.featureWins.county_fair = game.run.seasonMs;
  game = must(game, { type: "reset", layer: "scrap", choices: { ...game.config, countyBaton: "carry", homeCounty: "quarry", retainedPartUid: "baton-tire" } });
  game.run.cash = 100;
  const beater = addCar(game, "beater_car", "baton-beater");
  beater.parts.engine!.partId = "engine_v6";
  game = must(game, { type: "install", vehicleUid: beater.uid, slot: "wheel", partUid: "baton-tire" });
  game.run.venuesOpen.push("county_fair");
  game.run.ladder.county_fair = ["sprint", "heat", "feature"];
  return must(game, { type: "enqueue", spec: { kind: "race", vehicleUid: beater.uid, venueId: "county_fair", event: "feature", call: "nurse" } });
}
