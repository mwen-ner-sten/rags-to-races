import { afterEach, describe, expect, it, vi } from "vitest";
import { RACE_CONTROL_RACES_PER_OPPORTUNITY } from "@/config/gameplayLimits";
import { buildResetRetentionMatrix } from "@/data/resetContracts";
import { createGameplayFixture } from "@/testing/gameplayFixtures";
import { getPersistedGameState, mergePersistedGameState } from "../persistence";
import {
  createInitialState,
  type AutomationSettlementMeta,
  type GameState,
  useGameStore,
} from "../store";

function settlement(racesCompleted: number): AutomationSettlementMeta {
  return {
    partsScavenged: 0,
    partsAutoSold: 0,
    scavengesCompleted: 0,
    racesCompleted,
    winsCompleted: 0,
    finalWinStreak: 0,
    bestWinStreak: 0,
    recentRaceOutcomes: [],
    winningCircuitIds: [],
    defeatedRivalIds: [],
    circuitWinStreaks: {},
    raceSalvageFound: 0,
    forgeTokensFound: 0,
    entryFeesPaid: 0,
    challengesEvaluated: false,
    completedChallengeIds: [],
    challengeForgeTokens: 0,
    challengeMaterials: {},
    ticksProcessed: racesCompleted,
  };
}

function settleAutomatedRaces(count: number): void {
  useGameStore.getState().applyTickResult(
    [], 0, 0, undefined, undefined, undefined, undefined, undefined,
    settlement(count),
  );
}

function loadRaceReadyState(): void {
  const fixture = createGameplayFixture("workshop_ready").payload.state;
  useGameStore.setState({
    ...createInitialState(),
    ...fixture,
    prestigeCount: 1,
    autoRaceUnlocked: true,
    tutorialStep: -1,
  });
}

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  useGameStore.setState(createInitialState());
});

