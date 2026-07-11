import { ADDON_DEFINITIONS } from "@/data/addons";
import { CIRCUIT_DEFINITIONS } from "@/data/circuits";
import { FEATURE_AVAILABILITY } from "@/config/features";
import { LOCATION_DEFINITIONS } from "@/data/locations";
import { OWNER_UPGRADE_DEFINITIONS } from "@/data/ownerUpgrades";
import { CONDITIONS, PART_DEFINITIONS, type PartCondition } from "@/data/parts";
import { TEAM_UPGRADE_DEFINITIONS } from "@/data/teamUpgrades";
import { TRACK_PERK_DEFINITIONS } from "@/data/trackPerks";
import { UPGRADE_DEFINITIONS } from "@/data/upgrades";
import { VEHICLE_DEFINITIONS, getVehicleById } from "@/data/vehicles";
import { GEAR_DEFINITIONS } from "@/data/gear";
import { AUTO_SCAVENGE_MANUAL_TARGET } from "@/config/gameplayLimits";
import { SCRAP_RESET_REQUIREMENTS } from "@/config/progression";
import { calculateStats, type BuiltVehicle, type InstalledPart } from "@/engine/build";
import type { ScavengedPart } from "@/engine/scavenge";
import type { RaceOutcome } from "@/engine/race";
import { calculateOwnerPoints, calculateScrapResetAward, calculateTeamPoints, calculateTrackTokens, deriveHighestCircuitTier } from "@/engine/prestige";
import { createInitialState, type GameState } from "@/state/store";
import {
  getPersistedGameState,
  PERSISTENCE_STORAGE_KEY,
  PERSISTENCE_VERSION,
  type PersistedGameState,
} from "@/state/persistence";
import { getRaceIneligibilityReason } from "@/engine/eligibility";
import { crewLevelFromXp } from "@/engine/crew";
import { CHALLENGE_DEFINITIONS } from "@/data/challenges";
import { ACHIEVEMENT_DEFINITIONS } from "@/data/achievements";
import { PLAYSTYLE_NODE_DEFINITIONS } from "@/data/playstyleUpgrades";
import { MOMENTUM_TIERS } from "@/data/momentumBonuses";
import { LEGACY_UPGRADE_DEFINITIONS } from "@/data/legacyUpgrades";
import { GARAGE_STATION_IDS } from "@/data/garageStations";
import type { StationEquipment } from "@/data/stationEquipment";
import { RIVAL_DEFINITIONS } from "@/data/rivals";

export const GAMEPLAY_FIXTURE_VERSION = 2;
export const GAMEPLAY_FIXTURE_EPOCH = 1_700_000_000_000;

export const GAMEPLAY_FIXTURE_NAMES = [
  "fresh",
  "first_build_ready",
  "first_race_ready",
  "workshop_ready",
  "auto_scavenge_boundary",
  "first_scrap_reset_ready",
  "post_scrap_reset",
  "team_reset_ready",
  "post_team_reset",
  "owner_reset_ready",
  "post_owner_reset",
  "track_reset_ready",
  "post_track_reset",
  "maxed",
] as const;

export type GameplayFixtureName = (typeof GAMEPLAY_FIXTURE_NAMES)[number];

export interface GameplayFixture {
  fixtureVersion: number;
  name: GameplayFixtureName;
  description: string;
  storageKey: typeof PERSISTENCE_STORAGE_KEY;
  payload: {
    version: typeof PERSISTENCE_VERSION;
    state: PersistedGameState;
  };
}

const levelMap = (definitions: ReadonlyArray<{ id: string; maxLevel: number }>) =>
  Object.fromEntries(definitions.map((definition) => [definition.id, definition.maxLevel]));

const ALL_LOCATIONS = LOCATION_DEFINITIONS.map((definition) => definition.id);
const ALL_CIRCUITS = CIRCUIT_DEFINITIONS.map((definition) => definition.id);
const ALL_VEHICLES = VEHICLE_DEFINITIONS.map((definition) => definition.id);
const ALL_FEATURES = Object.entries(FEATURE_AVAILABILITY)
  .filter(([, definition]) => definition.availability === "released")
  .map(([id]) => id) as GameState["unlockedFeatures"];

function fixturePart(
  definitionId: string,
  index: number,
  condition: PartCondition = "good",
  type: ScavengedPart["type"] = "part",
): ScavengedPart {
  return {
    id: `fixture_part_${index}_${definitionId}`,
    definitionId,
    condition,
    foundAt: "dev_fixture",
    type,
  };
}

