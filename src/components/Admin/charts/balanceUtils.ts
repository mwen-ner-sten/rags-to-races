import { CIRCUIT_DEFINITIONS } from "@/data/circuits";
import { getVehicleById } from "@/data/vehicles";
import { deriveHighestCircuitTier } from "@/engine/prestige";
import { useGameStore } from "@/state/store";
import { FATIGUE, fatiguePerRace } from "@/config/progression";

/** Chart abstraction: Iron Will value (5 per level) → recovery rate bonus, as engine/fatigue maps it. */
const IRON_WILL_RECOVERY_PER_VALUE = 0.02;
/** Charts assume one race per minute of hands-on play when converting recovery into per-race relief. */
const CHART_MINUTES_PER_RACE = 1;

/**
 * Fatigue for balance charts under the rhythm model (engine/fatigue): each
 * race adds a tier-1 amount and the minutes between races recover some of it.
 * `fatigueOffset` is the Iron Will value (5 per level), mapped to the same
 * recovery bonus the engine applies, so the charts keep their Iron Will axis.
 */
export function calcFatigue(races: number, fatigueOffset: number): number {
  if (races <= 0) return 0;
  const recoveryPerHour = FATIGUE.RECOVERY_PER_HOUR * (1 + Math.max(0, fatigueOffset) * IRON_WILL_RECOVERY_PER_VALUE);
  const recoveryPerRace = recoveryPerHour * (CHART_MINUTES_PER_RACE / 60);
  const netPerRace = fatiguePerRace(1) - recoveryPerRace;
  return Math.max(0, Math.min(FATIGUE.MAX, Math.floor(races * netPerRace)));
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
