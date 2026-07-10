import { CONDITIONS, type PartCondition } from "@/data/parts";

export interface RandomSource {
  next(): number;
}

export const systemRandomSource: RandomSource = {
  next: () => Math.random(),
};

/** Small deterministic generator suitable for repeatable gameplay tests and fixtures. */
export class SeededRandomSource implements RandomSource {
  private state: number;

  constructor(seed: number | string) {
    this.state = typeof seed === "number" ? seed >>> 0 : hashSeed(seed);
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }
}

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

let activeRandomSource: RandomSource = systemRandomSource;

export function setRandomSource(source: RandomSource): void {
  activeRandomSource = source;
}

export function resetRandomSource(): void {
  activeRandomSource = systemRandomSource;
}

export function random(source: RandomSource = activeRandomSource): number {
  const value = source.next();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new Error(`RandomSource.next() must return a finite value in [0, 1); received ${value}`);
  }
  return value;
}

export function withRandomSource<T>(source: RandomSource, callback: () => T): T {
  const previous = activeRandomSource;
  activeRandomSource = source;
  try {
    return callback();
  } finally {
    activeRandomSource = previous;
  }
}

/** Pick a random item from an array */
export function pick<T>(arr: T[], source?: RandomSource): T {
  return arr[Math.floor(random(source) * arr.length)];
}

/** Weighted random: keys are labels, values are relative weights */
export function weightedPick<T extends string>(weights: Record<T, number>, source?: RandomSource): T {
  const entries = Object.entries(weights) as [T, number][];
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = random(source) * total;
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
export function rollCondition(rarityBias: number, maxConditionIndex: number = 3, source?: RandomSource): PartCondition {
  // Clamp maxConditionIndex to valid range
  const cap = Math.min(Math.max(0, maxConditionIndex), CONDITIONS.length - 1);
  const pool = CONDITIONS.slice(0, cap + 1);

  const r = random(source);

  // Skew the roll toward lower conditions when rarityBias is low.
  // At bias=0: exponent ~4 (very skewed toward 0), bias=0.5: ~2, bias=1: ~1 (uniform)
  const exponent = 1 + 3 * (1 - rarityBias);
  const skewed = Math.pow(r, exponent);

  // Map skewed value (0-1) to condition index within the allowed pool
  const idx = Math.min(Math.floor(skewed * pool.length), pool.length - 1);
  return pool[idx];
}

/** Returns true with given probability (0–1) */
export function chance(probability: number, source?: RandomSource): boolean {
  return random(source) < probability;
}

/** Random integer between min (inclusive) and max (inclusive) */
export function randInt(min: number, max: number, source?: RandomSource): number {
  return Math.floor(random(source) * (max - min + 1)) + min;
}
