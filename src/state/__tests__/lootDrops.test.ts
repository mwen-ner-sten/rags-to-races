import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LOOT_GEAR_INVENTORY_LIMIT } from "@/config/gameplayLimits";
import type { InstalledMod, LootGearItem } from "@/data/lootGear";
import type { StationEquipment } from "@/data/stationEquipment";
import { isSystemRevealed } from "@/data/featureUnlocks";
import { getUnlockGuide } from "@/components/effects/Toast";
import { createGameplayFixture } from "@/testing/gameplayFixtures";
import { resetRandomSource, setRandomSource, type RandomSource } from "@/utils/random";
import { createInitialState, getLootGearSalvageScrap, useGameStore, type AutomationSettlementMeta } from "../store";

/** Every roll lands: a race (any result) drops loot, a scavenge drops station gear. */
const alwaysDrop: RandomSource = { next: () => 0.0001 };

function lootPiece(index: number): LootGearItem {
  return { id: `owned_${index}`, slot: "head", rarity: "common", name: `Owned ${index}`, effects: [], enhancementLevel: 0, modSlots: 0, mods: [], source: "test" };
}

function settlement(overrides: Partial<AutomationSettlementMeta> = {}): AutomationSettlementMeta {
  return {
    partsScavenged: 0, partsAutoSold: 0, scavengesCompleted: 0, racesCompleted: 0, winsCompleted: 0,
    finalWinStreak: 0, bestWinStreak: 0, recentRaceOutcomes: [], winningCircuitIds: [], defeatedRivalIds: [],
    circuitWinStreaks: {}, raceSalvageFound: 0, forgeTokensFound: 0, entryFeesPaid: 0, challengesEvaluated: false,
    completedChallengeIds: [], challengeForgeTokens: 0, challengeMaterials: {}, ticksProcessed: 1, ...overrides,
  };
}

function loadFreshRacer(): void {
  const fixture = createGameplayFixture("first_race_ready").payload.state;
  useGameStore.setState({ ...createInitialState(), ...fixture, tutorialStep: -1 });
  const state = useGameStore.getState();
  expect(state.lootGearInventory).toHaveLength(0);
  expect(state.gearModInventory).toHaveLength(0);
  expect(state.stationEquipmentInventory).toHaveLength(0);
  expect(state.revealedSystems).not.toContain("locker");
}

/**
 * A forced-low RNG would also force a DNF (random() < dnfChance), so race
 * tests wear a station piece that zeroes DNF risk; the same low roll then
 * wins the race and lands the drop.
 */
const DNF_GUARD: StationEquipment = { id: "dnf_guard", slot: "diagnostics", rarity: "legendary", name: "Guard Array", effects: [{ type: "bonus", bonus: "race_dnf_reduction", value: 0.5 }], enhancementLevel: 0, source: "test" };

function loadFreshRacerWithDnfGuard(): void {
  loadFreshRacer();
  useGameStore.setState((s) => ({
    stationEquipmentInventory: [DNF_GUARD],
    equippedStationEquipment: { ...s.equippedStationEquipment, diagnostics: DNF_GUARD.id },
  }));
}

function raceOnce(): void {
  useGameStore.getState().enterRace();
  vi.runAllTimers();
  expect(useGameStore.getState().isRacing).toBe(false);
}

beforeEach(() => {
  vi.useFakeTimers();
  setRandomSource(alwaysDrop);
});

afterEach(() => {
  resetRandomSource();
  vi.clearAllTimers();
  vi.useRealTimers();
  useGameStore.setState(createInitialState());
});

describe("race drops feed the Locker", () => {
  it("a won Sprint yields loot gear and a toast but no Feature-only mod", () => {
    loadFreshRacerWithDnfGuard();
    raceOnce();
    const after = useGameStore.getState();

    expect(after.lastRaceOutcome?.result).toBe("win");
    expect(after.lootGearInventory).toHaveLength(1);
    expect(after.lootGearInventory[0]).toMatchObject({ rarity: "common", source: "backyard_derby" });
    expect(after.gearModInventory).toHaveLength(0);
    expect(after.stationEquipmentInventory).toEqual([DNF_GUARD]);
    expect(after.reforgeShards).toBe(0);

    const toast = after.unlockEvents.find((event) => event.startsWith("Found "));
    expect(toast).toBe(`Found Common ${after.lootGearInventory[0].name}`);
    expect(getUnlockGuide(toast!)?.where).toContain("Workshop > Locker");
    expect(after.unlockEvents.some((event) => event.startsWith("Gear Mod:"))).toBe(false);
  });

  it("reveals the Locker on the first race drop", () => {
    loadFreshRacerWithDnfGuard();
    expect(isSystemRevealed(useGameStore.getState(), "locker")).toBe(false);
    raceOnce();
    const after = useGameStore.getState();
    expect(after.revealedSystems).toContain("locker");
    expect(isSystemRevealed(after, "locker")).toBe(true);
  });

  it("auto-salvages a drop that finds the Locker full, paying its salvage value", () => {
    loadFreshRacerWithDnfGuard();
    const owned = Array.from({ length: LOOT_GEAR_INVENTORY_LIMIT }, (_, index) => lootPiece(index));
    useGameStore.setState({ lootGearInventory: owned });
    const before = useGameStore.getState();
    const salvageValue = getLootGearSalvageScrap(before, { ...lootPiece(-1), rarity: "common" });
    expect(salvageValue).toBeGreaterThan(0);

    raceOnce();
    const after = useGameStore.getState();
    expect(after.lootGearInventory).toBe(owned);
    expect(after.lootGearInventory).toHaveLength(LOOT_GEAR_INVENTORY_LIMIT);
    expect(after.scrapBucks - before.scrapBucks).toBe((after.lastRaceOutcome?.scrapsEarned ?? 0) + salvageValue);
    expect(after.unlockEvents.some((event) => event.startsWith("Found "))).toBe(false);
    expect(after.activityLog.some((entry) => entry.message.includes("Locker full: auto-salvaged 1 loot gear drop"))).toBe(true);
  });
});

