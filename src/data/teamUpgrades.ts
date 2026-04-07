export type TeamUpgradeCategory = "legacy" | "infrastructure" | "crew" | "racer_dev" | "fortune";

export interface TeamUpgradeDefinition {
  id: string;
  name: string;
  description: string;
  category: TeamUpgradeCategory;
  maxLevel: number;
  baseCost: number;     // TP cost for level 1
  costScaling: number;
  effect: { type: string; valuePerLevel: number };
}

/** Calculate TP cost for a given upgrade at a given level (1-indexed) */
export function teamUpgradeCost(def: TeamUpgradeDefinition, level: number): number {
  return Math.ceil(def.baseCost * Math.pow(def.costScaling, level - 1));
}

// ── Legacy (accelerate L1 runs) ────────────────────────────────────────────

const LP_AMPLIFIER: TeamUpgradeDefinition = {
  id: "team_lp_amp",
  name: "LP Amplifier",
  description: "+15% LP per Scrap Reset per level.",
  category: "legacy",
  maxLevel: 10,
  baseCost: 3,
  costScaling: 1.5,
  effect: { type: "lp_multiplier", valuePerLevel: 0.15 },
};

const QUICK_START: TeamUpgradeDefinition = {
  id: "team_quick_start",
  name: "Quick Start",
  description: "Start L1 with 500 bonus scrap + auto-scavenge per level.",
  category: "legacy",
  maxLevel: 5,
  baseCost: 5,
  costScaling: 2.0,
  effect: { type: "quick_start_bonus", valuePerLevel: 500 },
};

const LEGACY_VAULT: TeamUpgradeDefinition = {
  id: "team_legacy_vault",
  name: "Legacy Vault",
  description: "Keep N legacy upgrades through Team Reset per level.",
  category: "legacy",
  maxLevel: 3,
  baseCost: 10,
  costScaling: 2.5,
  effect: { type: "keep_legacy_count", valuePerLevel: 1 },
};

const MOMENTUM_MASTERY: TeamUpgradeDefinition = {
  id: "team_momentum",
  name: "Momentum Mastery",
  description: "Momentum thresholds -10% per level.",
  category: "legacy",
  maxLevel: 5,
  baseCost: 4,
  costScaling: 1.8,
  effect: { type: "momentum_threshold_reduction", valuePerLevel: 0.1 },
};

// ── Infrastructure ─────────────────────────────────────────────────────────

const EXTENDED_WORKSHOP: TeamUpgradeDefinition = {
  id: "team_ext_workshop",
  name: "Extended Workshop",
  description: "+1 workshop upgrade slot per level.",
  category: "infrastructure",
  maxLevel: 5,
  baseCost: 5,
  costScaling: 2.0,
  effect: { type: "workshop_slot", valuePerLevel: 1 },
};

const FLEET_GARAGE: TeamUpgradeDefinition = {
  id: "team_fleet",
  name: "Fleet Garage",
  description: "+1 active vehicle per level.",
  category: "infrastructure",
  maxLevel: 3,
  baseCost: 8,
  costScaling: 2.5,
  effect: { type: "active_vehicle_slot", valuePerLevel: 1 },
};

const EXOTIC_PARTS_PIPELINE: TeamUpgradeDefinition = {
  id: "team_exotic",
  name: "Exotic Parts Pipeline",
  description: "T6 parts available at high-tier locations.",
  category: "infrastructure",
  maxLevel: 1,
  baseCost: 20,
  costScaling: 1,
  effect: { type: "unlock_t6_parts", valuePerLevel: 1 },
};

const ADVANCED_TOOLS: TeamUpgradeDefinition = {
  id: "team_tools",
  name: "Advanced Tools",
  description: "Enhancement costs -10% per level.",
  category: "infrastructure",
  maxLevel: 5,
  baseCost: 4,
  costScaling: 1.8,
  effect: { type: "enhancement_cost_reduction", valuePerLevel: 0.1 },
};

// ── Crew (unlock and improve crew system) ──────────────────────────────────

const CREW_QUARTERS: TeamUpgradeDefinition = {
  id: "team_crew_slots",
  name: "Crew Quarters",
  description: "+1 crew slot per level.",
  category: "crew",
  maxLevel: 4,
  baseCost: 6,
  costScaling: 2.0,
  effect: { type: "crew_slot", valuePerLevel: 1 },
};

const CREW_TRAINING: TeamUpgradeDefinition = {
  id: "team_crew_xp",
  name: "Crew Training",
  description: "Crew XP +20% per level.",
  category: "crew",
  maxLevel: 5,
  baseCost: 4,
  costScaling: 1.5,
  effect: { type: "crew_xp_multiplier", valuePerLevel: 0.2 },
};

const CREW_SPECIALIZATION: TeamUpgradeDefinition = {
  id: "team_crew_spec",
  name: "Crew Specialization",
  description: "Unlock 2nd specialization for crew members.",
  category: "crew",
  maxLevel: 1,
  baseCost: 15,
  costScaling: 1,
  effect: { type: "crew_second_spec", valuePerLevel: 1 },
};

