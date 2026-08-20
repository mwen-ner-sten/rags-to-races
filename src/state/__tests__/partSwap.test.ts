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

function expectCanonicalVehicleStats() {
  const state = useGameStore.getState();
  const current = state.garage[0];
  const definition = getVehicleById(current.definitionId)!;
  expect(current.stats).toEqual(
    calculateStats(definition, current.parts, current.condition, getEffectiveVehicleHandlingBonus(state)),
  );
}

afterEach(() => useGameStore.setState(createInitialState()));

describe("part swapping", () => {
  it("keeps displayed, projected, and committed stats identical after buying Tuned Suspension", () => {
    setSwapState();
    useGameStore.setState({ scrapBucks: 10_000, workshopLevels: { toolkit: 1 } });

    useGameStore.getState().purchaseUpgrade("tuned_suspension");

    const before = useGameStore.getState();
    const definition = getVehicleById("push_mower")!;
    const handlingBonus = getEffectiveVehicleHandlingBonus(before);
    expect(handlingBonus).toBeGreaterThan(0);
    expect(before.garage[0].stats).toEqual(
      calculateStats(definition, before.garage[0].parts, before.garage[0].condition, handlingBonus),
    );

    const comparison = compareInstalledPart(
      definition,
      before.garage[0],
      "engine",
      replacement,
      handlingBonus,
    );
    expect(comparison).not.toBeNull();
    expect(comparison!.currentStats).toEqual(before.garage[0].stats);

    before.swapPart("vehicle-1", "engine", replacement);

    const after = useGameStore.getState();
    expect(after.garage[0].stats).toEqual(comparison!.projectedStats);
    for (const stat of ["speed", "handling", "reliability", "weight", "performance"] as const) {
      expect(before.garage[0].stats[stat] + comparison!.deltas[stat]).toBeCloseTo(after.garage[0].stats[stat], 10);
    }
    expect(after.garage[0].parts.engine.part).toBe(replacement);
    expect(after.inventory).not.toContain(replacement);
  });

  it("recalculates canonical stats through static and loot handling gear actions", () => {
    setSwapState([]);
    useGameStore.setState({
      scrapBucks: 10_000,
      repPoints: 10_000,
      workshopLevels: { toolkit: 1 },
      lootGearInventory: [{
        id: "handling-boots",
        slot: "feet",
        rarity: "common",
        name: "Handling Boots",
        effects: [{ type: "race_handling_pct", value: 0.08 }],
        enhancementLevel: 0,
        modSlots: 1,
        mods: [],
        source: "test",
      }],
      gearModInventory: [{
        id: "grip-mod",
        templateId: "grip_tape",
        name: "Grip Tape",
        effectType: "race_handling_pct",
        value: 0.03,
      }],
    });

    useGameStore.getState().purchaseGear("hands_racing");
    expectCanonicalVehicleStats();

    useGameStore.getState().equipLootGear("handling-boots");
    expectCanonicalVehicleStats();

    useGameStore.getState().installMod("handling-boots", "grip-mod");
    expectCanonicalVehicleStats();

    useGameStore.getState().removeMod("handling-boots", 0);
    expectCanonicalVehicleStats();

    useGameStore.getState().enhanceLootGear("handling-boots");
    expectCanonicalVehicleStats();

    useGameStore.getState().salvageLootGear("handling-boots");
    expectCanonicalVehicleStats();
  });

  it("recalculates canonical stats when playstyle changes amplify Tuned Suspension", () => {
    setSwapState([]);
    useGameStore.setState({
      legacyPoints: 100,
      unlockedPlaystyleNodes: ["ps_eng_t1", "ps_eng_t2a"],
    });

    useGameStore.getState().purchasePlaystyleNode("ps_eng_t3a");
    expectCanonicalVehicleStats();

    useGameStore.getState().respecPlaystylePath("engineer");
    expectCanonicalVehicleStats();
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
