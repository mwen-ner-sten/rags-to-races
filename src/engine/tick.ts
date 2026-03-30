import type { GameState } from "@/state/store";
import { _getUpgradeEffectValue } from "@/state/store";
import { scavenge } from "./scavenge";
import { getLocationById } from "@/data/locations";
import { getCircuitById } from "@/data/circuits";
import { simulateRace, calculateWear } from "./race";

export const TICK_MS = 1000; // game ticks every second

export interface TickResult {
  partsFound: ReturnType<typeof scavenge>;
  scrapsEarned: number;
  repEarned: number;
  raceOutcome: ReturnType<typeof simulateRace> | null;
  vehicleWearAmount: number;
  vehicleRepairAmount: number;
}

/** Pure function: compute one tick of idle progress */
export function computeTick(state: GameState): TickResult {
  const result: TickResult = {
    partsFound: [],
    scrapsEarned: 0,
    repEarned: 0,
    raceOutcome: null,
    vehicleWearAmount: 0,
    vehicleRepairAmount: 0,
  };

  // Auto-scavenge (with workshop upgrade bonuses)
  if (state.autoScavengeUnlocked && state.selectedLocationId) {
    const location = getLocationById(state.selectedLocationId);
    if (location) {
      const extraLuck = _getUpgradeEffectValue(state, "keen_eye");
      const extraParts = Math.floor(_getUpgradeEffectValue(state, "deep_pockets"));
      const fatigue = state.fatigue ?? 0;
      const parts = scavenge(location, state.prestigeBonus.luckBonus + extraLuck, fatigue);
      // Add extra parts from Deep Pockets
      for (let i = 0; i < extraParts; i++) {
        const bonus = scavenge(location, state.prestigeBonus.luckBonus + extraLuck, fatigue);
        if (bonus.length > 0) parts.push(bonus[0]);
      }
      result.partsFound = parts;
    }
  }

  // Auto-race (with wear and auto-repair)
  if (state.autoRaceUnlocked && state.activeVehicleId && state.selectedCircuitId) {
    const vehicle = state.garage.find((v) => v.id === state.activeVehicleId);
    const circuit = getCircuitById(state.selectedCircuitId);

    if (vehicle && circuit) {
      const vehicleCondition = vehicle.condition ?? 100;

      // Auto-repair if upgrade exists and vehicle needs it
      const autoRepairRate = _getUpgradeEffectValue(state, "auto_repair");
      if (autoRepairRate > 0 && vehicleCondition < 100) {
        result.vehicleRepairAmount = Math.min(Math.floor(autoRepairRate), 100 - vehicleCondition);
      }

      // Only race if vehicle is functional and can afford entry
      if (vehicleCondition > 0 && state.scrapBucks >= circuit.entryFee) {
        const fatigue = state.fatigue ?? 0;
        result.raceOutcome = simulateRace(vehicle, circuit, state.prestigeBonus.scrapMultiplier, fatigue);

        // Apply consolation sponsor bonus
        const consolationBonus = _getUpgradeEffectValue(state, "consolation_sponsor");
        let scraps = result.raceOutcome.scrapsEarned;
        if (result.raceOutcome.result !== "win" && consolationBonus > 0) {
          scraps = Math.floor(scraps * (1 + consolationBonus));
        }
        result.scrapsEarned += scraps - circuit.entryFee;
        result.repEarned += result.raceOutcome.repEarned;

        // Calculate wear
        const wearReduction = _getUpgradeEffectValue(state, "reinforced_chassis");
        result.vehicleWearAmount = calculateWear(vehicle, result.raceOutcome.result, wearReduction, fatigue);
      }
    }
  }

  return result;
}
