import { afterEach, describe, expect, it, vi } from "vitest";
import { PENDING_MANUAL_RACE_ENTRY_FEE_KEY } from "@/config/gameplayLimits";
import { getCircuitById } from "@/data/circuits";
import { getPersistedGameState, mergePersistedGameState } from "../persistence";
import { createInitialState, type GameState, useGameStore } from "../store";
import { createGameplayFixture } from "@/testing/gameplayFixtures";

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  useGameStore.setState(createInitialState());
});

function loadRaceReadyState(): number {
  const fixture = createGameplayFixture("workshop_ready").payload.state;
  useGameStore.setState({
    ...createInitialState(),
    ...fixture,
    tutorialStep: -1,
    lifetimeRacesAllTime: 1,
  });
  return useGameStore.getState().scrapBucks;
}

describe("manual race persistence escrow", () => {
  it("refunds an interrupted entry fee exactly once when the browser hydrates", () => {
    vi.useFakeTimers();
    const startingCash = loadRaceReadyState();
    const circuit = getCircuitById(useGameStore.getState().selectedCircuitId)!;

    useGameStore.getState().enterRace();
    const inFlight = useGameStore.getState();
    expect(inFlight.scrapBucks).toBe(startingCash - circuit.entryFee);
    expect(inFlight.challengeProgress[PENDING_MANUAL_RACE_ENTRY_FEE_KEY]).toBe(circuit.entryFee);

    const persisted = getPersistedGameState(inFlight);
    const hydrated = mergePersistedGameState(persisted, createInitialState() as GameState);
    expect(hydrated.scrapBucks).toBe(startingCash);
    expect(hydrated.challengeProgress[PENDING_MANUAL_RACE_ENTRY_FEE_KEY]).toBe(0);
    expect(hydrated.isRacing).toBe(false);
    expect(hydrated.raceHistory).toEqual(inFlight.raceHistory);

    const hydratedAgain = mergePersistedGameState(getPersistedGameState(hydrated), createInitialState() as GameState);
    expect(hydratedAgain.scrapBucks).toBe(startingCash);
  });

  it("clears the escrow without refunding after a normal settlement", () => {
    vi.useFakeTimers();
    loadRaceReadyState();
    useGameStore.getState().enterRace();
    vi.runAllTimers();

    const settled = useGameStore.getState();
    expect(settled.isRacing).toBe(false);
    expect(settled.raceHistory).toHaveLength(1);
    expect(settled.challengeProgress[PENDING_MANUAL_RACE_ENTRY_FEE_KEY]).toBe(0);
  });
});
