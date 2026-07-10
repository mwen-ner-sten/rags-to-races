import type { GarageStationSlot } from "@/data/garageStations";
import { RARITY_PRIMARY_RANGE, RARITY_SECONDARY_COUNT, RARITY_SECONDARY_RANGE, STATION_AFFINITIES, type StationAttribute, type StationEquipment, type StationEquipmentRarity } from "@/data/stationEquipment";
import { randInt, type RandomSource } from "@/utils/random";

export const STATION_FORGE_COST: Record<StationEquipmentRarity, number> = { common: 250, uncommon: 750, rare: 2500, epic: 10000, legendary: 50000 };
const BASE_NAMES: Record<GarageStationSlot, string> = { workbench: "Bench Kit", lift: "Lift Rig", diagnostics: "Diagnostic Array", fabrication: "Fabricator", pit_equipment: "Pit Kit", logistics: "Logistics Rack" };
let counter = 0;

export function forgeStationEquipment(slot: GarageStationSlot, rarity: StationEquipmentRarity, source?: RandomSource): StationEquipment {
  const affinity = STATION_AFFINITIES[slot]; const effects: StationEquipment["effects"] = []; const used = new Set<StationAttribute>();
  const primary = affinity.primary[randInt(0, affinity.primary.length - 1, source)]; const [pMin, pMax] = RARITY_PRIMARY_RANGE[rarity];
  effects.push({ type: "attribute", attribute: primary, value: randInt(pMin, pMax, source) }); used.add(primary);
  const pool = [...affinity.secondary, ...affinity.primary].filter((id) => !used.has(id)); const [sMin, sMax] = RARITY_SECONDARY_RANGE[rarity];
  for (let index = 0; index < RARITY_SECONDARY_COUNT[rarity] && pool.length; index += 1) { const id = pool.splice(randInt(0, pool.length - 1, source), 1)[0]; effects.push({ type: "attribute", attribute: id, value: randInt(sMin, sMax, source) }); }
  return { id: `station_${Date.now()}_${counter++}`, slot, rarity, name: `${rarity[0].toUpperCase()}${rarity.slice(1)} ${BASE_NAMES[slot]}`, effects, enhancementLevel: 0, source: "Salvage Workshop" };
}