const CREW_RETENTION: TeamUpgradeDefinition = {
  id: "team_crew_retain",
  name: "Crew Retention",
  description: "Crew keeps 25% XP through Scrap Reset per level.",
  category: "crew",
  maxLevel: 4,
  baseCost: 5,
  costScaling: 2.0,
  effect: { type: "crew_xp_retention", valuePerLevel: 0.25 },
};

// ── Racer Development ──────────────────────────────────────────────────────

const ATTRIBUTE_POINTS: TeamUpgradeDefinition = {
  id: "team_attr_points",
  name: "Attribute Points",
  description: "+2 attribute points per level.",
  category: "racer_dev",
  maxLevel: 10,
  baseCost: 5,
  costScaling: 1.8,
  effect: { type: "bonus_attr_points", valuePerLevel: 2 },
};

const SECOND_WIND: TeamUpgradeDefinition = {
  id: "team_second_wind",
  name: "Second Wind",
  description: "Fatigue cap -5 per level.",
  category: "racer_dev",
  maxLevel: 5,
  baseCost: 6,
  costScaling: 2.0,
  effect: { type: "fatigue_cap_reduction", valuePerLevel: 5 },
};

const VETERAN_INSTINCT: TeamUpgradeDefinition = {
  id: "team_vet_instinct",
  name: "Veteran Instinct",
  description: "+2% base race performance per level.",
  category: "racer_dev",
  maxLevel: 10,
  baseCost: 3,
  costScaling: 1.5,
  effect: { type: "base_race_performance", valuePerLevel: 0.02 },
};

const GENERATIONAL_WISDOM: TeamUpgradeDefinition = {
  id: "team_wisdom",
  name: "Generational Wisdom",
  description: "+10% starting rep per level.",
  category: "racer_dev",
  maxLevel: 5,
  baseCost: 4,
  costScaling: 1.8,
  effect: { type: "starting_rep_multiplier", valuePerLevel: 0.1 },
};

// ── Fortune ────────────────────────────────────────────────────────────────

const LOOT_MAGNETISM: TeamUpgradeDefinition = {
  id: "team_loot_magnet",
  name: "Loot Magnetism",
  description: "+5% gear drop rate per level.",
  category: "fortune",
  maxLevel: 10,
  baseCost: 3,
  costScaling: 1.5,
  effect: { type: "gear_drop_rate", valuePerLevel: 0.05 },
};

const MATERIAL_RESONANCE: TeamUpgradeDefinition = {
  id: "team_mat_resonance",
  name: "Material Resonance",
  description: "Start each team era with N materials per level.",
  category: "fortune",
  maxLevel: 5,
  baseCost: 5,
  costScaling: 2.0,
  effect: { type: "starting_materials", valuePerLevel: 1 },
};

const TALENT_EXPANSION: TeamUpgradeDefinition = {
  id: "team_talent_exp",
  name: "Talent Expansion",
  description: "Unlock T4/T5 talent nodes.",
  category: "fortune",
  maxLevel: 2,
  baseCost: 15,
  costScaling: 2.0,
  effect: { type: "talent_tier_unlock", valuePerLevel: 1 },
};

const FORGE_AFFINITY: TeamUpgradeDefinition = {
  id: "team_forge_affinity",
  name: "Forge Affinity",
  description: "+2% forge token drop rate per level.",
  category: "fortune",
  maxLevel: 5,
  baseCost: 4,
  costScaling: 1.8,
  effect: { type: "forge_token_rate", valuePerLevel: 0.02 },
};

// ── Export ──────────────────────────────────────────────────────────────────

export const TEAM_UPGRADE_DEFINITIONS: TeamUpgradeDefinition[] = [
  LP_AMPLIFIER,
  QUICK_START,
  LEGACY_VAULT,
  MOMENTUM_MASTERY,
  EXTENDED_WORKSHOP,
  FLEET_GARAGE,
  EXOTIC_PARTS_PIPELINE,
  ADVANCED_TOOLS,
  CREW_QUARTERS,
  CREW_TRAINING,
  CREW_SPECIALIZATION,
  CREW_RETENTION,
  ATTRIBUTE_POINTS,
  SECOND_WIND,
  VETERAN_INSTINCT,
  GENERATIONAL_WISDOM,
  LOOT_MAGNETISM,
  MATERIAL_RESONANCE,
  TALENT_EXPANSION,
  FORGE_AFFINITY,
];

export const TEAM_UPGRADES_BY_ID = Object.fromEntries(
  TEAM_UPGRADE_DEFINITIONS.map((u) => [u.id, u]),
) as Record<string, TeamUpgradeDefinition>;

export const TEAM_CATEGORIES: TeamUpgradeCategory[] = [
  "legacy",
  "infrastructure",
  "crew",
  "racer_dev",
  "fortune",
];

export const TEAM_CATEGORY_LABELS: Record<TeamUpgradeCategory, string> = {
  legacy: "Legacy",
  infrastructure: "Infrastructure",
  crew: "Crew",
  racer_dev: "Racer Development",
  fortune: "Fortune",
};
