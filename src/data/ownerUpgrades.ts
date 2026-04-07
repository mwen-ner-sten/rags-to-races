export type OwnerUpgradeCategory = "franchise" | "facilities" | "management" | "network";

export interface OwnerUpgradeDefinition {
  id: string;
  name: string;
  description: string;
  category: OwnerUpgradeCategory;
  maxLevel: number;
  baseCost: number;     // OP cost for level 1
  costScaling: number;
  effect: { type: string; valuePerLevel: number };
}

/** Calculate OP cost for a given upgrade at a given level (1-indexed) */
export function ownerUpgradeCost(def: OwnerUpgradeDefinition, level: number): number {
  return Math.ceil(def.baseCost * Math.pow(def.costScaling, level - 1));
}

// ── Franchise (multiplicative power) ───────────────────────────────────────

const SCRAP_EMPIRE: OwnerUpgradeDefinition = {
  id: "owner_scrap_empire",
  name: "Scrap Empire",
  description: "All scrap multipliers squared.",
  category: "franchise",
  maxLevel: 1,
  baseCost: 20,
  costScaling: 1,
  effect: { type: "scrap_mult_squared", valuePerLevel: 1 },
};

const REP_DYNASTY: OwnerUpgradeDefinition = {
  id: "owner_rep_dynasty",
  name: "Rep Dynasty",
  description: "All rep multipliers squared.",
  category: "franchise",
  maxLevel: 1,
  baseCost: 20,
  costScaling: 1,
  effect: { type: "rep_mult_squared", valuePerLevel: 1 },
};

const LP_PRINTING_PRESS: OwnerUpgradeDefinition = {
  id: "owner_lp_press",
  name: "LP Printing Press",
  description: "LP earned x3.",
  category: "franchise",
  maxLevel: 1,
  baseCost: 25,
  costScaling: 1,
  effect: { type: "lp_triple", valuePerLevel: 1 },
};

const AUTO_EVERYTHING: OwnerUpgradeDefinition = {
  id: "owner_auto_all",
  name: "Auto-Everything",
  description: "All automation from tick 0.",
  category: "franchise",
  maxLevel: 1,
  baseCost: 30,
  costScaling: 1,
  effect: { type: "auto_all", valuePerLevel: 1 },
};

// ── Facilities (new content) ───────────────────────────────────────────────

const ADVANCED_CIRCUITS: OwnerUpgradeDefinition = {
  id: "owner_adv_circuits",
  name: "Advanced Circuits",
  description: "Unlock T5/T6 circuits.",
  category: "facilities",
  maxLevel: 1,
  baseCost: 15,
  costScaling: 1,
  effect: { type: "unlock_adv_circuits", valuePerLevel: 1 },
};

const VEHICLE_MASTERY: OwnerUpgradeDefinition = {
  id: "owner_vehicle_mastery",
  name: "Vehicle Mastery",
  description: "Unlock T9+ vehicles.",
  category: "facilities",
  maxLevel: 1,
  baseCost: 15,
  costScaling: 1,
  effect: { type: "unlock_t9_vehicles", valuePerLevel: 1 },
};

const RD_LAB: OwnerUpgradeDefinition = {
  id: "owner_rd_lab",
  name: "R&D Lab",
  description: "Unlock Research workshop category.",
  category: "facilities",
  maxLevel: 1,
  baseCost: 10,
  costScaling: 1,
  effect: { type: "unlock_research", valuePerLevel: 1 },
};

const INFINITE_GARAGE: OwnerUpgradeDefinition = {
  id: "owner_inf_garage",
  name: "Infinite Garage",
  description: "No vehicle limit.",
  category: "facilities",
  maxLevel: 1,
  baseCost: 12,
  costScaling: 1,
  effect: { type: "infinite_garage", valuePerLevel: 1 },
};

// ── Management ─────────────────────────────────────────────────────────────

const TEAM_LEGACY: OwnerUpgradeDefinition = {
  id: "owner_team_legacy",
  name: "Team Legacy",
  description: "Keep 50% of Team upgrades through Owner Reset.",
  category: "management",
  maxLevel: 1,
  baseCost: 20,
  costScaling: 1,
  effect: { type: "keep_team_upgrades", valuePerLevel: 0.5 },
};

