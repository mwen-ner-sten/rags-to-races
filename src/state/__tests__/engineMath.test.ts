import { afterEach, describe, expect, it, vi } from "vitest";
import { BASE_WEAR_PER_RACE, DNF_WEAR_BONUS } from "@/data/vehicles";
import { createGameplayFixture } from "@/testing/gameplayFixtures";
import { calculateScrapResetAward, deriveHighestCircuitTier } from "@/engine/prestige";
import { withDerivedStats } from "@/engine/performance";
import { calculateWear } from "@/engine/race";
import { SeededRandomSource, withRandomSource } from "@/utils/random";
import { _getUpgradeEffectValue, createInitialState, useGameStore, type GameState } from "../store";

afterEach(() => {
  vi.useRealTimers();
  useGameStore.setState(createInitialState());
});

describe("_getUpgradeEffectValue", () => {
  const boosted = { ...createInitialState(), unlockedPlaystyleNodes: ["ps_eng_t3a"] } as GameState;

  it("scales scalar yield and percent effects by the Garage Philosophy workshop bonus", () => {
    expect(_getUpgradeEffectValue({ ...boosted, workshopLevels: { keen_eye: 1 } }, "keen_eye")).toBeCloseTo(0.04 * 1.5);
    expect(_getUpgradeEffectValue({ ...boosted, workshopLevels: { reinforced_chassis: 1 } }, "reinforced_chassis")).toBeCloseTo(0.15 * 1.5);
  });

  it("exempts time, count, and unlock effects", () => {
    expect(_getUpgradeEffectValue({ ...boosted, workshopLevels: { tick_accelerator: 1 } }, "tick_accelerator")).toBe(4_000);
    expect(_getUpgradeEffectValue({ ...boosted, workshopLevels: { steady_hands: 1 } }, "steady_hands")).toBe(400);
    expect(_getUpgradeEffectValue({ ...boosted, workshopLevels: { deep_pockets: 1 } }, "deep_pockets")).toBe(1);
    expect(_getUpgradeEffectValue({ ...boosted, workshopLevels: { pit_crew: 1 } }, "pit_crew")).toBe(1);
    expect(_getUpgradeEffectValue({ ...boosted, workshopLevels: { auto_repair: 1 } }, "auto_repair")).toBe(5);
    expect(_getUpgradeEffectValue({ ...boosted, workshopLevels: { toolkit: 1 } }, "toolkit")).toBe(1);
  });
});

describe("manual race wear", () => {
  it("uses stats derived from parts, not the persisted garage snapshot", () => {
    vi.useFakeTimers();
    const fixture = createGameplayFixture("first_race_ready");
    const state = { ...createInitialState(), ...fixture.payload.state } as GameState;
    const staleVehicle = { ...state.garage[0], condition: 100, stats: { ...state.garage[0].stats, reliability: 999 } };
    useGameStore.setState({ ...state, garage: [staleVehicle], activeVehicleId: staleVehicle.id, scrapBucks: 100_000 });

    withRandomSource(new SeededRandomSource("manual-wear"), () => {
      useGameStore.getState().enterRace();
      vi.runAllTimers();
    });

    const settled = useGameStore.getState();
    const raced = settled.garage.find((vehicle) => vehicle.id === staleVehicle.id)!;
    const outcome = settled.lastRaceOutcome!;
    const expectedWear = calculateWear(withDerivedStats(staleVehicle), outcome.result, 0, 0, 0, 0, outcome.planEvaluation?.wearMultiplier ?? 1);
    expect(100 - raced.condition).toBe(expectedWear);
    // A push mower's real reliability is far below the wear threshold, so the
    // full base wear lands; the stale 999 snapshot would have cut it to 30%.
    expect(expectedWear).toBeGreaterThanOrEqual(Math.round(BASE_WEAR_PER_RACE * (outcome.planEvaluation?.wearMultiplier ?? 1)));
    expect(expectedWear).toBeLessThanOrEqual(Math.round((BASE_WEAR_PER_RACE + DNF_WEAR_BONUS) * (outcome.planEvaluation?.wearMultiplier ?? 1)) + 1);
  });
});

describe("Scrap Reset award", () => {
  it("pays exactly the Legacy Points the confirmation screen quotes", () => {
    const fixture = createGameplayFixture("first_scrap_reset_ready");
    const state = { ...createInitialState(), ...fixture.payload.state } as GameState;
    useGameStore.setState(state);
    const quoted = calculateScrapResetAward({
      currentPrestigeCount: state.prestigeCount,
      runStats: {
        lifetimeScrapBucks: state.lifetimeScrapBucks,
        lifetimeRaces: state.lifetimeRaces,
        fatigue: state.fatigue,
        highestCircuitTier: deriveHighestCircuitTier(state.unlockedCircuitIds),
        workshopUpgradesBought: Object.values(state.workshopLevels).reduce((sum, level) => sum + level, 0),
      },
      activeMomentumTierIds: state.activeMomentumTiers,
      teamUpgradeLevels: state.teamUpgradeLevels,
      trackPerkLevels: state.trackPerkLevels,
      earnedAchievements: state.earnedAchievements,
      unlockedPlaystyleNodes: state.unlockedPlaystyleNodes,
      crewRoster: state.crewRoster,
    }).totalLp;

    useGameStore.getState().prestige();
    expect(useGameStore.getState().prestigeCount).toBe(state.prestigeCount + 1);
    expect(useGameStore.getState().legacyPoints).toBe(state.legacyPoints + quoted);
  });
});
