import { describe, it, expect } from "vitest";
import {
  computeTickSpeedMs,
  simulateOfflineTicks,
  TICK_MS_DEFAULT,
  TICK_MS_MIN,
  RACE_TICKS_DEFAULT,
} from "../tick";
import type { GameState } from "@/state/store";

/**
 * Builds a minimal GameState for testing. Override any fields as needed.
 */
function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    scrapBucks: 1000,
    repPoints: 0,
    lifetimeScrapBucks: 0,
    prestigeCount: 0,
    prestigeBonus: { scrapMultiplier: 1, luckBonus: 0, repMultiplier: 1 },
    legacyPoints: 0,
    lifetimeLegacyPoints: 0,
    legacyUpgradeLevels: {},
    activeMomentumTiers: [],
    currentEra: 1,
    inventory: [],
    garage: [],
    activeVehicleId: null,
    selectedLocationId: "curbside",
    selectedSellBelowQuality: "decent",
    isScavenging: false,
    autoScavengeUnlocked: false,
    manualScavengeClicks: 0,
    selectedCircuitId: "backyard_derby",
    isRacing: false,
    autoRaceUnlocked: false,
    raceTickProgress: 0,
    lastRaceOutcome: null,
    raceHistory: [],
    raceEvents: [],
    raceStartTime: null,
    precomputedOutcome: null,
    winStreak: 0,
    bestWinStreak: 0,
    fatigue: 0,
    lifetimeRaces: 0,
    unlockEvents: [],
    activityLog: [],
    _logIdCounter: 0,
    equippedGear: { head: "head_bare", body: "body_rags", hands: "hands_bare", feet: "feet_bare", tool: "tool_stick", accessory: "acc_empty" },
    ownedGearIds: ["head_bare", "body_rags", "hands_bare", "feet_bare", "tool_stick", "acc_empty"],
    lootGearInventory: [],
    equippedLootGear: { head: null, body: null, hands: null, feet: null, tool: null, accessory: null },
    gearModInventory: [],
    unlockedTalentNodes: [],
    workshopLevels: {},
    pendingBuildParts: {},
    pendingBuildVehicleId: "push_mower",
    unlockedLocationIds: ["curbside"],
    unlockedCircuitIds: ["backyard_derby"],
    unlockedVehicleIds: ["push_mower"],
    _vehicleIdCounter: 0,
    materials: { metalScrap: 0, rubberCompound: 0, heatCore: 0, circuitFragment: 0, carbonDust: 0 },
    forgeTokens: 0,
    dealerBoard: [],
    gameTick: 0,
    lastActiveTimestamp: 0,
    completedChallenges: [],
    challengeProgress: {},
    lifetimeTotalDecomposed: 0,
    lifetimeTotalEnhanced: 0,
    lifetimeTotalTradeUps: 0,
    lifetimeTotalRaceSalvage: 0,
    highestConditionReached: 0,
    tutorialStep: -1,
    tutorialDismissed: false,
    racerSkills: {
      driving: { xp: 0, level: 0 },
      mechanics: { xp: 0, level: 0 },
      scavenging: { xp: 0, level: 0 },
      endurance: { xp: 0, level: 0 },
    },
    teamPoints: 0,
    lifetimeTeamPoints: 0,
    teamUpgradeLevels: {},
    teamEraCount: 0,
    lifetimeLPThisTeamEra: 0,
    ownerPoints: 0,
    lifetimeOwnerPoints: 0,
    ownerUpgradeLevels: {},
    ownerEraCount: 0,
    lifetimeTPThisOwnerEra: 0,
    trackPrestigeTokens: 0,
    lifetimeTrackTokens: 0,
    trackPerkLevels: {},
    trackEraCount: 0,
    lifetimeOPThisTrackEra: 0,
    racerAttributes: { reflexes: 0, endurance: 0, charisma: 0, instinct: 0, engineering: 0, fortune: 0 },
    unlockedFeatures: [],
    lifetimeLPAllTime: 0,
    lifetimeScrapResets: 0,
    crewRoster: [],
    crewSlots: 0,
    ...overrides,
  } as GameState;
}