function fixtureVehicle(
  definitionId: string,
  index: number,
  condition = 82,
  partCondition: PartCondition = "pristine",
): BuiltVehicle {
  const definition = getVehicleById(definitionId);
  if (!definition) throw new Error(`Unknown fixture vehicle ${definitionId}`);
  const parts = Object.fromEntries(
    definition.slots
      .filter((slot) => slot.required)
      .map((slot, slotIndex) => {
        const part = fixturePart(slot.acceptableParts.at(-1)!, index * 20 + slotIndex, partCondition);
        return [slot.slot, { part, addons: [] } satisfies InstalledPart];
      }),
  );
  return {
    id: `fixture_vehicle_${index}_${definitionId}`,
    definitionId,
    parts,
    stats: calculateStats(definition, parts, condition),
    builtAt: GAMEPLAY_FIXTURE_EPOCH + index,
    condition,
    totalRaces: index * 3,
  };
}

function inventorySet(copies = 1): ScavengedPart[] {
  const parts: ScavengedPart[] = [];
  let index = 1_000;
  for (let copy = 0; copy < copies; copy++) {
    for (const definition of PART_DEFINITIONS) {
      parts.push(fixturePart(definition.id, index++, copy === 0 ? "decent" : "good"));
    }
  }
  for (const definition of ADDON_DEFINITIONS) {
    parts.push(fixturePart(definition.id, index++, "good", "addon"));
  }
  return parts;
}

function fixtureWinningRace(circuitId = "backyard_derby"): RaceOutcome {
  return {
    circuitId,
    result: "win",
    position: 1,
    totalRacers: 8,
    scrapsEarned: 10,
    repEarned: 1,
    log: ["Fixture race completed"],
  };
}

function basePersistedState(): PersistedGameState {
  const initial = createInitialState();
  return {
    ...getPersistedGameState(initial as GameState),
    tutorialLastAdvanceTime: 0,
    lastActiveTimestamp: GAMEPLAY_FIXTURE_EPOCH,
  };
}

function actionReadyCommon(): Partial<PersistedGameState> {
  return {
    tutorialStep: -1,
    tutorialDismissed: true,
    tutorialMinimized: false,
    unlockedLocationIds: [...ALL_LOCATIONS],
    unlockedCircuitIds: [...ALL_CIRCUITS],
    unlockedVehicleIds: [...ALL_VEHICLES],
    unlockedFeatures: [...ALL_FEATURES],
    selectedLocationId: ALL_LOCATIONS.at(-1)!,
    selectedCircuitId: ALL_CIRCUITS.at(-1)!,
  };
}

function resetReadyCommon(): Partial<PersistedGameState> {
  const garage = [
    fixtureVehicle("push_mower", 1, 68, "good"),
    fixtureVehicle("riding_mower", 2, 76, "pristine"),
    fixtureVehicle("go_kart", 3, 91, "pristine"),
  ];
  return {
    ...actionReadyCommon(),
    scrapBucks: 100_000,
    repPoints: 10_000,
    lifetimeScrapBucks: 100_000,
    inventory: inventorySet(2),
    garage,
    activeVehicleId: garage[2].id,
    selectedLocationId: "industrial_surplus",
    selectedCircuitId: "dirt_track",
    autoScavengeUnlocked: true,
    autoRaceUnlocked: true,
    manualScavengeClicks: AUTO_SCAVENGE_MANUAL_TARGET,
    lifetimeRaces: 40,
    fatigue: 18,
    lifetimeVehiclesBuiltAllTime: 3,
    lifetimeRacesAllTime: 40,
    lifetimeWinsAllTime: 24,
    lifetimePartsScavengedAllTime: 650,
    lifetimeScrapBucksAllTime: 100_000,
    uniqueVehicleTypesBuilt: ["push_mower", "riding_mower", "go_kart"],
    workshopLevels: { toolkit: 1, refurbishment_bench: 1, bargain_builder: 1 },
    materials: { metalScrap: 80, rubberCompound: 80, heatCore: 80, circuitFragment: 80, carbonDust: 80, greaseSludge: 80 },
    forgeTokens: 25,
    completedChallenges: ["races_25", "streak_5"],
    earnedAchievements: ["ach_first_win"],
    discoveredBlueprintIds: ["push_mower", "riding_mower", "go_kart"],
  };
}

