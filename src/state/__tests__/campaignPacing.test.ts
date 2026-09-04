import { afterEach, describe, expect, it, vi } from "vitest";
import { CONDITIONS } from "@/data/parts";
import { CIRCUIT_DEFINITIONS } from "@/data/circuits";
import { getLocationById } from "@/data/locations";
import { getVehicleById } from "@/data/vehicles";
import { calculateScrapResetAward, deriveHighestCircuitTier } from "@/engine/prestige";
import { SeededRandomSource, withRandomSource } from "@/utils/random";
import { canScrapReset, SCRAP_RESET_REQUIREMENTS } from "@/config/progression";
import { createInitialState, getVehicleBuildCost, getVehicleRepairCost, useGameStore } from "../store";
import { LEGACY_UPGRADE_DEFINITIONS } from "@/data/legacyUpgrades";
import { computeTick } from "@/engine/tick";

function settleLiveAutomationTick(): void {
  const state = useGameStore.getState();
  const result = computeTick(state);
  const outcome = result.raceOutcome;
  const projectedStreak = outcome ? (outcome.result === "win" ? state.winStreak + 1 : 0) : state.winStreak;
  state.applyTickResult(
    result.partsFound,
    result.scrapsEarned,
    result.repEarned,
    result.vehicleWearAmount || undefined,
    result.vehicleRepairAmount || undefined,
    result.newRaceTickProgress,
    result.lootGearDrops,
    result.modDrops,
    {
      partsScavenged: result.partsScavenged,
      partsAutoSold: result.partsAutoSold,
      scavengesCompleted: result.scavengesCompleted,
      racesCompleted: outcome ? 1 : 0,
      winsCompleted: outcome?.result === "win" ? 1 : 0,
      finalWinStreak: projectedStreak,
      bestWinStreak: Math.max(state.bestWinStreak, projectedStreak),
      recentRaceOutcomes: outcome ? [outcome] : [],
      winningCircuitIds: outcome?.result === "win" ? [outcome.circuitId] : [],
      defeatedRivalIds: outcome?.result === "win" && outcome.rivalId ? [outcome.rivalId] : [],
      circuitWinStreaks: outcome?.result === "win" ? { [outcome.circuitId]: projectedStreak } : {},
      raceSalvageFound: result.raceSalvageFound,
      forgeTokensFound: result.forgeTokensFound,
      entryFeesPaid: result.entryFeesPaid,
      challengesEvaluated: false,
      completedChallengeIds: [],
      challengeForgeTokens: 0,
      challengeMaterials: {},
      ticksProcessed: 1,
      repDecayed: result.repDecayed,
    },
  );
}

/**
 * Rep is spent, not only accumulated: the campaign player opens the next
 * circuit a garage vehicle can enter, then the next blueprint, then the next
 * junkyard, whenever the balance covers it. One purchase per check-in.
 */
const CAMPAIGN_CIRCUITS = ["dirt_track", "regional_circuit", "national_circuit"] as const;
const CAMPAIGN_BLUEPRINTS = ["go_kart", "street_racer"] as const;
const CAMPAIGN_LOCATIONS = ["neighborhood_yards", "local_junkyard", "salvage_auction", "industrial_surplus"] as const;
function spendRepOnProgression(): void {
  const state = useGameStore.getState();
  const garageTiers = state.garage.map((vehicle) => getVehicleById(vehicle.definitionId)!.tier);
  for (const circuitId of CAMPAIGN_CIRCUITS) {
    if (state.unlockedCircuitIds.includes(circuitId)) continue;
    const circuit = CIRCUIT_DEFINITIONS.find((candidate) => candidate.id === circuitId)!;
    const enterable = garageTiers.some((tier) => tier >= circuit.minVehicleTier && tier <= circuit.maxVehicleTier);
    if (enterable && state.canAffordRep(circuit.unlockRepCost)) {
      state.unlockCircuit(circuitId);
      return;
    }
    break;
  }
  for (const vehicleId of CAMPAIGN_BLUEPRINTS) {
    if (state.unlockedVehicleIds.includes(vehicleId)) continue;
    const requirement = getVehicleById(vehicleId)!.unlockRequirement;
    if (requirement.type === "reputation" && state.canAffordRep(requirement.amount)) {
      state.unlockVehicle(vehicleId);
      return;
    }
    break;
  }
  for (const locationId of CAMPAIGN_LOCATIONS) {
    if (state.unlockedLocationIds.includes(locationId)) continue;
    if (state.canAffordRep(getLocationById(locationId)!.unlockCost)) state.unlockLocation(locationId);
    return;
  }
}

