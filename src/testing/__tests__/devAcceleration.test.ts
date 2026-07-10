import { describe, expect, it } from "vitest";
import { createInitialState, type GameState } from "@/state/store";
import { createGameplayFixture } from "../gameplayFixtures";
import { MAX_OFFLINE_MS, offlineTicksForDuration, runSeededOffline, runSeededTicks } from "../devAcceleration";

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
    expect(runSeededOffline(state, MAX_OFFLINE_MS * 4, "cap-seed").ticksProcessed).toBe(exact.ticks);
  });

  it("does not mutate the supplied gameplay state", () => {
    const state = stateFor("first_race_ready");
    const before = structuredClone({ scrapBucks: state.scrapBucks, garage: state.garage });
    runSeededTicks(state, 1_000, "immutable");
    expect({ scrapBucks: state.scrapBucks, garage: state.garage }).toEqual(before);
  });
});
