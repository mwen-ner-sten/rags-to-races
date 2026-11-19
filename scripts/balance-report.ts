/**
 * Balance report: how reference builds score against every event they can enter.
 *   npx tsx scripts/balance-report.ts [dirt|drag]
 *
 * For each vehicle it builds three cars and prints the Push win chance per event:
 *   first    — the first part each slot accepts, in Good condition, no practice
 *   best     — the best part per slot for that venue, in Good condition, no practice
 *   maxed    — the best parts, Restored, with full practice at the venue
 * Use it after changing parts, vehicles, venue demands or event fields, then run the pacing check.
 */
import { createGame } from "../src/core";
import { DISCIPLINES, EVENT_KINDS, VENUES } from "../src/core/content/events";
import { PART_BY_ID } from "../src/core/content/parts";
import { VEHICLES, type VehicleDef } from "../src/core/content/vehicles";
import { rawScore, winChance } from "../src/core/race";
import type { Condition, DisciplineId, GameState, Vehicle } from "../src/core/types";

const discipline = (process.argv[2] ?? "dirt") as DisciplineId;

function build(def: VehicleDef, pick: (accepts: string[]) => string, condition: Condition): Vehicle {
  return {
    uid: "ref", vehicleId: def.id, name: def.name, tune: "balanced", builtAtSeasonMs: 0,
    history: { races: 0, wins: 0, dnfs: 0, bestFinish: null },
    parts: Object.fromEntries(def.slots.map((slot) => [slot.slot, { uid: `ref-${slot.slot}`, partId: pick(slot.accepts), condition, origin: "ref" }])),
  };
}

function game(vehicle: Vehicle, practice: number): GameState {
  const state = createGame("balance");
  state.run.vehicles = [vehicle];
  for (const venue of VENUES) state.run.practice[venue.id] = practice;
  if (discipline !== "dirt") {
    state.era = { discipline, teamName: "Ref", colors: ["#c33", "#eee"], crew: [], milestones: [], hardshipsCompleted: 0, legends: [], seasonIndex: 0 };
  }
  return state;
}

const pct = (p: number) => `${Math.round(p * 100)}%`.padStart(4);

console.log(`Discipline: ${DISCIPLINES[discipline].name}\n`);
for (const def of VEHICLES) {
  for (const venue of VENUES) {
    if (def.tier < venue.tiers[0] || def.tier > venue.tiers[1]) continue;
    const bestFor = (accepts: string[]) => {
      const scored = accepts.map((id) => {
        const probe = build(def, (a) => (a === accepts ? id : a[0]), 3);
        return { id, score: rawScore(probe, discipline, venue.id) };
      });
      return scored.sort((a, b) => b.score - a.score)[0].id;
    };
    const cars: [string, Vehicle, number][] = [
      ["first", build(def, (a) => a[0], 3), 0],
      ["best ", build(def, bestFor, 3), 0],
      ["maxed", build(def, bestFor, 4), 10],
    ];
    console.log(`${def.name} @ ${venue.name}  (fields ${EVENT_KINDS.map((e) => venue.events[e].field).join("/")})`);
    for (const [label, car, practice] of cars) {
      const state = game(car, practice);
      const odds = EVENT_KINDS.map((e) => pct(winChance(state, car, venue.id, e, "push"))).join(" ");
      const picks = label === "first" ? "" : Object.values(car.parts).map((p) => (p ? PART_BY_ID[p.partId].name : "")).join(", ");
      console.log(`  ${label} score ${rawScore(car, discipline, venue.id).toFixed(1).padStart(6)}  win ${odds}  ${picks}`);
    }
  }
  console.log("");
}
