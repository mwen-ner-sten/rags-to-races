import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialState, useGameStore, type AutomationSettlementMeta } from "../store";
import { migratePersistedState, PERSISTENCE_VERSION } from "../persistence";
import { withRandomSource, type RandomSource } from "@/utils/random";
import { REP_PROGRESSION } from "@/config/progression";
import { WORKSHOP_REVEAL_PREFIX } from "@/data/workshopTabs";
import type { RaceOutcome } from "@/engine/race";

const strongCar = {
  id: "ladder-car",
  definitionId: "go_kart",
  parts: {},
  stats: { speed: 1_000, handling: 100, reliability: 100, weight: 50, performance: 1_000 },
  builtAt: 1,
  condition: 100,
  totalRaces: 0,
};

class SequenceRandomSource implements RandomSource {
  private index = 0;
  constructor(private readonly values: readonly number[]) {}
  next(): number {
    return this.values[this.index++] ?? 0.5;
  }
}

/** No DNF, a win, no salvage, no forge token, flavor. */
function winRace(): void {
  withRandomSource(new SequenceRandomSource([0.99, 0, 0.99, 0.99, 0.5]), () => useGameStore.getState().enterRace());
  vi.runAllTimers();
}

function settlement(outcomes: RaceOutcome[], extra: Partial<AutomationSettlementMeta> = {}): AutomationSettlementMeta {
  return {
    partsScavenged: 0,
    partsAutoSold: 0,
    scavengesCompleted: 0,
    racesCompleted: outcomes.length,
    winsCompleted: outcomes.filter((outcome) => outcome.result === "win").length,
    finalWinStreak: 0,
    bestWinStreak: 0,
    recentRaceOutcomes: outcomes,
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
    ticksProcessed: 1,
    ...extra,
  };
}

afterEach(() => {
  vi.useRealTimers();
  useGameStore.setState(createInitialState());
});

describe("event ladder in the store", () => {
  it("records a manual Sprint win, opens the Heat and announces it", () => {
    vi.useFakeTimers();
    useGameStore.setState({
      ...createInitialState(),
      scrapBucks: 100,
      garage: [strongCar],
      activeVehicleId: strongCar.id,
      selectedCircuitId: "dirt_track",
      unlockedCircuitIds: ["backyard_derby", "dirt_track"],
      tutorialStep: -1,
    });
    winRace();
    const state = useGameStore.getState();
    expect(state.lastRaceOutcome).toMatchObject({ result: "win", circuitId: "dirt_track", eventId: "sprint" });
    expect(state.eventWins).toEqual({ dirt_track: { sprint: 1 } });
    expect(state.unlockEvents.some((event) => /Dirt Track Heat Unlocked/.test(event))).toBe(true);
    // The pinned Feature is still closed, so auto-pick keeps racing the Heat next.
    useGameStore.getState().setSelectedEvent("dirt_track", "feature");
    expect(useGameStore.getState().pinnedEventIds).toEqual({});
    useGameStore.getState().setSelectedEvent("dirt_track", "heat");
    expect(useGameStore.getState().pinnedEventIds).toEqual({ dirt_track: "heat" });
    useGameStore.getState().setSelectedEvent("dirt_track", null);
    expect(useGameStore.getState().pinnedEventIds).toEqual({});
  });

  it("merges automated wins from outcomes and from exact batched counts", () => {
    useGameStore.setState({ ...createInitialState(), eventWins: { dirt_track: { sprint: 1 } } });
    const heatWin: RaceOutcome = { result: "win", position: 1, totalRacers: 8, scrapsEarned: 0, repEarned: 0, log: [], circuitId: "dirt_track", eventId: "heat" };
    useGameStore.getState().applyTickResult([], 0, 0, undefined, undefined, undefined, undefined, undefined, settlement([heatWin]));
    expect(useGameStore.getState().eventWins).toEqual({ dirt_track: { sprint: 1, heat: 1 } });
    expect(useGameStore.getState().unlockEvents.some((event) => /Dirt Track Feature Unlocked/.test(event))).toBe(true);

    useGameStore.getState().applyTickResult([], 0, 0, undefined, undefined, undefined, undefined, undefined, settlement([], {
      eventWins: { regional_circuit: { sprint: 2 } },
    }));
    expect(useGameStore.getState().eventWins).toEqual({ dirt_track: { sprint: 1, heat: 1 }, regional_circuit: { sprint: 2 } });
    // Outcomes saved before the ladder count as Heats.
    const legacyWin: RaceOutcome = { result: "win", position: 1, totalRacers: 8, scrapsEarned: 0, repEarned: 0, log: [], circuitId: "backyard_derby" };
    useGameStore.getState().applyTickResult([], 0, 0, undefined, undefined, undefined, undefined, undefined, settlement([legacyWin]));
    expect(useGameStore.getState().eventWins.backyard_derby).toEqual({ heat: 1 });
  });

  it("resets event wins on Scrap Reset but keeps revealed systems", () => {
    useGameStore.setState({
      ...createInitialState(),
      lifetimeRep: 2_500,
      eventWins: { national_circuit: { sprint: 1, heat: 1, feature: 1 } },
      defeatedRivalIds: ["rival_greasy_pete", "rival_redline_rosa"],
      revealedSystems: ["dealer", "decompose"],
    });
    useGameStore.getState().prestige();
    const reset = useGameStore.getState();
    expect(reset.prestigeCount).toBe(1);
    expect(reset.eventWins).toEqual({});
    expect(reset.revealedSystems).toEqual(["dealer", "decompose"]);
  });
});