function firstScrapResetReady(): Partial<PersistedGameState> {
  const garage = [
    fixtureVehicle("push_mower", 41, 74, "good"),
    fixtureVehicle("riding_mower", 42, 82, "pristine"),
    fixtureVehicle("go_kart", 43, 91, "pristine"),
  ];
  const repPoints = SCRAP_RESET_REQUIREMENTS.reputation;
  const unlockedLocationIds = LOCATION_DEFINITIONS.filter((location) => location.unlockCost <= repPoints).map((location) => location.id);
  const unlockedCircuitIds = CIRCUIT_DEFINITIONS.filter((circuit) => !circuit.requiredFeature && circuit.unlockRepCost <= repPoints).map((circuit) => circuit.id);
  const unlockedVehicleIds = VEHICLE_DEFINITIONS.filter((vehicle) => {
    const requirement = vehicle.unlockRequirement;
    if (requirement.type === "start") return true;
    if (requirement.type === "reputation") return requirement.amount <= repPoints;
    if (requirement.type === "circuit_win") return requirement.circuitId === "backyard_derby";
    if (requirement.type === "circuit_win_streak") return requirement.circuitId === "backyard_derby" && requirement.wins <= 5;
    return false;
  }).map((vehicle) => vehicle.id);
  return {
    tutorialStep: -1,
    tutorialDismissed: true,
    scrapBucks: 1_000,
    repPoints,
    lifetimeScrapBucks: SCRAP_RESET_REQUIREMENTS.lifetimeScrapBucks,
    inventory: inventorySet(1).slice(0, 24),
    garage,
    activeVehicleId: garage[2].id,
    selectedLocationId: unlockedLocationIds.at(-1)!,
    selectedCircuitId: "dirt_track",
    unlockedLocationIds,
    unlockedCircuitIds,
    unlockedVehicleIds,
    autoScavengeUnlocked: false,
    autoRaceUnlocked: false,
    manualScavengeClicks: 0,
    lifetimeRaces: 74,
    fatigue: 19,
    lifetimeVehiclesBuiltAllTime: 3,
    lifetimeRacesAllTime: 74,
    lifetimeWinsAllTime: 38,
    lifetimePartsScavengedAllTime: 441,
    lifetimeScrapBucksAllTime: SCRAP_RESET_REQUIREMENTS.lifetimeScrapBucks,
    bestWinStreak: 5,
    bestWinStreakAllTime: 5,
    uniqueVehicleTypesBuilt: ["push_mower", "riding_mower", "go_kart"],
    workshopLevels: { budget_repairs: 2, reinforced_chassis: 2 },
    raceHistory: Array.from({ length: 5 }, () => fixtureWinningRace("backyard_derby")),
    completedChallenges: ["races_25", "streak_5"],
    earnedAchievements: ["ach_first_win"],
    discoveredBlueprintIds: ["push_mower", "riding_mower", "go_kart"],
    unlockedFeatures: [],
    materials: { metalScrap: 0, rubberCompound: 0, heatCore: 0, circuitFragment: 0, carbonDust: 0, greaseSludge: 0 },
    forgeTokens: 0,
  };
}

function firstScrapResetAward(state: Partial<PersistedGameState>): number {
  return calculateScrapResetAward({
    currentPrestigeCount: state.prestigeCount ?? 0,
    runStats: {
      lifetimeScrapBucks: state.lifetimeScrapBucks ?? 0,
      lifetimeRaces: state.lifetimeRaces ?? 0,
      fatigue: state.fatigue ?? 0,
      repPoints: state.repPoints ?? 0,
      highestCircuitTier: deriveHighestCircuitTier(state.unlockedCircuitIds ?? ["backyard_derby"]),
      workshopUpgradesBought: Object.values(state.workshopLevels ?? {}).reduce((sum, level) => sum + level, 0),
    },
    activeMomentumTierIds: state.activeMomentumTiers ?? [],
    teamUpgradeLevels: state.teamUpgradeLevels ?? {},
    trackPerkLevels: state.trackPerkLevels ?? {},
    earnedAchievements: state.earnedAchievements ?? [],
    unlockedPlaystyleNodes: state.unlockedPlaystyleNodes ?? [],
    crewRoster: state.crewRoster ?? [],
  }).totalLp;
}

