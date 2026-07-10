import { RARITY_SECONDARY_COUNT, RARITY_SECONDARY_RANGE, STATION_AFFINITIES, type StationAttribute, type StationEquipment, type StationEquipmentRarity } from "@/data/stationEquipment";
import { randInt, type RandomSource } from "@/utils/random";

export const SHARDS_PER_SALVAGE: Record<StationEquipmentRarity, number> = { common: 1, uncommon: 3, rare: 10, epic: 40, legendary: 200 };
export const REFORGE_COST_SHARDS: Record<StationEquipmentRarity, number> = { common: 2, uncommon: 5, rare: 15, epic: 50, legendary: 250 };

export function reforgeStationEquipment(item: StationEquipment, source?: RandomSource): StationEquipment {
  const attributes = item.effects.filter((effect) => effect.type === "attribute"); const bonuses = item.effects.filter((effect) => effect.type === "bonus");
  const primary = attributes[0]; if (!primary || primary.type !== "attribute") return item;
  const used = new Set<StationAttribute>([primary.attribute]); const affinity = STATION_AFFINITIES[item.slot]; const pool = [...affinity.secondary, ...affinity.primary].filter((id) => !used.has(id));
  const [min, max] = RARITY_SECONDARY_RANGE[item.rarity]; const secondaries: StationEquipment["effects"] = [];
  for (let index = 0; index < RARITY_SECONDARY_COUNT[item.rarity] && pool.length; index += 1) { const attribute = pool.splice(randInt(0, pool.length - 1, source), 1)[0]; secondaries.push({ type: "attribute", attribute, value: randInt(min, max, source) }); }
  return { ...item, effects: [primary, ...secondaries, ...bonuses] };
}
