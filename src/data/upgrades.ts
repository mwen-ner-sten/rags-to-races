export type UpgradeCategory = "scavenging" | "building" | "racing" | "maintenance" | "gear_lab";

export interface UpgradeEffect {
  type: string;
  valuePerLevel: number;
}

export interface UpgradeDefinition {
  id: string;
  name: string;
  description: string;
  category: UpgradeCategory;
  maxLevel: number;
  baseCost: number;
  costScaling: number;
  effect: UpgradeEffect;
  unlockRequirement?: {
    repPoints?: number;
    workshopUpgradeId?: string;
    workshopUpgradeIds?: string[];   // ALL of these must be ≥1
  };
}

export const UPGRADE_DEFINITIONS: UpgradeDefinition[] = [
  // ── Scavenging ──
  {
    id: "keen_eye",
    name: "Keen Eye",
    description: "Better chance of finding parts in good condition.",
    category: "scavenging",
    maxLevel: 5,
    baseCost: 50,
    costScaling: 2.5,
    effect: { type: "scavenge_luck_bonus", valuePerLevel: 0.04 },
  },
  {
    id: "deep_pockets",
    name: "Deep Pockets",
    description: "Find +1 extra part per scavenge.",
    category: "scavenging",
    maxLevel: 3,
    baseCost: 200,
    costScaling: 3.0,
    effect: { type: "scavenge_extra_parts", valuePerLevel: 1 },
  },

  // ── Building ──
  {
    id: "toolkit",
    name: "Toolkit",
    description: "Unlocks part swapping — remove and replace parts on built vehicles.",
    category: "building",
    maxLevel: 1,
    baseCost: 150,
    costScaling: 1,
    effect: { type: "unlock_part_swap", valuePerLevel: 1 },
    unlockRequirement: { repPoints: 8 },
  },
  {
    id: "bargain_builder",
    name: "Bargain Builder",
    description: "Reduce vehicle build costs by 10% per level.",
    category: "building",
    maxLevel: 5,
    baseCost: 80,
    costScaling: 2.5,
    effect: { type: "build_cost_reduction", valuePerLevel: 0.10 },
  },
  {
    id: "refurbishment_bench",
    name: "Refurbishment Bench",
    description: "Unlocks part refurbishment — improve part condition for scrap.",
    category: "building",
    maxLevel: 1,
    baseCost: 100,
    costScaling: 1,
    effect: { type: "unlock_refurbish", valuePerLevel: 1 },
    unlockRequirement: { repPoints: 5 },
  },

  // ── Racing ──
  {
    id: "tuned_suspension",
    name: "Tuned Suspension",
    description: "+5% handling bonus to all vehicles.",
    category: "racing",
    maxLevel: 5,
    baseCost: 100,
    costScaling: 2.5,
    effect: { type: "handling_bonus_pct", valuePerLevel: 0.05 },
  },
  {
    id: "reinforced_chassis",
    name: "Reinforced Chassis",
    description: "Reduce wear from racing by 15% per level.",
    category: "racing",
    maxLevel: 5,
    baseCost: 120,
    costScaling: 2.0,
    effect: { type: "wear_reduction_pct", valuePerLevel: 0.15 },
  },
  {
    id: "consolation_sponsor",
    name: "Consolation Sponsor",
    description: "+20% scrap from non-win finishes.",
    category: "racing",
    maxLevel: 3,
    baseCost: 160,
    costScaling: 2.5,
    effect: { type: "consolation_bonus_pct", valuePerLevel: 0.20 },
  },

  // ── Maintenance ──
  {
    id: "budget_repairs",
    name: "Budget Repairs",
    description: "Reduce repair costs by 15% per level.",
    category: "maintenance",
    maxLevel: 5,
    baseCost: 65,
    costScaling: 2.0,
    effect: { type: "repair_cost_reduction", valuePerLevel: 0.15 },
  },
  {
    id: "cheap_refurb",
    name: "Thrifty Refurbisher",
    description: "Reduce part refurbishment costs by 20% per level.",
    category: "maintenance",
    maxLevel: 3,
    baseCost: 130,
    costScaling: 2.5,
    effect: { type: "refurb_cost_reduction", valuePerLevel: 0.20 },
    unlockRequirement: { workshopUpgradeId: "refurbishment_bench" },
  },
  {
    id: "auto_repair",
    name: "Auto-Repair Kit",
    description: "Vehicles slowly self-repair between races (+5 condition/tick).",
    category: "maintenance",
    maxLevel: 3,
    baseCost: 300,
    costScaling: 3.0,
    effect: { type: "auto_repair_rate", valuePerLevel: 5 },
    unlockRequirement: { repPoints: 30 },
  },
  {
    id: "gentle_swap",
    name: "Gentle Hands",
    description: "Part swapping no longer degrades the removed part.",
    category: "maintenance",
    maxLevel: 1,
    baseCost: 750,
    costScaling: 1,
    effect: { type: "no_swap_degrade", valuePerLevel: 1 },
    unlockRequirement: { workshopUpgradeId: "toolkit" },
  },

  // ── Gear Lab ──
  {
    id: "gear_scavenger",
    name: "Gear Scavenger",
    description: "Increases gear drop chance while scavenging (+2% per level).",
    category: "gear_lab",
    maxLevel: 5,
    baseCost: 200,
    costScaling: 2.2,
    effect: { type: "gear_drop_rate_scavenge", valuePerLevel: 0.02 },
    unlockRequirement: { repPoints: 3000 },
  },
  {
    id: "trophy_hunter",
    name: "Trophy Hunter",
    description: "Increases gear drop chance from race wins (+3% per level).",
    category: "gear_lab",
    maxLevel: 5,
    baseCost: 300,
    costScaling: 2.5,
    effect: { type: "gear_drop_rate_race", valuePerLevel: 0.03 },
    unlockRequirement: { repPoints: 8000 },
  },
  {
    id: "rarity_sense",
    name: "Rarity Sense",
    description: "Improves the rarity of dropped gear. Each level shifts odds toward better rarities.",
    category: "gear_lab",
    maxLevel: 3,
    baseCost: 600,
    costScaling: 2.8,
    effect: { type: "gear_rarity_bonus", valuePerLevel: 1 },
    unlockRequirement: { workshopUpgradeId: "gear_scavenger" },
  },
  {
    id: "enhancement_mastery",
    name: "Enhancement Mastery",
    description: "Raises the max enhancement level for loot gear (+3 levels per upgrade).",
    category: "gear_lab",
    maxLevel: 3,
    baseCost: 1000,
    costScaling: 3.0,
    effect: { type: "gear_max_enhance", valuePerLevel: 3 },
    unlockRequirement: { workshopUpgradeId: "trophy_hunter" },
  },
  {
    id: "mod_hunter",
    name: "Mod Hunter",
    description: "Increases the chance of finding gear mods (+0.5% per level).",
    category: "gear_lab",
    maxLevel: 3,
    baseCost: 500,
    costScaling: 2.5,
    effect: { type: "mod_drop_rate_bonus", valuePerLevel: 0.005 },
    unlockRequirement: { workshopUpgradeId: "gear_scavenger" },
  },
  {
    id: "careful_modding",
    name: "Careful Modding",
    description: "Mods are preserved when removed from gear instead of being destroyed.",
    category: "gear_lab",
    maxLevel: 1,
    baseCost: 2000,
    costScaling: 1,
    effect: { type: "no_mod_destroy_on_remove", valuePerLevel: 1 },
    unlockRequirement: { workshopUpgradeId: "enhancement_mastery" },
  },
  {
    id: "gear_recycler",
    name: "Gear Recycler",
    description: "Increases the scrap value you get from salvaging loot gear (+25% per level).",
    category: "gear_lab",
    maxLevel: 3,
    baseCost: 400,
    costScaling: 2.0,
    effect: { type: "salvage_value_bonus", valuePerLevel: 0.25 },
    unlockRequirement: { workshopUpgradeId: "gear_scavenger" },
  },
  {
    id: "double_drop",
    name: "Double Drop",
    description: "Small chance to find two gear items at once (+5% per level).",
    category: "gear_lab",
    maxLevel: 3,
    baseCost: 800,
    costScaling: 3.0,
    effect: { type: "gear_double_drop_chance", valuePerLevel: 0.05 },
    unlockRequirement: { workshopUpgradeIds: ["gear_scavenger", "trophy_hunter"] },
  },

  // ── Add-On ──
  {
    id: "addon_bench",
    name: "Add-On Bench",
    description: "Unlocks attaching and detaching add-ons on built vehicles.",
    category: "building",
    maxLevel: 1,
    baseCost: 150,
    costScaling: 1,
    effect: { type: "unlock_addon_manage", valuePerLevel: 1 },
    unlockRequirement: { repPoints: 8 },
  },

  // ── New: Decomposition & Enhancement ────────────────────────────────────────
  {
    id: "tuning_bench",
    name: "Tuning Bench",
    description: "Unlocks part enhancement — spend salvage materials to upgrade a part's condition tier.",
    category: "building",
    maxLevel: 1,
    baseCost: 1500,
    costScaling: 1,
    effect: { type: "unlock_enhancement", valuePerLevel: 1 },
    unlockRequirement: { repPoints: 5000 },
  },
  {
    id: "parts_bin",
    name: "Parts Bin",
    description: "Unlocks salvage crafting — spend materials to fabricate a random part in any category.",
    category: "building",
    maxLevel: 1,
    baseCost: 3000,
    costScaling: 1,
    effect: { type: "unlock_crafting", valuePerLevel: 1 },
    unlockRequirement: { repPoints: 15000 },
  },
  {
    id: "parts_trader",
    name: "Parts Trader",
    description: "Unlocks the trade-up system — combine 3 parts of the same category and condition into 1 of the next tier.",
    category: "building",
    maxLevel: 1,
    baseCost: 8000,
    costScaling: 1,
    effect: { type: "unlock_tradeup", valuePerLevel: 1 },
    unlockRequirement: { repPoints: 50000 },
  },
  {
    id: "artifact_forge",
    name: "Artifact Forge",
    description: "Unlocks the Artifact Forge — spend a Forge Token and rare materials to push Mythic parts to Artifact tier.",
    category: "building",
    maxLevel: 1,
    baseCost: 50000,
    costScaling: 1,
    effect: { type: "unlock_artifact_forge", valuePerLevel: 1 },
    unlockRequirement: { repPoints: 150000 },
  },

  // ── Efficiency (Tick Speed) ──────────────────────────────────────────────────
  {
    id: "tick_accelerator",
    name: "Speed Dial",
    description: "Reduces the global tick interval by 2s per level (max 7 levels: 15s → 1s).",
    category: "maintenance",
    maxLevel: 7,
    baseCost: 500,
    costScaling: 2.5,
    effect: { type: "tick_speed_reduction_ms", valuePerLevel: 2000 },
    unlockRequirement: { repPoints: 500 },
  },
  {
    id: "overclocked_tick",
    name: "Overclocked Engine",
    description: "Further reduces tick interval by 0.45s per level (1s → 0.55s → 0.1s min). Requires Speed Dial maxed.",
    category: "maintenance",
    maxLevel: 2,
    baseCost: 5000,
    costScaling: 2.0,
    effect: { type: "tick_speed_reduction_ms", valuePerLevel: 450 },
    unlockRequirement: { workshopUpgradeId: "tick_accelerator" },
  },
  {
    id: "pit_crew",
    name: "Pit Crew",
    description: "Reduces the ticks needed between auto-races by 1 per level (default 3 ticks, min 1).",
    category: "racing",
    maxLevel: 2,
    baseCost: 2000,
    costScaling: 3.0,
    effect: { type: "race_tick_reduction", valuePerLevel: 1 },
    unlockRequirement: { repPoints: 2000 },
  },

  // ── Hold-to-Scavenge ─────────────────────────────────────────────────────────
  {
    id: "steady_hands",
    name: "Steady Hands",
    description: "Hold the Scavenge button to repeat automatically. Each level speeds it up (–300 ms, base 2 s).",
    category: "scavenging",
    maxLevel: 5,
    baseCost: 75,
    costScaling: 2.0,
    effect: { type: "hold_speed_reduction_ms", valuePerLevel: 300 },
  },
  {
    id: "lightning_fingers",
    name: "Lightning Fingers",
    description: "Further reduces hold-scavenge interval by 100 ms per level.",
    category: "scavenging",
    maxLevel: 3,
    baseCost: 500,
    costScaling: 2.5,
    effect: { type: "hold_speed_reduction_ms", valuePerLevel: 100 },
    unlockRequirement: { workshopUpgradeId: "steady_hands" },
  },
  {
    id: "thorough_search",
    name: "Thorough Search",
    description: "+10 % chance per level to double parts found on any scavenge (click or hold).",
    category: "scavenging",
    maxLevel: 5,
    baseCost: 150,
    costScaling: 2.5,
    effect: { type: "scavenge_double_chance", valuePerLevel: 0.10 },
  },

  // ── New: Scavenging enhancements ─────────────────────────────────────────────
  {
    id: "scavengers_eye",
    name: "Scavenger's Eye",
    description: "Race salvage drop chance increases to 30% and max condition improves to Decent.",
    category: "scavenging",
    maxLevel: 1,
    baseCost: 2500,
    costScaling: 1,
    effect: { type: "salvage_drop_upgrade", valuePerLevel: 1 },
    unlockRequirement: { repPoints: 10000 },
  },
];

export function getUpgradeById(id: string): UpgradeDefinition | undefined {
  return UPGRADE_DEFINITIONS.find((u) => u.id === id);
}

export function getUpgradeCost(def: UpgradeDefinition, currentLevel: number): number {
  return Math.floor(def.baseCost * Math.pow(def.costScaling, currentLevel));
}

export const UPGRADE_CATEGORIES: { id: UpgradeCategory; label: string; icon: string }[] = [
  { id: "scavenging", label: "Scavenging", icon: "🔍" },
  { id: "building", label: "Building", icon: "🔧" },
  { id: "racing", label: "Racing", icon: "🏁" },
  { id: "maintenance", label: "Maintenance", icon: "🛠" },
  { id: "gear_lab", label: "Gear Lab", icon: "✨" },
];
