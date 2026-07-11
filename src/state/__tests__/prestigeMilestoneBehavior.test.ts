import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialState, type GameState, useGameStore } from "../store";
import { computeTick, computeTickSpeedMs, simulateOfflineTicks } from "@/engine/tick";
import { AUTO_SCAVENGE_MANUAL_TARGET } from "@/config/gameplayLimits";
import { CONDITIONS } from "@/data/parts";
import { SeededRandomSource, withRandomSource } from "@/utils/random";
import { createGameplayFixture } from "@/testing/gameplayFixtures";

const vehicle = {
  id: "milestone-car",
  definitionId: "push_mower",
  parts: {},
  stats: { speed: 40, handling: 30, reliability: 100, weight: 50, performance: 40 },
  builtAt: 1,
  condition: 100,
  totalRaces: 0,
};

function pureState(overrides: Partial<GameState> = {}): GameState {
  return { ...createInitialState(), ...overrides } as GameState;
}

function autoRaceTick(prestigeCount: number, seed: string) {
  return withRandomSource(new SeededRandomSource(seed), () => computeTick(pureState({
    prestigeCount,
    autoRaceUnlocked: true,
    raceTickProgress: 2,
    garage: [vehicle],
    activeVehicleId: vehicle.id,
    selectedCircuitId: "backyard_derby",
    scrapBucks: 1_000,
  })));
}

function performReset(prestigeCount: number, overrides: Partial<GameState> = {}, seed = "milestone-reset") {
  useGameStore.setState({
    ...createInitialState(),
    prestigeCount,
    lifetimeScrapBucks: 50_000,
    repPoints: 5_000,
    lifetimeRaces: 60,
    fatigue: 30,
    garage: [vehicle, { ...vehicle, id: "milestone-car-2" }, { ...vehicle, id: "milestone-car-3" }],
    activeVehicleId: vehicle.id,
    ...overrides,
  });
  withRandomSource(new SeededRandomSource(seed), () => useGameStore.getState().prestige());
  return useGameStore.getState();
}

function manualRaceRewards(prestigeCount: number, seed: string) {
  vi.useFakeTimers();
  useGameStore.setState({
    ...createInitialState(),
    prestigeCount,
    scrapBucks: 1_000,
    garage: [vehicle],
    activeVehicleId: vehicle.id,
    selectedCircuitId: "backyard_derby",
    tutorialStep: -1,
    lifetimeRacesAllTime: 1,
  });
  withRandomSource(new SeededRandomSource(seed), () => useGameStore.getState().enterRace());
  vi.runAllTimers();
  const state = useGameStore.getState();
  return { scrap: state.scrapBucks - 1_000, rep: state.repPoints };
}

afterEach(() => {
  vi.useRealTimers();
  useGameStore.setState(createInitialState());
});

