import { GEAR_SETS, equippedSetCounts, type GearSetId } from "@/data/gearSets";
import { GEAR_SLOTS, type GearSlot, type LootGearItem } from "@/data/lootGear";
import type { GarageStationSlot } from "@/data/garageStations";
import type { StationEquipment } from "@/data/stationEquipment";
import { getStationEquipmentBonuses } from "./stationEquipment";
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
  /** Fraction of fatigue gain removed per race (0.0–1.0) */
  fatigue_rate_reduction: number;
  fatigue_recovery_pct: number;
  /** Fraction bonus to material yield on decompose (e.g. 0.15 = +15%) */
  material_bonus_pct: number;
  /** Additive bonus to forge token drop chance (e.g. 0.01 = +1%) */
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
  fatigue_recovery_pct: 0,
  material_bonus_pct: 0,
  forge_token_chance_bonus: 0,
};

/**
 * Aggregate every equipped loot gear item's effects (enhanced effects + mods)
 * and the shared garage station equipment into a flat bonus map. Slots with
 * nothing equipped contribute nothing.
 */
export function getGearBonuses(
  equippedLootGear: Record<GearSlot, string | null>,
  lootGearInventory: LootGearItem[],
  equippedStationEquipment?: Record<GarageStationSlot, string | null>,
  stationEquipmentInventory?: StationEquipment[],
): GearBonuses {
  const bonuses = { ...EMPTY_BONUSES };

  for (const slot of GEAR_SLOTS) {
    const lootId = equippedLootGear[slot];
    if (!lootId) continue;
    const lootItem = lootGearInventory.find((g) => g.id === lootId);
    if (!lootItem) continue;
    for (const effect of getTotalEffects(lootItem)) {
      if (effect.type in bonuses) {
        bonuses[effect.type as keyof GearBonuses] += effect.value;
      }
    }
  }

  const sets = equippedSetCounts(equippedLootGear, lootGearInventory);
  for (const id of Object.keys(sets) as GearSetId[]) for (const effect of GEAR_SETS[id].bonuses) {
    if (sets[id] >= effect.pieces) bonuses[effect.type] += effect.value;
  }
  const stationBonuses = getStationEquipmentBonuses(equippedStationEquipment, stationEquipmentInventory);
  for (const [key, value] of Object.entries(stationBonuses)) bonuses[key as keyof GearBonuses] += value;
  return bonuses;
}
