import { computeOfflineTickSpeedMs, computeTickSpeedMs, simulateOfflineTicks, type OfflineResult } from "@/engine/tick";
import type { GameState } from "@/state/store";
import { SeededRandomSource, withRandomSource } from "@/utils/random";
import { MAX_OFFLINE_DURATION_MS } from "@/config/gameplayLimits";

export const MAX_OFFLINE_MS = MAX_OFFLINE_DURATION_MS;

export interface DevSimulationSummary extends OfflineResult {
  seed: string;
  requestedTicks: number;
  requestedDurationMs: number | null;
  cappedDurationMs: number | null;
  tickSpeedMs: number;
  scavengesCompleted: number;
}

export function offlineTicksForDuration(
  state: GameState,
  requestedDurationMs: number,
): { ticks: number; requestedDurationMs: number; cappedDurationMs: number; tickSpeedMs: number } {
  const safeDuration = Number.isFinite(requestedDurationMs) ? Math.max(0, requestedDurationMs) : 0;
  const cappedDurationMs = Math.min(safeDuration, MAX_OFFLINE_MS);
  const tickSpeedMs = computeOfflineTickSpeedMs(state);
  return {
    ticks: Math.floor(cappedDurationMs / tickSpeedMs),
    requestedDurationMs: safeDuration,
    cappedDurationMs,
    tickSpeedMs,
  };
}

export function runSeededTicks(state: GameState, ticks: number, seed: string | number): DevSimulationSummary {
  const safeTicks = Number.isFinite(ticks) ? Math.max(0, Math.floor(ticks)) : 0;
  const normalizedSeed = String(seed);
  const rawResult = withRandomSource(
    new SeededRandomSource(normalizedSeed),
    () => simulateOfflineTicks(state, safeTicks),
  );
  const idPrefix = `dev_${hashForId(normalizedSeed)}_${state.gameTick}_${safeTicks}`;
  const normalizedPartIds = new Map<string, string>();
  const partsFound = rawResult.partsFound.map((part, index) => {
    const id = `${idPrefix}_part_${index}`;
    normalizedPartIds.set(part.id, id);
    return { ...part, id };
  });
  const result = {
    ...rawResult,
    partsFound,
    recentRaceOutcomes: rawResult.recentRaceOutcomes.map((outcome, index) => ({
      ...outcome,
      salvageDrop: outcome.salvageDrop
        ? { ...outcome.salvageDrop, id: normalizedPartIds.get(outcome.salvageDrop.id) ?? `${idPrefix}_race_salvage_${index}` }
        : undefined,
    })),
    lootGearDrops: rawResult.lootGearDrops.map((drop, index) => ({ ...drop, id: `${idPrefix}_gear_${index}` })),
    modDrops: rawResult.modDrops.map((drop, index) => ({ ...drop, id: `${idPrefix}_mod_${index}` })),
  };
  return {
    ...result,
    seed: normalizedSeed,
    requestedTicks: safeTicks,
    requestedDurationMs: null,
    cappedDurationMs: null,
    tickSpeedMs: computeTickSpeedMs(state),
    scavengesCompleted: result.scavengesCompleted,
  };
}

function hashForId(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  return (hash >>> 0).toString(36);
}

export function runSeededOffline(
  state: GameState,
  requestedDurationMs: number,
  seed: string | number,
): DevSimulationSummary {
  const duration = offlineTicksForDuration(state, requestedDurationMs);
  return {
    ...runSeededTicks(state, duration.ticks, seed),
    requestedDurationMs: duration.requestedDurationMs,
    cappedDurationMs: duration.cappedDurationMs,
    tickSpeedMs: duration.tickSpeedMs,
  };
}

export function applyDevSimulation(state: GameState, result: DevSimulationSummary): void {
  state.advanceFleetAssignments(result.ticksProcessed);
  state.applyTickResult(
    result.partsFound,
    result.scrapsEarned,
    result.repEarned,
    result.vehicleWearTotal,
    result.vehicleRepairTotal,
    result.raceTickProgress,
    result.lootGearDrops,
    result.modDrops,
    {
      partsScavenged: result.partsScavenged,
      partsAutoSold: result.partsAutoSold,
      scavengesCompleted: result.scavengesCompleted,
      racesCompleted: result.racesCompleted,
      winsCompleted: result.winsCompleted,
      finalWinStreak: result.finalWinStreak,
      bestWinStreak: result.bestWinStreak,
      recentRaceOutcomes: result.recentRaceOutcomes,
      winningCircuitIds: result.winningCircuitIds,
      defeatedRivalIds: result.defeatedRivalIds,
      circuitWinStreaks: result.circuitWinStreaks,
      raceSalvageFound: result.raceSalvageFound,
      forgeTokensFound: result.forgeTokensFound,
      entryFeesPaid: result.entryFeesPaid,
      challengesEvaluated: result.challengesEvaluated,
      completedChallengeIds: result.completedChallengeIds,
      challengeForgeTokens: result.challengeForgeTokens,
      challengeMaterials: result.challengeMaterials,
      ticksProcessed: result.ticksProcessed,
      finalFatigue: result.finalFatigue,
      finalVehicleCondition: result.finalVehicleCondition,
      finalRacerSkills: result.finalRacerSkills,
      finalCrewRoster: result.finalCrewRoster,
      finalActiveMomentumTiers: result.finalActiveMomentumTiers,
      newAchievementIds: result.newAchievementIds,
      stationEquipmentAutoSalvaged: result.stationEquipmentAutoSalvaged,
      reforgeShardsFound: result.reforgeShardsFound,
    },
  );
}
