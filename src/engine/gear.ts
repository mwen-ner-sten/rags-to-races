import { GEAR_SLOTS, getGearById, type GearSlot } from "@/data/gear";

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
};

/** Aggregate all equipped gear effects into a flat bonus map. */
export function getGearBonuses(equippedGear: Record<GearSlot, string>): GearBonuses {
  const bonuses = { ...EMPTY_BONUSES };

  for (const slot of GEAR_SLOTS) {
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

  return bonuses;
}
