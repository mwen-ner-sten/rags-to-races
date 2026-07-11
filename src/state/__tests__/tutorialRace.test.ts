import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialState, useGameStore } from "../store";

describe("tutorial first-race contract", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useGameStore.setState(createInitialState());
    useGameStore.getState().devQuickStart();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    useGameStore.setState(createInitialState());
  });

  for (const tutorialStep of [9, 10, 11]) {
    it(`keeps the displayed forced DNF when Enter Race is used at step ${tutorialStep}`, () => {
      useGameStore.setState({ tutorialStep, lifetimeRacesAllTime: 0 });

      const before = useGameStore.getState();
      const vehicleId = before.activeVehicleId!;
      const conditionBefore = before.garage.find((vehicle) => vehicle.id === vehicleId)!.condition;

      before.enterRace();
      expect(useGameStore.getState().isRacing).toBe(true);
      vi.runAllTimers();

      const after = useGameStore.getState();
      expect(after.lastRaceOutcome?.result).toBe("dnf");
      expect(after.raceHistory[0]?.result).toBe("dnf");
      expect(after.lifetimeRacesAllTime).toBe(1);
      expect(after.garage.find((vehicle) => vehicle.id === vehicleId)!.condition).toBeLessThan(conditionBefore);
    });
  }
});
