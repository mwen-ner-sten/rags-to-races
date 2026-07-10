import { computeTickSpeedMs, simulateOfflineTicks, type OfflineResult } from "@/engine/tick";
import { useGameStore, type GameState } from "@/state/store";
import { SeededRandomSource, withRandomSource } from "@/utils/random";

export const MAX_OFFLINE_MS = 8 * 60 * 60 * 1_000;

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
  const tickSpeedMs = computeTickSpeedMs(state);
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
  const result = {
    ...rawResult,
    partsFound: rawResult.partsFound.map((part, index) => ({ ...part, id: `${idPrefix}_part_${index}` })),
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
    scavengesCompleted: state.autoScavengeUnlocked ? result.ticksProcessed : 0,
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
    result.racesCompleted,
  );
  useGameStore.setState((current) => ({ gameTick: current.gameTick + result.ticksProcessed }));
}