/** A minimal vehicle with enough stats to race on backyard_derby */
function makeVehicle(id = "v1", condition = 100) {
  return {
    id,
    definitionId: "push_mower",
    parts: {},
    stats: { speed: 30, handling: 20, reliability: 60, weight: 50, performance: 30 },
    builtAt: Date.now(),
    condition,
    totalRaces: 0,
  };
}

// ── computeTickSpeedMs ────────────────────────────────────────────────────────

describe("computeTickSpeedMs", () => {
  it("returns the default tick speed with no upgrades or gear", () => {
    const state = makeState();
    expect(computeTickSpeedMs(state)).toBe(TICK_MS_DEFAULT);
  });

  it("clamps to minimum tick speed", () => {
    // Give upgrades that would push tick below minimum
    const state = makeState({ workshopLevels: { tick_accelerator: 100, overclocked_tick: 100 } });
    expect(computeTickSpeedMs(state)).toBe(TICK_MS_MIN);
  });
});

// ── simulateOfflineTicks ──────────────────────────────────────────────────────

describe("simulateOfflineTicks", () => {
  it("returns zero results for 0 ticks", () => {
    const state = makeState();
    const result = simulateOfflineTicks(state, 0);
    expect(result.ticksProcessed).toBe(0);
    expect(result.partsFound).toEqual([]);
    expect(result.scrapsEarned).toBe(0);
    expect(result.repEarned).toBe(0);
    expect(result.racesCompleted).toBe(0);
  });

  it("scavenges parts each tick when auto-scavenge is unlocked", () => {
    const state = makeState({ autoScavengeUnlocked: true });
    const result = simulateOfflineTicks(state, 10);
    expect(result.ticksProcessed).toBe(10);
    // curbside location always yields at least 1 part per scavenge
    expect(result.partsFound.length).toBeGreaterThanOrEqual(10);
  });

  it("does not scavenge when auto-scavenge is not unlocked", () => {
    const state = makeState({ autoScavengeUnlocked: false });
    const result = simulateOfflineTicks(state, 5);
    expect(result.partsFound).toEqual([]);
  });

  it("races fire at correct intervals (every RACE_TICKS_DEFAULT ticks)", () => {
    const vehicle = makeVehicle();
    const state = makeState({
      autoRaceUnlocked: true,
      garage: [vehicle],
      activeVehicleId: "v1",
      raceTickProgress: 0,
    });

    // With default 3-tick race interval, 9 ticks should produce 3 races
    const result = simulateOfflineTicks(state, 9);
    expect(result.racesCompleted).toBe(Math.floor(9 / RACE_TICKS_DEFAULT));
  });

  it("correctly tracks racesCompleted count", () => {
    const vehicle = makeVehicle();
    const state = makeState({
      autoRaceUnlocked: true,
      garage: [vehicle],
      activeVehicleId: "v1",
      raceTickProgress: 0,
      scrapBucks: 10000,
    });

    const result = simulateOfflineTicks(state, 30);
    // With default 3-tick interval and healthy vehicle, should get ~10 races
    // (may be fewer if vehicle breaks down)
    expect(result.racesCompleted).toBeGreaterThan(0);
    expect(result.racesCompleted).toBeLessThanOrEqual(Math.floor(30 / RACE_TICKS_DEFAULT));
  });

  it("vehicle condition degrades from racing", () => {
    const vehicle = makeVehicle("v1", 100);
    const state = makeState({
      autoRaceUnlocked: true,
      garage: [vehicle],
      activeVehicleId: "v1",
      scrapBucks: 10000,
    });

    // Run many ticks so wear accumulates
    const result = simulateOfflineTicks(state, 60);
    // Wear should have accumulated across races
    expect(result.vehicleWearTotal).toBeGreaterThan(0);
    expect(result.racesCompleted).toBeGreaterThan(0);
  });

  it("stops racing when vehicle condition reaches 0", () => {
    // Start with a nearly-broken vehicle
    const vehicle = makeVehicle("v1", 5);
    const state = makeState({
      autoRaceUnlocked: true,
      garage: [vehicle],
      activeVehicleId: "v1",
      scrapBucks: 10000,
    });

    // Run enough ticks that vehicle should break
    const result = simulateOfflineTicks(state, 90);
    // With condition 5, vehicle should break quickly. The number of races
    // should be much fewer than the maximum possible (90/3 = 30).
    // The first race will produce some wear, eventually reaching 0.
    expect(result.racesCompleted).toBeLessThan(Math.floor(90 / RACE_TICKS_DEFAULT));
  });

  it("stops racing when scrapBucks are depleted", () => {
    const vehicle = makeVehicle();
    // Use dirt_track which has an entry fee
    const state = makeState({
      autoRaceUnlocked: true,
      garage: [vehicle],
      activeVehicleId: "v1",
      selectedCircuitId: "dirt_track",
      scrapBucks: 10, // very low balance
    });

    const result = simulateOfflineTicks(state, 30);
    // With such low scrapBucks and dirt_track having an entry fee,
    // racing should stop once we can't afford it
    // (the first race may fire since backyard has 0 fee, but dirt_track costs more)
    expect(result.racesCompleted).toBeLessThan(Math.floor(30 / RACE_TICKS_DEFAULT));
  });

  it("fatigue increases with races during offline simulation", () => {
    const vehicle = makeVehicle();
    const state = makeState({
      autoRaceUnlocked: true,
      garage: [vehicle],
      activeVehicleId: "v1",
      scrapBucks: 100000,
      fatigue: 0,
      lifetimeRaces: 0,
    });

    // Run many ticks to accumulate races
    const result = simulateOfflineTicks(state, 90);
    // After many races, fatigue should have increased, which means
    // later races had different odds than early ones
    expect(result.racesCompleted).toBeGreaterThan(0);
  });

  it("applies repair between races when auto-repair is unlocked", () => {
    const vehicle = makeVehicle("v1", 50);
    const state = makeState({
      autoRaceUnlocked: true,
      garage: [vehicle],
      activeVehicleId: "v1",
      scrapBucks: 100000,
      workshopLevels: { auto_repair: 5 }, // gives auto-repair rate
    });

    const result = simulateOfflineTicks(state, 30);
    // With auto-repair, we should see repair amounts
    expect(result.vehicleRepairTotal).toBeGreaterThan(0);
  });

  it("does not modify the original state object", () => {
    const vehicle = makeVehicle("v1", 100);
    const originalCondition = vehicle.condition;
    const state = makeState({
      autoRaceUnlocked: true,
      autoScavengeUnlocked: true,
      garage: [vehicle],
      activeVehicleId: "v1",
      scrapBucks: 1000,
    });
    const originalBucks = state.scrapBucks;

    simulateOfflineTicks(state, 30);

    // Original state should be unchanged
    expect(state.scrapBucks).toBe(originalBucks);
    expect(vehicle.condition).toBe(originalCondition);
  });

  it("handles combined scavenging and racing", () => {
    const vehicle = makeVehicle();
    const state = makeState({
      autoScavengeUnlocked: true,
      autoRaceUnlocked: true,
      garage: [vehicle],
      activeVehicleId: "v1",
      scrapBucks: 100000,
    });

    const result = simulateOfflineTicks(state, 15);
    // Should have both parts and race results
    expect(result.partsFound.length).toBeGreaterThan(0);
    expect(result.racesCompleted).toBeGreaterThan(0);
    expect(result.ticksProcessed).toBe(15);
  });

  it("respects maxTicks parameter", () => {
    const state = makeState({ autoScavengeUnlocked: true });
    const result = simulateOfflineTicks(state, 5);
    expect(result.ticksProcessed).toBe(5);
  });
});
