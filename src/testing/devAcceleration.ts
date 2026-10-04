import { computeOfflineTickBudget, computeTickSpeedMs, simulateOfflineTicks, type OfflineResult } from "@/engine/tick";
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
  const budget = computeOfflineTickBudget(state, safeDuration);
  return {
    ticks: budget.ticks,
    requestedDurationMs: safeDuration,
    cappedDurationMs: budget.cappedElapsedMs,
    tickSpeedMs: budget.tickMs,
  };
}

export function runSeededTicks(state: GameState, ticks: number, seed: string | number, elapsedMs?: number): DevSimulationSummary {
  const safeTicks = Number.isFinite(ticks) ? Math.max(0, Math.floor(ticks)) : 0;
  const normalizedSeed = String(seed);
  const rawResult = withRandomSource(
    new SeededRandomSource(normalizedSeed),
    () => simulateOfflineTicks(state, safeTicks, elapsedMs),
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
    stationEquipmentDrops: rawResult.stationEquipmentDrops.map((drop, index) => ({ ...drop, id: `${idPrefix}_station_${index}` })),
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
    ...runSeededTicks(state, duration.ticks, seed, duration.cappedDurationMs),
    requestedDurationMs: duration.requestedDurationMs,
    cappedDurationMs: duration.cappedDurationMs,
    tickSpeedMs: duration.tickSpeedMs,
  };
}

export function applyDevSimulation(state: GameState, result: DevSimulationSummary): void {
  state.settleOffline(result, state.lastActiveTimestamp, Date.now());
}
