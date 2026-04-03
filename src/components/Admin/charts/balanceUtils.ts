import { CIRCUIT_DEFINITIONS } from "@/data/circuits";
import { getVehicleById } from "@/data/vehicles";
import { deriveHighestCircuitTier } from "@/engine/prestige";
import { useGameStore } from "@/state/store";

/**
 * Fatigue calculation for balance charts.
 * Mirrors the canonical formula in src/state/store.ts (calculateFatigue).
 * Extracted here to avoid duplicating in every chart component.
 */
export function calcFatigue(races: number, fatigueOffset: number): number {
  const effective = Math.max(0, races - fatigueOffset);
  return Math.min(99, Math.floor(25 * Math.log2(1 + effective / 25)));
}

/** Snapshot of game state values relevant to balance charts */
export interface GameSnapshot {
  ironWill: number;
  scrapMultLevel: number;
  lifetimeScrap: number;
  lifetimeRaces: number;
  circuitTier: number;
  circuitIdx: number;
  workshopCount: number;
  vehiclePerf: number;
  vehicleTier: number;
  reliability: number;
}

/** Build a snapshot from the current Zustand store state */
export function buildSnapshot(): GameSnapshot {
  const s = useGameStore.getState();

  const activeVehicle = s.garage.find((v) => v.id === s.activeVehicleId);
  const vehicleDef = activeVehicle ? getVehicleById(activeVehicle.definitionId) : undefined;

  const circuitIdx = Math.max(
    0,
    CIRCUIT_DEFINITIONS.findIndex((c) => c.id === s.selectedCircuitId),
  );

  const workshopCount = Object.values(s.workshopLevels).reduce(
    (sum: number, lvl: number) => sum + lvl,
    0,
  );

  return {
    ironWill: s.legacyUpgradeLevels["leg_fatigue_offset"] ?? 0,
    scrapMultLevel: s.legacyUpgradeLevels["leg_scrap_mult"] ?? 0,
    lifetimeScrap: s.lifetimeScrapBucks,
    lifetimeRaces: s.lifetimeRaces,
    circuitTier: deriveHighestCircuitTier(s.unlockedCircuitIds),
    circuitIdx,
    workshopCount,
    vehiclePerf: Math.round(activeVehicle?.stats.performance ?? 40),
    vehicleTier: vehicleDef?.tier ?? 0,
    reliability: Math.round(activeVehicle?.stats.reliability ?? 60),
  };
}
