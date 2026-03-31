import { CONDITIONS, type PartCondition } from "@/data/parts";

/** Pick a random item from an array */
export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Weighted random: keys are labels, values are relative weights */
export function weightedPick<T extends string>(weights: Record<T, number>): T {
  const entries = Object.entries(weights) as [T, number][];
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = Math.random() * total;
  for (const [key, weight] of entries) {
    r -= weight;
    if (r <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

/**
 * Roll a part condition based on location rarity bias (0–1).
 * @param rarityBias - 0=mostly rusted, 1=best available condition
 * @param maxConditionIndex - upper bound (inclusive) on the condition index that can be rolled.
 *   Defaults to 3 (good) to enforce scavenge caps. Pass a higher value for high-tier locations.
 */
export function rollCondition(rarityBias: number, maxConditionIndex: number = 3): PartCondition {
  // Clamp maxConditionIndex to valid range
  const cap = Math.min(Math.max(0, maxConditionIndex), CONDITIONS.length - 1);
  const pool = CONDITIONS.slice(0, cap + 1);

  const r = Math.random();

  // Skew the roll toward lower conditions when rarityBias is low.
  // At bias=0: exponent ~4 (very skewed toward 0), bias=0.5: ~2, bias=1: ~1 (uniform)
  const exponent = 1 + 3 * (1 - rarityBias);
  const skewed = Math.pow(r, exponent);

  // Map skewed value (0-1) to condition index within the allowed pool
  const idx = Math.min(Math.floor(skewed * pool.length), pool.length - 1);
  return pool[idx];
}

/** Returns true with given probability (0–1) */
export function chance(probability: number): boolean {
  return Math.random() < probability;
}

/** Random integer between min (inclusive) and max (inclusive) */
export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
