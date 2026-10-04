import { describe, expect, it } from "vitest";
import { createInitialState, type GameState } from "@/state/store";
import { createGameplayFixture } from "../gameplayFixtures";
import { MAX_OFFLINE_MS, offlineTicksForDuration, runSeededOffline, runSeededTicks } from "../devAcceleration";
import { AUTOMATION_DROP_DETAIL_LIMIT, LOOT_GEAR_INVENTORY_LIMIT, OFFLINE_LOOSE_INVENTORY_LIMIT, OFFLINE_TICK_MS_MIN, STATION_EQUIPMENT_INVENTORY_LIMIT } from "@/config/gameplayLimits";

function stateFor(name: Parameters<typeof createGameplayFixture>[0]): GameState {
  return { ...createInitialState(), ...createGameplayFixture(name).payload.state } as GameState;
}

describe("deterministic DEV acceleration", () => {
  it("repeats seeded real-engine simulations exactly", () => {
    const state = stateFor("workshop_ready");
    const first = runSeededTicks(state, 100, "repeatable-seed");
    const second = runSeededTicks(state, 100, "repeatable-seed");
    expect(second).toEqual(first);
    expect(first.ticksProcessed).toBe(100);
    expect(first.scavengesCompleted).toBe(100);
  });

  it("honors the eight-hour offline cap", () => {
    const state = stateFor("workshop_ready");
    const exact = offlineTicksForDuration(state, MAX_OFFLINE_MS);
    const excessive = offlineTicksForDuration(state, MAX_OFFLINE_MS * 4);
    expect(excessive.cappedDurationMs).toBe(MAX_OFFLINE_MS);
    expect(excessive.ticks).toBe(exact.ticks);
    const result = runSeededOffline(state, MAX_OFFLINE_MS * 4, "cap-seed");
    expect(result.ticksProcessed).toBe(exact.ticks);
    expect(state.inventory.length + result.partsFound.length).toBeLessThanOrEqual(OFFLINE_LOOSE_INVENTORY_LIMIT);
    expect(result.partsScavenged + result.raceSalvageFound).toBe(result.partsFound.length + result.partsAutoSold);
  });

  it("uses the live tick floor and the bounded tick cap for a maxed save", () => {
    const duration = offlineTicksForDuration(stateFor("maxed"), MAX_OFFLINE_MS);
    expect(duration.tickSpeedMs).toBe(OFFLINE_TICK_MS_MIN);
    // 8 h at a 100 ms tick would be 288,000 ticks; catch-up replays at most OFFLINE_TICK_CAP of them.
    expect(duration.ticks).toBe(48 * 60 * 60 * 10);
    expect(offlineTicksForDuration(stateFor("maxed"), 10 * 60_000).ticks).toBe((10 * 60_000) / OFFLINE_TICK_MS_MIN);
  });

  it("does not mutate the supplied gameplay state", () => {
    const state = stateFor("first_race_ready");
    const before = structuredClone({ scrapBucks: state.scrapBucks, garage: state.garage });
    runSeededTicks(state, 1_000, "immutable");
    expect({ scrapBucks: state.scrapBucks, garage: state.garage }).toEqual(before);
  });

  it("bounds every high-frequency inventory during a maxed 1,000-tick batch", () => {
    const state = stateFor("maxed");
    const result = runSeededTicks(state, 1_000, "maxed-stall");

    expect(state.inventory.length + result.partsFound.length).toBe(state.inventory.length);
    expect(state.stationEquipmentInventory.length + result.stationEquipmentDrops.length)
      .toBeLessThanOrEqual(Math.max(state.stationEquipmentInventory.length, STATION_EQUIPMENT_INVENTORY_LIMIT));
    expect(result.stationEquipmentAutoSalvaged).toBeGreaterThan(0);
    expect(state.lootGearInventory.length + result.lootGearDrops.length).toBeLessThanOrEqual(LOOT_GEAR_INVENTORY_LIMIT);
    expect(result.reforgeShardsFound).toBeGreaterThan(0);
    expect(result.modDrops).toHaveLength(Math.min(result.modDropsFound, AUTOMATION_DROP_DETAIL_LIMIT));
  });
});