function milestonePatch(name: GameplayFixtureName): Partial<PersistedGameState> {
  const raceVehicle = fixtureVehicle("push_mower", 10, 72, "good");
  const resetReady = resetReadyCommon();
  const firstResetReady = firstScrapResetReady();

  switch (name) {
    case "fresh":
      return {};
    case "first_build_ready": {
      const engine = fixturePart("engine_small", 100, "good");
      const wheel = fixturePart("wheel_busted", 101, "good");
      const spare = fixturePart("misc_junk", 102, "worn");
      return {
        tutorialStep: -1,
        tutorialDismissed: true,
        scrapBucks: 25,
        lifetimeScrapBucks: 25,
        repPoints: 8,
        inventory: [engine, wheel, spare],
        pendingBuildVehicleId: "push_mower",
        pendingBuildParts: { engine, wheel },
        manualScavengeClicks: 12,
        lifetimePartsScavengedAllTime: 18,
      };
    }
    case "first_race_ready":
      return {
        tutorialStep: -1,
        tutorialDismissed: true,
        scrapBucks: 100,
        lifetimeScrapBucks: 100,
        repPoints: 25,
        inventory: [fixturePart("engine_small", 110, "decent"), fixturePart("wheel_busted", 111, "worn")],
        garage: [raceVehicle],
        activeVehicleId: raceVehicle.id,
        selectedCircuitId: "backyard_derby",
        lifetimeVehiclesBuiltAllTime: 1,
        uniqueVehicleTypesBuilt: ["push_mower"],
      };
    case "workshop_ready": {
      const garage = [fixtureVehicle("go_kart", 20, 64), fixtureVehicle("beater_car", 21, 88), fixtureVehicle("street_racer", 22, 97)];
      const inventory = [...inventorySet(3), fixturePart("engine_v4", 9_999, "mythic")];
      return {
        ...actionReadyCommon(),
        scrapBucks: 1_000_000,
        lifetimeScrapBucks: 1_500_000,
        repPoints: 250_000,
        legacyPoints: 500,
        teamPoints: 100,
        ownerPoints: 100,
        trackPrestigeTokens: 100,
        inventory,
        garage,
        activeVehicleId: garage[2].id,
        selectedLocationId: "industrial_surplus",
        selectedCircuitId: "regional_circuit",
        workshopLevels: { toolkit: 1, addon_bench: 1, auto_fitter: 1, refurbishment_bench: 1, parts_bin: 1, parts_trader: 1, tuning_bench: 1, enhancement_mastery: 1, artifact_forge: 1, careful_modding: 1, gear_scavenger: 1, trophy_hunter: 1 },
        materials: { metalScrap: 500, rubberCompound: 500, heatCore: 500, circuitFragment: 500, carbonDust: 500, greaseSludge: 500 },
        forgeTokens: 200,
        reforgeShards: 200,
        dealerBoard: [
          { id: "fixture_dealer_engine", definitionId: "engine_v4", condition: "good", price: 175, expiresAt: 130 },
          { id: "fixture_dealer_wheel", definitionId: "wheel_sport", condition: "pristine", price: 125, expiresAt: 130 },
          { id: "fixture_dealer_frame", definitionId: "frame_kart", condition: "good", price: 105, expiresAt: 130 },
        ],
        gameTick: 100,
        stationEquipmentInventory: [{ id: "fixture_station_workbench", slot: "workbench", rarity: "rare", name: "Fixture Torque Bench", effects: [{ type: "attribute", attribute: "engineering", value: 7 }], enhancementLevel: 0, source: "dev_fixture" }],
        equippedStationEquipment: { diagnostics: null, lift: null, workbench: null, logistics: null, fabrication: null, pit_equipment: null },
        autoScavengeUnlocked: true,
        autoRaceUnlocked: true,
        manualScavengeClicks: AUTO_SCAVENGE_MANUAL_TARGET,
        lifetimeRaces: 80,
        fatigue: 32,
        activeMomentumTiers: ["momentum_warmed_up", "momentum_in_the_zone", "momentum_reputation"],
        racerAttributes: { reflexes: 3, endurance: 3, instinct: 3, engineering: 3, charisma: 3, fortune: 3 },
        lifetimeLPAllTime: 250,
        lifetimeTeamPoints: 600,
        teamEraCount: 3,
        ownerEraCount: 5,
        trackEraCount: 1,
      };
    }
    case "auto_scavenge_boundary":
      return {
        ...actionReadyCommon(),
        garage: [raceVehicle],
        activeVehicleId: raceVehicle.id,
        selectedLocationId: "curbside",
        selectedCircuitId: "backyard_derby",
        scrapBucks: 1_000,
        manualScavengeClicks: AUTO_SCAVENGE_MANUAL_TARGET - 1,
        autoScavengeUnlocked: false,
        autoRaceUnlocked: false,
        prestigeCount: 0,
      };
    case "first_scrap_reset_ready":
      return { ...firstResetReady, lifetimeLPAllTime: 0, lifetimeScrapResets: 0, prestigeCount: 0, legacyPoints: 0, lifetimeLegacyPoints: 0 };
    case "post_scrap_reset":
      return {
        tutorialStep: -1,
        tutorialDismissed: true,
        prestigeCount: 1,
        legacyPoints: firstScrapResetAward(firstResetReady),
        lifetimeLegacyPoints: firstScrapResetAward(firstResetReady),
        lifetimeLPAllTime: firstScrapResetAward(firstResetReady),
        lifetimeLPThisTeamEra: firstScrapResetAward(firstResetReady),
        lifetimeScrapResets: 1,
        autoScavengeUnlocked: true,
        autoRaceUnlocked: true,
        manualScavengeClicks: 0,
        materials: firstResetReady.materials,
        forgeTokens: (firstResetReady.forgeTokens ?? 0) + 1,
        completedChallenges: [...(firstResetReady.completedChallenges ?? []), "prestige_first"],
        earnedAchievements: [...(firstResetReady.earnedAchievements ?? []), "ach_prestige_1"],
        discoveredBlueprintIds: firstResetReady.discoveredBlueprintIds,
        unlockedFeatures: firstResetReady.unlockedFeatures,
      };
    case "team_reset_ready":
      return {
        ...resetReady,
        legacyPoints: 150,
        lifetimeLegacyPoints: 400,
        lifetimeLPThisTeamEra: 1_600,
        lifetimeLPAllTime: 400,
        lifetimeScrapResets: 6,
        teamPoints: 40,
        lifetimeTeamPoints: 150,
        teamEraCount: 2,
        crewSlots: 2,
          crewRoster: [{ id: "fixture_crew", name: "Rook", role: "mechanic", level: 3, xp: 190, specialization: null }],
        raceHistory: [fixtureWinningRace("backyard_derby")],
        unlockedPlaystyleNodes: ["ps_scrap_t1"],
      };
    case "post_team_reset": {
      const earned = calculateTeamPoints({ lifetimeLPThisTeamEra: 1_600, teamEraCount: 2, unspentLP: 150 });
      return { tutorialStep: -1, tutorialDismissed: true, unlockedFeatures: resetReady.unlockedFeatures, teamPoints: 40 + earned, lifetimeTeamPoints: 150 + earned, teamEraCount: 3, lifetimeLPThisTeamEra: 0, lifetimeTPThisOwnerEra: earned, lifetimeLPAllTime: 400, lifetimeScrapResets: 6, crewSlots: 1, unlockedPlaystyleNodes: [] };
    }
    case "owner_reset_ready":
      return {
        ...resetReady,
        legacyPoints: 100,
        teamPoints: 200,
        lifetimeTeamPoints: 650,
        teamEraCount: 4,
        lifetimeTPThisOwnerEra: 1_250,
        ownerPoints: 50,
        lifetimeOwnerPoints: 250,
        ownerEraCount: 4,
        lifetimeLPAllTime: 500,
        lifetimeScrapResets: 8,
      };
    case "post_owner_reset": {
      const earned = calculateOwnerPoints({ lifetimeTPThisOwnerEra: 1_250, ownerEraCount: 4, unspentTP: 200 });
      return { tutorialStep: -1, tutorialDismissed: true, unlockedFeatures: resetReady.unlockedFeatures, ownerPoints: 50 + earned, lifetimeOwnerPoints: 250 + earned, ownerEraCount: 5, lifetimeTPThisOwnerEra: 0, lifetimeOPThisTrackEra: earned, lifetimeLPAllTime: 500, lifetimeScrapResets: 8 };
    }
    case "track_reset_ready":
      return {
        ...resetReady,
        ownerPoints: 250,
        lifetimeOwnerPoints: 1_250,
        ownerEraCount: 6,
        lifetimeOPThisTrackEra: 1_500,
        trackPrestigeTokens: 50,
        lifetimeTrackTokens: 200,
        trackEraCount: 2,
        lifetimeLPAllTime: 700,
        lifetimeScrapResets: 10,
      };
    case "post_track_reset": {
      const earned = calculateTrackTokens({ lifetimeOPThisTrackEra: 1_500, trackEraCount: 2, unspentOP: 250 });
      return { tutorialStep: -1, tutorialDismissed: true, unlockedFeatures: resetReady.unlockedFeatures, trackPrestigeTokens: 50 + earned, lifetimeTrackTokens: 200 + earned, trackEraCount: 3, lifetimeOPThisTrackEra: 0, lifetimeLPAllTime: 700, lifetimeScrapResets: 10 };
    }
    case "maxed": {
      const garage = VEHICLE_DEFINITIONS.map((vehicle, index) => fixtureVehicle(vehicle.id, 100 + index, 100, "artifact"));
      const stationEquipmentInventory: StationEquipment[] = GARAGE_STATION_IDS.map((slot, index) => ({
        id: `fixture_station_${slot}`,
        slot,
        rarity: "legendary",
        name: `Maxed ${slot.replaceAll("_", " ")}`,
        effects: [{ type: "attribute", attribute: "engineering", value: 18 }],
        enhancementLevel: 13,
        setId: index < 4 ? "redline" : undefined,
        source: "fixture_maxed",
      }));
      return {
        ...actionReadyCommon(),
        scrapBucks: 1_000_000_000,
        repPoints: 1_000_000_000,
        lifetimeScrapBucks: 2_000_000_000,
        legacyPoints: 100_000,
        lifetimeLegacyPoints: 1_000_000,
        teamPoints: 100_000,
        ownerPoints: 100_000,
        trackPrestigeTokens: 100_000,
        prestigeCount: 25,
        teamEraCount: 10,
        ownerEraCount: 10,
        trackEraCount: 10,
        lifetimeLPAllTime: 1_000_000,
        lifetimeTeamPoints: 100_000,
        lifetimeOwnerPoints: 100_000,
        lifetimeTrackTokens: 100_000,
        lifetimeLPThisTeamEra: 10_000,
        lifetimeTPThisOwnerEra: 10_000,
        lifetimeOPThisTrackEra: 10_000,
        inventory: inventorySet(8),
          garage,
          activeVehicleId: garage.at(-1)!.id,
          defeatedRivalIds: RIVAL_DEFINITIONS.map((rival) => rival.id),
          discoveredBlueprintIds: [...ALL_VEHICLES],
          selectedLocationId: ALL_LOCATIONS.at(-1)!,
        selectedCircuitId: ALL_CIRCUITS.at(-1)!,
        workshopLevels: levelMap(UPGRADE_DEFINITIONS),
        teamUpgradeLevels: levelMap(TEAM_UPGRADE_DEFINITIONS),
        ownerUpgradeLevels: levelMap(OWNER_UPGRADE_DEFINITIONS),
        trackPerkLevels: levelMap(TRACK_PERK_DEFINITIONS),
        legacyUpgradeLevels: levelMap(LEGACY_UPGRADE_DEFINITIONS),
        unlockedFeatures: [...ALL_FEATURES],
        activeMomentumTiers: MOMENTUM_TIERS.map((tier) => tier.id),
        completedChallenges: CHALLENGE_DEFINITIONS.map((challenge) => challenge.id),
        earnedAchievements: ACHIEVEMENT_DEFINITIONS.map((achievement) => achievement.id),
        unlockedPlaystyleNodes: [
          "ps_scrap_t1", "ps_scrap_t2a", "ps_scrap_t3a", "ps_scrap_t4",
          "ps_speed_t1", "ps_speed_t2a", "ps_speed_t3a", "ps_speed_t4",
          "ps_eng_t1", "ps_eng_t2a", "ps_eng_t3a", "ps_eng_t4",
        ],
        materials: { metalScrap: 1_000_000, rubberCompound: 1_000_000, heatCore: 1_000_000, circuitFragment: 1_000_000, carbonDust: 1_000_000, greaseSludge: 1_000_000 },
        forgeTokens: 100_000,
        reforgeShards: 100_000,
        autoScavengeUnlocked: true,
        autoRaceUnlocked: true,
        manualScavengeClicks: AUTO_SCAVENGE_MANUAL_TARGET,
        fatigue: 99,
        lifetimeRaces: 100_000,
        lifetimeRacesAllTime: 1_000_000,
        lifetimeWinsAllTime: 800_000,
        lifetimePartsScavengedAllTime: 5_000_000,
        lifetimeVehiclesBuiltAllTime: garage.length,
        lifetimeScrapResets: 25,
        bestWinStreak: 100,
        bestWinStreakAllTime: 100,
        highestVehicleTierBuilt: Math.max(...VEHICLE_DEFINITIONS.map((vehicle) => vehicle.tier)),
        totalForgeTokensEarned: 100_000,
        lifetimeTotalDecomposed: 10_000,
        lifetimeTotalEnhanced: 10_000,
        lifetimeTotalTradeUps: 10_000,
        lifetimeTotalRaceSalvage: 10_000,
        highestConditionReached: CONDITIONS.indexOf("artifact"),
        challengeProgress: { totalDecomposed: 10_000, winStreak: 100, fatigue: 99, lifetimeRaces: 100_000, totalEnhanced: 10_000, highestConditionReached: CONDITIONS.indexOf("artifact"), prestigeCount: 25, totalTradeUps: 10_000, totalRaceSalvage: 10_000 },
        uniqueVehicleTypesBuilt: [...ALL_VEHICLES],
        racerSkills: {
          driving: { xp: 1_000_000, level: 20 },
          mechanics: { xp: 1_000_000, level: 20 },
          scavenging: { xp: 1_000_000, level: 20 },
          endurance: { xp: 1_000_000, level: 20 },
        },
        ownedGearIds: GEAR_DEFINITIONS.map((gear) => gear.id),
        equippedGear: {
          head: "head_racing_helmet",
          body: "body_race_suit",
          hands: "hands_racing",
          feet: "feet_racing_boots",
          tool: "tool_power_tools",
          accessory: "acc_sponsor_bag",
        },
        lootGearInventory: [
          {
            id: "fixture_loot_head",
            slot: "head",
            rarity: "epic",
            name: "Fixture Rally Goggles",
            effects: [{ type: "race_dnf_reduction", value: 0.08 }],
            enhancementLevel: 3,
            modSlots: 1,
            mods: [{ id: "fixture_installed_padding", templateId: "mod_padding", name: "Fixture Impact Padding", effectType: "race_wear_reduction_pct", value: 0.05 }],
            source: "fixture_maxed",
          },
          {
            id: "fixture_loot_hands",
            slot: "hands",
            rarity: "rare",
            name: "Fixture Pit Gloves",
            effects: [{ type: "build_cost_reduction_pct", value: 0.06 }],
            enhancementLevel: 1,
            modSlots: 1,
            mods: [],
            source: "fixture_maxed",
          },
        ],
        equippedLootGear: { head: "fixture_loot_head", body: null, hands: null, feet: null, tool: null, accessory: null },
        gearModInventory: [{ id: "fixture_mod_grip", templateId: "mod_grip_tape", name: "Fixture Grip Tape", effectType: "race_handling_pct", value: 0.03 }],
        stationEquipmentInventory,
        equippedStationEquipment: Object.fromEntries(stationEquipmentInventory.map((item) => [item.slot, item.id])) as GameState["equippedStationEquipment"],
        dealerBoard: [
          { id: "fixture_max_dealer_1", definitionId: "engine_v8", condition: "pristine", price: 1_500, expiresAt: 1_000_030 },
          { id: "fixture_max_dealer_2", definitionId: "wheel_racing", condition: "pristine", price: 400, expiresAt: 1_000_030 },
          { id: "fixture_max_dealer_3", definitionId: "frame_carbon", condition: "pristine", price: 2_500, expiresAt: 1_000_030 },
        ],
        gameTick: 1_000_000,
        crewSlots: 8,
        crewRoster: [
          { id: "fixture_crew_mechanic", name: "Rook", role: "mechanic", level: 10, xp: 100_000, specialization: "tuner" },
          { id: "fixture_crew_scout", name: "Scout", role: "scout", level: 10, xp: 100_000, specialization: "treasure_hunter" },
          { id: "fixture_crew_driver", name: "Ace", role: "driver", level: 10, xp: 100_000, specialization: "safety_first" },
          { id: "fixture_crew_trader", name: "Mags", role: "trader", level: 10, xp: 100_000, specialization: "negotiator" },
        ],
        raceHistory: [fixtureWinningRace("world_championship")],
      };
    }
  }
}

