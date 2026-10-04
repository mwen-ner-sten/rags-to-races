import { afterEach, describe, expect, it } from "vitest";
import { computeTick, computeTickSpeedMs, computeOfflineTickBudget, simulateOfflineTicks, type TickResult } from "@/engine/tick";
import { createGameplayFixture } from "@/testing/gameplayFixtures";
import { SeededRandomSource, withRandomSource } from "@/utils/random";
import {
  createInitialState,
  useGameStore,
  type AutomationSettlementMeta,
  type GameState,
} from "../store";

function circuitStreak(state: GameState, tick: TickResult): Record<string, number> {
  const outcome = tick.raceOutcome;
  if (!outcome || outcome.result !== "win") return {};
  let priorWins = 0;
  for (const race of state.raceHistory) {
    if (race.result !== "win" || race.circuitId !== outcome.circuitId) break;
    priorWins++;
  }
  return { [outcome.circuitId]: priorWins + 1 };
}

function onlineSettlement(state: GameState, tick: TickResult): AutomationSettlementMeta {
  const outcome = tick.raceOutcome;
  const projectedStreak = outcome ? (outcome.result === "win" ? state.winStreak + 1 : 0) : state.winStreak;
  return {
    partsScavenged: tick.partsScavenged,
    partsAutoSold: tick.partsAutoSold,
    scavengesCompleted: tick.scavengesCompleted,
    racesCompleted: outcome ? 1 : 0,
    winsCompleted: outcome?.result === "win" ? 1 : 0,
    finalWinStreak: projectedStreak,
    bestWinStreak: Math.max(state.bestWinStreak, projectedStreak),
    recentRaceOutcomes: outcome ? [outcome] : [],
    winningCircuitIds: outcome?.result === "win" ? [outcome.circuitId] : [],
    defeatedRivalIds: outcome?.result === "win" && outcome.rivalId ? [outcome.rivalId] : [],
    circuitWinStreaks: circuitStreak(state, tick),
    raceSalvageFound: tick.raceSalvageFound,
    forgeTokensFound: tick.forgeTokensFound,
    entryFeesPaid: tick.entryFeesPaid,
    challengesEvaluated: false,
    completedChallengeIds: [],
    challengeForgeTokens: 0,
    challengeMaterials: {},
    ticksProcessed: 1,
    repDecayed: tick.repDecayed,
    finalFatigue: tick.fatigueAfterTick,
    stationEquipmentDrops: tick.stationDrops,
    reforgeShardDrops: tick.reforgeShardDrops,
    finalProjects: tick.projects,
    completedProjects: tick.completedProjects,
  };
}

function settleOnlineTick(state: GameState, tick: TickResult): void {
  state.applyTickResult(
    tick.partsFound,
    tick.scrapsEarned,
    tick.repEarned,
    tick.vehicleWearAmount || undefined,
    tick.vehicleRepairAmount || undefined,
    tick.newRaceTickProgress,
    tick.lootGearDrops,
    tick.modDrops,
    onlineSettlement(state, tick),
  );
}

function settleOffline(state: GameState, result: ReturnType<typeof simulateOfflineTicks>): void {
  state.applyTickResult(
    result.partsFound,
    result.scrapsEarned,
    result.repEarned,
    result.vehicleWearTotal || undefined,
    result.vehicleRepairTotal || undefined,
    result.raceTickProgress,
    result.lootGearDrops,
    result.modDrops,
    {
      partsScavenged: result.partsScavenged,
      partsAutoSold: result.partsAutoSold,
      scavengesCompleted: result.scavengesCompleted,
      racesCompleted: result.racesCompleted,
      winsCompleted: result.winsCompleted,
      finalWinStreak: result.finalWinStreak,
      bestWinStreak: result.bestWinStreak,
      recentRaceOutcomes: result.recentRaceOutcomes,
      winningCircuitIds: result.winningCircuitIds,
      defeatedRivalIds: result.defeatedRivalIds,
      circuitWinStreaks: result.circuitWinStreaks,
      eventWins: result.eventWins,
      raceSalvageFound: result.raceSalvageFound,
      forgeTokensFound: result.forgeTokensFound,
      entryFeesPaid: result.entryFeesPaid,
      challengesEvaluated: result.challengesEvaluated,
      completedChallengeIds: result.completedChallengeIds,
      challengeForgeTokens: result.challengeForgeTokens,
      challengeMaterials: result.challengeMaterials,
      ticksProcessed: result.ticksProcessed,
      repDecayed: result.repDecayed,
      finalFatigue: result.finalFatigue,
      finalRepPoints: result.finalRepPoints,
      finalVehicleCondition: result.finalVehicleCondition,
      finalRacerSkills: result.finalRacerSkills,
      finalCrewRoster: result.finalCrewRoster,
      finalActiveMomentumTiers: result.finalActiveMomentumTiers,
      newAchievementIds: result.newAchievementIds,
      stationEquipmentDrops: result.stationEquipmentDrops,
      stationEquipmentAutoSalvaged: result.stationEquipmentAutoSalvaged,
      reforgeShardsFound: result.reforgeShardsFound,
      lootGearAutoSalvaged: result.lootGearAutoSalvaged,
      lootGearSalvageScrap: result.lootGearSalvageScrap,
      finalProjects: result.finalProjects,
      completedProjects: result.completedProjects,
    },
  );
}

