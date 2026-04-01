import type { GameState } from "@/state/store";
import { _getUpgradeEffectValue } from "@/state/store";
import { scavenge } from "./scavenge";
import { getGearBonuses } from "./gear";
import { getLocationById } from "@/data/locations";
import { getCircuitById } from "@/data/circuits";
import { simulateRace, calculateWear } from "./race";

/** Base tick duration — 15 seconds. */
export const TICK_MS_DEFAULT = 15_000;
/** Minimum tick duration — 0.1 seconds. */
export const TICK_MS_MIN = 100;
/** Default number of ticks required to fire one auto-race. */
export const RACE_TICKS_DEFAULT = 3;
/** Minimum number of ticks required to fire one auto-race. */
export const RACE_TICKS_MIN = 1;

export interface TickResult {
  partsFound: ReturnType<typeof scavenge>;
  scrapsEarned: number;
  repEarned: number;
  raceOutcome: ReturnType<typeof simulateRace> | null;
  vehicleWearAmount: number;
  vehicleRepairAmount: number;
  /** Updated race tick progress (0 = just fired, or incremented counter). */
  newRaceTickProgress: number;
}

/**
 * Returns the current tick interval in ms, factoring in workshop upgrades and gear.
 * Clamped to [TICK_MS_MIN, TICK_MS_DEFAULT].
 */
export function computeTickSpeedMs(state: GameState): number {
  const upgradeReductionMs =
    _getUpgradeEffectValue(state, "tick_accelerator") +
    _getUpgradeEffectValue(state, "overclocked_tick");
  const gearBonuses = getGearBonuses(state.equippedGear);
  const gearReductionMs = (gearBonuses.tick_speed_reduction_ms ?? 0);
  return Math.max(TICK_MS_MIN, TICK_MS_DEFAULT - upgradeReductionMs - gearReductionMs);
}

/**
 * Returns how many ticks must pass before one auto-race fires.
 * Clamped to [RACE_TICKS_MIN, RACE_TICKS_DEFAULT].
 */
export function getRaceTicksNeeded(state: GameState): number {
  const reduction = _getUpgradeEffectValue(state, "pit_crew");
  return Math.max(RACE_TICKS_MIN, RACE_TICKS_DEFAULT - reduction);
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
    newRaceTickProgress: state.raceTickProgress,
  };

  const gearBonuses = getGearBonuses(state.equippedGear);

  // Auto-scavenge (with workshop upgrade bonuses + gear bonuses) — fires every tick
  if (state.autoScavengeUnlocked && state.selectedLocationId) {
    const location = getLocationById(state.selectedLocationId);
    if (location) {
      const extraLuck = _getUpgradeEffectValue(state, "keen_eye");
      const extraParts = Math.floor(_getUpgradeEffectValue(state, "deep_pockets"));
      const fatigue = state.fatigue ?? 0;
      const parts = scavenge(location, state.prestigeBonus.luckBonus + extraLuck, fatigue, gearBonuses.scavenge_luck_bonus, gearBonuses.scavenge_yield_pct);
      // Add extra parts from Deep Pockets
      for (let i = 0; i < extraParts; i++) {
        const bonus = scavenge(location, state.prestigeBonus.luckBonus + extraLuck, fatigue, gearBonuses.scavenge_luck_bonus, gearBonuses.scavenge_yield_pct);
        if (bonus.length > 0) parts.push(bonus[0]);
      }
      result.partsFound = parts;
    }
  }

  // Auto-race — fires every N ticks (multi-tick)
  if (state.autoRaceUnlocked && state.activeVehicleId && state.selectedCircuitId) {
    const raceTicksNeeded = getRaceTicksNeeded(state);
    const newRaceProgress = state.raceTickProgress + 1;

    if (newRaceProgress >= raceTicksNeeded) {
      // Time to race — reset progress
      result.newRaceTickProgress = 0;

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
          result.raceOutcome = simulateRace(vehicle, circuit, state.prestigeBonus.scrapMultiplier, fatigue, gearBonuses.race_performance_pct, gearBonuses.race_dnf_reduction);

          // Apply consolation sponsor bonus
          const consolationBonus = _getUpgradeEffectValue(state, "consolation_sponsor");
          let scraps = result.raceOutcome.scrapsEarned;
          if (result.raceOutcome.result !== "win" && consolationBonus > 0) {
            scraps = Math.floor(scraps * (1 + consolationBonus));
          }
          // Gear race scrap bonus
          if (gearBonuses.race_scrap_bonus_pct > 0) {
            scraps = Math.floor(scraps * (1 + gearBonuses.race_scrap_bonus_pct));
          }
          result.scrapsEarned += scraps - circuit.entryFee;
          result.repEarned += result.raceOutcome.repEarned;

          // Calculate wear (workshop + gear reduction)
          const wearReduction = _getUpgradeEffectValue(state, "reinforced_chassis");
          result.vehicleWearAmount = calculateWear(vehicle, result.raceOutcome.result, wearReduction, fatigue, gearBonuses.race_wear_reduction_pct);
        }
      }
    } else {
      // Accumulate tick progress toward next race
      result.newRaceTickProgress = newRaceProgress;
    }
  }

  return result;
}