describe("Race Control opportunity progression", () => {
  it("defaults old saves safely and explicitly resets opportunity state at every reset layer", () => {
    const hydrated = mergePersistedGameState(
      { prestigeCount: 1, autoRaceUnlocked: true },
      createInitialState() as GameState,
    );
    expect(hydrated).toMatchObject({
      raceControlOpportunityReady: false,
      raceControlRaceProgress: 0,
      raceControlCallEscrowed: false,
    });

    const matrix = buildResetRetentionMatrix([
      "raceControlOpportunityReady",
      "raceControlRaceProgress",
      "raceControlCallEscrowed",
    ]);
    for (const layer of ["scrap", "team", "owner", "track"] as const) {
      expect(matrix[layer]).toEqual({
        raceControlOpportunityReady: "reset",
        raceControlRaceProgress: "reset",
        raceControlCallEscrowed: "reset",
      });
    }
  });

  it("persists a stocked opportunity across ordinary reloads", () => {
    const stocked = {
      ...createInitialState(),
      prestigeCount: 1,
      autoRaceUnlocked: true,
      raceControlOpportunityReady: true,
      raceControlRaceProgress: RACE_CONTROL_RACES_PER_OPPORTUNITY,
    } as GameState;

    const hydrated = mergePersistedGameState(
      getPersistedGameState(stocked),
      createInitialState() as GameState,
    );
    expect(hydrated).toMatchObject({
      raceControlOpportunityReady: true,
      raceControlRaceProgress: RACE_CONTROL_RACES_PER_OPPORTUNITY,
      raceControlCallEscrowed: false,
    });
  });

  it("preserves a stocked opportunity when Owner automation restores Auto-Race", () => {
    const hydrated = mergePersistedGameState(
      {
        prestigeCount: 1,
        autoRaceUnlocked: false,
        ownerUpgradeLevels: { owner_auto_all: 1 },
        raceControlOpportunityReady: true,
        raceControlRaceProgress: RACE_CONTROL_RACES_PER_OPPORTUNITY,
      },
      createInitialState() as GameState,
    );

    expect(hydrated).toMatchObject({
      autoRaceUnlocked: true,
      raceControlOpportunityReady: true,
      raceControlRaceProgress: RACE_CONTROL_RACES_PER_OPPORTUNITY,
    });
  });

  it("earns one capped opportunity after ten settled races following the first Scrap Reset", () => {
    settleAutomatedRaces(RACE_CONTROL_RACES_PER_OPPORTUNITY);
    expect(useGameStore.getState()).toMatchObject({
      raceControlOpportunityReady: false,
      raceControlRaceProgress: 0,
    });

    useGameStore.setState({ prestigeCount: 1, autoRaceUnlocked: true });
    settleAutomatedRaces(RACE_CONTROL_RACES_PER_OPPORTUNITY - 1);
    expect(useGameStore.getState()).toMatchObject({
      raceControlOpportunityReady: false,
      raceControlRaceProgress: RACE_CONTROL_RACES_PER_OPPORTUNITY - 1,
    });

    settleAutomatedRaces(1);
    expect(useGameStore.getState()).toMatchObject({
      raceControlOpportunityReady: true,
      raceControlRaceProgress: RACE_CONTROL_RACES_PER_OPPORTUNITY,
    });

    settleAutomatedRaces(RACE_CONTROL_RACES_PER_OPPORTUNITY * 2);
    expect(useGameStore.getState()).toMatchObject({
      raceControlOpportunityReady: true,
      raceControlRaceProgress: RACE_CONTROL_RACES_PER_OPPORTUNITY,
    });
  });

  it("does not earn an opportunity until Auto-Race is mastered", () => {
    useGameStore.setState({ prestigeCount: 1, autoRaceUnlocked: false });

    settleAutomatedRaces(RACE_CONTROL_RACES_PER_OPPORTUNITY);

    expect(useGameStore.getState()).toMatchObject({
      raceControlOpportunityReady: false,
      raceControlRaceProgress: 0,
    });
  });

  it("does not consume a ready opportunity during auto or ordinary manual races", () => {
    vi.useFakeTimers();
    loadRaceReadyState();
    useGameStore.setState({
      raceControlOpportunityReady: true,
      raceControlRaceProgress: RACE_CONTROL_RACES_PER_OPPORTUNITY,
    });

    settleAutomatedRaces(3);
    expect(useGameStore.getState().raceControlOpportunityReady).toBe(true);

    useGameStore.getState().enterRace();
    expect(useGameStore.getState().precomputedOutcome?.raceControlCall).toBeUndefined();
    vi.runAllTimers();
    expect(useGameStore.getState().raceControlOpportunityReady).toBe(true);
  });

  it("escrows one selected call and restores it after interrupted hydration", () => {
    vi.useFakeTimers();
    loadRaceReadyState();
    useGameStore.setState({
      raceControlOpportunityReady: true,
      raceControlRaceProgress: RACE_CONTROL_RACES_PER_OPPORTUNITY,
    });

    useGameStore.getState().enterRace({
      callId: "protect",
      vehicleId: useGameStore.getState().activeVehicleId!,
      circuitId: useGameStore.getState().selectedCircuitId,
    });
    const inFlight = useGameStore.getState();
    expect(inFlight.precomputedOutcome?.raceControlCall?.id).toBe("protect");
    expect(inFlight).toMatchObject({
      raceControlOpportunityReady: false,
      raceControlRaceProgress: 0,
      raceControlCallEscrowed: true,
    });

    const hydrated = mergePersistedGameState(
      getPersistedGameState(inFlight),
      createInitialState() as GameState,
    );
    expect(hydrated).toMatchObject({
      raceControlOpportunityReady: true,
      raceControlRaceProgress: RACE_CONTROL_RACES_PER_OPPORTUNITY,
      raceControlCallEscrowed: false,
      isRacing: false,
    });
  });

  it("consumes the escrow only when the called manual race settles", () => {
    vi.useFakeTimers();
    loadRaceReadyState();
    useGameStore.setState({
      raceControlOpportunityReady: true,
      raceControlRaceProgress: RACE_CONTROL_RACES_PER_OPPORTUNITY,
    });

    useGameStore.getState().enterRace({
      callId: "attack",
      vehicleId: useGameStore.getState().activeVehicleId!,
      circuitId: useGameStore.getState().selectedCircuitId,
    });
    vi.runAllTimers();

    expect(useGameStore.getState()).toMatchObject({
      raceControlOpportunityReady: false,
      raceControlRaceProgress: 1,
      raceControlCallEscrowed: false,
    });
    expect(useGameStore.getState().lastRaceOutcome?.raceControlCall?.id).toBe("attack");
  });

  it("rejects a call when its previewed vehicle or circuit selection is stale", () => {
    loadRaceReadyState();
    useGameStore.setState({
      raceControlOpportunityReady: true,
      raceControlRaceProgress: RACE_CONTROL_RACES_PER_OPPORTUNITY,
    });
    const state = useGameStore.getState();
    const startingCash = state.scrapBucks;

    state.enterRace({
      callId: "protect",
      vehicleId: "stale-vehicle",
      circuitId: state.selectedCircuitId,
    });
    expect(useGameStore.getState()).toMatchObject({
      isRacing: false,
      scrapBucks: startingCash,
      raceControlOpportunityReady: true,
    });

    state.enterRace({
      callId: "protect",
      vehicleId: state.activeVehicleId!,
      circuitId: "stale-circuit",
    });
    expect(useGameStore.getState()).toMatchObject({
      isRacing: false,
      scrapBucks: startingCash,
      raceControlOpportunityReady: true,
    });
  });
});
