import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialState, useGameStore } from "../store";
import { resetRandomSource, SeededRandomSource, setRandomSource } from "@/utils/random";

describe("tutorial first-race contract", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useGameStore.setState(createInitialState());
    useGameStore.getState().devQuickStart();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    resetRandomSource();
    useGameStore.setState(createInitialState());
  });

  it("uses the real simulation for the first guided race", () => {
    const results = new Set<string>();

    for (let seed = 0; seed < 24; seed += 1) {
      useGameStore.setState(createInitialState());
      useGameStore.getState().devQuickStart();
      useGameStore.setState({ tutorialStep: 10, lifetimeRacesAllTime: 0 });
      setRandomSource(new SeededRandomSource(`first-race-${seed}`));

      useGameStore.getState().enterRace();
      const outcome = useGameStore.getState().precomputedOutcome;
      expect(outcome).not.toBeNull();
      results.add(outcome!.result);
    }

    expect(results.size).toBeGreaterThan(1);
    expect(results).not.toEqual(new Set(["dnf"]));
  });

  it("ends at the repair step and normalizes saves parked on removed steps", () => {
    useGameStore.setState({ tutorialStep: 13 });
    useGameStore.getState().advanceTutorial();
    expect(useGameStore.getState().tutorialStep).toBe(-1);

    useGameStore.setState({ tutorialStep: 18 });
    useGameStore.getState().advanceTutorial();
    expect(useGameStore.getState().tutorialStep).toBe(-1);
  });
});
