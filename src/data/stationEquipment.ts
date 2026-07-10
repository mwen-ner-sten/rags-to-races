import type { GarageStationSlot } from "./garageStations";
import type { GearSlot } from "./gear";
import type { LootGearItem } from "./lootGear";

export type StationEquipmentRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type StationAttribute = "reflexes" | "endurance" | "instinct" | "engineering" | "charisma" | "fortune" | "power" | "grip" | "aero" | "weight_reduction";
export type StationSetId = "grease_monkey" | "redline" | "scrapper" | "slipstream";

export type StationEquipmentEffect =
  | { type: "attribute"; attribute: StationAttribute; value: number }
  | { type: "bonus"; bonus: "scavenge_luck_bonus" | "scavenge_yield_pct" | "sell_value_bonus_pct" | "race_performance_pct" | "race_dnf_reduction" | "race_handling_pct" | "race_wear_reduction_pct" | "race_scrap_bonus_pct" | "build_cost_reduction_pct" | "repair_cost_reduction_pct" | "refurb_cost_reduction_pct" | "tick_speed_reduction_ms" | "fatigue_rate_reduction" | "material_bonus_pct" | "forge_token_chance_bonus"; value: number };

export interface StationEquipment {
  id: string;
  slot: GarageStationSlot;
  rarity: StationEquipmentRarity;
  name: string;
  effects: StationEquipmentEffect[];
  enhancementLevel: number;
  setId?: StationSetId;
  source: string;
}

export const STATION_ATTRIBUTES: StationAttribute[] = ["reflexes", "endurance", "instinct", "engineering", "charisma", "fortune", "power", "grip", "aero", "weight_reduction"];
export const ATTRIBUTE_LABELS: Record<StationAttribute, string> = { reflexes: "Reflexes", endurance: "Endurance", instinct: "Instinct", engineering: "Engineering", charisma: "Charisma", fortune: "Fortune", power: "Power", grip: "Grip", aero: "Aero", weight_reduction: "Weight Reduction" };

export const STATION_AFFINITIES: Record<GarageStationSlot, { primary: StationAttribute[]; secondary: StationAttribute[] }> = {
  diagnostics: { primary: ["instinct", "aero"], secondary: ["reflexes", "fortune", "endurance", "power"] },
  lift: { primary: ["endurance", "aero"], secondary: ["engineering", "weight_reduction", "instinct", "power"] },
  workbench: { primary: ["engineering", "grip"], secondary: ["reflexes", "fortune", "power", "charisma"] },
  logistics: { primary: ["reflexes", "grip"], secondary: ["weight_reduction", "endurance", "instinct", "aero"] },
  fabrication: { primary: ["engineering", "power"], secondary: ["fortune", "weight_reduction", "instinct", "charisma"] },
  pit_equipment: { primary: ["fortune", "charisma"], secondary: ["instinct", "engineering", "power", "reflexes"] },
};

export const RARITY_PRIMARY_RANGE: Record<StationEquipmentRarity, [number, number]> = { common: [2, 3], uncommon: [3, 5], rare: [5, 8], epic: [8, 12], legendary: [12, 18] };
export const RARITY_SECONDARY_RANGE: Record<StationEquipmentRarity, [number, number]> = { common: [0, 0], uncommon: [1, 2], rare: [2, 4], epic: [3, 6], legendary: [5, 9] };
export const RARITY_SECONDARY_COUNT: Record<StationEquipmentRarity, number> = { common: 0, uncommon: 1, rare: 1, epic: 2, legendary: 2 };

export const STATION_SETS: { id: StationSetId; name: string; slots: GarageStationSlot[]; tiers: { piecesRequired: number; effects: StationEquipmentEffect[]; description: string }[] }[] = [
  { id: "grease_monkey", name: "Grease Monkey", slots: ["diagnostics", "lift", "workbench", "fabrication"], tiers: [{ piecesRequired: 2, description: "+5 Engineering", effects: [{ type: "attribute", attribute: "engineering", value: 5 }] }, { piecesRequired: 4, description: "-15% repair cost and +10 Engineering total", effects: [{ type: "attribute", attribute: "engineering", value: 5 }, { type: "bonus", bonus: "repair_cost_reduction_pct", value: 0.15 }] }] },
  { id: "redline", name: "Redline", slots: ["diagnostics", "lift", "logistics", "pit_equipment"], tiers: [{ piecesRequired: 2, description: "+10 Power", effects: [{ type: "attribute", attribute: "power", value: 10 }] }, { piecesRequired: 4, description: "+5% race performance and +15 Power total", effects: [{ type: "attribute", attribute: "power", value: 5 }, { type: "bonus", bonus: "race_performance_pct", value: 0.05 }] }] },
  { id: "scrapper", name: "Scrapper", slots: ["workbench", "logistics", "fabrication", "pit_equipment"], tiers: [{ piecesRequired: 2, description: "+5 Fortune", effects: [{ type: "attribute", attribute: "fortune", value: 5 }] }, { piecesRequired: 4, description: "+15% scavenge yield and +8 Fortune total", effects: [{ type: "attribute", attribute: "fortune", value: 3 }, { type: "bonus", bonus: "scavenge_yield_pct", value: 0.15 }] }] },
  { id: "slipstream", name: "Slipstream", slots: ["diagnostics", "lift", "logistics", "pit_equipment"], tiers: [{ piecesRequired: 2, description: "+8 Aero", effects: [{ type: "attribute", attribute: "aero", value: 8 }] }, { piecesRequired: 4, description: "-5% DNF risk and +12 Aero total", effects: [{ type: "attribute", attribute: "aero", value: 4 }, { type: "bonus", bonus: "race_dnf_reduction", value: 0.05 }] }] },
];

const LEGACY_SLOT_TO_STATION: Record<GearSlot, GarageStationSlot> = { head: "diagnostics", body: "lift", hands: "workbench", feet: "logistics", tool: "fabrication", accessory: "pit_equipment" };
const STATION_BONUS_IDS = new Set(["scavenge_luck_bonus", "scavenge_yield_pct", "sell_value_bonus_pct", "race_performance_pct", "race_dnf_reduction", "race_handling_pct", "race_wear_reduction_pct", "race_scrap_bonus_pct", "build_cost_reduction_pct", "repair_cost_reduction_pct", "refurb_cost_reduction_pct", "tick_speed_reduction_ms", "fatigue_rate_reduction", "material_bonus_pct", "forge_token_chance_bonus"]);

/** Compatibility bridge for old drop tables while all acquisition paths move to station-native definitions. */
export function convertLegacyLootDrop(item: LootGearItem): StationEquipment {
  const effects: StationEquipmentEffect[] = item.effects.flatMap((effect) => STATION_BONUS_IDS.has(effect.type)
    ? [{ type: "bonus" as const, bonus: effect.type as Extract<StationEquipmentEffect, { type: "bonus" }>["bonus"], value: effect.value }]
    : []);
  const legacySet = (item as LootGearItem & { setId?: string }).setId;
  return { id: item.id, slot: LEGACY_SLOT_TO_STATION[item.slot], rarity: item.rarity, name: item.name, effects, enhancementLevel: item.enhancementLevel, source: item.source, setId: STATION_SETS.some((set) => set.id === legacySet) ? legacySet as StationSetId : undefined };
}
