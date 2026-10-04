import { createInitialState, useGameStore, type GameState } from "../src/state/store";
import { createGameplayFixture } from "../src/testing/gameplayFixtures";
import { computeOfflineTickBudget, offlineTickBatches } from "../src/engine/tick";
import { SeededRandomSource, setRandomSource } from "../src/utils/random";
import { writeFileSync, mkdirSync } from "node:fs";

useGameStore.setState({ ...createInitialState(), ...createGameplayFixture("maxed").payload.state, lastActiveTimestamp: 1000 } as GameState);
const state = useGameStore.getState();
const elapsed = 48 * 3600000;
const budget = computeOfflineTickBudget(state, elapsed);
const started = performance.now();
setRandomSource(new SeededRandomSource("48h-high-speed"));
const batches = offlineTickBatches(state, budget.ticks, elapsed);
let step = batches.next();
while (!step.done) {
  if (step.value % 100000 === 0) console.log(`${step.value} ticks in ${((performance.now()-started)/1000).toFixed(1)}s`);
  step = batches.next();
}
const result = step.value;
const first = state.settleOffline(result, 1000, 1000 + elapsed);
const second = useGameStore.getState().settleOffline(result, 1000, 1000 + elapsed);
const report = { elapsedHours: 48, tickMs: budget.tickMs, ticks: result.ticksProcessed, seconds: (performance.now()-started)/1000,
  races: result.racesCompleted, parts: result.partsScavenged, initialParts: state.inventory.length, retainedParts: useGameStore.getState().inventory.length,
  retainedGear: useGameStore.getState().lootGearInventory.length, firstSettlement: first, duplicateSettlement: second,
  longerAbsenceCapped: JSON.stringify(computeOfflineTickBudget(state,72*3600000)) === JSON.stringify(budget) };
if (result.ticksProcessed !== budget.ticks || !first || second || report.retainedParts > Math.max(250, state.inventory.length) || report.retainedGear > 250) throw new Error(JSON.stringify(report));
mkdirSync('output/playtests/2026-09-04', { recursive: true });
writeFileSync('output/playtests/2026-09-04/offline.json', JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
