/** Continue the action-only customer career through depot deliveries and Runabout assembly. */
import { readFileSync } from "node:fs";
import { must } from "../src/core";
import { counterBlocker } from "../src/core/actions";
import { blueprintPlan } from "../src/core/buildPlanning";
import { getPart, STRIP_YIELD } from "../src/core/content/parts";
import { getVehicle } from "../src/core/content/vehicles";
import { garageSpace, vehicleStats } from "../src/core/garage";
import { carryFor } from "../src/core/haul";
import { nextEventInMs } from "../src/core/jobs";
import { MOTOR_ROUTE_IDS, motorFitCandidates, motorTenderCandidates, motorWearSlot } from "../src/core/motorPool";
import { rawScore } from "../src/core/race";
import { shopFoundingReady } from "../src/core/serviceShop";
import type { GameState, JobSpec, MaterialId } from "../src/core/types";
import { decodeSave } from "../src/game/save";

const checkpoint = process.argv[2] ?? "test-results/service-careers/charter-ready.txt";
const save = decodeSave(Buffer.from(readFileSync(checkpoint, "utf8").trim(), "base64").toString("utf8"));
if (!save || !shopFoundingReady(save.game) || save.game.era || save.game.run.races.length) {
  throw new Error("A repair-only, charter-ready checkpoint is required.");
}

function complete(game: GameState, spec: JobSpec): GameState {
  const queued = must(game, { type: "enqueue", spec });
  const active = queued.run.jobs.find(({ spec: job }) => job.kind === spec.kind);
  if (!active) throw new Error(`Could not start ${spec.kind}`);
  return must(queued, { type: "advance", ms: Math.ceil(active.remaining) + 1 });
}

function reload(game: GameState): GameState {
  const loaded = decodeSave(JSON.stringify({ game, savedAt: 1 }));
  if (!loaded) throw new Error("Could not reload the assembled build.");
  return loaded.game;
}

const def = getVehicle("service_runabout");
const blueprint = def.blueprint!;
const mower = save.game.run.vehicles.find(({ vehicleId }) => vehicleId === "riding_mower");
if (!mower) throw new Error("The checkpoint lacks a genuine Riding Mower.");
const mowerCapacity = carryFor(save.game);
const start = { hauls: save.game.run.stats.hauls, cash: save.game.run.cash, time: save.game.run.seasonMs };
let game = must(save.game, { type: "motorPool", move: { type: "lodge", vehicleUid: mower.uid } });
const custodyCapacity = carryFor(game);
const depotStock: Record<string, string> = {};
for (const route of MOTOR_ROUTE_IDS) {
  const rig = game.motorPool!.custody!.rig;
  const slot = motorWearSlot(rig, route);
  if ((rig.parts[slot]?.condition ?? 0) < 2) {
    const donor = motorFitCandidates(game, slot).find(({ condition }) => condition >= 2);
    if (!donor) throw new Error(`No roadworthy stock for the ${slot}.`);
    game = must(game, { type: "motorPool", move: { type: "fit", slot, partUid: donor.uid } });
  }
  const tender = motorTenderCandidates(game, route).find(({ partId }) => route !== "ramp" || partId === "wheel_busted");
  if (!tender) throw new Error(`No trade stock for ${route}.`);
  game = must(game, { type: "motorPool", move: { type: "book", route, tenderUid: tender.uid } });
  const job = game.motorPool!.job!;
  game = must(game, { type: "advance", ms: job.remaining, away: true });
  game = must(game, { type: "motorPool", move: { type: "claim" } });
  depotStock[route === "ramp" ? "frame" : "engine"] = job.part.uid;
}

