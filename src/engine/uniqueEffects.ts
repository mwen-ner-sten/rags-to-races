/**
 * Unique/legendary item special effects.
 *
 * Each item with `unique: true` may also have `specialEffectId` that triggers
 * a conditional bonus during race/scavenge resolution. The dispatcher returns
 * flat bonus adjustments which the caller layers on top of the normal
 * GearBonuses aggregation.
 */

import type { LootGearItem } from "@/data/lootGear";
import type { GearSlot } from "@/data/gearSlots";

export type SpecialEffectId =
  | "lucky_fifth_race"     // every 5th race: +50% race_scrap
  | "rain_master"          // DNF reduction doubled when raceContext.weather === "rain"
  | "scrap_magnet"         // each scavenge: +1 bonus scavenge_luck
  | "endurance_burst";     // race_wear_reduction doubled when vehicle at <50% condition

export interface RaceContext {
  /** 1-indexed total race count across lifetime (after increment). */
  lifetimeRaces: number;
  weather?: "clear" | "rain" | "dust";
  vehicleConditionPct?: number;
}

export interface SpecialEffectBonuses {
  race_scrap_multiplier: number;       // 1.0 = no change
  dnf_reduction_bonus: number;         // additive fraction
  wear_reduction_multiplier: number;   // 1.0 = no change
  scavenge_luck_bonus: number;         // additive
}

export function emptySpecialBonuses(): SpecialEffectBonuses {
  return {
    race_scrap_multiplier: 1,
    dnf_reduction_bonus: 0,
    wear_reduction_multiplier: 1,
    scavenge_luck_bonus: 0,
  };
}

export interface UniqueDefinition {
  id: string;
  name: string;
  slot: GearSlot;
  specialEffectId: SpecialEffectId;
  description: string;
}

// Curated legendaries — these are the chase pieces players hunt
export const UNIQUE_ITEMS: UniqueDefinition[] = [
  {
    id: "unique_redline_helm",
    name: "Redline Helm",
    slot: "head",
    specialEffectId: "lucky_fifth_race",
    description: "Every 5th race pays out +50% Scrap Bucks.",
  },
  {
    id: "unique_rainmaker_gloves",
    name: "Rainmaker Gloves",
    slot: "hands",
    specialEffectId: "rain_master",
    description: "DNF reduction doubled on rain tracks.",
  },
  {
    id: "unique_magnet_boots",
    name: "Magnet Boots",
    slot: "feet",
    specialEffectId: "scrap_magnet",
    description: "Each scavenge pull nets +1 luck.",
  },
  {
    id: "unique_iron_lung_vest",
    name: "Iron Lung Vest",
    slot: "body",
    specialEffectId: "endurance_burst",
    description: "Wear reduction doubled when the vehicle is below 50% condition.",
  },
];

export function getUniqueById(id: string): UniqueDefinition | undefined {
  return UNIQUE_ITEMS.find((u) => u.id === id);
}

/** Collect bonuses from all equipped unique items given the current race context. */
export function getRaceSpecialBonuses(
  equippedLootGear: Record<GearSlot, string | null> | undefined,
  lootGearInventory: LootGearItem[] | undefined,
  ctx: RaceContext,
): SpecialEffectBonuses {
  const out = emptySpecialBonuses();
  if (!equippedLootGear || !lootGearInventory) return out;

  for (const id of Object.values(equippedLootGear)) {
    if (!id) continue;
    const item = lootGearInventory.find((g) => g.id === id);
    if (!item?.unique || !item.specialEffectId) continue;

    switch (item.specialEffectId as SpecialEffectId) {
      case "lucky_fifth_race":
        if (ctx.lifetimeRaces > 0 && ctx.lifetimeRaces % 5 === 0) {
          out.race_scrap_multiplier *= 1.5;
        }
        break;
      case "rain_master":
        if (ctx.weather === "rain") {
          out.dnf_reduction_bonus += 0.05; // base bonus then doubled via flag below
        }
        break;
      case "endurance_burst":
        if ((ctx.vehicleConditionPct ?? 100) < 50) {
          out.wear_reduction_multiplier *= 2;
        }
        break;
      default:
        break;
    }
  }
  return out;
}

/** Scavenge-only special bonuses aggregated across equipped uniques. */
export function getScavengeSpecialBonuses(
  equippedLootGear: Record<GearSlot, string | null> | undefined,
  lootGearInventory: LootGearItem[] | undefined,
): SpecialEffectBonuses {
  const out = emptySpecialBonuses();
  if (!equippedLootGear || !lootGearInventory) return out;

  for (const id of Object.values(equippedLootGear)) {
    if (!id) continue;
    const item = lootGearInventory.find((g) => g.id === id);
    if (!item?.unique || !item.specialEffectId) continue;
    if (item.specialEffectId === "scrap_magnet") {
      out.scavenge_luck_bonus += 1;
    }
  }
  return out;
}