function tryBuild(vehicleId: string): boolean {
  const state = useGameStore.getState();
  const definition = getVehicleById(vehicleId)!;
  const usedIds = new Set<string>();
  const selected = Object.fromEntries(definition.slots.flatMap((slot) => {
    if (!slot.required) return [];
    const part = state.inventory
      .filter((candidate) => !usedIds.has(candidate.id) && slot.acceptableParts.includes(candidate.definitionId))
      .sort((left, right) => CONDITIONS.indexOf(right.condition) - CONDITIONS.indexOf(left.condition))[0];
    if (!part) return [];
    usedIds.add(part.id);
    return [[slot.slot, part]];
  }));
  if (definition.slots.some((slot) => slot.required && !selected[slot.slot])) return false;

  for (const part of state.inventory) {
    if (!usedIds.has(part.id)) useGameStore.getState().sellPart(part.id);
  }
  if (useGameStore.getState().scrapBucks < getVehicleBuildCost(useGameStore.getState(), definition)) return false;
  useGameStore.getState().setPendingVehicle(vehicleId);
  for (const [slot, part] of Object.entries(selected)) useGameStore.getState().setPendingPart(slot, part);
  const before = useGameStore.getState().garage.length;
  useGameStore.getState().buildSelectedVehicle();
  return useGameStore.getState().garage.length === before + 1;
}

/**
 * Manual scavenges are paced at ~2 s and the garage ticks every 30 s on its
 * own, so roughly one automation tick lands per 15 manual actions. The
 * harness settles that background tick so the estimate reflects real play.
 */
const MANUAL_ACTIONS_PER_TICK = 15;
let manualActionsSinceTick = 0;
function manualScavengeWithBackgroundTick(): void {
  useGameStore.getState().manualScavenge();
  manualActionsSinceTick++;
  if (manualActionsSinceTick >= MANUAL_ACTIONS_PER_TICK) {
    manualActionsSinceTick = 0;
    settleLiveAutomationTick();
  }
}

function scavengeUntilBuilt(vehicleId: string, maxActions: number): number {
  for (let actions = 0; actions < maxActions; actions++) {
    if (tryBuild(vehicleId)) return actions;
    const state = useGameStore.getState();
    const bestLocationId = state.unlockedLocationIds
      .map((id) => getLocationById(id)!)
      .sort((left, right) => right.tier - left.tier)[0].id;
    state.setSelectedLocation(bestLocationId);
    manualScavengeWithBackgroundTick();
  }
  throw new Error(`Could not organically source ${vehicleId} in ${maxActions} scavenges`);
}

afterEach(() => {
  vi.useRealTimers();
  useGameStore.setState(createInitialState());
});

