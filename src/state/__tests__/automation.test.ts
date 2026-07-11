import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialState, useGameStore, type AutomationSettlementMeta } from "../store";
import { createGameplayFixture } from "@/testing/gameplayFixtures";
import type { RaceOutcome } from "@/engine/race";
import { DEALER_BOARD_SIZE, DEALER_REFRESH_INTERVAL, DEALER_UNLOCK_REP } from "@/data/dealer";
import { computeTick } from "@/engine/tick";
import { LOOSE_INVENTORY_LIMIT, STATION_EQUIPMENT_INVENTORY_LIMIT } from "@/config/gameplayLimits";
import type { ScavengedPart } from "@/engine/scavenge";
import type { LootGearItem } from "@/data/lootGear";

function settlement(overrides: Partial<AutomationSettlementMeta> = {}): AutomationSettlementMeta {
  return {
    partsScavenged: 0,
    partsAutoSold: 0,
    scavengesCompleted: 0,
    racesCompleted: 0,
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
    ticksProcessed: 1,
    ...overrides,
  };
}

function raceOutcome(result: RaceOutcome["result"], circuitId = "backyard_derby"): RaceOutcome {
  return {
    result,
    position: result === "win" ? 1 : result === "loss" ? 2 : 8,
    totalRacers: 8,
    scrapsEarned: result === "win" ? 10 : 0,
    repEarned: result === "win" ? 1 : 0,
    log: [],
    circuitId,
  };
}

afterEach(() => {
  vi.useRealTimers();
  useGameStore.setState(createInitialState());
});

