import { CIRCUIT_DEFINITIONS } from "@/data/circuits";
import { LOCATION_DEFINITIONS } from "@/data/locations";
import { OWNER_UPGRADE_DEFINITIONS } from "@/data/ownerUpgrades";
import { TEAM_UPGRADE_DEFINITIONS } from "@/data/teamUpgrades";
import { TRACK_PERK_DEFINITIONS } from "@/data/trackPerks";
import { VEHICLE_DEFINITIONS } from "@/data/vehicles";
import { createInitialState, type GameState } from "@/state/store";
import {
  getPersistedGameState,
  PERSISTENCE_STORAGE_KEY,
  PERSISTENCE_VERSION,
  type PersistedGameState,
} from "@/state/persistence";

export const GAMEPLAY_FIXTURE_VERSION = 1;

export const GAMEPLAY_FIXTURE_NAMES = [
  "fresh",
  "scrap_ready",
  "team",
  "owner",
  "track",
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

function basePersistedState(): PersistedGameState {
  const initial = createInitialState();
  return {
    ...getPersistedGameState(initial as GameState),
    tutorialLastAdvanceTime: 0,
  };
}

function milestonePatch(name: GameplayFixtureName): Partial<PersistedGameState> {
  const allLocations = LOCATION_DEFINITIONS.map((definition) => definition.id);
  const allCircuits = CIRCUIT_DEFINITIONS.map((definition) => definition.id);
  const allVehicles = VEHICLE_DEFINITIONS.map((definition) => definition.id);
  const common = {
    tutorialStep: -1,
    tutorialDismissed: true,
    unlockedLocationIds: allLocations,
    unlockedCircuitIds: allCircuits,
    unlockedVehicleIds: allVehicles,
  } satisfies Partial<PersistedGameState>;

  switch (name) {
    case "fresh":
      return {};
    case "scrap_ready":
      return {
        ...common,
        scrapBucks: 100_000,
        repPoints: 10_000,
        lifetimeScrapBucks: 100_000,
        lifetimeLPAllTime: 200,
        lifetimeVehiclesBuiltAllTime: 3,
      };
    case "team":
      return {
        ...common,
        teamEraCount: 1,
        teamPoints: 50,
        lifetimeTeamPoints: 50,
        lifetimeLPAllTime: 250,
        crewSlots: 2,
        unlockedFeatures: ["crew", "fleet_programs", "station_equipment"],
      };
    case "owner":
      return {
        ...common,
        teamEraCount: 3,
        ownerEraCount: 1,
        teamPoints: 50,
        ownerPoints: 50,
        lifetimeTeamPoints: 500,
        lifetimeOwnerPoints: 50,
        crewSlots: 3,
        unlockedFeatures: ["crew", "fleet_programs", "station_equipment", "owner_facilities", "advanced_circuits"],
      };
    case "track":
      return {
        ...common,
        teamEraCount: 3,
        ownerEraCount: 5,
        trackEraCount: 1,
        teamPoints: 50,
        ownerPoints: 50,
        trackPrestigeTokens: 50,
        lifetimeTeamPoints: 500,
        lifetimeOwnerPoints: 1_000,
        lifetimeTrackTokens: 50,
        crewSlots: 4,
        unlockedFeatures: ["crew", "fleet_programs", "station_equipment", "owner_facilities", "advanced_circuits", "track_configuration"],
      };
    case "maxed":
      return {
        ...common,
        scrapBucks: 1_000_000_000,
        repPoints: 1_000_000,
        legacyPoints: 100_000,
        teamPoints: 10_000,
        ownerPoints: 10_000,
        trackPrestigeTokens: 10_000,
        teamEraCount: 10,
        ownerEraCount: 10,
        trackEraCount: 10,
        lifetimeLPAllTime: 1_000_000,
        lifetimeTeamPoints: 100_000,
        lifetimeOwnerPoints: 100_000,
        lifetimeTrackTokens: 100_000,
        teamUpgradeLevels: levelMap(TEAM_UPGRADE_DEFINITIONS),
        ownerUpgradeLevels: levelMap(OWNER_UPGRADE_DEFINITIONS),
        trackPerkLevels: levelMap(TRACK_PERK_DEFINITIONS),
        crewSlots: 8,
        unlockedFeatures: ["crew", "fleet_programs", "station_equipment", "owner_facilities", "advanced_circuits", "track_configuration", "vehicle_mastery"],
      };
  }
}

export function createGameplayFixture(name: GameplayFixtureName): GameplayFixture {
  const state = { ...basePersistedState(), ...milestonePatch(name) };
  return {
    fixtureVersion: GAMEPLAY_FIXTURE_VERSION,
    name,
    description: `Generated ${name.replaceAll("_", " ")} gameplay milestone`,
    storageKey: PERSISTENCE_STORAGE_KEY,
    payload: { version: PERSISTENCE_VERSION, state },
  };
}

export function createAllGameplayFixtures(): Record<GameplayFixtureName, GameplayFixture> {
  return Object.fromEntries(
    GAMEPLAY_FIXTURE_NAMES.map((name) => [name, createGameplayFixture(name)]),
  ) as Record<GameplayFixtureName, GameplayFixture>;
}
