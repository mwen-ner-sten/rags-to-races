import { afterEach, describe, expect, it } from "vitest";
import { calculateStats, type BuiltVehicle } from "@/engine/build";
import type { ScavengedPart } from "@/engine/scavenge";
import { getVehicleById } from "@/data/vehicles";
import { createInitialState, useGameStore } from "../store";

const original: ScavengedPart = { id: "engine-original", definitionId: "engine_lawn", condition: "good", foundAt: "test", type: "part" };
const replacement: ScavengedPart = { id: "engine-replacement", definitionId: "engine_small", condition: "good", foundAt: "test", type: "part" };
const wheel: ScavengedPart = { id: "wheel-original", definitionId: "wheel_basic", condition: "good", foundAt: "test", type: "part" };

function vehicle(): BuiltVehicle {
  const definition = getVehicleById("push_mower")!;
  const parts = { engine: { part: original, addons: [] }, wheel: { part: wheel, addons: [] } };
  return { id: "vehicle-1", definitionId: definition.id, parts, stats: calculateStats(definition, parts), builtAt: 1, condition: 100, totalRaces: 0 };
}

afterEach(() => useGameStore.setState(createInitialState()));

describe("named vehicle loadouts", () => {
  it("saves and reapplies the exact available part instances", () => {
    useGameStore.setState({ ...createInitialState(), garage: [vehicle()], activeVehicleId: "vehicle-1", inventory: [replacement], workshopLevels: { toolkit: 1 } });
    useGameStore.getState().saveVehicleLoadout("vehicle-1", "Backyard grip");
    useGameStore.getState().swapPart("vehicle-1", "engine", replacement);

    const loadout = useGameStore.getState().vehicleLoadouts[0];
    useGameStore.getState().applyVehicleLoadout(loadout.id);

    const state = useGameStore.getState();
    expect(state.garage[0].parts.engine.part.id).toBe(original.id);
    expect(state.inventory.map((part) => part.id)).toContain(replacement.id);
  });

  it("removes vehicle-bound loadouts when the vehicle is sold", () => {
    useGameStore.setState({ ...createInitialState(), garage: [vehicle()] });
    useGameStore.getState().saveVehicleLoadout("vehicle-1", "Keep me");
    useGameStore.getState().sellVehicle("vehicle-1");
    expect(useGameStore.getState().vehicleLoadouts).toEqual([]);
  });
});