const TALENT_PIPELINE: OwnerUpgradeDefinition = {
  id: "owner_talent_pipeline",
  name: "Talent Pipeline",
  description: "Talent nodes cost 50% less LP.",
  category: "management",
  maxLevel: 1,
  baseCost: 15,
  costScaling: 1,
  effect: { type: "talent_cost_reduction", valuePerLevel: 0.5 },
};

const BORN_RICH: OwnerUpgradeDefinition = {
  id: "owner_born_rich",
  name: "Born Rich",
  description: "Start every L1 run with $5000 scrap per level.",
  category: "management",
  maxLevel: 5,
  baseCost: 8,
  costScaling: 2.0,
  effect: { type: "starting_scrap", valuePerLevel: 5000 },
};

const FATIGUE_IMMUNITY: OwnerUpgradeDefinition = {
  id: "owner_fatigue_immune",
  name: "Fatigue Immunity",
  description: "-50% fatigue rate.",
  category: "management",
  maxLevel: 1,
  baseCost: 18,
  costScaling: 1,
  effect: { type: "fatigue_rate_reduction", valuePerLevel: 0.5 },
};

// ── Network ────────────────────────────────────────────────────────────────

const MATERIAL_SYNTHESIS: OwnerUpgradeDefinition = {
  id: "owner_mat_synth",
  name: "Material Synthesis",
  description: "Convert materials at 2:1 ratio.",
  category: "network",
  maxLevel: 1,
  baseCost: 10,
  costScaling: 1,
  effect: { type: "material_conversion", valuePerLevel: 1 },
};

const CREW_LEGENDS: OwnerUpgradeDefinition = {
  id: "owner_crew_legends",
  name: "Crew Legends",
  description: "Crew start at level 3.",
  category: "network",
  maxLevel: 1,
  baseCost: 12,
  costScaling: 1,
  effect: { type: "crew_starting_level", valuePerLevel: 3 },
};

const OWNERS_INSIGHT: OwnerUpgradeDefinition = {
  id: "owner_insight",
  name: "Owner's Insight",
  description: "Legacy upgrades start at level 2 per L1 prestige.",
  category: "network",
  maxLevel: 1,
  baseCost: 25,
  costScaling: 1,
  effect: { type: "legacy_starting_level", valuePerLevel: 2 },
};

const UNLOCK_COST_SLASH: OwnerUpgradeDefinition = {
  id: "owner_cost_slash",
  name: "Unlock Cost Slash",
  description: "Circuit/location costs -75%.",
  category: "network",
  maxLevel: 1,
  baseCost: 15,
  costScaling: 1,
  effect: { type: "unlock_cost_reduction", valuePerLevel: 0.75 },
};

// ── Export ──────────────────────────────────────────────────────────────────

export const OWNER_UPGRADE_DEFINITIONS: OwnerUpgradeDefinition[] = [
  SCRAP_EMPIRE,
  REP_DYNASTY,
  LP_PRINTING_PRESS,
  AUTO_EVERYTHING,
  ADVANCED_CIRCUITS,
  VEHICLE_MASTERY,
  RD_LAB,
  INFINITE_GARAGE,
  TEAM_LEGACY,
  TALENT_PIPELINE,
  BORN_RICH,
  FATIGUE_IMMUNITY,
  MATERIAL_SYNTHESIS,
  CREW_LEGENDS,
  OWNERS_INSIGHT,
  UNLOCK_COST_SLASH,
];

export const OWNER_UPGRADES_BY_ID = Object.fromEntries(
  OWNER_UPGRADE_DEFINITIONS.map((u) => [u.id, u]),
) as Record<string, OwnerUpgradeDefinition>;

export const OWNER_CATEGORIES: OwnerUpgradeCategory[] = [
  "franchise",
  "facilities",
  "management",
  "network",
];

export const OWNER_CATEGORY_LABELS: Record<OwnerUpgradeCategory, string> = {
  franchise: "Franchise",
  facilities: "Facilities",
  management: "Management",
  network: "Network",
};
