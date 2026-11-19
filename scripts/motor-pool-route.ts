/** Action-only depot continuation from the repair-only checkpoint produced by scripts/customer-career.ts. */
import { readFileSync } from "node:fs";
import { must } from "../src/core";
import { TEAM_LAYER, teamAward } from "../src/core/layers";
import { MOTOR_ROUTE_IDS, MOTOR_ROUTES, motorFitCandidates, motorTenderCandidates, type MotorPoolMove } from "../src/core/motorPool";
import { shopFoundingReady } from "../src/core/serviceShop";
import { initialConfig } from "../src/core/state";
import type { GameState } from "../src/core/types";
import { decodeSave } from "../src/game/save";

const checkpoint = process.argv[2] ?? "test-results/service-careers/charter-ready.txt";
const save = decodeSave(Buffer.from(readFileSync(checkpoint, "utf8").trim(), "base64").toString("utf8"));
if (!save || !shopFoundingReady(save.game) || save.game.era || save.game.meta.stateWonEver || save.game.run.races.length) {
  throw new Error("A valid repair-only, charter-ready checkpoint is required.");
}

const act = (game: GameState, move: MotorPoolMove) => must(game, { type: "motorPool", move });
function reload(game: GameState): GameState {
  const checked = decodeSave(JSON.stringify({ game, savedAt: 1 }));
  if (!checked) throw new Error("The depot save did not reload.");
  return checked.game;
}

const rig = save.game.run.vehicles.find(({ vehicleId }) => vehicleId === "riding_mower" || vehicleId === "beater_car");
if (!rig) throw new Error("The checkpoint needs a genuine eligible rig.");
let game = reload(act(save.game, { type: "lodge", vehicleUid: rig.uid }));
if (game.run.vehicles.some(({ uid }) => uid === rig.uid)) throw new Error("Lodging duplicated the rig.");
const deliveries = [];

for (const route of MOTOR_ROUTE_IDS) {
  const slot = MOTOR_ROUTES[route].wear;
  if ((game.motorPool!.custody!.rig.parts[slot]?.condition ?? 0) < 2) {
    const donor = motorFitCandidates(game, slot).find(({ condition }) => condition >= 2);
    if (!donor) throw new Error(`The checkpoint has no roadworthy stock for the ${slot}.`);
    game = act(game, { type: "fit", slot, partUid: donor.uid });
  }
  const tender = motorTenderCandidates(game, route)[0];
  if (!tender) throw new Error(`The checkpoint has no trade stock for ${route}.`);
  game = reload(act(game, { type: "book", route, tenderUid: tender.uid }));
  const job = game.motorPool!.job!;
  const midway = reload(must(game, { type: "advance", ms: Math.floor(job.duration / 2) }));
  const split = must(midway, { type: "advance", ms: midway.motorPool!.job!.remaining });
  const away = reload(must(game, { type: "advance", ms: job.duration, away: true }));
  if (JSON.stringify(split.motorPool) !== JSON.stringify(away.motorPool)) throw new Error("Live and offline routes settled differently.");
  game = reload(act(away, { type: "claim" }));
  const stock = game.run.inventory.find(({ uid }) => uid === job.part.uid);
  if (!stock || game.run.inventory.some(({ uid }) => uid === tender.uid)) throw new Error("Depot stock did not exchange correctly.");
  deliveries.push({ route, tender: tender.partId, tenderCondition: tender.condition, fee: MOTOR_ROUTES[route].cost,
    minutes: Math.round(job.duration / 6_000) / 10, reward: stock.partId, condition: stock.condition, rigWear: { slot, after: game.motorPool!.custody!.rig.parts[slot]?.condition } });
}

if (!TEAM_LAYER.gate(game).ok || game.run.races.length) throw new Error("Two real receipts did not qualify a no-race Team Reset.");
const award = teamAward(game);
const beforeResetCash = game.run.cash;
const held = game.motorPool!.custody!.rig;
game = reload(must(game, { type: "reset", layer: "team", choices: { ...initialConfig(), organization: "collective", discipline: "dirt", teamName: "County Service Union", colors: ["#347", "#ffe"] } }));
game = reload(act(game, { type: "reclaim" }));
const returned = game.run.vehicles.find(({ uid }) => uid === rig.uid);
if (!returned || JSON.stringify(returned) !== JSON.stringify(held) || game.motorPool?.custody || game.team.tp !== award) throw new Error("The original rig did not return intact from the Team Reset.");
console.log(JSON.stringify({ checkpoint, rig: { id: rig.uid, model: rig.vehicleId, name: rig.name }, deliveries,
  beforeResetCash,
  team: game.era?.organization, award, reclaimed: { sameUid: true, sameRaceHistory: true, parts: returned.parts }, validSave: true }));
