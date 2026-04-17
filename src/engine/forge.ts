import type { GearSlot } from "@/data/gearSlots";
import {
  RARITY_PRIMARY_RANGE,
  RARITY_SECONDARY_RANGE,
  RARITY_SECONDARY_COUNT,
  generateLootName,
  type GearRarity,
  type LootGearItem,
} from "@/data/lootGear";
import {
  SLOT_AFFINITIES,
  attributeEffectType,
  type GearAttributeId,
} from "@/data/gearAttributes";
import { GEAR_SETS } from "@/data/gearSets";
import { randInt } from "@/utils/random";

// ── Forge costs ─────────────────────────────────────────────────────────────
export const FORGE_COST: Record<GearRarity, number> = {
  common:    250,
  uncommon:  750,
  rare:      2500,
  epic:      10000,
  legendary: 50000,
};

let _forgeCounter = 0;
function makeForgeId(): string {
  return `forged_${Date.now()}_${_forgeCounter++}`;
}

function rollForgedEffects(slot: GearSlot, rarity: GearRarity): LootGearItem["effects"] {
  const affinity = SLOT_AFFINITIES[slot];
  const effects: LootGearItem["effects"] = [];
  const used = new Set<GearAttributeId>();

  const primary = affinity.primary[randInt(0, affinity.primary.length - 1)];
  const [pMin, pMax] = RARITY_PRIMARY_RANGE[rarity];
  effects.push({ type: attributeEffectType(primary), value: randInt(pMin, pMax) });
  used.add(primary);

  const count = RARITY_SECONDARY_COUNT[rarity];
  const [sMin, sMax] = RARITY_SECONDARY_RANGE[rarity];
  const pool = [...affinity.secondary, ...affinity.primary].filter((id) => !used.has(id));
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = randInt(0, pool.length - 1);
    const id = pool.splice(idx, 1)[0];
    const value = randInt(sMin, sMax);
    if (value <= 0) continue;
    effects.push({ type: attributeEffectType(id), value });
    used.add(id);
  }
  return effects;
}

/** Forge a new LootGearItem at the specified slot + rarity. Deterministic shape, random affixes. */
export function forgeItem(slot: GearSlot, rarity: GearRarity): LootGearItem {
  // Crafted items never roll with set membership (kept pure).
  // Could add a rare chance to roll a set piece later.
  const _unusedSets = GEAR_SETS.length; // keep import referenced for future use
  void _unusedSets;

  return {
    id: makeForgeId(),
    slot,
    rarity,
    name: generateLootName(slot, rarity),
    effects: rollForgedEffects(slot, rarity),
    enhancementLevel: 0,
    modSlots: 0,
    mods: [],
    source: "Forge",
  };
}