describe("seeded first-campaign pacing", () => {
  it("reaches the first Scrap Reset with three organically sourced vehicles and a useful LP award", () => {
    vi.useFakeTimers();
    useGameStore.setState({
      ...createInitialState(),
      tutorialStep: 10,
      tutorialDismissed: true,
    });
    const random = new SeededRandomSource("uat-first-campaign");
    let scavenges = 0;
    let firstVehicleScavenges = 0;
    let races = 0;
    let raceDurationMs = 0;

    withRandomSource(random, () => {
      firstVehicleScavenges = scavengeUntilBuilt("push_mower", 80);
      scavenges += firstVehicleScavenges;
      useGameStore.getState().setActiveVehicle(useGameStore.getState().garage[0].id);

      while (!canScrapReset({
        vehiclesBuilt: useGameStore.getState().garage.length,
        reputation: useGameStore.getState().lifetimeRep,
        lifetimeScrapBucks: useGameStore.getState().lifetimeScrapBucks,
      })) {
        spendRepOnProgression();
        const state = useGameStore.getState();
        const builtTypes = new Set(state.garage.map((vehicle) => vehicle.definitionId));
        for (const vehicleId of ["riding_mower", "go_kart", "street_racer"] as const) {
          if (builtTypes.has(vehicleId) || !state.unlockedVehicleIds.includes(vehicleId)) continue;
          const requiredLocationTier = vehicleId === "riding_mower" ? 1 : vehicleId === "go_kart" ? 2 : 3;
          if (!state.unlockedLocationIds.some((id) => (getLocationById(id)?.tier ?? -1) >= requiredLocationTier)) continue;
          scavenges += scavengeUntilBuilt(vehicleId, 160);
        }

        const refreshed = useGameStore.getState();
        if ((refreshed.workshopLevels.budget_repairs ?? 0) < 2 && refreshed.scrapBucks >= 250) refreshed.purchaseUpgrade("budget_repairs");
        if ((useGameStore.getState().workshopLevels.reinforced_chassis ?? 0) < 2 && useGameStore.getState().scrapBucks >= 400) useGameStore.getState().purchaseUpgrade("reinforced_chassis");
        const bestRace = CIRCUIT_DEFINITIONS
          .filter((circuit) => refreshed.unlockedCircuitIds.includes(circuit.id))
          .flatMap((circuit) => refreshed.garage.flatMap((vehicle) => {
            const definition = getVehicleById(vehicle.definitionId)!;
            return definition.tier >= circuit.minVehicleTier && definition.tier <= circuit.maxVehicleTier
              ? [{ circuit, vehicle, definition }]
              : [];
          }))
          .sort((left, right) => right.circuit.tier - left.circuit.tier || right.definition.tier - left.definition.tier)[0];
        if (!bestRace) throw new Error("No eligible race during campaign cohort");
        refreshed.setActiveVehicle(bestRace.vehicle.id);
        refreshed.setSelectedCircuit(bestRace.circuit.id);
        // Grind cash until the car is race-ready: the background ticks keep
        // racing (and wearing) the car while we scavenge, so the repair bill
        // is re-read every attempt rather than fixed up front.
        for (let attempts = 0; attempts < 400; attempts++) {
          const cashState = useGameStore.getState();
          const car = cashState.garage.find((vehicle) => vehicle.id === bestRace.vehicle.id)!;
          const needsRepair = (car.condition ?? 100) < 35;
          const neededCash = (needsRepair ? getVehicleRepairCost(cashState, car) : 0) + bestRace.circuit.entryFee;
          if (cashState.scrapBucks >= neededCash) {
            if (!needsRepair) break;
            cashState.repairVehicle(car.id);
            continue;
          }
          const bestLocationId = cashState.unlockedLocationIds
            .map((id) => getLocationById(id)!)
            .sort((left, right) => right.tier - left.tier)[0].id;
          cashState.setSelectedLocation(bestLocationId);
          manualScavengeWithBackgroundTick();
          useGameStore.getState().sellAllJunk();
          scavenges++;
        }
        useGameStore.getState().enterRace();
        expect(useGameStore.getState().isRacing).toBe(true);
        vi.runAllTimers();
        races++;
        raceDurationMs += bestRace.circuit.raceDuration;
        // A race plus its review is roughly one background tick of real time.
        settleLiveAutomationTick();
        if (races > 400) {
          const stalled = useGameStore.getState();
          throw new Error(`First campaign exceeded 400 races: rep=${stalled.repPoints}, lifetimeRep=${stalled.lifetimeRep}, scrap=${stalled.lifetimeScrapBucks}, vehicles=${stalled.garage.map((vehicle) => vehicle.definitionId).join(",")}, unlocked=${stalled.unlockedVehicleIds.join(",")}, circuits=${stalled.unlockedCircuitIds.join(",")}`);
        }
      }
    });

    const state = useGameStore.getState();
    const award = calculateScrapResetAward({
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
    });
    const scavengeDurationMs = scavenges * 4_000;
    const reviewAndInventoryMs = races * 12_000 + scavenges * 2_000;
    const estimatedHandsOnMinutes = (raceDurationMs + scavengeDurationMs + reviewAndInventoryMs) / 60_000;

    console.info("FIRST_CAMPAIGN_COHORT", {
      seed: "uat-first-campaign",
      scavenges,
      races,
      vehicles: state.garage.map((vehicle) => vehicle.definitionId),
      vehicleStats: state.garage.map((vehicle) => ({ id: vehicle.definitionId, performance: vehicle.stats.performance, reliability: vehicle.stats.reliability })),
      reputation: state.repPoints,
      lifetimeRep: state.lifetimeRep,
      unlockedCircuits: state.unlockedCircuitIds,
      unlockedLocations: state.unlockedLocationIds,
      lifetimeScrap: state.lifetimeScrapBucks,
      wins: state.lifetimeWinsAllTime,
      fatigue: state.fatigue,
      lp: award.totalLp,
      engineMinutes: Number(((raceDurationMs + scavengeDurationMs) / 60_000).toFixed(1)),
      estimatedHandsOnMinutes: Number(estimatedHandsOnMinutes.toFixed(1)),
    });

    expect(state.garage.length).toBeGreaterThanOrEqual(SCRAP_RESET_REQUIREMENTS.vehiclesBuilt);
    expect(state.lifetimeRep).toBeGreaterThanOrEqual(SCRAP_RESET_REQUIREMENTS.reputation);
    expect(state.lifetimeScrapBucks).toBeGreaterThanOrEqual(SCRAP_RESET_REQUIREMENTS.lifetimeScrapBucks);
    expect(award.totalLp).toBeGreaterThanOrEqual(5);
    // The first Scrap Reset is meant to be earned over an engaged 1–2 hours
    // (see CAMPAIGN_PACING_TARGETS_HOURS.scrap), never handed out in a sprint.
    expect(estimatedHandsOnMinutes).toBeGreaterThanOrEqual(60);
    expect(estimatedHandsOnMinutes).toBeLessThanOrEqual(130);

    state.prestige();
    const secondRun = useGameStore.getState();
    expect(secondRun).toMatchObject({
      prestigeCount: 1,
      legacyPoints: award.totalLp,
      autoScavengeUnlocked: true,
      autoRaceUnlocked: true,
    });
    expect(LEGACY_UPGRADE_DEFINITIONS.filter((upgrade) => upgrade.baseCost <= secondRun.legacyPoints).length).toBeGreaterThanOrEqual(2);

    let ticksToVehicle: number | null = null;
    let ticksToRace: number | null = null;
    withRandomSource(new SeededRandomSource("uat-second-run"), () => {
      for (let tick = 1; tick <= 100; tick++) {
        settleLiveAutomationTick();
        const current = useGameStore.getState();
        if (current.garage.length === 0 && tryBuild("push_mower")) {
          ticksToVehicle = tick;
          useGameStore.getState().setActiveVehicle(useGameStore.getState().garage[0].id);
        }
        if (useGameStore.getState().raceHistory.length > 0) {
          ticksToRace = tick;
          break;
        }
      }
    });
    expect(ticksToVehicle).not.toBeNull();
    expect(ticksToRace).not.toBeNull();
    expect(useGameStore.getState().manualScavengeClicks).toBe(0);
    console.info("SECOND_RUN_AUTOMATION", {
      seed: "uat-second-run",
      ticksToVehicle,
      ticksToRace,
      minutesToVehicle: Number((((ticksToVehicle ?? 0) * 30_000) / 60_000).toFixed(1)),
      minutesToRace: Number((((ticksToRace ?? 0) * 30_000) / 60_000).toFixed(1)),
      firstRunManualScavengesToVehicle: firstVehicleScavenges,
      secondRunManualScavengesToVehicle: 0,
      repetitiveClickReductionPct: 100,
    });
  });
});