function paritySnapshot(state: GameState) {
  const activeVehicle = state.garage.find((vehicle) => vehicle.id === state.activeVehicleId);
  return {
    scrapBucks: state.scrapBucks,
    repPoints: state.repPoints,
    lifetimeScrapBucks: state.lifetimeScrapBucks,
    lifetimeScrapBucksAllTime: state.lifetimeScrapBucksAllTime,
    lifetimeRaces: state.lifetimeRaces,
    lifetimeRacesAllTime: state.lifetimeRacesAllTime,
    lifetimeWinsAllTime: state.lifetimeWinsAllTime,
    winStreak: state.winStreak,
    bestWinStreak: state.bestWinStreak,
    fatigue: state.fatigue,
    racerSkills: state.racerSkills,
    crewRoster: state.crewRoster,
    vehicleCondition: activeVehicle?.condition,
    vehicleStats: activeVehicle?.stats,
    vehicleRaces: activeVehicle?.totalRaces,
    challengeProgress: state.challengeProgress,
    completedChallenges: state.completedChallenges,
    materials: state.materials,
    forgeTokens: state.forgeTokens,
    totalForgeTokensEarned: state.totalForgeTokensEarned,
    earnedAchievements: state.earnedAchievements,
    activeMomentumTiers: state.activeMomentumTiers,
    gameTick: state.gameTick,
    stationEquipmentCount: state.stationEquipmentInventory.length,
    reforgeShards: state.reforgeShards,
    recentResults: state.raceHistory.map(({ result, circuitId, scrapsEarned, repEarned }) => ({ result, circuitId, scrapsEarned, repEarned })),
  };
}

afterEach(() => useGameStore.setState(createInitialState()));

describe("online and batched automation parity", () => {
  it("matches elapsed time when a workshop speed project completes during the batch", () => {
    const initial = { ...createInitialState(), ...createGameplayFixture("first_race_ready").payload.state,
      autoScavengeUnlocked: true, autoRaceUnlocked: true, scrapBucks: 10000,
      workshopLevels: {}, projects: [{ id: "speed", kind: "upgrade" as const, label: "Tick Accelerator",
        upgradeId: "tick_accelerator", targetLevel: 1, startedAt: 0, durationMs: 30000, elapsedMs: 0,
        paid: { scrap: 2500, rep: 0, materials: {} } }] };
    const elapsed = 300000;
    useGameStore.setState(initial);
    const before = useGameStore.getState();
    const budget = computeOfflineTickBudget(before, elapsed);
    const result = withRandomSource(new SeededRandomSource("speed-project-parity"), () => simulateOfflineTicks(before, budget.ticks, elapsed));
    before.settleOffline(result, before.lastActiveTimestamp, before.lastActiveTimestamp + elapsed);
    const offline = paritySnapshot(useGameStore.getState());
    expect(useGameStore.getState().workshopLevels.tick_accelerator).toBe(1);
    useGameStore.setState(initial);
    let credited = 0;
    withRandomSource(new SeededRandomSource("speed-project-parity"), () => {
      while (credited + computeTickSpeedMs(useGameStore.getState()) <= elapsed) {
        const state = useGameStore.getState();
        credited += computeTickSpeedMs(state);
        settleOnlineTick(state, computeTick(state));
      }
    });
    expect(result.creditedMs).toBe(credited);
    expect(result.ticksProcessed).toBeGreaterThan(budget.ticks);
    expect(paritySnapshot(useGameStore.getState())).toEqual(offline);
  });

  it("settles the same seeded 100-tick campaign including mid-batch momentum, challenges, achievements, fatigue, and wear", () => {
    const fixture = createGameplayFixture("first_race_ready");
    const fixtureVehicle = fixture.payload.state.garage[0]!;
    const initial = {
      ...createInitialState(),
      ...fixture.payload.state,
      scrapBucks: 100_000,
      lifetimeScrapBucks: 1_000,
      repPoints: 0,
      autoRaceUnlocked: true,
      // Never rest for fatigue: the parity check wants a race on every tick.
      autoRaceMaxFatigue: 99,
      raceTickProgress: 0,
      lifetimeRaces: 29,
      lifetimeRacesAllTime: 29,
      activeMomentumTiers: [],
      workshopLevels: { auto_repair: 3, reinforced_chassis: 5, pit_crew: 2 },
      garage: [{ ...fixtureVehicle, condition: 100, totalRaces: 0 }],
      crewRoster: [{ id: "driver", name: "Mags", role: "driver" as const, level: 1, xp: 0, specialization: null }],
    };

    useGameStore.setState(initial);
    const offlineResult = withRandomSource(new SeededRandomSource("automation-parity"), () =>
      simulateOfflineTicks(useGameStore.getState(), 100),
    );
    settleOffline(useGameStore.getState(), offlineResult);
    const offlineState = paritySnapshot(useGameStore.getState());

    useGameStore.setState(initial);
    withRandomSource(new SeededRandomSource("automation-parity"), () => {
      for (let tickNumber = 0; tickNumber < 100; tickNumber++) {
        const state = useGameStore.getState();
        settleOnlineTick(state, computeTick(state));
      }
    });
    const onlineState = paritySnapshot(useGameStore.getState());

    expect(offlineResult.racesCompleted).toBe(100);
    expect(offlineState).toEqual(onlineState);
  });
});
