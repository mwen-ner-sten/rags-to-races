import { ADDON_DEFINITIONS } from "@/data/addons";
import { CIRCUIT_DEFINITIONS } from "@/data/circuits";
import { FEATURE_UNLOCK_DEFINITIONS } from "@/data/featureUnlocks";
import { LOCATION_DEFINITIONS } from "@/data/locations";
import { OWNER_UPGRADE_DEFINITIONS } from "@/data/ownerUpgrades";
import { PART_DEFINITIONS, type PartCondition } from "@/data/parts";
import { TEAM_UPGRADE_DEFINITIONS } from "@/data/teamUpgrades";
import { TRACK_PERK_DEFINITIONS } from "@/data/trackPerks";
import { UPGRADE_DEFINITIONS } from "@/data/upgrades";
import { VEHICLE_DEFINITIONS, getVehicleById } from "@/data/vehicles";
import { calculateStats, type BuiltVehicle, type InstalledPart } from "@/engine/build";
import type { ScavengedPart } from "@/engine/scavenge";
import { calculateOwnerPoints, calculateTeamPoints, calculateTrackTokens } from "@/engine/prestige";
import { createInitialState, type GameState } from "@/state/store";
import {
  getPersistedGameState,
  PERSISTENCE_STORAGE_KEY,
  PERSISTENCE_VERSION,
  type PersistedGameState,
} from "@/state/persistence";

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
const ALL_FEATURES = FEATURE_UNLOCK_DEFINITIONS.map((definition) => definition.id);

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
    selectedCircuitId: "regional_circuit",
    autoScavengeUnlocked: true,
    autoRaceUnlocked: true,
    manualScavengeClicks: 500,
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
    completedChallenges: ["first_build"],
    earnedAchievements: ["first_vehicle"],
    discoveredBlueprintIds: ["push_mower", "riding_mower", "go_kart"],
  };
}

function milestonePatch(name: GameplayFixtureName): Partial<PersistedGameState> {
  const raceVehicle = fixtureVehicle("push_mower", 10, 72, "good");
  const resetReady = resetReadyCommon();

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
        activeVehicleId: garage[1].id,
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
        manualScavengeClicks: 500,
        lifetimeRaces: 80,
        fatigue: 32,
        activeMomentumTiers: ["momentum_1"],
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
        manualScavengeClicks: 499,
        autoScavengeUnlocked: false,
        autoRaceUnlocked: false,
        prestigeCount: 0,
      };
    case "first_scrap_reset_ready":
      return { ...resetReady, lifetimeLPAllTime: 0, lifetimeScrapResets: 0, prestigeCount: 0, legacyPoints: 0, lifetimeLegacyPoints: 0, autoRaceUnlocked: false };
    case "post_scrap_reset":
      return {
        tutorialStep: -1,
        tutorialDismissed: true,
        prestigeCount: 1,
        legacyPoints: 106,
        lifetimeLegacyPoints: 106,
        lifetimeLPAllTime: 106,
        lifetimeLPThisTeamEra: 106,
        lifetimeScrapResets: 1,
        autoScavengeUnlocked: false,
        autoRaceUnlocked: true,
        manualScavengeClicks: 0,
        materials: resetReady.materials,
        forgeTokens: resetReady.forgeTokens,
        completedChallenges: resetReady.completedChallenges,
        earnedAchievements: resetReady.earnedAchievements,
        discoveredBlueprintIds: resetReady.discoveredBlueprintIds,
        unlockedFeatures: resetReady.unlockedFeatures,
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
        crewRoster: [{ id: "fixture_crew", name: "Rook", role: "mechanic", level: 3, xp: 40, specialization: null }],
        unlockedPlaystyleNodes: ["scrapper_start"],
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
        selectedLocationId: ALL_LOCATIONS.at(-1)!,
        selectedCircuitId: ALL_CIRCUITS.at(-1)!,
        workshopLevels: levelMap(UPGRADE_DEFINITIONS),
        teamUpgradeLevels: levelMap(TEAM_UPGRADE_DEFINITIONS),
        ownerUpgradeLevels: levelMap(OWNER_UPGRADE_DEFINITIONS),
        trackPerkLevels: levelMap(TRACK_PERK_DEFINITIONS),
        legacyUpgradeLevels: {},
        materials: { metalScrap: 1_000_000, rubberCompound: 1_000_000, heatCore: 1_000_000, circuitFragment: 1_000_000, carbonDust: 1_000_000, greaseSludge: 1_000_000 },
        forgeTokens: 100_000,
        reforgeShards: 100_000,
        autoScavengeUnlocked: true,
        autoRaceUnlocked: true,
        manualScavengeClicks: 500,
        fatigue: 99,
        lifetimeRaces: 100_000,
        lifetimeRacesAllTime: 1_000_000,
        lifetimeWinsAllTime: 800_000,
        lifetimePartsScavengedAllTime: 5_000_000,
        lifetimeVehiclesBuiltAllTime: garage.length,
        uniqueVehicleTypesBuilt: [...ALL_VEHICLES],
        crewSlots: 8,
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
  const vehicleIds = new Set(state.garage.map((vehicle) => vehicle.id));
  if (state.activeVehicleId && !vehicleIds.has(state.activeVehicleId)) errors.push("activeVehicleId does not reference garage");
  if (!state.unlockedLocationIds.includes(state.selectedLocationId)) errors.push("selectedLocationId is locked");
  if (!state.unlockedCircuitIds.includes(state.selectedCircuitId)) errors.push("selectedCircuitId is locked");
  for (const vehicle of state.garage) {
    const definition = getVehicleById(vehicle.definitionId);
    if (!definition) { errors.push(`unknown vehicle ${vehicle.definitionId}`); continue; }
    if (!Number.isFinite(vehicle.condition) || vehicle.condition < 0 || vehicle.condition > 100) errors.push(`invalid condition for ${vehicle.id}`);
    for (const slot of definition.slots.filter((candidate) => candidate.required)) {
      const installed = vehicle.parts[slot.slot];
      if (!installed || !slot.acceptableParts.includes(installed.part.definitionId)) errors.push(`invalid ${slot.slot} for ${vehicle.id}`);
    }
  }
  for (const value of [state.scrapBucks, state.repPoints, state.legacyPoints, state.teamPoints, state.ownerPoints, state.trackPrestigeTokens]) {
    if (!Number.isFinite(value) || value < 0) errors.push("invalid currency");
  }
  return errors;
}
