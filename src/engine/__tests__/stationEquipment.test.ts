import { describe, expect, it } from "vitest";
import { GARAGE_STATION_IDS, type GarageStationSlot } from "@/data/garageStations";
import type { StationEquipment } from "@/data/stationEquipment";
import { SeededRandomSource } from "@/utils/random";
import { forgeStationEquipment } from "../stationForge";
import { reforgeStationEquipment } from "../stationReforge";
import { getStationEquipmentBonuses, STATION_BONUS_CAPS } from "../stationEquipment";

const emptyEquipment = () => Object.fromEntries(GARAGE_STATION_IDS.map((slot) => [slot, null])) as Record<GarageStationSlot, string | null>;

describe("station equipment", () => {
  it("forges deterministic station-native attribute equipment", () => {
    const first = forgeStationEquipment("diagnostics", "epic", new SeededRandomSource(42));
    const second = forgeStationEquipment("diagnostics", "epic", new SeededRandomSource(42));
    expect(first.effects).toEqual(second.effects);
    expect(first.slot).toBe("diagnostics");
    expect(first.effects).toHaveLength(3);
  });

  it("every attribute produces a positive runtime bonus and respects caps", () => {
    const attributes = ["reflexes", "endurance", "instinct", "engineering", "charisma", "fortune", "power", "grip", "aero", "weight_reduction"] as const;
    for (const [index, attribute] of attributes.entries()) {
      const item: StationEquipment = { id: `item-${index}`, slot: GARAGE_STATION_IDS[index % GARAGE_STATION_IDS.length], rarity: "legendary", name: attribute, effects: [{ type: "attribute", attribute, value: 10000 }], enhancementLevel: 0, source: "test" };
      const equipped = emptyEquipment(); equipped[item.slot] = item.id;
      const bonuses = getStationEquipmentBonuses(equipped, [item]);
      expect(Object.values(bonuses).some((value) => value > 0)).toBe(true);
      for (const key of Object.keys(bonuses) as (keyof typeof bonuses)[]) expect(bonuses[key]).toBeLessThanOrEqual(STATION_BONUS_CAPS[key]);
    }
  });

  it("activates two-piece and four-piece set effects", () => {
    const items: StationEquipment[] = ["diagnostics", "lift", "workbench", "fabrication"].map((slot, index) => ({ id: `set-${index}`, slot: slot as GarageStationSlot, rarity: "rare", name: "Grease Monkey", effects: [], enhancementLevel: 0, setId: "grease_monkey", source: "test" }));
    const equipped = emptyEquipment(); items.forEach((item) => { equipped[item.slot] = item.id; });
    const bonuses = getStationEquipmentBonuses(equipped, items);
    expect(bonuses.build_cost_reduction_pct).toBeGreaterThan(0);
    expect(bonuses.repair_cost_reduction_pct).toBeGreaterThan(bonuses.build_cost_reduction_pct);
  });

  it("reforges secondaries while preserving the primary", () => {
    const item = forgeStationEquipment("workbench", "legendary", new SeededRandomSource(1));
    const reforged = reforgeStationEquipment(item, new SeededRandomSource(2));
    expect(reforged.effects[0]).toEqual(item.effects[0]);
    expect(reforged.effects.slice(1)).not.toEqual(item.effects.slice(1));
  });
});
