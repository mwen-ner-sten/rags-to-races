import { afterEach, describe, expect, it } from "vitest";
import { calculateStats, type BuiltVehicle, type InstalledPart } from "@/engine/build";
import type { ScavengedPart } from "@/engine/scavenge";
import { getVehicleById } from "@/data/vehicles";
import { createInitialState, resolveVehicleLoadout, type VehicleLoadout, useGameStore } from "../store";

function item(id: string, definitionId: string, condition: ScavengedPart["condition"], type: ScavengedPart["type"] = "part"): ScavengedPart {
  return { id, definitionId, condition, type, foundAt: "loadout-test" };
}

function mower(engineCondition: ScavengedPart["condition"]): BuiltVehicle {
  const definition = getVehicleById("push_mower")!;
  const parts: Record<string, InstalledPart> = {
    engine: { part: item("engine", "engine_small", engineCondition), addons: [] },
    wheel: { part: item("wheel", "wheel_busted", "good"), addons: [] },
  };
  return {
    id: "loadout-mower",
    definitionId: definition.id,
    parts,
    stats: calculateStats(definition, parts),
    builtAt: 1,
    condition: 100,
    totalRaces: 0,
  };
}

const loadout: VehicleLoadout = {
  id: "two-addon-loadout",
  name: "Twin Add-ons",
  vehicleId: "loadout-mower",
  vehicleDefinitionId: "push_mower",
  createdAt: 1,
  parts: {
    engine: { partId: "engine", addonIds: ["air", "turbo"] },
    wheel: { partId: "wheel", addonIds: [] },
  },
};

const addons = [
  item("air", "addon_air_filter", "good", "addon"),
  item("turbo", "addon_turbo_snail", "good", "addon"),
];

afterEach(() => useGameStore.setState(createInitialState()));

describe("named vehicle loadout integrity", () => {
  it("rejects a saved add-on count that exceeds the current degraded part capacity", () => {
    const vehicle = mower("good");
    expect(resolveVehicleLoadout(vehicle, addons, loadout)).toMatchObject({
      valid: false,
      reason: "Saved engine uses 2 add-ons, but good condition allows 1",
    });

    useGameStore.setState({
      ...createInitialState(),
      garage: [vehicle],
      activeVehicleId: vehicle.id,
      inventory: addons,
      vehicleLoadouts: [loadout],
    });
    useGameStore.getState().applyVehicleLoadout(loadout.id);

    expect(useGameStore.getState().garage[0].parts.engine.addons).toEqual([]);
    expect(useGameStore.getState().inventory.map((part) => part.id)).toEqual(["air", "turbo"]);
  });

  it("applies the same saved loadout when the base part still has capacity", () => {
    const vehicle = mower("pristine");
    useGameStore.setState({
      ...createInitialState(),
      garage: [vehicle],
      activeVehicleId: vehicle.id,
      inventory: addons,
      vehicleLoadouts: [loadout],
    });

    useGameStore.getState().applyVehicleLoadout(loadout.id);

    expect(useGameStore.getState().garage[0].parts.engine.addons.map((addon) => addon.id)).toEqual(["air", "turbo"]);
    expect(useGameStore.getState().inventory).toEqual([]);
  });
});
