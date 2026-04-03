/**
 * Fatigue calculation for balance charts.
 * Mirrors the canonical formula in src/state/store.ts (calculateFatigue).
 * Extracted here to avoid duplicating in every chart component.
 */
export function calcFatigue(races: number, fatigueOffset: number): number {
  const effective = Math.max(0, races - fatigueOffset);
  return Math.min(99, Math.floor(25 * Math.log2(1 + effective / 25)));
}
