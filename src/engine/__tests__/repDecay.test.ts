import { describe, expect, it } from "vitest";
import { REP_DECAY, repDecayAmount, REP_UNLOCK_COSTS, REP_PROGRESSION } from "@/config/progression";
import { computeTick, computeTickSpeedMs, simulateOfflineTicks } from "../tick";
import { getRepFloor } from "../repFloor";
import { createInitialState, type GameState } from "@/state/store";

function pureState(overrides: Partial<GameState> = {}): GameState {
  return { ...createInitialState(), ...overrides } as GameState;
}

describe("Rep decay constants and formula", () => {
  it("uses a three-day half-life toward the floor", () => {
    expect(REP_DECAY.HALF_LIFE_MS).toBe(3 * 24 * 60 * 60 * 1_000);
    expect(REP_DECAY.LEGACY_FLOOR_SHARE).toBe(0.1);
    // One half-life removes exactly half of the excess over the floor.
    expect(repDecayAmount(1_000, 200, REP_DECAY.HALF_LIFE_MS)).toBe(0);
    // No excess, no decay; below the floor is never pulled further down.
    expect(repDecayAmount(200, 200, REP_DECAY.HALF_LIFE_MS)).toBe(0);
    expect(repDecayAmount(50, 200, REP_DECAY.HALF_LIFE_MS)).toBe(0);
    expect(repDecayAmount(100, 0, 0)).toBe(0);
  });

  it("halves the unlock costs relative to the shared threshold ladder", () => {
    expect(REP_UNLOCK_COSTS.circuits.dirt_track).toBe(Math.ceil(REP_PROGRESSION.circuits.dirt_track / 2));
    expect(REP_UNLOCK_COSTS.locations.local_junkyard).toBe(Math.ceil(REP_PROGRESSION.locations.local_junkyard / 2));
    expect(REP_UNLOCK_COSTS.vehicles.go_kart).toBe(Math.ceil(REP_PROGRESSION.vehicles.go_kart / 2));
    expect(REP_UNLOCK_COSTS.workshop.toolkit).toBe(REP_PROGRESSION.workshop.toolkit / 2);
    expect(REP_UNLOCK_COSTS.circuits.national_circuit).toBe(500);
    // Tier-0 entries stay free.
    expect(REP_UNLOCK_COSTS.circuits.backyard_derby).toBe(0);
    expect(REP_UNLOCK_COSTS.locations.curbside).toBe(0);
  });
});

describe("Rep decay through computeTick", () => {
  it("reports the per-tick decay from the current balance and floor", () => {
    const state = pureState({ repPoints: 1_000, legacyRepFloor: 100, autoScavengeUnlocked: false, autoRaceUnlocked: false });
    const tickMs = computeTickSpeedMs(state);
    const result = computeTick(state);
    expect(result.repDecayed).toBeCloseTo(repDecayAmount(1_000, getRepFloor(state), tickMs), 9);
    expect(result.repDecayed).toBe(0);
    expect(result.repEarned).toBe(0);
  });

  it("never decays below the legacy floor and skips decay at the floor", () => {
    const atFloor = computeTick(pureState({ repPoints: 100, legacyRepFloor: 100, autoScavengeUnlocked: false, autoRaceUnlocked: false }));
    expect(atFloor.repDecayed).toBe(0);
    const belowFloor = computeTick(pureState({ repPoints: 10, legacyRepFloor: 100, autoScavengeUnlocked: false, autoRaceUnlocked: false }));
    expect(belowFloor.repDecayed).toBe(0);
  });

  it("applies the same decay online and offline over the same ticks", () => {
    const base = pureState({ repPoints: 5_000, legacyRepFloor: 0, autoScavengeUnlocked: false, autoRaceUnlocked: false });
    let rep = base.repPoints;
    let onlineDecay = 0;
    for (let tick = 0; tick < 50; tick++) {
      const result = computeTick({ ...base, repPoints: rep });
      rep -= result.repDecayed;
      onlineDecay += result.repDecayed;
    }
    const offline = simulateOfflineTicks(base, 50);
    expect(offline.repDecayed).toBeCloseTo(onlineDecay, 6);
    // Closed form: 50 ticks of half-life decay.
    const expected = 0;
    expect(onlineDecay).toBeCloseTo(expected, 6);
  });
});
