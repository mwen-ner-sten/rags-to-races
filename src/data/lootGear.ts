import type { GearSlot } from "@/data/gearSlots";

export type GearRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export const RARITY_LABELS: Record<GearRarity, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

export const RARITY_COLORS: Record<GearRarity, string> = {
  common: "text-zinc-400",
  uncommon: "text-green-400",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-orange-400",
};

export const RARITY_BORDER: Record<GearRarity, string> = {
  common: "border-zinc-600",
  uncommon: "border-green-700/60",
  rare: "border-blue-700/60",
  epic: "border-purple-700/60",
  legendary: "border-orange-600/70",
};

export const RARITY_BG: Record<GearRarity, string> = {
  common: "bg-zinc-900/50",
  uncommon: "bg-green-900/10",
  rare: "bg-blue-900/10",
  epic: "bg-purple-900/10",
  legendary: "bg-orange-900/10",
};

export interface LootGearEffect {
  type: string;
  value: number;
}

export interface InstalledMod {
  id: string;          // unique instance id
  templateId: string;
  name: string;
  effectType: string;
  value: number;
}

export interface LootGearItem {
  id: string;
  slot: GearSlot;
  rarity: GearRarity;
  name: string;
  effects: LootGearEffect[];
  enhancementLevel: number;  // 0–13
  modSlots: number;          // 0–2 (0 base, +1 at lvl 3, +1 at lvl 7)
  mods: InstalledMod[];
  source: string;            // circuit/location id for flavor
  /** Optional set membership — enables 2pc/4pc bonuses when multiple pieces equipped */
  setId?: string;
  /** Named unique/legendary piece — drives special-effect dispatch */
  unique?: boolean;
  /** Id matched by {@link src/engine/uniqueEffects.ts}. Only meaningful when unique is true */
  specialEffectId?: string;
  /** True when item's effects were migrated from the legacy %-only schema; shown in UI */
  legacy?: boolean;
}

// ── Effect pools per slot ───────────────────────────────────────────────────
// Each entry: [effectType, baseMin, baseMax]
type EffectPool = [string, number, number][];

export const LOOT_EFFECT_POOLS: Record<GearSlot, EffectPool> = {
  head: [
    ["scavenge_luck_bonus",      0.02, 0.06],
    ["race_dnf_reduction",       0.02, 0.05],
    ["race_wear_reduction_pct",  0.02, 0.06],
    ["race_performance_pct",     0.02, 0.05],
  ],
  body: [
    ["build_cost_reduction_pct",  0.03, 0.07],
    ["repair_cost_reduction_pct", 0.03, 0.07],
    ["race_wear_reduction_pct",   0.02, 0.06],
    ["race_performance_pct",      0.02, 0.05],
  ],
  hands: [
    ["build_cost_reduction_pct",  0.03, 0.08],
    ["refurb_cost_reduction_pct", 0.03, 0.08],
    ["scavenge_luck_bonus",       0.02, 0.05],
    ["scavenge_yield_pct",        0.02, 0.06],
  ],
  feet: [
    ["scavenge_luck_bonus",   0.02, 0.05],
    ["scavenge_yield_pct",    0.02, 0.06],
    ["race_handling_pct",     0.02, 0.05],
    ["race_performance_pct",  0.02, 0.05],
  ],
  tool: [
    ["build_cost_reduction_pct",  0.03, 0.08],
    ["repair_cost_reduction_pct", 0.03, 0.08],
    ["refurb_cost_reduction_pct", 0.03, 0.08],
    ["sell_value_bonus_pct",      0.03, 0.07],
  ],
  accessory: [
    ["sell_value_bonus_pct",   0.03, 0.08],
    ["race_scrap_bonus_pct",   0.03, 0.08],
    ["scavenge_yield_pct",     0.02, 0.06],
    ["race_handling_pct",      0.02, 0.05],
  ],
};

