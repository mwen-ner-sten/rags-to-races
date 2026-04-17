import type { LootGearItem, LootGearEffect, GearRarity } from "@/data/lootGear";
import { parseAttributeEffectType } from "@/data/gearAttributes";

// Base cost per rarity
const RARITY_BASE_COST: Record<GearRarity, number> = {
  common:    50,
  uncommon:  150,
  rare:      500,
  epic:      2000,
  legendary: 10000,
};

// Default max enhancement level (without workshop upgrades)
const BASE_MAX_ENHANCE = 4;

// Each enhancement_mastery level adds 3 to the cap
const MASTERY_BONUS_PER_LEVEL = 3;

// Absolute maximum regardless of upgrades
const HARD_MAX_ENHANCE = 13;

/**
 * Cost to enhance from current level to level+1.
 * Formula: floor(baseCost * (currentLevel + 1)^1.8)
 */
export function getEnhancementCost(item: LootGearItem): number {
  const base = RARITY_BASE_COST[item.rarity];
  const level = item.enhancementLevel;
  return Math.floor(base * Math.pow(level + 1, 1.8));
}

/** Maximum enhancement level given workshop mastery level (0–3) */
export function getMaxEnhancementLevel(masteryLevel: number): number {
  return Math.min(
    BASE_MAX_ENHANCE + masteryLevel * MASTERY_BONUS_PER_LEVEL,
    HARD_MAX_ENHANCE,
  );
}

/**
 * Returns the effective (post-enhancement) effect values.
 * Each effect is multiplied by (1 + enhancementLevel * 0.12).
 * Mods are added on top as flat bonuses.
 */
export function getEnhancedEffects(item: LootGearItem): LootGearEffect[] {
  const mult = 1 + item.enhancementLevel * 0.12;
  return item.effects.map((e) => {
    const scaled = e.value * mult;
    // Attribute grants are integer +points; round after scaling for clean display.
    const value = parseAttributeEffectType(e.type)
      ? Math.round(scaled)
      : parseFloat(scaled.toFixed(4));
    return { type: e.type, value };
  });
}

/**
 * How many mod slots the item has at its current enhancement level.
 * 0 slots: lvl 0–2, 1 slot: lvl 3–6, 2 slots: lvl 7+
 */
export function getModSlots(enhancementLevel: number): number {
  if (enhancementLevel >= 7) return 2;
  if (enhancementLevel >= 3) return 1;
  return 0;
}

/**
 * Returns the total effective effects for a loot gear item:
 * enhanced base effects + all mod effects (flat).
 */
export function getTotalEffects(item: LootGearItem): LootGearEffect[] {
  const enhanced = getEnhancedEffects(item);
  const byType = new Map<string, number>();

  for (const e of enhanced) {
    byType.set(e.type, (byType.get(e.type) ?? 0) + e.value);
  }
  for (const mod of item.mods) {
    byType.set(mod.effectType, (byType.get(mod.effectType) ?? 0) + mod.value);
  }

  return Array.from(byType.entries()).map(([type, value]) => {
    const rounded = parseAttributeEffectType(type)
      ? Math.round(value)
      : parseFloat(value.toFixed(4));
    return { type, value: rounded };
  });
}

/**
 * Scrap value when salvaging loot gear.
 * Base scales with rarity, enhanced by salvage_value_bonus workshop upgrade.
 */
const RARITY_SALVAGE_BASE: Record<GearRarity, number> = {
  common:    15,
  uncommon:  50,
  rare:      200,
  epic:      800,
  legendary: 4000,
};

export function getSalvageValue(item: LootGearItem, salvageBonusMult: number): number {
  const base = RARITY_SALVAGE_BASE[item.rarity];
  const enhancementBonus = item.enhancementLevel * 0.15;
  return Math.floor(base * (1 + enhancementBonus) * (1 + salvageBonusMult));
}
