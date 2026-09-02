import { afterEach, describe, expect, it, vi } from "vitest";
import type { RaceOutcome } from "@/engine/race";
import { withRandomSource } from "@/utils/random";
import { createInitialState, useGameStore } from "../store";
import { REP_PROGRESSION } from "@/config/progression";

// Stats are derived from parts at race entry, so the test car needs real
// parts. A pristine Push Mower is comfortably favoured on the Backyard Derby.
const testVehicle = {
  id: "blueprint-test-car",
  definitionId: "push_mower",
  parts: {
    engine: { part: { id: "bp-engine", definitionId: "engine_lawn", condition: "pristine" as const, foundAt: "test", type: "part" as const }, addons: [] },
    wheel: { part: { id: "bp-wheel", definitionId: "wheel_basic", condition: "pristine" as const, foundAt: "test", type: "part" as const }, addons: [] },
  },
  stats: { speed: 20, handling: 7, reliability: 22, weight: 66, performance: 16.5 },
  builtAt: 1,
  condition: 100,
  totalRaces: 0,
};

function wonBackyardRace(): RaceOutcome {
  return {
    result: "win",
    position: 1,
    totalRacers: 8,
    scrapsEarned: 10,
    repEarned: 1,
    log: [],
    circuitId: "backyard_derby",
  };
}

function finishBackyardRace(startingRep: number, raceHistory: RaceOutcome[] = []) {
  vi.useFakeTimers();
  useGameStore.setState({
    ...createInitialState(),
    scrapBucks: 1_000,
    repPoints: startingRep,
    garage: [testVehicle],
    activeVehicleId: testVehicle.id,
    selectedCircuitId: "backyard_derby",
    tutorialStep: -1,
    lifetimeRacesAllTime: 1,
    raceHistory,
    winStreak: raceHistory.length,
  });
  withRandomSource({ next: () => 0.5 }, () => useGameStore.getState().enterRace());
  vi.runAllTimers();
  return useGameStore.getState();
}

afterEach(() => {
  vi.useRealTimers();
  useGameStore.setState(createInitialState());
});

describe("vehicle blueprint state transitions", () => {
  it("uses the shared Beater Car Rep boundary in race settlement", () => {
    expect(finishBackyardRace(REP_PROGRESSION.vehicles.beater_car - 3).unlockedVehicleIds).not.toContain("beater_car");
    expect(finishBackyardRace(REP_PROGRESSION.vehicles.beater_car - 2).unlockedVehicleIds).toContain("beater_car");
  });

  it("unlocks the Go-Kart at 25 Rep rather than a win streak", () => {
    expect(finishBackyardRace(0, Array.from({ length: 4 }, wonBackyardRace)).unlockedVehicleIds).not.toContain("go_kart");
    expect(finishBackyardRace(REP_PROGRESSION.vehicles.go_kart - 3).unlockedVehicleIds).not.toContain("go_kart");
    expect(finishBackyardRace(REP_PROGRESSION.vehicles.go_kart - 2).unlockedVehicleIds).toContain("go_kart");
  });

  it("unlocks both Vehicle Mastery blueprints when the Owner upgrade is purchased", () => {
    useGameStore.setState({
      ...createInitialState(),
      ownerPoints: 20,
      ownerUpgradeLevels: {},
      unlockedVehicleIds: ["push_mower"],
    });

    useGameStore.getState().purchaseOwnerUpgrade("owner_vehicle_mastery");

    expect(useGameStore.getState().unlockedVehicleIds).toEqual(
      expect.arrayContaining(["hypercar", "prototype_x"]),
    );
  });

  it("preserves Vehicle Mastery blueprints through lower-layer resets", () => {
    for (const action of ["prestige", "teamReset", "ownerReset"] as const) {
      useGameStore.setState({
        ...createInitialState(),
        ownerUpgradeLevels: { owner_vehicle_mastery: 1 },
        unlockedVehicleIds: ["push_mower", "hypercar", "prototype_x"],
      });

      useGameStore.getState()[action]();

      expect(useGameStore.getState().unlockedVehicleIds, action).toEqual(
        expect.arrayContaining(["push_mower", "hypercar", "prototype_x"]),
      );
    }
  });

  it("clears Vehicle Mastery at the Track Reset that clears Owner upgrades", () => {
    useGameStore.setState({
      ...createInitialState(),
      ownerUpgradeLevels: { owner_vehicle_mastery: 1, owner_adv_circuits: 1 },
      unlockedVehicleIds: ["push_mower", "hypercar", "prototype_x"],
      unlockedCircuitIds: ["backyard_derby", "continental_grand_prix", "endurance_series"],
      unlockedFeatures: ["crew_system", "vehicle_mastery", "advanced_circuits"],
      lifetimeOwnerPoints: 1_000,
      ownerEraCount: 5,
      lifetimeOPThisTrackEra: 100,
    });

    useGameStore.getState().trackReset();

    expect(useGameStore.getState().ownerUpgradeLevels).toEqual({});
    expect(useGameStore.getState().unlockedVehicleIds).toEqual(["push_mower"]);
    expect(useGameStore.getState().unlockedCircuitIds).toEqual(["backyard_derby"]);
    expect(useGameStore.getState().unlockedFeatures).toContain("crew_system");
    expect(useGameStore.getState().unlockedFeatures).not.toEqual(
      expect.arrayContaining(["vehicle_mastery", "advanced_circuits"]),
    );
  });
});
