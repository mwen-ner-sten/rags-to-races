import { GEAR_SLOTS, type GearSlot } from "@/data/gearSlots";
import { getGearById } from "@/data/gear";
import type { LootGearItem } from "@/data/lootGear";
import type { TalentNode } from "@/data/talentNodes";
import { getTotalEffects } from "@/engine/gearEnhance";
import {
  GEAR_ATTRIBUTES,
  parseAttributeEffectType,
  type GearAttributeId,
} from "@/data/gearAttributes";
import { getActiveSetEffects } from "@/engine/gearSets";
import { getScavengeSpecialBonuses } from "@/engine/uniqueEffects";

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

// ── Attribute sums ─────────────────────────────────────────────────────────
export type GearAttributes = Record<GearAttributeId, number>;

export function emptyGearAttributes(): GearAttributes {
  const out = {} as GearAttributes;
  for (const id of GEAR_ATTRIBUTES) out[id] = 0;
  return out;
}

/**
 * Per-attribute contribution to each field of {@link GearBonuses}, per +1 point.
 * Tuning table — keep this the single source of truth for the mapping.
 */
export const ATTRIBUTE_DERIVATION: Record<
  GearAttributeId,
  Partial<Record<keyof GearBonuses, number>>
> = {
  reflexes: { race_handling_pct: 0.005 },
  endurance: { race_wear_reduction_pct: 0.005 },
  instinct: { race_dnf_reduction: 0.003 },
  engineering: {
    build_cost_reduction_pct: 0.005,
    repair_cost_reduction_pct: 0.005,
    refurb_cost_reduction_pct: 0.005,
  },
  charisma: { race_scrap_bonus_pct: 0.005 },
  fortune: {
    scavenge_luck_bonus: 0.002,
    sell_value_bonus_pct: 0.005,
    race_scrap_bonus_pct: 0.005,
  },
  power: { race_performance_pct: 0.01 },
  grip: { race_handling_pct: 0.008 },
  aero: { race_dnf_reduction: 0.004, race_wear_reduction_pct: 0.003 },
  weight_reduction: { race_handling_pct: 0.003, race_scrap_bonus_pct: 0.002 },
};

/** Convert raw attribute sums into derived GearBonuses fields. */
export function deriveBonusesFromAttributes(attrs: GearAttributes): GearBonuses {
  const out = { ...EMPTY_BONUSES };
  for (const id of GEAR_ATTRIBUTES) {
    const points = attrs[id] ?? 0;
    if (points === 0) continue;
    const contrib = ATTRIBUTE_DERIVATION[id];
    for (const [field, perPoint] of Object.entries(contrib)) {
      const key = field as keyof GearBonuses;
      out[key] += points * perPoint;
    }
  }
  return out;
}

/**
 * Aggregate attribute-point totals across equipped loot gear + unlocked talents.
 * Attribute grants ride on effects with `type: "attribute_<id>"`.
 */
export function getGearAttributes(
  equippedLootGear?: Record<GearSlot, string | null>,
  lootGearInventory?: LootGearItem[],
  unlockedTalentNodes?: string[],
  talentNodeDefs?: TalentNode[],
): GearAttributes {
  const attrs = emptyGearAttributes();

  for (const slot of GEAR_SLOTS) {
    const lootId = equippedLootGear?.[slot];
    if (!lootId) continue;
    const item = lootGearInventory?.find((g) => g.id === lootId);
    if (!item) continue;
    for (const effect of getTotalEffects(item)) {
      const id = parseAttributeEffectType(effect.type);
      if (id) attrs[id] += effect.value;
    }
  }

  if (unlockedTalentNodes && talentNodeDefs) {
    for (const nodeId of unlockedTalentNodes) {
      const node = talentNodeDefs.find((n) => n.id === nodeId);
      if (!node) continue;
      const id = parseAttributeEffectType(node.effect.type);
      if (id) attrs[id] += node.effect.value;
    }
  }

  // Set bonuses can grant attribute points too
  for (const effect of getActiveSetEffects(equippedLootGear, lootGearInventory)) {
    const id = parseAttributeEffectType(effect.type);
    if (id) attrs[id] += effect.value;
  }

  return attrs;
}

/** Add source bonuses (from any GearBonuses shape) into a target, mutating target. */
function addBonuses(target: GearBonuses, source: GearBonuses): void {
  for (const key of Object.keys(target) as (keyof GearBonuses)[]) {
    target[key] += source[key];
  }
}

/**
 * Aggregate all equipped gear effects into a flat bonus map.
 *
 * Sources combined:
 * - Loot gear: raw non-attribute effects (legacy %s) + derived effects from attribute grants
 * - Static gear (per slot, only if no loot gear equipped there): raw % effects (legacy, being retired)
 * - Talent nodes: raw % effects OR attribute grants (derived like gear)
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
      const lootItem = lootGearInventory?.find((g) => g.id === lootId);
      if (lootItem) {
        for (const effect of getTotalEffects(lootItem)) {
          // Attribute effects are handled via derivation, not directly
          if (parseAttributeEffectType(effect.type)) continue;
          if (effect.type in bonuses) {
            bonuses[effect.type as keyof GearBonuses] += effect.value;
          }
        }
        continue; // skip static gear for this slot
      }
    }

    // Fall back to static gear (legacy path — retired in Phase 2)
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

  // Talent node passives (raw non-attribute effects only here)
  if (unlockedTalentNodes && talentNodeDefs) {
    for (const nodeId of unlockedTalentNodes) {
      const node = talentNodeDefs.find((n) => n.id === nodeId);
      if (!node) continue;
      if (parseAttributeEffectType(node.effect.type)) continue;
      if (node.effect.type in bonuses) {
        bonuses[node.effect.type as keyof GearBonuses] += node.effect.value;
      }
    }
  }

  // Layer in non-attribute set bonuses (raw % effects)
  for (const effect of getActiveSetEffects(equippedLootGear, lootGearInventory)) {
    if (parseAttributeEffectType(effect.type)) continue;
    if (effect.type in bonuses) {
      bonuses[effect.type as keyof GearBonuses] += effect.value;
    }
  }

  // Now layer attribute-derived bonuses on top (uses the combined attrs
  // including set bonuses, via getGearAttributes)
  const attrs = getGearAttributes(
    equippedLootGear,
    lootGearInventory,
    unlockedTalentNodes,
    talentNodeDefs,
  );
  addBonuses(bonuses, deriveBonusesFromAttributes(attrs));

  // Layer passive unique-item bonuses that apply anywhere (scavenge-side)
  const scavSpecial = getScavengeSpecialBonuses(equippedLootGear, lootGearInventory);
  bonuses.scavenge_luck_bonus += scavSpecial.scavenge_luck_bonus;

  return bonuses;
}
