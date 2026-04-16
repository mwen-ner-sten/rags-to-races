import {
  ACHIEVEMENT_DEFINITIONS,
  type AchievementStats,
  type AchievementDefinition,
} from "@/data/achievements";

// ── Achievement Bonus Types ────────────────────────────────────────────────

export interface AchievementBonuses {
  raceScrapMult: number;        // additive multiplier on race scrap
  racePerformanceBonus: number; // additive race performance
  fatigueReduction: number;     // fractional reduction (0.10 = -10%)
  dnfReduction: number;         // fractional reduction
  startingScrap: number;        // flat starting scrap bonus
  buildCostReduction: number;   // fractional reduction
  partQualityBonus: number;     // additive scavenge quality
  scavengeYieldMult: number;    // additive yield multiplier
  scavengeLuckBonus: number;    // additive luck
  materialYieldMult: number;    // additive material yield multiplier
  lpMultiplier: number;         // additive LP multiplier
  scrapMult: number;            // additive scrap-from-all-sources multiplier
  sellValueMult: number;        // additive sell value multiplier
  allMultiplier: number;        // additive all-sources multiplier
}

const EMPTY_BONUSES: AchievementBonuses = {
  raceScrapMult: 0,
  racePerformanceBonus: 0,
  fatigueReduction: 0,
  dnfReduction: 0,
  startingScrap: 0,
  buildCostReduction: 0,
  partQualityBonus: 0,
  scavengeYieldMult: 0,
  scavengeLuckBonus: 0,
  materialYieldMult: 0,
  lpMultiplier: 0,
  scrapMult: 0,
  sellValueMult: 0,
  allMultiplier: 0,
};

// ── Bonus ID to field mapping ──────────────────────────────────────────────

const BONUS_MAP: Record<string, { field: keyof AchievementBonuses; value: number }> = {
  ach_race_scrap_15:    { field: "raceScrapMult", value: 0.15 },
  ach_race_perf_10:     { field: "racePerformanceBonus", value: 0.10 },
  ach_race_perf_15:     { field: "racePerformanceBonus", value: 0.15 },
  ach_fatigue_reduction_10: { field: "fatigueReduction", value: 0.10 },
  ach_dnf_reduction_5:  { field: "dnfReduction", value: 0.05 },
  ach_starting_scrap_500: { field: "startingScrap", value: 500 },
  ach_starting_scrap_300: { field: "startingScrap", value: 300 },
  ach_build_cost_25:    { field: "buildCostReduction", value: 0.25 },
  ach_part_quality_10:  { field: "partQualityBonus", value: 0.10 },
  ach_scav_yield_20:    { field: "scavengeYieldMult", value: 0.20 },
  ach_scav_luck_15:     { field: "scavengeLuckBonus", value: 0.15 },
  ach_material_yield_15: { field: "materialYieldMult", value: 0.15 },
  ach_lp_15:            { field: "lpMultiplier", value: 0.15 },
  ach_lp_25:            { field: "lpMultiplier", value: 0.25 },
  ach_lp_mult_10:       { field: "lpMultiplier", value: 0.10 },
  ach_scrap_all_20:     { field: "scrapMult", value: 0.20 },
  ach_sell_value_50:    { field: "sellValueMult", value: 0.50 },
  ach_all_mult_10:      { field: "allMultiplier", value: 0.10 },
  ach_all_mult_5:       { field: "allMultiplier", value: 0.05 },
};

// ── Core functions ─────────────────────────────────────────────────────────

/** Check which achievements are newly earned given stats and already-earned set */
export function checkAchievements(
  stats: AchievementStats,
  alreadyEarned: string[],
): string[] {
  const earnedSet = new Set(alreadyEarned);
  const newlyEarned: string[] = [];

  for (const def of ACHIEVEMENT_DEFINITIONS) {
    if (earnedSet.has(def.id)) continue;
    const statValue = stats[def.statKey];
    if (statValue >= def.target) {
      newlyEarned.push(def.id);
    }
  }

  return newlyEarned;
}

/** Aggregate bonuses from all earned achievements */
export function getAchievementBonuses(earnedIds: string[]): AchievementBonuses {
  if (earnedIds.length === 0) return { ...EMPTY_BONUSES };

  const earnedSet = new Set(earnedIds);
  const bonuses = { ...EMPTY_BONUSES };

  for (const def of ACHIEVEMENT_DEFINITIONS) {
    if (!earnedSet.has(def.id)) continue;
    if (def.reward.type !== "bonus") continue;
    const mapping = BONUS_MAP[def.reward.bonusId];
    if (!mapping) continue;
    (bonuses[mapping.field] as number) += mapping.value;
  }

  return bonuses;
}

/** Get achievement definition by ID */
export function getAchievementById(id: string): AchievementDefinition | undefined {
  return ACHIEVEMENT_DEFINITIONS.find((a) => a.id === id);
}

/** Get progress toward an achievement (0 to 1, capped at 1) */
export function getAchievementProgress(
  def: AchievementDefinition,
  stats: AchievementStats,
): number {
  const value = stats[def.statKey];
  return Math.min(1, value / def.target);
}