export function createGameplayFixture(name: GameplayFixtureName): GameplayFixture {
  const state = { ...basePersistedState(), ...milestonePatch(name) };
  return {
    fixtureVersion: GAMEPLAY_FIXTURE_VERSION,
    name,
    description: `Generated ${name.replaceAll("_", " ")} gameplay scenario`,
    storageKey: PERSISTENCE_STORAGE_KEY,
    payload: { version: PERSISTENCE_VERSION, state },
  };
}

export function createAllGameplayFixtures(): Record<GameplayFixtureName, GameplayFixture> {
  return Object.fromEntries(
    GAMEPLAY_FIXTURE_NAMES.map((name) => [name, createGameplayFixture(name)]),
  ) as Record<GameplayFixtureName, GameplayFixture>;
}

export function validateGameplayFixture(fixture: GameplayFixture): string[] {
  const state = fixture.payload.state;
  const errors: string[] = [];
  const knownLocations = new Set(LOCATION_DEFINITIONS.map((definition) => definition.id));
  const knownCircuits = new Set(CIRCUIT_DEFINITIONS.map((definition) => definition.id));
  const knownVehicles = new Set(VEHICLE_DEFINITIONS.map((definition) => definition.id));
  const knownFeatures = new Set(Object.keys(FEATURE_AVAILABILITY));
  const knownChallenges = new Set(CHALLENGE_DEFINITIONS.map((definition) => definition.id));
  const knownAchievements = new Set(ACHIEVEMENT_DEFINITIONS.map((definition) => definition.id));
  const knownPlaystyleNodes = new Set(PLAYSTYLE_NODE_DEFINITIONS.map((definition) => definition.id));
  const knownMomentumTiers = new Set(MOMENTUM_TIERS.map((definition) => definition.id));
  const vehicleIds = new Set(state.garage.map((vehicle) => vehicle.id));
  if (state.activeVehicleId && !vehicleIds.has(state.activeVehicleId)) errors.push("activeVehicleId does not reference garage");
  for (const id of state.unlockedLocationIds) if (!knownLocations.has(id)) errors.push(`unknown location ${id}`);
  for (const id of state.unlockedCircuitIds) if (!knownCircuits.has(id)) errors.push(`unknown circuit ${id}`);
  for (const id of state.unlockedVehicleIds) if (!knownVehicles.has(id)) errors.push(`unknown vehicle unlock ${id}`);
  for (const id of state.unlockedFeatures) if (!knownFeatures.has(id)) errors.push(`unknown feature ${id}`);
  for (const id of state.completedChallenges) if (!knownChallenges.has(id)) errors.push(`unknown challenge ${id}`);
  for (const id of state.earnedAchievements) if (!knownAchievements.has(id)) errors.push(`unknown achievement ${id}`);
  for (const id of state.unlockedPlaystyleNodes) if (!knownPlaystyleNodes.has(id)) errors.push(`unknown playstyle node ${id}`);
  for (const id of state.activeMomentumTiers) if (!knownMomentumTiers.has(id)) errors.push(`unknown momentum tier ${id}`);
  if (!state.unlockedLocationIds.includes(state.selectedLocationId)) errors.push("selectedLocationId is locked");
  if (!state.unlockedCircuitIds.includes(state.selectedCircuitId)) errors.push("selectedCircuitId is locked");
  if (state.autoRaceUnlocked && state.activeVehicleId) {
    const reason = getRaceIneligibilityReason({
      activeVehicleId: state.activeVehicleId,
      garage: state.garage,
      selectedCircuitId: state.selectedCircuitId,
      unlockedCircuitIds: state.unlockedCircuitIds,
      scrapBucks: state.scrapBucks,
    });
    if (reason) errors.push(`active auto-race selection is ineligible: ${reason}`);
  }
  for (const vehicle of state.garage) {
    const definition = getVehicleById(vehicle.definitionId);
    if (!definition) { errors.push(`unknown vehicle ${vehicle.definitionId}`); continue; }
    if (!Number.isFinite(vehicle.condition) || vehicle.condition < 0 || vehicle.condition > 100) errors.push(`invalid condition for ${vehicle.id}`);
    for (const slot of definition.slots.filter((candidate) => candidate.required)) {
      const installed = vehicle.parts[slot.slot];
      if (!installed || !slot.acceptableParts.includes(installed.part.definitionId)) errors.push(`invalid ${slot.slot} for ${vehicle.id}`);
    }
  }
  for (const member of state.crewRoster) {
    const derivedLevel = crewLevelFromXp(member.xp).level;
    if (member.level !== derivedLevel) errors.push(`crew level/xp mismatch for ${member.id}`);
  }
  for (const value of [state.scrapBucks, state.repPoints, state.legacyPoints, state.teamPoints, state.ownerPoints, state.trackPrestigeTokens]) {
    if (!Number.isFinite(value) || value < 0) errors.push("invalid currency");
  }
  return errors;
}
