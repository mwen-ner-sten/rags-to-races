import type { LootGearItem, GearSlot } from "./lootGear";
import type { MaterialType } from "./materials";

export const GEAR_SETS = {
  junkyard_dog: { name: "Junkyard Dog", material: "metalScrap" as MaterialType, bonuses: [
    { pieces: 2, type: "scavenge_luck_bonus", value: 0.05 }, { pieces: 4, type: "sell_value_bonus_pct", value: 0.1 }, { pieces: 6, type: "scavenge_yield_pct", value: 0.15 }] },
  track_rat: { name: "Track Rat", material: "rubberCompound" as MaterialType, bonuses: [
    { pieces: 2, type: "race_performance_pct", value: 0.05 }, { pieces: 4, type: "race_dnf_reduction", value: 0.03 }, { pieces: 6, type: "race_performance_pct", value: 0.1 }] },
  iron_lungs: { name: "Iron Lungs", material: "carbonDust" as MaterialType, bonuses: [
    { pieces: 2, type: "fatigue_rate_reduction", value: 0.05 }, { pieces: 4, type: "fatigue_recovery_pct", value: 0.2 }, { pieces: 6, type: "fatigue_rate_reduction", value: 0.1 }] },
} as const;
export type GearSetId = keyof typeof GEAR_SETS;
export function equippedSetCounts(equipped: Record<GearSlot, string | null>, inventory: LootGearItem[]): Record<GearSetId, number> {
  const counts = { junkyard_dog: 0, track_rat: 0, iron_lungs: 0 };
  for (const id of new Set(Object.values(equipped))) {
    const item = inventory.find((g) => g.id === id);
    if (item?.setId && item.setId in counts) counts[item.setId]++;
  }
  return counts;
}
export function gearSalvageMaterials(item: LootGearItem): Partial<Record<MaterialType, number>> {
  if (!item.setId || !(item.setId in GEAR_SETS)) return {};
  return { [GEAR_SETS[item.setId].material]: 1 + item.enhancementLevel };
}