describe("prestige milestone runtime behavior", () => {
  it("Auto-Pilot and Quick Hands automate racing/scavenging and first activation at Prestige 1", () => {
    const reset = performReset(0);
    expect(reset).toMatchObject({ autoRaceUnlocked: true, autoScavengeUnlocked: true, manualScavengeClicks: 0 });

    const fixture = createGameplayFixture("first_build_ready");
    useGameStore.setState({ ...createInitialState(), ...fixture.payload.state, prestigeCount: 1, activeVehicleId: null });
    useGameStore.getState().buildSelectedVehicle();
    expect(useGameStore.getState().activeVehicleId).toBe(useGameStore.getState().garage[0].id);
  });

  it("Junk Filter auto-sells rusted finds in manual, tick, and offline-equivalent paths", () => {
    useGameStore.setState({ ...createInitialState(), prestigeCount: 2, selectedLocationId: "curbside" });
    withRandomSource(new SeededRandomSource("junk-filter-manual"), () => {
      for (let index = 0; index < AUTO_SCAVENGE_MANUAL_TARGET; index++) useGameStore.getState().manualScavenge();
    });
    const manual = useGameStore.getState();
    expect(manual.inventory.every((part) => part.condition !== "rusted")).toBe(true);
    expect(manual.scrapBucks).toBeGreaterThan(0);

    const tick = withRandomSource(new SeededRandomSource("junk-filter-tick"), () => computeTick(pureState({
      prestigeCount: 2,
      autoScavengeUnlocked: true,
      selectedLocationId: "curbside",
    })));
    expect(tick.partsFound.every((part) => part.condition !== "rusted")).toBe(true);
    expect(tick.partsScavenged).toBe(tick.partsFound.length + tick.partsAutoSold);

    const offline = withRandomSource(new SeededRandomSource("junk-filter-offline"), () => simulateOfflineTicks(pureState({
      prestigeCount: 2,
      autoScavengeUnlocked: true,
      selectedLocationId: "curbside",
    }), 20));
    expect(offline.partsFound.every((part) => part.condition !== "rusted")).toBe(true);
    expect(offline.partsAutoSold).toBeGreaterThan(0);
    expect(offline.partsScavenged + offline.raceSalvageFound).toBe(offline.partsFound.length + offline.partsAutoSold);
  });

  it("Quick Builder selects the highest-condition compatible build parts at Prestige 5", () => {
    const inventory = [
      { id: "engine-low", definitionId: "engine_small", condition: "worn" as const, foundAt: "test", type: "part" as const },
      { id: "engine-best", definitionId: "engine_small", condition: "good" as const, foundAt: "test", type: "part" as const },
      { id: "wheel-low", definitionId: "wheel_busted", condition: "rusted" as const, foundAt: "test", type: "part" as const },
      { id: "wheel-best", definitionId: "wheel_busted", condition: "decent" as const, foundAt: "test", type: "part" as const },
    ];
    useGameStore.setState({ ...createInitialState(), prestigeCount: 5, inventory });
    useGameStore.getState().setPendingVehicle("push_mower");
    expect(useGameStore.getState().pendingBuildParts).toMatchObject({ engine: { id: "engine-best" }, wheel: { id: "wheel-best" } });
  });

  it("Scavenger's Windfall doubles the guaranteed core yield at Prestige 7", () => {
    const before = withRandomSource(new SeededRandomSource("windfall"), () => computeTick(pureState({ prestigeCount: 6, autoScavengeUnlocked: true })));
    const after = withRandomSource(new SeededRandomSource("windfall"), () => computeTick(pureState({ prestigeCount: 7, autoScavengeUnlocked: true })));
    expect(before.partsScavenged).toBeGreaterThanOrEqual(1);
    expect(after.partsScavenged).toBeGreaterThanOrEqual(2);
    expect(after.partsScavenged).toBeGreaterThan(before.partsScavenged);
  });

  it("Racer's Momentum increases real auto-race Scrap and Rep at Prestige 10", () => {
    const before = autoRaceTick(9, "racer-momentum");
    const after = autoRaceTick(10, "racer-momentum");
    expect(after.scrapsEarned).toBeGreaterThan(before.scrapsEarned);
    expect(after.repEarned).toBeGreaterThan(before.repEarned);

    const manualBefore = manualRaceRewards(9, "manual-racer-momentum");
    const manualAfter = manualRaceRewards(10, "manual-racer-momentum");
    expect(manualAfter.scrap).toBeGreaterThan(manualBefore.scrap);
    expect(manualAfter.rep).toBeGreaterThan(manualBefore.rep);
  });

  it("Workshop Prodigy discounts purchases and starts the next run with Toolkit", () => {
    useGameStore.setState({ ...createInitialState(), prestigeCount: 12, scrapBucks: 100 });
    useGameStore.getState().purchaseUpgrade("keen_eye");
    expect(useGameStore.getState().scrapBucks).toBe(55);

    const reset = performReset(11);
    expect(reset.workshopLevels.toolkit).toBe(1);
  });

  it("Speed Demon reduces the real tick interval by four seconds at Prestige 15", () => {
    expect(computeTickSpeedMs(pureState({ prestigeCount: 14 }))).toBe(30_000);
    expect(computeTickSpeedMs(pureState({ prestigeCount: 15 }))).toBe(26_000);
  });

  it("Deep Run Master doubles LP only when reset fatigue exceeds 50", () => {
    const shallow = performReset(19, { fatigue: 50 }).legacyPoints;
    const deep = performReset(19, { fatigue: 51 }).legacyPoints;
    expect(deep).toBe(shallow * 2);
  });

  it("Fortune's Favorite measurably improves seeded scavenged conditions at Prestige 25", () => {
    let improved = false;
    for (let seed = 0; seed < 200 && !improved; seed++) {
      const before = withRandomSource(new SeededRandomSource(seed), () => computeTick(pureState({ prestigeCount: 24, autoScavengeUnlocked: true })));
      const after = withRandomSource(new SeededRandomSource(seed), () => computeTick(pureState({ prestigeCount: 25, autoScavengeUnlocked: true })));
      const beforeScore = before.partsFound.reduce((sum, part) => sum + CONDITIONS.indexOf(part.condition), 0);
      const afterScore = after.partsFound.reduce((sum, part) => sum + CONDITIONS.indexOf(part.condition), 0);
      improved = afterScore > beforeScore;
    }
    expect(improved).toBe(true);
  });

  it("Master Mechanic starts Prestige 30 with three random upgrades plus Toolkit", () => {
    const reset = performReset(29, { workshopLevels: {} }, "master-mechanic");
    expect(reset.workshopLevels.toolkit).toBe(1);
    expect(Object.keys(reset.workshopLevels).filter((id) => id !== "toolkit")).toHaveLength(3);
    expect(Object.values(reset.workshopLevels).every((level) => level === 1)).toBe(true);
  });

  it("Scrap Baron triples all starting Scrap at Prestige 40", () => {
    const reset = performReset(39, { teamUpgradeLevels: { team_quick_start: 1 } });
    expect(reset.scrapBucks).toBe(1_500);
    expect(reset.lifetimeScrapBucks).toBe(1_500);
  });

  it("Living Legend increases real race rewards and LP at Prestige 50", () => {
    const beforeRace = autoRaceTick(49, "living-legend");
    const afterRace = autoRaceTick(50, "living-legend");
    expect(afterRace.scrapsEarned).toBeGreaterThan(beforeRace.scrapsEarned);
    expect(afterRace.repEarned).toBeGreaterThan(beforeRace.repEarned);

    const beforeLp = performReset(48).legacyPoints;
    const afterLp = performReset(49).legacyPoints;
    expect(afterLp).toBeGreaterThan(beforeLp);
  });
});
