import { GARAGE_STATION_IDS, type GarageStationSlot } from "@/data/garageStations";
import { STATION_ATTRIBUTES, STATION_SETS, type StationAttribute, type StationEquipment, type StationEquipmentEffect } from "@/data/stationEquipment";

export interface StationEquipmentBonuses {
  scavenge_luck_bonus: number; scavenge_yield_pct: number; sell_value_bonus_pct: number;
  race_performance_pct: number; race_dnf_reduction: number; race_handling_pct: number;
  race_wear_reduction_pct: number; race_scrap_bonus_pct: number; build_cost_reduction_pct: number;
  repair_cost_reduction_pct: number; refurb_cost_reduction_pct: number;
  tick_speed_reduction_ms: number; fatigue_rate_reduction: number; material_bonus_pct: number; forge_token_chance_bonus: number;
}

const DERIVATION: Record<StationAttribute, Partial<StationEquipmentBonuses>> = {
  reflexes: { race_handling_pct: 0.005 }, endurance: { race_wear_reduction_pct: 0.005 }, instinct: { race_dnf_reduction: 0.003 },
  engineering: { build_cost_reduction_pct: 0.005, repair_cost_reduction_pct: 0.005, refurb_cost_reduction_pct: 0.005 },
  charisma: { race_scrap_bonus_pct: 0.005 }, fortune: { scavenge_luck_bonus: 0.002, sell_value_bonus_pct: 0.005, race_scrap_bonus_pct: 0.005 },
  power: { race_performance_pct: 0.01 }, grip: { race_handling_pct: 0.008 }, aero: { race_dnf_reduction: 0.004, race_wear_reduction_pct: 0.003 },
  weight_reduction: { race_handling_pct: 0.003, race_scrap_bonus_pct: 0.002 },
};
const EMPTY: StationEquipmentBonuses = { scavenge_luck_bonus: 0, scavenge_yield_pct: 0, sell_value_bonus_pct: 0, race_performance_pct: 0, race_dnf_reduction: 0, race_handling_pct: 0, race_wear_reduction_pct: 0, race_scrap_bonus_pct: 0, build_cost_reduction_pct: 0, repair_cost_reduction_pct: 0, refurb_cost_reduction_pct: 0, tick_speed_reduction_ms: 0, fatigue_rate_reduction: 0, material_bonus_pct: 0, forge_token_chance_bonus: 0 };
export const STATION_BONUS_CAPS: StationEquipmentBonuses = { scavenge_luck_bonus: 0.5, scavenge_yield_pct: 2, sell_value_bonus_pct: 0.75, race_performance_pct: 1, race_dnf_reduction: 0.5, race_handling_pct: 1, race_wear_reduction_pct: 0.75, race_scrap_bonus_pct: 1, build_cost_reduction_pct: 0.75, repair_cost_reduction_pct: 0.75, refurb_cost_reduction_pct: 0.75, tick_speed_reduction_ms: 29000, fatigue_rate_reduction: 0.75, material_bonus_pct: 2, forge_token_chance_bonus: 0.25 };

export function getStationEquipmentEffects(equipped: Record<GarageStationSlot, string | null>, inventory: StationEquipment[]): StationEquipmentEffect[] {
  const items = GARAGE_STATION_IDS.map((slot) => inventory.find((item) => item.id === equipped[slot])).filter((item): item is StationEquipment => !!item);
  const effects = items.flatMap((item) => item.effects.map((effect) => ({ ...effect, value: effect.value * (1 + item.enhancementLevel * 0.12) })));
  const counts = new Map<string, number>(); items.forEach((item) => item.setId && counts.set(item.setId, (counts.get(item.setId) ?? 0) + 1));
  for (const set of STATION_SETS) for (const tier of set.tiers) if ((counts.get(set.id) ?? 0) >= tier.piecesRequired) effects.push(...tier.effects);
  return effects;
}

export function getStationEquipmentBonuses(equipped: Record<GarageStationSlot, string | null> | undefined, inventory: StationEquipment[] | undefined): StationEquipmentBonuses {
  const result = { ...EMPTY }; if (!equipped || !inventory) return result;
  const attributes = Object.fromEntries(STATION_ATTRIBUTES.map((id) => [id, 0])) as Record<StationAttribute, number>;
  for (const effect of getStationEquipmentEffects(equipped, inventory)) {
    if (effect.type === "bonus") result[effect.bonus] += effect.value;
    else attributes[effect.attribute] += effect.value;
  }
  for (const attribute of STATION_ATTRIBUTES) for (const [key, value] of Object.entries(DERIVATION[attribute])) result[key as keyof StationEquipmentBonuses] += attributes[attribute] * value;
  for (const key of Object.keys(result) as (keyof StationEquipmentBonuses)[]) result[key] = Math.min(result[key], STATION_BONUS_CAPS[key]);
  return result;
}