describe("automation unlock contracts", () => {
  it("does not unlock either automation system from Rep", () => {
    vi.useFakeTimers();
    const fixture = createGameplayFixture("first_race_ready");
    useGameStore.setState({
      ...createInitialState(),
      ...fixture.payload.state,
      repPoints: 100_000,
      autoScavengeUnlocked: false,
      autoRaceUnlocked: false,
    });

    useGameStore.getState().enterRace();
    vi.runAllTimers();

    expect(useGameStore.getState()).toMatchObject({
      autoScavengeUnlocked: false,
      autoRaceUnlocked: false,
    });
  });

  it("accounts for auto-sold offline parts in lifetime progress and Trader XP", () => {
    useGameStore.setState({
      ...createInitialState(),
      crewRoster: [{ id: "trader", name: "Mags", role: "trader", level: 1, xp: 0, specialization: null }],
    });

    useGameStore.getState().applyTickResult([], 5, 0, undefined, undefined, undefined, undefined, undefined, settlement({
      partsScavenged: 5,
      partsAutoSold: 5,
      scavengesCompleted: 5,
    }));

    expect(useGameStore.getState()).toMatchObject({
      lifetimePartsScavengedAllTime: 5,
      crewRoster: [{ id: "trader", xp: 5 }],
    });
  });

  it("auto-sells live automation overflow without replacing the bounded inventory array", () => {
    const inventory: ScavengedPart[] = Array.from({ length: LOOSE_INVENTORY_LIMIT }, (_, index) => ({
      id: `existing-${index}`,
      definitionId: "misc_junk",
      condition: "worn",
      foundAt: "test",
      type: "part",
    }));
    const incoming: ScavengedPart[] = [0, 1].map((index) => ({
      id: `incoming-${index}`,
      definitionId: "misc_junk",
      condition: "worn",
      foundAt: "test",
      type: "part",
    }));
    useGameStore.setState({
      ...createInitialState(),
      inventory,
      crewRoster: [{ id: "trader", name: "Mags", role: "trader", level: 1, xp: 0, specialization: null }],
    });

    useGameStore.getState().applyTickResult(incoming, 0, 0, undefined, undefined, undefined, undefined, undefined, settlement({
      partsScavenged: incoming.length,
      scavengesCompleted: 1,
    }));
    const after = useGameStore.getState();

    expect(after.inventory).toBe(inventory);
    expect(after.inventory).toHaveLength(LOOSE_INVENTORY_LIMIT);
    expect(after.scrapBucks).toBeGreaterThan(0);
    expect(after.lifetimePartsScavengedAllTime).toBe(incoming.length);
    expect(after.crewRoster[0].xp).toBe(incoming.length);
    expect(after.activityLog.at(-1)?.message).toContain("2 auto-sold");
  });

  it("auto-salvages live station-equipment overflow into Reforge Shards", () => {
    const stationEquipmentInventory = Array.from({ length: STATION_EQUIPMENT_INVENTORY_LIMIT }, (_, index) => ({
      id: `station-${index}`,
      slot: "diagnostics" as const,
      rarity: "common" as const,
      name: `Station ${index}`,
      effects: [],
      enhancementLevel: 0,
      source: "test",
    }));
    const gearDrops: LootGearItem[] = [0, 1].map((index) => ({
      id: `drop-${index}`,
      slot: "head",
      rarity: "common",
      name: `Drop ${index}`,
      effects: [],
      enhancementLevel: 0,
      modSlots: 0,
      mods: [],
      source: "test",
    }));
    useGameStore.setState({ ...createInitialState(), stationEquipmentInventory });

    useGameStore.getState().applyTickResult([], 0, 0, undefined, undefined, undefined, gearDrops, undefined, settlement());
    const after = useGameStore.getState();

    expect(after.stationEquipmentInventory).toBe(stationEquipmentInventory);
    expect(after.stationEquipmentInventory).toHaveLength(STATION_EQUIPMENT_INVENTORY_LIMIT);
    expect(after.reforgeShards).toBe(2);
    expect(after.activityLog.at(-1)?.message).toContain("2 gear auto-salvaged");
  });

  it("advances the global clock on a no-op tick without generating resources", () => {
    const before = createInitialState();
    useGameStore.setState(before);

    useGameStore.getState().applyTickResult([], 0, 0, undefined, undefined, undefined, undefined, undefined, settlement({ ticksProcessed: 7 }));

    expect(useGameStore.getState()).toMatchObject({
      gameTick: before.gameTick + 7,
      scrapBucks: before.scrapBucks,
      repPoints: before.repPoints,
      inventory: before.inventory,
      lifetimeRaces: before.lifetimeRaces,
    });
  });

  it("initializes the Dealer board when an automated reward crosses its Rep gate", () => {
    useGameStore.setState({
      ...createInitialState(),
      repPoints: DEALER_UNLOCK_REP - 1,
      gameTick: 12,
      dealerBoard: [],
    });

    useGameStore.getState().applyTickResult([], 0, 1, undefined, undefined, undefined, undefined, undefined, settlement({ ticksProcessed: 3 }));
    const state = useGameStore.getState();

    expect(state.gameTick).toBe(15);
    expect(state.dealerBoard).toHaveLength(DEALER_BOARD_SIZE);
    expect(state.dealerBoard.every((listing) => listing.expiresAt === 15 + DEALER_REFRESH_INTERVAL)).toBe(true);
  });

  it("counts an auto-race with zero wear and retains it in bounded history", () => {
    const fixture = createGameplayFixture("first_race_ready");
    const outcome = raceOutcome("win");
    useGameStore.setState({ ...createInitialState(), ...fixture.payload.state });

    useGameStore.getState().applyTickResult([], 10, 1, undefined, undefined, 0, undefined, undefined, settlement({
      racesCompleted: 1,
      winsCompleted: 1,
      finalWinStreak: 1,
      bestWinStreak: 1,
      recentRaceOutcomes: [outcome],
      winningCircuitIds: [outcome.circuitId],
      circuitWinStreaks: { [outcome.circuitId]: 1 },
    }));

    expect(useGameStore.getState()).toMatchObject({ lifetimeRaces: 1, lifetimeWinsAllTime: 1, lastRaceOutcome: outcome });
    expect(useGameStore.getState().raceHistory).toHaveLength(1);
  });

  it("requires five consecutive wins on the same circuit for the Go-Kart blueprint", () => {
    const winningOutcome = raceOutcome("win");
    useGameStore.setState({ ...createInitialState(), bestWinStreak: 5 });

    useGameStore.getState().applyTickResult([], 0, 0, undefined, undefined, undefined, undefined, undefined, settlement({
      racesCompleted: 5,
      winsCompleted: 5,
      finalWinStreak: 5,
      bestWinStreak: 5,
      recentRaceOutcomes: [winningOutcome],
      winningCircuitIds: ["backyard_derby", "dirt_track"],
      circuitWinStreaks: { backyard_derby: 4, dirt_track: 1 },
    }));
    expect(useGameStore.getState().unlockedVehicleIds).not.toContain("go_kart");

    useGameStore.setState({ ...createInitialState(), bestWinStreak: 4 });
    useGameStore.getState().applyTickResult([], 0, 0, undefined, undefined, undefined, undefined, undefined, settlement({
      racesCompleted: 1,
      winsCompleted: 1,
      finalWinStreak: 5,
      bestWinStreak: 5,
      recentRaceOutcomes: [winningOutcome],
      winningCircuitIds: ["backyard_derby"],
      circuitWinStreaks: { backyard_derby: 5 },
    }));
    expect(useGameStore.getState().unlockedVehicleIds).toContain("go_kart");
  });

  it("bounds batched race history to the most recent twenty outcomes", () => {
    const outcomes = Array.from({ length: 30 }, (_, index) => ({
      ...raceOutcome(index % 2 === 0 ? "win" : "loss"),
      log: [`race-${index}`],
    }));

    useGameStore.getState().applyTickResult([], 0, 0, undefined, undefined, undefined, undefined, undefined, settlement({
      racesCompleted: outcomes.length,
      winsCompleted: 15,
      recentRaceOutcomes: outcomes,
    }));

    expect(useGameStore.getState().raceHistory).toHaveLength(20);
  });

  it("blocks manual and automated actions for stale locked selections", () => {
    const fixture = createGameplayFixture("first_race_ready");
    useGameStore.setState({
      ...createInitialState(),
      ...fixture.payload.state,
      autoScavengeUnlocked: true,
      autoRaceUnlocked: true,
      selectedLocationId: "local_junkyard",
      selectedCircuitId: "regional_circuit",
      unlockedLocationIds: ["curbside"],
      unlockedCircuitIds: ["backyard_derby"],
    });

    const before = useGameStore.getState();
    before.manualScavenge();
    before.enterRace();
    const tick = computeTick(useGameStore.getState());

    expect(useGameStore.getState()).toMatchObject({
      manualScavengeClicks: before.manualScavengeClicks,
      isRacing: false,
    });
    expect(tick.partsScavenged).toBe(0);
    expect(tick.raceOutcome).toBeNull();
  });
});