// ── Attribute roll ranges by rarity ─────────────────────────────────────────
// Primary attribute roll (1 per item) and secondary rolls (count depends on rarity)
// Values are integer +N attribute points.
export const RARITY_PRIMARY_RANGE: Record<GearRarity, [number, number]> = {
  common:    [2, 3],
  uncommon:  [3, 5],
  rare:      [5, 8],
  epic:      [8, 12],
  legendary: [12, 18],
};

export const RARITY_SECONDARY_RANGE: Record<GearRarity, [number, number]> = {
  common:    [0, 0],
  uncommon:  [1, 2],
  rare:      [2, 4],
  epic:      [3, 6],
  legendary: [5, 9],
};

// How many secondary affixes each rarity rolls
export const RARITY_SECONDARY_COUNT: Record<GearRarity, number> = {
  common:    0,
  uncommon:  1,
  rare:      1,
  epic:      2,
  legendary: 2,
};

// Rarity multiplier ranges [min, max] applied to base effect ranges
// (legacy % pools — retained during transition, removed in Phase 2)
export const RARITY_VALUE_MULTS: Record<GearRarity, [number, number]> = {
  common:    [0.5,  0.8],
  uncommon:  [0.8,  1.2],
  rare:      [1.2,  1.8],
  epic:      [1.8,  2.5],
  legendary: [2.5,  4.0],
};

// How many effects each rarity rolls [min, max]
export const RARITY_EFFECT_COUNT: Record<GearRarity, [number, number]> = {
  common:    [1, 1],
  uncommon:  [1, 2],
  rare:      [2, 3],
  epic:      [3, 4],
  legendary: [4, 5],
};

// ── Name generation ─────────────────────────────────────────────────────────
const RARITY_PREFIXES: Record<GearRarity, string[]> = {
  common:    ["Battered", "Worn", "Scuffed", "Grimy", "Dusty"],
  uncommon:  ["Decent", "Solid", "Trusty", "Steady", "Clean"],
  rare:      ["Polished", "Refined", "Quality", "Sharp", "Precise"],
  epic:      ["Superior", "Exceptional", "Flawless", "Prime", "Elite"],
  legendary: ["Legendary", "Champion's", "Mythic", "Godlike", "Ultimate"],
};

const SLOT_BASE_NAMES: Record<GearSlot, string[]> = {
  head:      ["Helmet", "Crown", "Visor", "Goggles", "Cap", "Headgear"],
  body:      ["Suit", "Jacket", "Coveralls", "Vest", "Armor", "Kit"],
  hands:     ["Gloves", "Grips", "Gauntlets", "Wraps", "Mitts"],
  feet:      ["Boots", "Kicks", "Treads", "Stompers", "Racers"],
  tool:      ["Wrench", "Toolkit", "Rig", "Loadout", "Arsenal"],
  accessory: ["Badge", "Talisman", "Charm", "Emblem", "Keepsake", "Tag"],
};

export function generateLootName(slot: GearSlot, rarity: GearRarity): string {
  const prefixes = RARITY_PREFIXES[rarity];
  const bases = SLOT_BASE_NAMES[slot];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const base = bases[Math.floor(Math.random() * bases.length)];
  return `${prefix} ${base}`;
}

// ── Rarity drop weights indexed by tier (0–5) ───────────────────────────────
// Used by gearDrop.ts
export const RARITY_WEIGHTS_BY_TIER: Record<number, Record<GearRarity, number>> = {
  0: { common: 70, uncommon: 25, rare: 5,  epic: 0,  legendary: 0 },
  1: { common: 55, uncommon: 32, rare: 12, epic: 1,  legendary: 0 },
  2: { common: 40, uncommon: 35, rare: 20, epic: 4,  legendary: 1 },
  3: { common: 25, uncommon: 35, rare: 28, epic: 10, legendary: 2 },
  4: { common: 15, uncommon: 30, rare: 30, epic: 20, legendary: 5 },
  5: { common: 10, uncommon: 25, rare: 30, epic: 25, legendary: 10 },
};
