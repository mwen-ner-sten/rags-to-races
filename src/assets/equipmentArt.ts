import type { GearRarity } from "@/data/lootGear";
import { GARAGE_STATION_IDS, type GarageStationSlot } from "@/data/garageStations";

export const STATION_SET_IDS = ["grease_monkey", "redline", "scrapper", "slipstream"] as const;
export type StationSet = (typeof STATION_SET_IDS)[number];

export const EQUIPMENT_AFFIX_ART_IDS = ["engineering", "sourcing", "repair", "speed", "handling", "logistics"] as const;
export type EquipmentAffixArt = (typeof EQUIPMENT_AFFIX_ART_IDS)[number];

export interface EquipmentArtVariant {
  slot: GarageStationSlot;
  rarity: GearRarity;
  set?: StationSet;
  affixes: EquipmentAffixArt[];
}

export interface ComposedEquipmentArt {
  silhouette: string;
  rarityFrame: string;
  setMotif?: string;
  affixOverlays: string[];
}

export const EQUIPMENT_SILHOUETTES = Object.fromEntries(
  GARAGE_STATION_IDS.map((slot) => [slot, `/sprites/stations/${slot}.png`]),
) as Record<GarageStationSlot, string>;

export function composeEquipmentArt(variant: EquipmentArtVariant): ComposedEquipmentArt {
  return {
    silhouette: EQUIPMENT_SILHOUETTES[variant.slot],
    rarityFrame: `/sprites/equipment/rarity/${variant.rarity}.png`,
    setMotif: variant.set ? `/sprites/equipment/sets/${variant.set}.png` : undefined,
    affixOverlays: variant.affixes.map((affix) => `/sprites/equipment/affixes/${affix}.png`),
  };
}
