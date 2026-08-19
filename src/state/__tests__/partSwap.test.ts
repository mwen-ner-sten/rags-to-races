import { afterEach, describe, expect, it } from "vitest";
import { getVehicleById } from "@/data/vehicles";
import { calculateStats, compareInstalledPart, type BuiltVehicle } from "@/engine/build";
import type { ScavengedPart } from "@/engine/scavenge";
import { createInitialState, getEffectiveVehicleHandlingBonus, useGameStore } from "../store";

function part(
  id: string,
  definitionId: string,
  condition: ScavengedPart["condition"],
  type: ScavengedPart["type"] = "part",
): ScavengedPart {
  return { id, definitionId, condition, type, foundAt: "test" };
}

const original = part("engine-original", "engine_lawn", "good");
const wheel = part("wheel-original", "wheel_basic", "good");
const replacement = part("engine-replacement", "engine_small", "pristine");

function vehicle(): BuiltVehicle {
  const definition = getVehicleById("push_mower")!;
  const parts = {
    engine: { part: original, addons: [] },
    wheel: { part: wheel, addons: [] },
  };
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

function setSwapState(inventory: ScavengedPart[] = [replacement]) {
  useGameStore.setState({
    ...createInitialState(),
    garage: [vehicle()],
    activeVehicleId: "vehicle-1",
    inventory,
    workshopLevels: { toolkit: 1, tuned_suspension: 2 },
  });
}

function mutableStateSnapshot() {
  const state = useGameStore.getState();
  return structuredClone({ garage: state.garage, inventory: state.inventory });
}

afterEach(() => useGameStore.setState(createInitialState()));

describe("part swapping", () => {
  it("makes the state-level projection exactly match swap stats with effective handling bonuses", () => {
    setSwapState();
    const before = useGameStore.getState();
    const definition = getVehicleById("push_mower")!;
    const handlingBonus = getEffectiveVehicleHandlingBonus(before);
    expect(handlingBonus).toBeGreaterThan(0);

    const comparison = compareInstalledPart(
      definition,
      before.garage[0],
      "engine",
      replacement,
      handlingBonus,
    );
    expect(comparison).not.toBeNull();

    before.swapPart("vehicle-1", "engine", replacement);

    const after = useGameStore.getState();
    expect(after.garage[0].stats).toEqual(comparison!.projectedStats);
    expect(after.garage[0].parts.engine.part).toBe(replacement);
    expect(after.inventory).not.toContain(replacement);
  });

  it.each([
    ["an absent candidate", part("not-in-inventory", "engine_small", "good")],
    ["an add-on candidate", part("bad-addon", "engine_small", "good", "addon")],
    ["an unknown-condition candidate", part("bad-condition", "engine_small", "unknown" as ScavengedPart["condition"])],
    ["an incompatible candidate", part("bad-slot", "wheel_basic", "good")],
  ])("does not mutate for %s", (_label, candidate) => {
    setSwapState(candidate.id === "not-in-inventory" ? [replacement] : [candidate]);
    const before = mutableStateSnapshot();

    useGameStore.getState().swapPart("vehicle-1", "engine", candidate);

    expect(mutableStateSnapshot()).toEqual(before);
  });

  it("resolves a candidate by id and installs the canonical inventory object", () => {
    setSwapState();
    const spoofedArgument = { ...replacement, definitionId: "engine_lawn", condition: "rusted" as const };

    useGameStore.getState().swapPart("vehicle-1", "engine", spoofedArgument);

    const installed = useGameStore.getState().garage[0].parts.engine.part;
    expect(installed).toBe(replacement);
    expect(installed.definitionId).toBe("engine_small");
    expect(installed.condition).toBe("pristine");
  });

  it("does not mutate when inventory contains duplicate candidate ids", () => {
    const duplicate = { ...replacement, definitionId: "engine_lawn", condition: "rusted" as const };
    setSwapState([replacement, duplicate]);
    const before = mutableStateSnapshot();

    useGameStore.getState().swapPart("vehicle-1", "engine", replacement);

    expect(mutableStateSnapshot()).toEqual(before);
  });
});