describe("reveal on relevance in the store", () => {
  it("opens the Dealer with a fresh board once cash covers a missing core part", () => {
    const beater = {
      id: "beater",
      definitionId: "beater_car",
      parts: {
        engine: { part: { id: "e", definitionId: "engine_v4", condition: "decent" as const, foundAt: "t", type: "part" as const }, addons: [] },
        wheel: { part: { id: "w", definitionId: "wheel_basic", condition: "decent" as const, foundAt: "t", type: "part" as const }, addons: [] },
        frame: { part: { id: "f", definitionId: "frame_steel", condition: "decent" as const, foundAt: "t", type: "part" as const }, addons: [] },
        fuel: { part: { id: "u", definitionId: "fuel_tank_large", condition: "decent" as const, foundAt: "t", type: "part" as const }, addons: [] },
      },
      stats: { speed: 10, handling: 5, reliability: 10, weight: 300, performance: 10 },
      builtAt: 1,
      condition: 100,
      totalRaces: 0,
    };
    useGameStore.setState({ ...createInitialState(), garage: [beater], activeVehicleId: beater.id, scrapBucks: 5, gameTick: 40 });
    useGameStore.getState().checkWorkshopReveals();
    expect(useGameStore.getState().revealedSystems).toEqual([]);
    useGameStore.setState({ scrapBucks: 1_000 });
    useGameStore.getState().checkWorkshopReveals();
    expect(useGameStore.getState().revealedSystems).toEqual(["dealer"]);
    expect(useGameStore.getState().dealerBoard).toHaveLength(3);
    // Buying works without any Rep at all.
    const listing = useGameStore.getState().dealerBoard[0];
    useGameStore.getState().buyFromDealer(listing.id);
    expect(useGameStore.getState().inventory.some((part) => part.definitionId === listing.definitionId)).toBe(true);
  });

  it("reveals Decompose after a rusted part has sat in the pile for a full tick and announces it once", () => {
    const rusted = { id: "r", definitionId: "engine_small", condition: "rusted" as const, foundAt: "curbside", type: "part" as const };
    useGameStore.setState({ ...createInitialState(), inventory: [rusted], gameTick: 3 });
    useGameStore.getState().checkWorkshopReveals();
    expect(useGameStore.getState().rustedPileSinceTick).toBe(3);
    expect(useGameStore.getState().revealedSystems).toEqual([]);
    useGameStore.setState({ gameTick: 4 });
    useGameStore.getState().checkWorkshopReveals();
    expect(useGameStore.getState().revealedSystems).toEqual(["decompose"]);
    expect(useGameStore.getState().unlockEvents).toEqual([`${WORKSHOP_REVEAL_PREFIX}Decompose`]);
    useGameStore.getState().checkWorkshopReveals();
    expect(useGameStore.getState().unlockEvents).toHaveLength(1);
  });

  it("migrates a v5 save: venues stay open on their Sprint and old Rep reveals are kept", () => {
    const migrated = migratePersistedState({
      repPoints: 10,
      lifetimeRep: REP_PROGRESSION.dealer.unlock,
      unlockedCircuitIds: ["backyard_derby", "dirt_track"],
      raceHistory: [],
    }, 5) as Record<string, unknown>;
    expect(migrated.eventWins).toEqual({});
    expect(migrated.pinnedEventIds).toEqual({});
    expect(migrated.revealedSystems).toEqual(["dealer", "addons"]);
    expect(migrated.unlockedCircuitIds).toEqual(["backyard_derby", "dirt_track"]);
    const current = migratePersistedState({ revealedSystems: ["stations"], eventWins: { dirt_track: { sprint: 2 } } }, PERSISTENCE_VERSION) as Record<string, unknown>;
    expect(current.revealedSystems).toEqual(["stations"]);
    expect(current.eventWins).toEqual({ dirt_track: { sprint: 2 } });
  });
});