game = complete(game, { kind: "study", knowhowId: blueprint });
const suitable = new Set(def.slots.filter(({ slot }) => !Object.hasOwn(depotStock, slot)).flatMap(({ accepts }) => accepts));
let picked = blueprintPlan(game, def, depotStock);
for (let step = 0; step < 35 && (picked.ready !== picked.required || picked.missing.length > 0); step++) {
  const inactive = game.run.inventory.filter(({ uid }) => !Object.values(picked.chosen).includes(uid) && !Object.values(depotStock).includes(uid));
  const restore = picked.ready < picked.required && inactive.find((part) => suitable.has(part.partId) && part.condition === 0);
  const strip = inactive.find((part) => picked.missing.some(({ material }) => STRIP_YIELD[getPart(part.partId).category][material as MaterialId]));
  const purchase = picked.slots.filter(({ slot }) => !picked.chosen[slot.slot])
    .flatMap(({ slot }) => slot.accepts).find((id) => !counterBlocker(game, id));
  if (restore) game = complete(game, { kind: "clean", partUid: restore.uid });
  else if (strip) game = complete(game, { kind: "strip", partUid: strip.uid });
  else if (purchase) game = must(game, { type: "buyPart", partId: purchase });
  else if (game.run.inventory.length >= garageSpace(game) - 2) {
    game = must(game, { type: "sell", partUids: inactive.slice(0, 4).map(({ uid }) => uid) });
  } else game = complete(game, { kind: "haul", placeId: "curb" });
  picked = blueprintPlan(game, def, depotStock);
}

const extraHauls = game.run.stats.hauls - start.hauls;
const curb = { kind: "haul", placeId: "curb" } as const;
const withoutRunabout = complete(game, curb);
const found = (before: GameState, after: GameState) => Object.entries(after.meta.codex.parts).reduce((n, [id, count]) => n + count - (before.meta.codex.parts[id] ?? 0), 0);
const onFootFinds = found(game, withoutRunabout);
const mowerFinds = found(save.game, complete(save.game, curb));
game = reload(complete(game, { kind: "assemble", vehicleId: def.id, name: "Depot Special", partUids: picked.chosen }));
const runabout = game.run.vehicles.find(({ vehicleId }) => vehicleId === def.id)!;
const runaboutCapacity = carryFor(game);
if (runabout.parts.frame?.uid !== depotStock.frame || runabout.parts.engine?.uid !== depotStock.engine
  || runabout.parts.wheel?.uid === runabout.parts.rear_wheel?.uid || runaboutCapacity <= mowerCapacity || game.run.races.length) {
  throw new Error("The repair-only build did not use distinct stock and improve hauling capacity.");
}

const withRunabout = complete(game, curb);
const runaboutFinds = found(game, withRunabout);
if (runaboutFinds <= mowerFinds) throw new Error("The Runabout haul did not bring back more than the mower.");

// Keep the repair-only save as the acquisition proof. Run the handling trial from a separate action branch.
const trial = { kind: "race", vehicleUid: runabout.uid, venueId: "backyard", event: "sprint", call: "nurse" } as const;
const booked = must(game, { type: "enqueue", spec: trial });
const finished = must(booked, { type: "advance", ms: nextEventInMs(booked, trial.venueId, trial.event) + 180_000 });
const result = finished.run.races.at(-1);
if (result?.vehicleUid !== runabout.uid) throw new Error("The Runabout did not complete the race queue.");
const equivalentKart = { ...runabout, vehicleId: "go_kart", parts: { ...runabout.parts, rear_wheel: undefined } };
const scoring = (vehicle: typeof runabout) => Object.fromEntries((["dirt", "drag", "rally"] as const).map((discipline) => [
  discipline, Math.round(rawScore(vehicle, discipline) * 10) / 10,
]));
console.log(JSON.stringify({ checkpoint, name: runabout.name, extraHauls, races: game.run.races.length,
  elapsedHours: Math.round((game.run.seasonMs - start.time) / 360_000) / 10, spent: start.cash - game.run.cash,
  parts: runabout.parts, capacity: { mower: mowerCapacity, mowerAtDepot: custodyCapacity, runabout: runaboutCapacity },
  curbFinds: { mower: mowerFinds, mowerAtDepot: onFootFinds, runabout: runaboutFinds }, validSave: true,
  trial: { actual: { position: result.position, field: result.fieldSize, dnf: result.dnf, wear: result.wear },
    runaboutHandling: vehicleStats(runabout).handling, runaboutScore: scoring(runabout), equivalentKartScore: scoring(equivalentKart) } }));
