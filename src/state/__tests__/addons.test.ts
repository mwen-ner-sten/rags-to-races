import { afterEach, describe, expect, it } from "vitest";
import { calculateStats, type BuiltVehicle } from "@/engine/build";
import type { ScavengedPart } from "@/engine/scavenge";
import { getVehicleById } from "@/data/vehicles";
import { createInitialState, useGameStore } from "../store";

const engine: ScavengedPart = {
  id: "engine-1",
  definitionId: "engine_small",
  condition: "decent",
  foundAt: "test",
  type: "part",
};

const addon: ScavengedPart = {
  id: "addon-1",
  definitionId: "addon_air_filter",
  condition: "good",
  foundAt: "test",
  type: "addon",
};

function fixtureVehicle(): BuiltVehicle {
  const definition = getVehicleById("push_mower")!;
  const parts = { engine: { part: engine, addons: [] } };
  return {
    id: "vehicle-1",
    definitionId: definition.id,
    parts,
    stats: calculateStats(definition, parts),
    builtAt: 1,
    condition: 100,
    totalRaces: 0,
  };
}

function resetWithAddon(): void {
  useGameStore.setState({
    ...createInitialState(),
    garage: [fixtureVehicle()],
    inventory: [addon],
    workshopLevels: { addon_bench: 1 },
  });
}

afterEach(() => useGameStore.setState(createInitialState()));

describe("vehicle add-ons", () => {
  it("does not install before the Add-On Bench is purchased", () => {
    resetWithAddon();
    useGameStore.setState({ workshopLevels: {} });
    useGameStore.getState().installAddon("vehicle-1", "engine", "addon-1");

    expect(useGameStore.getState().inventory).toEqual([addon]);
    expect(useGameStore.getState().garage[0].parts.engine.addons).toHaveLength(0);
  });

  it("installs a compatible add-on, consumes inventory, and updates stats", () => {
    resetWithAddon();
    const before = useGameStore.getState().garage[0].stats.performance;

    useGameStore.getState().installAddon("vehicle-1", "engine", "addon-1");

    const state = useGameStore.getState();
    expect(state.inventory).toHaveLength(0);
    expect(state.garage[0].parts.engine.addons).toEqual([addon]);
    expect(state.garage[0].stats.performance).toBeGreaterThan(before);
  });

  it("removes an installed add-on back into inventory", () => {
    resetWithAddon();
    useGameStore.getState().installAddon("vehicle-1", "engine", "addon-1");
    useGameStore.getState().removeAddon("vehicle-1", "engine", "addon-1");

    expect(useGameStore.getState().inventory).toContainEqual(addon);
    expect(useGameStore.getState().garage[0].parts.engine.addons).toHaveLength(0);
  });

  it("sells add-ons using their definition value", () => {
    resetWithAddon();
    useGameStore.getState().sellPart("addon-1");

    expect(useGameStore.getState().inventory).toHaveLength(0);
    expect(useGameStore.getState().scrapBucks).toBeGreaterThan(0);
  });
});
