import type { GameState } from "@/state/store";
import { scavenge } from "./scavenge";
import { getLocationById } from "@/data/locations";
import { getCircuitById } from "@/data/circuits";
import { simulateRace } from "./race";

export const TICK_MS = 1000; // game ticks every second

export interface TickResult {
  partsFound: ReturnType<typeof scavenge>;
  scrapsEarned: number;
  repEarned: number;
  raceOutcome: ReturnType<typeof simulateRace> | null;
}

/** Pure function: compute one tick of idle progress */
export function computeTick(state: GameState): TickResult {
  const result: TickResult = {
    partsFound: [],
    scrapsEarned: 0,
    repEarned: 0,
    raceOutcome: null,
  };

  // Auto-scavenge
  if (state.autoScavengeUnlocked && state.selectedLocationId) {
    const location = getLocationById(state.selectedLocationId);
    if (location) {
      result.partsFound = scavenge(location, state.prestigeBonus.luckBonus);
    }
  }

  // Auto-race
  if (state.autoRaceUnlocked && state.activeVehicleId && state.selectedCircuitId) {
    const vehicle = state.garage.find((v) => v.id === state.activeVehicleId);
    const circuit = getCircuitById(state.selectedCircuitId);
    if (vehicle && circuit && state.scrapBucks >= circuit.entryFee) {
      result.raceOutcome = simulateRace(vehicle, circuit, state.prestigeBonus.scrapMultiplier);
      result.scrapsEarned += result.raceOutcome.scrapsEarned - circuit.entryFee;
      result.repEarned += result.raceOutcome.repEarned;
    }
  }

  return result;
}
