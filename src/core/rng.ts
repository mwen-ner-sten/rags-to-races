import type { GameState } from "./types";

/** FNV-1a hash of a string to a 32-bit seed. */
export function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Mulberry32 evaluated at a given counter: deterministic and stateless. */
function mulberry(seed: number, counter: number): number {
  let t = (seed + Math.imul(counter, 0x6d2b79f5)) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Draws the next random number in [0, 1) and advances the state's counter. */
export function rand(state: GameState): number {
  state.rng += 1;
  return mulberry(hashSeed(state.seed), state.rng);
}

export function randInt(state: GameState, minInclusive: number, maxInclusive: number): number {
  return minInclusive + Math.floor(rand(state) * (maxInclusive - minInclusive + 1));
}

/** Standard normal via Box–Muller. */
export function randNormal(state: GameState): number {
  const u = Math.max(rand(state), 1e-9);
  const v = rand(state);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function pickWeighted<T>(state: GameState, entries: readonly { item: T; weight: number }[]): T {
  const total = entries.reduce((sum, e) => sum + Math.max(0, e.weight), 0);
  let roll = rand(state) * total;
  for (const entry of entries) {
    roll -= Math.max(0, entry.weight);
    if (roll <= 0) return entry.item;
  }
  return entries[entries.length - 1].item;
}

export function nextUid(state: GameState, prefix: string): string {
  state.uid += 1;
  return `${prefix}${state.uid.toString(36)}`;
}
