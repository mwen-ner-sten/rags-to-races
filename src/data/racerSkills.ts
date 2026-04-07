/**
 * Racer Skills — within-run XP progression.
 *
 * Each skill earns flat "rating" per level.  Rating converts to an
 * effectiveness value via diminishing-returns that scales with content tier:
 *
 *   effectiveness = rating / (rating + tierConstant)
 *
 * This means the same rating is powerful at low tiers but weaker at higher
 * tiers, so the player must keep investing to stay relevant.
 */

// ── Skill names ─────────────────────────────────────────────────────────────
export type SkillName = "driving" | "mechanics" | "scavenging" | "endurance";

export const SKILL_NAMES: SkillName[] = ["driving", "mechanics", "scavenging", "endurance"];

// ── Per-skill state ─────────────────────────────────────────────────────────
export interface SkillState {
  xp: number;
  level: number;
}

export interface RacerSkills {
  driving: SkillState;
  mechanics: SkillState;
  scavenging: SkillState;
  endurance: SkillState;
}

export function createDefaultSkills(): RacerSkills {
  return {
    driving:    { xp: 0, level: 0 },
    mechanics:  { xp: 0, level: 0 },
    scavenging: { xp: 0, level: 0 },
    endurance:  { xp: 0, level: 0 },
  };
}

// ── XP curve ────────────────────────────────────────────────────────────────
export const MAX_SKILL_LEVEL = 20;

/** XP required to reach level `n` (from 0). Level 0 = 0 XP. */
export function xpForLevel(n: number): number {
  if (n <= 0) return 0;
  return Math.floor(100 * Math.pow(1.5, n - 1));
}

/** Cumulative XP required to reach level `n` from level 0. */
export function cumulativeXpForLevel(n: number): number {
  let total = 0;
  for (let i = 1; i <= n; i++) total += xpForLevel(i);
  return total;
}

/** Given current XP, return the level and remaining XP toward next level. */
export function levelFromXp(totalXp: number): { level: number; xpIntoLevel: number; xpForNext: number } {
  let remaining = totalXp;
  for (let lvl = 1; lvl <= MAX_SKILL_LEVEL; lvl++) {
    const cost = xpForLevel(lvl);
    if (remaining < cost) {
      return { level: lvl - 1, xpIntoLevel: remaining, xpForNext: cost };
    }
    remaining -= cost;
  }
  return { level: MAX_SKILL_LEVEL, xpIntoLevel: 0, xpForNext: 0 };
}

// ── Rating per level ────────────────────────────────────────────────────────
export const RATING_PER_LEVEL = 5;

/** Total rating for a skill at a given level. */
export function ratingForLevel(level: number): number {
  return level * RATING_PER_LEVEL;
}

// ── Tier constants (diminishing returns) ────────────────────────────────────
export const TIER_CONSTANTS: Record<number, number> = {
  0: 50,
  1: 100,
  2: 200,
  3: 400,
  4: 600,
  5: 800,
  6: 1000,
  7: 1200,
  8: 1500,
};

/** Get the tier constant for a given tier. Falls back to highest defined. */
export function getTierConstant(tier: number): number {
  if (tier in TIER_CONSTANTS) return TIER_CONSTANTS[tier];
  // For tiers beyond defined range, extrapolate
  const maxDefined = Math.max(...Object.keys(TIER_CONSTANTS).map(Number));
  return TIER_CONSTANTS[maxDefined] + (tier - maxDefined) * 200;
}

/**
 * Convert rating to effectiveness (0–1) at a given content tier.
 *
 *   effectiveness = rating / (rating + tierConstant)
 *
 * At T0 with 50 rating: 50/(50+50) = 0.5
 * At T3 with 50 rating: 50/(50+400) = 0.11
 */
export function ratingToEffectiveness(rating: number, tier: number): number {
  if (rating <= 0) return 0;
  const k = getTierConstant(tier);
  return rating / (rating + k);
}

// ── Skill metadata (for display) ────────────────────────────────────────────
export interface SkillDefinition {
  id: SkillName;
  name: string;
  icon: string;
  description: string;
  bonusDescription: string;
}

export const SKILL_DEFINITIONS: SkillDefinition[] = [
  {
    id: "driving",
    name: "Driving",
    icon: "🏎",
    description: "Improves race performance and reduces DNF chance.",
    bonusDescription: "+performance, -DNF risk",
  },
  {
    id: "mechanics",
    name: "Mechanics",
    icon: "🔧",
    description: "Reduces build and repair costs, improves refurbishment.",
    bonusDescription: "-build/repair costs",
  },
  {
    id: "scavenging",
    name: "Scavenging",
    icon: "🔍",
    description: "Better luck finding parts and more drops per scavenge.",
    bonusDescription: "+luck, +yield",
  },
  {
    id: "endurance",
    name: "Endurance",
    icon: "💪",
    description: "Reduces effective fatigue and vehicle wear.",
    bonusDescription: "-fatigue, -wear",
  },
];
