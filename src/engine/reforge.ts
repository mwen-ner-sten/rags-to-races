import type { GearSlot } from "@/data/gearSlots";
import {
  RARITY_SECONDARY_RANGE,
  RARITY_SECONDARY_COUNT,
  type GearRarity,
  type LootGearItem,
} from "@/data/lootGear";
import {
  SLOT_AFFINITIES,
  attributeEffectType,
  parseAttributeEffectType,
  type GearAttributeId,
} from "@/data/gearAttributes";
import { randInt } from "@/utils/random";

// ── Reforge Shards (new currency) ───────────────────────────────────────────
// Earned by salvaging gear. Spent to re-roll the secondary affixes on a kept
// piece while preserving its primary.
export const SHARDS_PER_SALVAGE: Record<GearRarity, number> = {
  common:    1,
  uncommon:  3,
  rare:      10,
  epic:      40,
  legendary: 200,
};

export const REFORGE_COST_SHARDS: Record<GearRarity, number> = {
  common:    2,
  uncommon:  5,
  rare:      15,
  epic:      50,
  legendary: 250,
};

/**
 * Re-roll all secondary attribute affixes on an item, preserving the primary.
 * Non-attribute legacy effects are left alone.
 */
export function reforgeItem(item: LootGearItem): LootGearItem {
  // Find the primary attribute effect (first attribute effect in list)
  const attrEffects = item.effects.filter((e) => parseAttributeEffectType(e.type));
  const nonAttrEffects = item.effects.filter((e) => !parseAttributeEffectType(e.type));
  if (attrEffects.length === 0) return item;

  const primary = attrEffects[0];
  const primaryId = parseAttributeEffectType(primary.type);
  if (!primaryId) return item;

  // Re-roll secondaries
  const slot = item.slot as GearSlot;
  const affinity = SLOT_AFFINITIES[slot];
  const used = new Set<GearAttributeId>([primaryId]);
  const pool = [...affinity.secondary, ...affinity.primary].filter((id) => !used.has(id));

  const count = RARITY_SECONDARY_COUNT[item.rarity];
  const [sMin, sMax] = RARITY_SECONDARY_RANGE[item.rarity];
  const newSecondaries: LootGearItem["effects"] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = randInt(0, pool.length - 1);
    const id = pool.splice(idx, 1)[0];
    const value = randInt(sMin, sMax);
    if (value <= 0) continue;
    newSecondaries.push({ type: attributeEffectType(id), value });
    used.add(id);
  }

  return {
    ...item,
    effects: [primary, ...newSecondaries, ...nonAttrEffects],
  };
}
