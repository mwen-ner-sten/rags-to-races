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

/** Roll a part condition based on location rarity bias (0–1) */
export function rollCondition(rarityBias: number): PartCondition {
  // rarityBias=0 → mostly rusted; rarityBias=1 → mostly pristine
  const r = Math.random();
  const adjusted = r * (1 - rarityBias) + rarityBias * r * r; // bias toward higher
  const idx = Math.min(Math.floor(adjusted * CONDITIONS.length), CONDITIONS.length - 1);
  // Invert: low adjusted = rusted, high = pristine
  const conditionIdx = Math.min(
    Math.floor((1 - adjusted + rarityBias * adjusted) * CONDITIONS.length * 0.7),
    CONDITIONS.length - 1,
  );
  void idx; // suppress unused warning
  return CONDITIONS[conditionIdx];
}

/** Returns true with given probability (0–1) */
export function chance(probability: number): boolean {
  return Math.random() < probability;
}

/** Random integer between min (inclusive) and max (inclusive) */
export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
