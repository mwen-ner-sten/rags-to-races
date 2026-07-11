import { afterEach, describe, expect, it } from "vitest";
import { createInitialState, useGameStore } from "../store";
import { STATION_FORGE_COST } from "@/engine/stationForge";
import { getStationEnhancementCost, getStationEquipmentBonuses } from "@/engine/stationEquipment";
import { calculateStats, type BuiltVehicle } from "@/engine/build";
import type { StationEquipment } from "@/data/stationEquipment";
import { getVehicleById } from "@/data/vehicles";

afterEach(() => useGameStore.setState(createInitialState()));

describe("station equipment actions", () => {
  it("forges, equips, and applies runtime bonuses", () => {
    useGameStore.setState({ ...createInitialState(), scrapBucks: STATION_FORGE_COST.legendary });
    useGameStore.getState().forgeStationItem("workbench", "legendary");
    const item = useGameStore.getState().stationEquipmentInventory[0];
    useGameStore.getState().equipStationItem(item.id);
    const state = useGameStore.getState();
    const bonuses = getStationEquipmentBonuses(state.equippedStationEquipment, state.stationEquipmentInventory);
    expect(state.scrapBucks).toBe(0);
    expect(state.equippedStationEquipment.workbench).toBe(item.id);
    expect(Object.values(bonuses).some((value) => value > 0)).toBe(true);
  });

  it("prevents salvaging equipped items and grants shards for spare items", () => {
    useGameStore.setState({ ...createInitialState(), scrapBucks: STATION_FORGE_COST.common * 2 });
    useGameStore.getState().forgeStationItem("lift", "common");
    useGameStore.getState().forgeStationItem("lift", "common");
    const [equipped, spare] = useGameStore.getState().stationEquipmentInventory;
    useGameStore.getState().equipStationItem(equipped.id);
    useGameStore.getState().salvageStationItem(equipped.id);
    expect(useGameStore.getState().stationEquipmentInventory).toHaveLength(2);
    useGameStore.getState().salvageStationItem(spare.id);
    expect(useGameStore.getState().stationEquipmentInventory).toHaveLength(1);
    expect(useGameStore.getState().reforgeShards).toBe(1);
  });

  it("can remove and salvage an installed item, with exact yield and activity logs", () => {
    useGameStore.setState({ ...createInitialState(), scrapBucks: STATION_FORGE_COST.common, workshopLevels: { mod_hunter: 2, gear_recycler: 2 } });
    useGameStore.getState().forgeStationItem("lift", "common");
    const item = useGameStore.getState().stationEquipmentInventory[0];
    useGameStore.getState().equipStationItem(item.id);
    useGameStore.getState().unequipStationItem("lift");
    useGameStore.getState().salvageStationItem(item.id);

    const state = useGameStore.getState();
    expect(state.equippedStationEquipment.lift).toBeNull();
    expect(state.stationEquipmentInventory).toEqual([]);
    expect(state.reforgeShards).toBe(4);
    expect(state.activityLog.map((entry) => entry.message)).toEqual(expect.arrayContaining([
      expect.stringContaining("Installed"),
      expect.stringContaining("Removed"),
      expect.stringContaining("Salvaged"),
    ]));
  });

  it("charges the displayed enhancement cost and refuses a no-op common reforge", () => {
    useGameStore.setState({ ...createInitialState(), scrapBucks: 1_000, reforgeShards: 20, workshopLevels: { careful_modding: 1 } });
    useGameStore.getState().forgeStationItem("workbench", "common");
    const item = useGameStore.getState().stationEquipmentInventory[0];
    const enhancementCost = getStationEnhancementCost(item);

    useGameStore.getState().enhanceStationItem(item.id);
    expect(useGameStore.getState().scrapBucks).toBe(1_000 - STATION_FORGE_COST.common - enhancementCost);
    expect(useGameStore.getState().stationEquipmentInventory[0].enhancementLevel).toBe(1);
    expect(useGameStore.getState().activityLog.at(-1)?.message).toContain(`for $${enhancementCost}`);

    useGameStore.getState().reforgeStationItem(item.id);
    expect(useGameStore.getState().reforgeShards).toBe(20);
  });

  it("recalculates vehicle stats when handling equipment is installed, enhanced, or removed", () => {
    const definition = getVehicleById("push_mower")!;
    const vehicle: BuiltVehicle = { id: "vehicle", definitionId: definition.id, parts: {}, stats: calculateStats(definition, {}, 100), builtAt: 1, condition: 100, totalRaces: 0 };
    const item: StationEquipment = { id: "grip-kit", slot: "workbench", rarity: "common", name: "Grip Kit", effects: [{ type: "attribute", attribute: "grip", value: 10 }], enhancementLevel: 0, source: "test" };
    useGameStore.setState({ ...createInitialState(), scrapBucks: 100, garage: [vehicle], activeVehicleId: vehicle.id, stationEquipmentInventory: [item] });

    useGameStore.getState().equipStationItem(item.id);
    let state = useGameStore.getState();
    let bonuses = getStationEquipmentBonuses(state.equippedStationEquipment, state.stationEquipmentInventory);
    expect(state.garage[0].stats).toEqual(calculateStats(definition, {}, 100, bonuses.race_handling_pct));
    expect(state.garage[0].stats.handling).toBeGreaterThan(vehicle.stats.handling);

    useGameStore.getState().enhanceStationItem(item.id);
    state = useGameStore.getState();
    bonuses = getStationEquipmentBonuses(state.equippedStationEquipment, state.stationEquipmentInventory);
    expect(state.garage[0].stats).toEqual(calculateStats(definition, {}, 100, bonuses.race_handling_pct));

    useGameStore.getState().unequipStationItem("workbench");
    expect(useGameStore.getState().garage[0].stats).toEqual(vehicle.stats);
  });
});
