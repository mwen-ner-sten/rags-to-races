import { afterEach, describe, expect, it } from "vitest";
import type { InstalledMod, LootGearItem } from "@/data/lootGear";
import { createInitialState, useGameStore } from "../store";

function gear(overrides: Partial<LootGearItem> = {}): LootGearItem {
  return {
    id: "gear-head",
    slot: "head",
    rarity: "rare",
    name: "Test Helmet",
    effects: [],
    enhancementLevel: 3,
    modSlots: 1,
    mods: [],
    source: "test",
    ...overrides,
  };
}

function mod(overrides: Partial<InstalledMod> = {}): InstalledMod {
  return {
    id: "mod-one",
    templateId: "mod_lucky_charm",
    name: "Lucky Charm",
    effectType: "scavenge_luck_bonus",
    value: 0.03,
    ...overrides,
  };
}

afterEach(() => useGameStore.setState(createInitialState()));

describe("gear mod installation integrity", () => {
  it("atomically consumes a mod once when rapid repeat calls target the same instance", () => {
    useGameStore.setState({
      ...createInitialState(),
      lootGearInventory: [gear({ modSlots: 2 })],
      gearModInventory: [mod()],
    });

    useGameStore.getState().installMod("gear-head", "mod-one");
    useGameStore.getState().installMod("gear-head", "mod-one");

    expect(useGameStore.getState().lootGearInventory[0].mods.map((item) => item.id)).toEqual(["mod-one"]);
    expect(useGameStore.getState().gearModInventory).toEqual([]);
  });

  it("leaves incompatible mods and full gear unchanged", () => {
    const incompatible = mod({
      id: "grip-mod",
      templateId: "mod_grip_tape",
      name: "Grip Tape",
      effectType: "race_handling_pct",
    });
    useGameStore.setState({
      ...createInitialState(),
      lootGearInventory: [gear()],
      gearModInventory: [incompatible],
    });
    useGameStore.getState().installMod("gear-head", "grip-mod");
    expect(useGameStore.getState().lootGearInventory[0].mods).toEqual([]);
    expect(useGameStore.getState().gearModInventory).toEqual([incompatible]);

    const installed = mod();
    useGameStore.setState({
      lootGearInventory: [gear({ mods: [installed] })],
      gearModInventory: [mod({ id: "mod-two" })],
    });
    useGameStore.getState().installMod("gear-head", "mod-two");
    expect(useGameStore.getState().lootGearInventory[0].mods).toEqual([installed]);
    expect(useGameStore.getState().gearModInventory.map((item) => item.id)).toEqual(["mod-two"]);
  });
});
