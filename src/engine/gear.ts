import { GEAR_SLOTS, getGearById, type GearSlot } from "@/data/gear";
import type { LootGearItem } from "@/data/lootGear";
import type { TalentNode } from "@/data/talentNodes";
import { getTotalEffects } from "@/engine/gearEnhance";

export interface GearBonuses {
  scavenge_luck_bonus: number;
  scavenge_yield_pct: number;
  sell_value_bonus_pct: number;
  race_performance_pct: number;
  race_dnf_reduction: number;
  race_handling_pct: number;
  race_wear_reduction_pct: number;
  race_scrap_bonus_pct: number;
  build_cost_reduction_pct: number;
  repair_cost_reduction_pct: number;
  refurb_cost_reduction_pct: number;
  tick_speed_reduction_ms: number;
  /** Talent-only: fraction of fatigue gain removed per race (0.0–1.0) */
  fatigue_rate_reduction: number;
  /** Talent-only: fraction bonus to material yield on decompose (e.g. 0.15 = +15%) */
  material_bonus_pct: number;
  /** Talent-only: additive bonus to forge token drop chance (e.g. 0.01 = +1%) */
  forge_token_chance_bonus: number;
}

const EMPTY_BONUSES: GearBonuses = {
  scavenge_luck_bonus: 0,
  scavenge_yield_pct: 0,
  sell_value_bonus_pct: 0,
  race_performance_pct: 0,
  race_dnf_reduction: 0,
  race_handling_pct: 0,
  race_wear_reduction_pct: 0,
  race_scrap_bonus_pct: 0,
  build_cost_reduction_pct: 0,
  repair_cost_reduction_pct: 0,
  refurb_cost_reduction_pct: 0,
  tick_speed_reduction_ms: 0,
  fatigue_rate_reduction: 0,
  material_bonus_pct: 0,
  forge_token_chance_bonus: 0,
};

/**
 * Aggregate all equipped gear effects into a flat bonus map.
 *
 * Priority per slot:
 * - If a loot gear item is equipped in that slot, use its enhanced effects + mods
 * - Otherwise fall back to the static gear item
 *
 * Talent node passives are always added on top.
 */
export function getGearBonuses(
  equippedGear: Record<GearSlot, string>,
  equippedLootGear?: Record<GearSlot, string | null>,
  lootGearInventory?: LootGearItem[],
  unlockedTalentNodes?: string[],
  talentNodeDefs?: TalentNode[],
): GearBonuses {
  const bonuses = { ...EMPTY_BONUSES };

  for (const slot of GEAR_SLOTS) {
    const lootId = equippedLootGear?.[slot];

    if (lootId) {
      // Use loot gear (enhanced effects + mods)
      const lootItem = lootGearInventory?.find((g) => g.id === lootId);
      if (lootItem) {
        for (const effect of getTotalEffects(lootItem)) {
          if (effect.type in bonuses) {
            bonuses[effect.type as keyof GearBonuses] += effect.value;
          }
        }
        continue; // skip static gear for this slot
      }
    }

    // Fall back to static gear
    const gearId = equippedGear[slot];
    if (!gearId) continue;
    const def = getGearById(gearId);
    if (!def) continue;
    for (const effect of def.effects) {
      if (effect.type in bonuses) {
        bonuses[effect.type as keyof GearBonuses] += effect.value;
      }
    }
  }

  // Add talent node passive bonuses
  if (unlockedTalentNodes && talentNodeDefs) {
    for (const nodeId of unlockedTalentNodes) {
      const node = talentNodeDefs.find((n) => n.id === nodeId);
      if (!node) continue;
      if (node.effect.type in bonuses) {
        bonuses[node.effect.type as keyof GearBonuses] += node.effect.value;
      }
    }
  }

  return bonuses;
}
