export type LegacyUpgradeCategory = "velocity" | "fortune" | "endurance" | "mastery";

export interface LegacyUpgradeEffect {
  type: string;
  valuePerLevel: number;
}

export interface LegacyUpgradeDefinition {
  id: string;
  name: string;
  description: string;
  category: LegacyUpgradeCategory;
  maxLevel: number;
  baseCost: number;     // LP cost for level 1
  costScaling: number;  // multiplier per level
  effect: LegacyUpgradeEffect;
}

/** Calculate LP cost for a given upgrade at a given level (1-indexed) */
export function legacyUpgradeCost(def: LegacyUpgradeDefinition, level: number): number {
  return Math.ceil(def.baseCost * Math.pow(def.costScaling, level - 1));
}

/** Get total effect value for an upgrade at a given level */
export function legacyEffectTotal(def: LegacyUpgradeDefinition, level: number): number {
  return def.effect.valuePerLevel * level;
}

// ── Velocity (speed up early game) ──────────────────────────────────────────

const SCRAP_MAGNATE: LegacyUpgradeDefinition = {
  id: "leg_scrap_mult",
  name: "Scrap Magnate",
  description: "All scrap earned increased by 20% per level.",
  category: "velocity",
  maxLevel: 10,
  baseCost: 5,
  costScaling: 1.8,
  effect: { type: "scrap_multiplier", valuePerLevel: 0.2 },
};

const STREET_CRED: LegacyUpgradeDefinition = {
  id: "leg_rep_mult",
  name: "Street Cred",
  description: "All rep earned increased by 15% per level.",
  category: "velocity",
  maxLevel: 10,
  baseCost: 5,
  costScaling: 1.8,
  effect: { type: "rep_multiplier", valuePerLevel: 0.15 },
};

const SEED_MONEY: LegacyUpgradeDefinition = {
  id: "leg_starting_scrap",
  name: "Seed Money",
  description: "Start each run with 100 scrap bucks per level.",
  category: "velocity",
  maxLevel: 20,
  baseCost: 3,
  costScaling: 1.5,
  effect: { type: "starting_scrap", valuePerLevel: 100 },
};

const MUSCLE_MEMORY: LegacyUpgradeDefinition = {
  id: "leg_auto_scav_clicks",
  name: "Muscle Memory",
  description: "Start with 20 auto-scavenge clicks per level (100 unlocks auto).",
  category: "velocity",
  maxLevel: 5,
  baseCost: 8,
  costScaling: 2.0,
  effect: { type: "starting_scav_clicks", valuePerLevel: 20 },
};

// ── Fortune (quality of loot) ───────────────────────────────────────────────

const BORN_LUCKY: LegacyUpgradeDefinition = {
  id: "leg_luck",
  name: "Born Lucky",
  description: "+2% scavenge luck per level.",
  category: "fortune",
  maxLevel: 10,
  baseCost: 8,
  costScaling: 2.0,
  effect: { type: "luck_bonus", valuePerLevel: 0.02 },
};

const EFFICIENT_SALVAGER: LegacyUpgradeDefinition = {
  id: "leg_decompose_yield",
  name: "Efficient Salvager",
  description: "+10% decompose material yield per level.",
  category: "fortune",
  maxLevel: 8,
  baseCost: 6,
  costScaling: 1.7,
  effect: { type: "decompose_yield_mult", valuePerLevel: 0.1 },
};

// ── Endurance (fight fatigue) ───────────────────────────────────────────────

const IRON_WILL: LegacyUpgradeDefinition = {
  id: "leg_fatigue_offset",
  name: "Iron Will",
  description: "Fatigue curve starts 5 races later per level.",
  category: "endurance",
  maxLevel: 10,
  baseCost: 10,
  costScaling: 2.0,
  effect: { type: "fatigue_offset", valuePerLevel: 5 },
};

const BUILT_TO_LAST: LegacyUpgradeDefinition = {
  id: "leg_wear_reduction",
  name: "Built to Last",
  description: "-5% vehicle wear per level.",
  category: "endurance",
  maxLevel: 8,
  baseCost: 6,
  costScaling: 1.8,
  effect: { type: "wear_reduction", valuePerLevel: 0.05 },
};

// ── Mastery (run shortcuts) ─────────────────────────────────────────────────

const BLUEPRINT_MEMORY: LegacyUpgradeDefinition = {
  id: "leg_keep_workshop",
  name: "Blueprint Memory",
  description: "Keep 1 random workshop upgrade (at level 1) on prestige per level.",
  category: "mastery",
  maxLevel: 5,
  baseCost: 25,
  costScaling: 2.5,
  effect: { type: "keep_workshop_count", valuePerLevel: 1 },
};

const OLD_HAUNTS: LegacyUpgradeDefinition = {
  id: "leg_starting_location",
  name: "Old Haunts",
  description: "Start runs with higher-tier locations already unlocked.",
  category: "mastery",
  maxLevel: 3,
  baseCost: 15,
  costScaling: 3.0,
  effect: { type: "starting_location_tier", valuePerLevel: 1 },
};

// ── Export ───────────────────────────────────────────────────────────────────

export const LEGACY_UPGRADE_DEFINITIONS: LegacyUpgradeDefinition[] = [
  SCRAP_MAGNATE,
  STREET_CRED,
  SEED_MONEY,
  MUSCLE_MEMORY,
  BORN_LUCKY,
  EFFICIENT_SALVAGER,
  IRON_WILL,
  BUILT_TO_LAST,
  BLUEPRINT_MEMORY,
  OLD_HAUNTS,
];

export const LEGACY_UPGRADES_BY_ID = Object.fromEntries(
  LEGACY_UPGRADE_DEFINITIONS.map((u) => [u.id, u]),
) as Record<string, LegacyUpgradeDefinition>;

export const LEGACY_CATEGORIES: LegacyUpgradeCategory[] = [
  "velocity",
  "fortune",
  "endurance",
  "mastery",
];

export const LEGACY_CATEGORY_LABELS: Record<LegacyUpgradeCategory, string> = {
  velocity: "Velocity",
  fortune: "Fortune",
  endurance: "Endurance",
  mastery: "Mastery",
};