describe("scavenge drops feed Stations", () => {
  it("never yields loot gear; station equipment and loose shards instead", () => {
    loadFreshRacer();
    for (let index = 0; index < 5; index += 1) useGameStore.getState().manualScavenge();
    const after = useGameStore.getState();

    expect(after.lootGearInventory).toHaveLength(0);
    expect(after.gearModInventory).toHaveLength(0);
    expect(after.stationEquipmentInventory).toHaveLength(5);
    expect(after.stationEquipmentInventory[0]).toMatchObject({ rarity: "common", source: after.selectedLocationId });
    expect(after.reforgeShards).toBe(5);
    expect(after.unlockEvents.filter((event) => event.startsWith("Station Equipment:"))).toHaveLength(5);
    expect(after.unlockEvents.some((event) => event.startsWith("Found "))).toBe(false);
    expect(isSystemRevealed(after, "locker")).toBe(false);
    expect(isSystemRevealed(after, "stations")).toBe(true);
  });
});

describe("automation settlement routes each drop to its home", () => {
  const drop: LootGearItem = { ...lootPiece(100), id: "race_drop", rarity: "rare", name: "Chrome Visor" };
  const mod: InstalledMod = { id: "mod_1", templateId: "mod_grip_tape", name: "Grip Tape", effectType: "race_handling_pct", value: 0.03 };
  const station: StationEquipment = { id: "station_drop", slot: "lift", rarity: "common", name: "Common Lift Rig", effects: [], enhancementLevel: 0, source: "junkyard" };

  it("keeps loot and mods in the Locker, station gear in Stations, and toasts a live tick", () => {
    useGameStore.setState(createInitialState());
    useGameStore.getState().applyTickResult([], 0, 0, undefined, undefined, undefined, [drop], [mod], settlement({ stationEquipmentDrops: [station], reforgeShardDrops: 1 }));
    const after = useGameStore.getState();

    expect(after.lootGearInventory).toEqual([drop]);
    expect(after.gearModInventory).toEqual([mod]);
    expect(after.stationEquipmentInventory).toEqual([station]);
    expect(after.reforgeShards).toBe(1);
    expect(after.unlockEvents).toEqual(expect.arrayContaining(["Found Rare Chrome Visor", "Gear Mod: Grip Tape!", "Station Equipment: Common Lift Rig!"]));
    expect(after.activityLog.at(-1)?.message).toContain("1 loot gear");
    expect(after.activityLog.at(-1)?.message).toContain("1 gear mod");
    expect(after.activityLog.at(-1)?.message).toContain("1 station equipment");
  });

  it("summarises a batched catch-up without a toast storm", () => {
    useGameStore.setState(createInitialState());
    useGameStore.getState().applyTickResult([], 0, 0, undefined, undefined, undefined, [drop], [mod], settlement({ ticksProcessed: 50, stationEquipmentDrops: [station] }));
    const after = useGameStore.getState();
    expect(after.lootGearInventory).toHaveLength(1);
    expect(after.unlockEvents.some((event) => event.startsWith("Found ") || event.startsWith("Gear Mod:") || event.startsWith("Station Equipment:"))).toBe(false);
  });

  it("auto-salvages live loot overflow into Scrap Bucks", () => {
    const owned = Array.from({ length: LOOT_GEAR_INVENTORY_LIMIT }, (_, index) => lootPiece(index));
    useGameStore.setState({ ...createInitialState(), lootGearInventory: owned, scrapBucks: 0 });
    const salvageValue = getLootGearSalvageScrap(useGameStore.getState(), drop);

    useGameStore.getState().applyTickResult([], 0, 0, undefined, undefined, undefined, [drop], undefined, settlement());
    const after = useGameStore.getState();
    expect(after.lootGearInventory).toBe(owned);
    expect(after.scrapBucks).toBe(salvageValue);
    expect(after.activityLog.at(-1)?.message).toContain("1 loot gear auto-salvaged");
  });
});
