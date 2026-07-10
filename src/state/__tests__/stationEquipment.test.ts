import { afterEach, describe, expect, it } from "vitest";
import { createInitialState, useGameStore } from "../store";
import { STATION_FORGE_COST } from "@/engine/stationForge";
import { getStationEquipmentBonuses } from "@/engine/stationEquipment";

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
});
