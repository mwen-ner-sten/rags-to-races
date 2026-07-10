"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  backupPersistedStoreBeforeMigration,
  getPersistedGameState,
  migratePersistedState,
  PERSISTENCE_STORAGE_KEY,
  PERSISTENCE_VERSION,
} from "./persistence";
import type { ScavengedPart } from "@/engine/scavenge";
import type { BuiltVehicle } from "@/engine/build";
import type { RaceOutcome } from "@/engine/race";
import type { RaceEvent } from "@/engine/raceEvents";
import type { PrestigeBonus, RunStats } from "@/engine/prestige";
import { LEGACY_UPGRADES_BY_ID, legacyUpgradeCost } from "@/data/legacyUpgrades";
import { getActiveMomentumTiers, getMomentumEffectValue } from "@/data/momentumBonuses";
import type { PartCondition } from "@/data/parts";
import { CONDITIONS, CONDITION_ADDON_SLOTS, CONDITION_MULTIPLIERS, getPartById } from "@/data/parts";
import { getAddonById } from "@/data/addons";
import type { InstalledPart } from "@/engine/build";
import type { GearSlot } from "@/data/gear";
import { getGearById, DEFAULT_EQUIPPED_GEAR, DEFAULT_OWNED_GEAR } from "@/data/gear";
import { getGearBonuses } from "@/engine/gear";
import { random } from "@/utils/random";
import type { LootGearItem, InstalledMod } from "@/data/lootGear";
import { TALENT_NODES, getTalentNodeById } from "@/data/talentNodes";
import { getEnhancementCost, getMaxEnhancementLevel, getModSlots, getSalvageValue } from "@/engine/gearEnhance";
import { rollGearDrops } from "@/engine/gearDrop";
import { calculatePrestigeBonus, calculatePrestigeBonusLegacy, doPrestige, deriveHighestCircuitTier, getLegacyEffectValue } from "@/engine/prestige";
import { generateRaceEvents } from "@/engine/raceEvents";
import { scavenge, makePartId } from "@/engine/scavenge";
import { buildVehicle, calculateStats, calculateRepairCost, calculateRefurbishCost, degradeCondition } from "@/engine/build";
import { simulateRace, calculateWear } from "@/engine/race";
import { decomposePart, decomposeMany } from "@/engine/decompose";
import { getLocationById } from "@/data/locations";
import { getCircuitById } from "@/data/circuits";
import { getVehicleById } from "@/data/vehicles";
import { getUpgradeById, getUpgradeCost } from "@/data/upgrades";
import { INITIAL_MATERIALS, type MaterialType } from "@/data/materials";
import type { DealerListing } from "@/data/dealer";
import { generateDealerBoard, shouldRefreshDealer, DEALER_UNLOCK_REP } from "@/data/dealer";
import { CHALLENGE_DEFINITIONS, type ChallengeRewardType } from "@/data/challenges";
import { calculateEnhancementCost, canAffordEnhancement, ARTIFACT_FORGE_COST, ARTIFACT_FORGE_TOKEN_COST } from "@/data/enhancement";
import type { CraftRecipe } from "@/data/craftRecipes";
import { canAffordRecipe } from "@/data/craftRecipes";
import { PART_DEFINITIONS } from "@/data/parts";
import { randInt } from "@/utils/random";
import type { RacerSkills, SkillName } from "@/data/racerSkills";
import { createDefaultSkills, levelFromXp, MAX_SKILL_LEVEL } from "@/data/racerSkills";
import { getSkillBonuses } from "@/engine/skills";
import type { RacerAttributes, AttributeName } from "@/data/racerAttributes";
import { createDefaultAttributes } from "@/data/racerAttributes";
import { TEAM_UPGRADES_BY_ID, teamUpgradeCost } from "@/data/teamUpgrades";
import { OWNER_UPGRADE_DEFINITIONS, OWNER_UPGRADES_BY_ID, ownerUpgradeCost } from "@/data/ownerUpgrades";
import { TRACK_PERKS_BY_ID, trackPerkCost } from "@/data/trackPerks";
import { calculateTeamPoints, calculateOwnerPoints, calculateTrackTokens } from "@/engine/prestige";
import { FEATURE_UNLOCK_DEFINITIONS, checkFeatureUnlock } from "@/data/featureUnlocks";
import type { CrewMember, CrewRole } from "@/data/crew";
import { grantCrewXp } from "@/engine/crew";
import { getPrestigeMilestoneBonuses, getNewlyUnlockedMilestones } from "@/data/prestigeMilestones";
import { checkAchievements } from "@/engine/achievements";
import { ACHIEVEMENTS_BY_ID, type AchievementStats } from "@/data/achievements";
import { PLAYSTYLE_NODES_BY_ID, canUnlockPlaystyleNode, getPlaystylePathRespecCost, type PlaystylePath } from "@/data/playstyleUpgrades";
import { GARAGE_STATION_IDS, type GarageStationSlot } from "@/data/garageStations";
import { convertLegacyLootDrop, type StationEquipment, type StationEquipmentRarity } from "@/data/stationEquipment";
import { forgeStationEquipment, STATION_FORGE_COST } from "@/engine/stationForge";
import { reforgeStationEquipment, REFORGE_COST_SHARDS, SHARDS_PER_SALVAGE } from "@/engine/stationReforge";
import { DEFAULT_RACE_PLAN, RACE_PLAN_PRESETS, type RacePlan } from "@/data/raceStrategy";
import { getRivalById } from "@/data/rivals";
import type { FleetAssignment } from "@/data/fleet";
import { getGameEffectValue } from "@/data/gameEffects";
import { TEAM_UPGRADE_DEFINITIONS } from "@/data/teamUpgrades";
import { DEFAULT_TRACK_CONFIG, type HostedEvent, type OwnedTrackConfig } from "@/data/trackVenue";

// ── Activity log ────────────────────────────────────────────────────────────
export type LogCategory = "scavenge" | "sell" | "race" | "build" | "upgrade" | "prestige" | "gear" | "craft" | "trade" | "tick";

export interface ActivityLogEntry {
  id: number;
  timestamp: number;
  category: LogCategory;
  message: string;
  scrapDelta?: number;
  repDelta?: number;
  lpDelta?: number;
}

export interface VehicleLoadout {
  id: string;
  name: string;
  vehicleId: string;
  vehicleDefinitionId: string;
  createdAt: number;
  parts: Record<string, { partId: string; addonIds: string[] }>;
}

const MAX_LOG_ENTRIES = 200;

export interface GameState {
  // Currency
  scrapBucks: number;
  repPoints: number;
  lifetimeScrapBucks: number;

  // Prestige
  prestigeCount: number;
  prestigeBonus: PrestigeBonus;

  // Legacy (prestige currency) — persists through prestige
  legacyPoints: number;
  lifetimeLegacyPoints: number;
  legacyUpgradeLevels: Record<string, number>;

  // Run momentum — resets on prestige
  activeMomentumTiers: string[];

  // Era tracking (Phase 2 foundation)
  currentEra: number;

  // Inventory
  inventory: ScavengedPart[];

  // Garage (built vehicles)
  garage: BuiltVehicle[];
  activeVehicleId: string | null;
  vehicleLoadouts: VehicleLoadout[];

  // Scavenging
  selectedLocationId: string;
  selectedSellBelowQuality: PartCondition;
  isScavenging: boolean;
  autoScavengeUnlocked: boolean;
  /** Counts manual scavenge button clicks; auto-scavenge unlocks at 500 */
  manualScavengeClicks: number;

  // Racing
  selectedCircuitId: string;
  isRacing: boolean;
  autoRaceUnlocked: boolean;
  /** Tick counter toward next auto-race fire (0 to raceTicksNeeded-1) */
  raceTickProgress: number;
  lastRaceOutcome: RaceOutcome | null;
  raceHistory: RaceOutcome[];
  raceEvents: RaceEvent[];
  raceStartTime: number | null;
  precomputedOutcome: RaceOutcome | null;
  currentRacePlan: RacePlan;
  defeatedRivalIds: string[];
  discoveredBlueprintIds: string[];
  fleetAssignments: FleetAssignment[];
  ownedTrackConfig: OwnedTrackConfig;
  hostedEvents: HostedEvent[];

  // Streaks
  winStreak: number;
  bestWinStreak: number;

  // Fatigue (aging mechanic)
  fatigue: number;          // 0-99, increases with races, penalizes everything
  lifetimeRaces: number;    // total races this run (drives fatigue curve)

  // Unlock notifications (transient)
  unlockEvents: string[];

  // Activity log (persists through prestige)
  activityLog: ActivityLogEntry[];
  _logIdCounter: number;

  // Gear (persists through prestige)
  equippedGear: Record<GearSlot, string>;
  ownedGearIds: string[];

  // Loot gear (persists through prestige)
  lootGearInventory: LootGearItem[];
  equippedLootGear: Record<GearSlot, string | null>;
  gearModInventory: InstalledMod[];
  unlockedTalentNodes: string[];
  stationEquipmentInventory: StationEquipment[];
  equippedStationEquipment: Record<GarageStationSlot, string | null>;
  reforgeShards: number;

  // Workshop upgrades
  workshopLevels: Record<string, number>;

  // Build UI state
  pendingBuildParts: Record<string, ScavengedPart | null>;
  pendingBuildVehicleId: string | null;

  // Unlocks
  unlockedLocationIds: string[];
  unlockedCircuitIds: string[];
  unlockedVehicleIds: string[];

  // Vehicle build counter (for unique IDs)
  _vehicleIdCounter: number;

  // ── New systems ─────────────────────────────────────────────────────────────

  /** Salvage materials (persists through prestige) */
  materials: Record<MaterialType, number>;

  /** Forge Tokens — used in Artifact Forge (persists through prestige) */
  forgeTokens: number;

  /** Dealer board listings (refreshes every 30 ticks when unlocked) */
  dealerBoard: DealerListing[];

  /** Current game tick (increments each tick for dealer refresh) */
  gameTick: number;

  /** Epoch ms of the last tick; used to compute offline catch-up time */
  lastActiveTimestamp: number;

  /** Completed challenge IDs */
  completedChallenges: string[];

  /** Progress tracking for active challenges (cumulative counters) */
  challengeProgress: Record<string, number>;

  /** Guided tutorial step (-1 = complete/skipped, 0+ = active step) */
  tutorialStep: number;
  /** Cards hidden but highlights/auto-advance still active */
  tutorialDismissed: boolean;
  /** Temporarily hidden — shows a restore chip instead of card/badge. Auto-resets on step advance. */
  tutorialMinimized: boolean;
  /** Steps that were auto-skipped by adaptive logic */
  tutorialSkippedSteps: number[];
  /** Timestamp of last tutorial step advance (for help nudge) */
  tutorialLastAdvanceTime: number;

  // Lifetime stats (for challenge tracking, persist through prestige)
  lifetimeTotalDecomposed: number;
  lifetimeTotalEnhanced: number;
  lifetimeTotalTradeUps: number;
  lifetimeTotalRaceSalvage: number;
  highestConditionReached: number; // index into CONDITIONS

  // Racer Skills (within-run XP progression, resets on prestige)
  racerSkills: RacerSkills;

  // ── Multi-Layer Prestige ────────────────────────────────────────────────────

  // Layer 2: Team Reset
  teamPoints: number;
  lifetimeTeamPoints: number;
  teamUpgradeLevels: Record<string, number>;
  teamEraCount: number;
  lifetimeLPThisTeamEra: number;

  // Layer 3: Owner Reset
  ownerPoints: number;
  lifetimeOwnerPoints: number;
  ownerUpgradeLevels: Record<string, number>;
  ownerEraCount: number;
  lifetimeTPThisOwnerEra: number;

  // Layer 4: Track Owner
  trackPrestigeTokens: number;
  lifetimeTrackTokens: number;
  trackPerkLevels: Record<string, number>;
  trackEraCount: number;
  lifetimeOPThisTrackEra: number;

  // Racer Attributes (persists through Scrap Reset, resets on Team Reset)
  racerAttributes: RacerAttributes;

  // Feature unlocks (progressive, never reset)
  unlockedFeatures: string[];

  // Lifetime tracking (never resets)
  lifetimeLPAllTime: number;
  lifetimeScrapResets: number;

  // Crew system (persists through Scrap Reset, resets on Team Reset unless Crew Retention)
  crewRoster: CrewMember[];
  crewSlots: number;

  // Achievements (never reset across any prestige layer)
  earnedAchievements: string[];

  // Lifetime stats for achievements (never reset across any prestige layer)
  lifetimeRacesAllTime: number;
  lifetimeWinsAllTime: number;
  lifetimeScrapBucksAllTime: number;
  lifetimePartsScavengedAllTime: number;
  lifetimeVehiclesBuiltAllTime: number;
  bestWinStreakAllTime: number;
  highestVehicleTierBuilt: number;
  totalForgeTokensEarned: number;
  uniqueVehicleTypesBuilt: string[];

  // Playstyle upgrades (persists through Scrap Reset, resets on Team Reset)
  unlockedPlaystyleNodes: string[];

  // Actions
  manualScavenge: () => void;
  sellPart: (partId: string) => void;
  sellAllJunk: () => void;
  sellAllScrap: () => void;
  sellBelowQuality: (threshold: PartCondition) => void;
  setPendingVehicle: (vehicleId: string) => void;
  setPendingPart: (slot: string, part: ScavengedPart | null) => void;
  buildSelectedVehicle: () => void;
  setActiveVehicle: (vehicleId: string) => void;
  sellVehicle: (vehicleId: string) => void;
  saveVehicleLoadout: (vehicleId: string, name: string) => void;
  applyVehicleLoadout: (loadoutId: string) => void;
  deleteVehicleLoadout: (loadoutId: string) => void;
  setSelectedLocation: (locationId: string) => void;
  setSelectedCircuit: (circuitId: string) => void;
  setSelectedSellBelowQuality: (threshold: PartCondition) => void;
  enterRace: () => void;
  setRacePlan: (plan: RacePlan) => void;
  applyRacePlanPreset: (preset: keyof typeof RACE_PLAN_PRESETS) => void;
  startFleetAssignment: (vehicleId: string, circuitId: string, crewId?: string) => void;
  collectFleetAssignment: (assignmentId: string) => void;
  advanceFleetAssignments: (ticks?: number) => void;
  updateOwnedTrackConfig: (config: OwnedTrackConfig) => void;
  hostTrackEvent: () => void;
  collectHostedEvent: (eventId: string) => void;
  clearUnlockEvents: () => void;
  advanceTutorial: () => void;
  skipTutorial: () => void;
  dismissTutorial: () => void;
  toggleTutorialMinimized: () => void;
  repairVehicle: (vehicleId: string) => void;
  swapPart: (vehicleId: string, slot: string, newPart: ScavengedPart) => void;
  installAddon: (vehicleId: string, slot: string, addonId: string) => void;
  removeAddon: (vehicleId: string, slot: string, addonId: string) => void;
  refurbishPart: (partId: string) => void;
  purchaseUpgrade: (upgradeId: string) => void;
  purchaseGear: (gearId: string) => void;
  equipGear: (gearId: string) => void;
  equipLootGear: (lootGearId: string) => void;
  unequipLootGear: (slot: GearSlot) => void;
  enhanceLootGear: (lootGearId: string) => void;
  salvageLootGear: (lootGearId: string) => void;
  installMod: (lootGearId: string, modInstanceId: string) => void;
  removeMod: (lootGearId: string, modIndex: number) => void;
  unlockTalentNode: (nodeId: string) => void;
  respecTalentTree: (treeId: string) => void;
  forgeStationItem: (slot: GarageStationSlot, rarity: StationEquipmentRarity) => void;
  equipStationItem: (itemId: string) => void;
  reforgeStationItem: (itemId: string) => void;
  enhanceStationItem: (itemId: string) => void;
  salvageStationItem: (itemId: string) => void;
  unlockLocation: (locationId: string) => void;
  unlockCircuit: (circuitId: string) => void;
  prestige: () => void;
  purchaseLegacyUpgrade: (upgradeId: string) => void;
  checkMomentumTiers: () => void;
  applyTickResult: (partsFound: ScavengedPart[], scrapsEarned: number, repEarned: number, vehicleWear?: number, vehicleRepair?: number, newRaceTickProgress?: number, lootGearDrops?: LootGearItem[], modDrops?: InstalledMod[], racesCompleted?: number) => void;

  // ── New system actions ───────────────────────────────────────────────────────
  decomposePart: (partId: string) => void;
  decomposeAllJunk: () => void;
  enhancePart: (partId: string) => void;
  forgePart: (partId: string) => void;
  craftPart: (recipe: CraftRecipe) => void;
  tradeUpParts: (partIds: [string, string, string]) => void;
  buyFromDealer: (listingId: string) => void;
  refreshDealer: () => void;
  convertScrapToMaterial: (material: MaterialType) => void;
  purchaseFatigueDrink: () => void;

  clearActivityLog: () => void;

  // ── Multi-layer prestige actions ─────────────────────────────────────────────
  teamReset: () => void;
  purchaseTeamUpgrade: (upgradeId: string) => void;
  ownerReset: () => void;
  purchaseOwnerUpgrade: (upgradeId: string) => void;
  trackReset: () => void;
  purchaseTrackPerk: (perkId: string) => void;
  allocateAttribute: (attr: AttributeName, delta: number) => void;
  specializeCrewMember: (crewId: string, spec: string) => void;
  recruitCrewMember: (role: CrewRole) => void;
  checkFeatureUnlocks: () => void;
  checkAchievements: () => void;
  purchasePlaystyleNode: (nodeId: string) => void;
  respecPlaystylePath: (path: PlaystylePath) => void;

  // User actions (destructive)
  resetSave: () => void;

  // Dev / admin actions
  devSetScrapBucks: (amount: number) => void;
  devAddScrapBucks: (amount: number) => void;
  devSetRepPoints: (amount: number) => void;
  devAddRepPoints: (amount: number) => void;
  devSetPrestigeCount: (count: number) => void;
  devUnlockAll: () => void;
  devLockAll: () => void;
  devAddPartsToInventory: (partIds: string[], condition: string, count: number) => void;
  devClearInventory: () => void;
  devClearGarage: () => void;
  devSetAutoUnlocks: (scavenge: boolean, race: boolean) => void;
  devResetSave: () => void;
  devQuickStart: () => void;
}

export function createInitialState(): Omit<GameState, keyof ReturnType<typeof createActions>> {
  return {
    scrapBucks: 0,
    repPoints: 0,
    lifetimeScrapBucks: 0,
    prestigeCount: 0,
    prestigeBonus: calculatePrestigeBonusLegacy(0),
    legacyPoints: 0,
    lifetimeLegacyPoints: 0,
    legacyUpgradeLevels: {},
    activeMomentumTiers: [],
    currentEra: 1,
    inventory: [],
    garage: [],
    activeVehicleId: null,
    vehicleLoadouts: [],
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
    currentRacePlan: { ...DEFAULT_RACE_PLAN },
    defeatedRivalIds: [],
    discoveredBlueprintIds: [],
    fleetAssignments: [],
    ownedTrackConfig: { ...DEFAULT_TRACK_CONFIG },
    hostedEvents: [],
    winStreak: 0,
    bestWinStreak: 0,
    fatigue: 0,
    lifetimeRaces: 0,
    unlockEvents: [],
    activityLog: [],
    _logIdCounter: 0,
    equippedGear: { ...DEFAULT_EQUIPPED_GEAR },
    ownedGearIds: [...DEFAULT_OWNED_GEAR],
    lootGearInventory: [],
    equippedLootGear: { head: null, body: null, hands: null, feet: null, tool: null, accessory: null },
    gearModInventory: [],
    unlockedTalentNodes: [],
    stationEquipmentInventory: [],
    equippedStationEquipment: Object.fromEntries(GARAGE_STATION_IDS.map((slot) => [slot, null])) as Record<GarageStationSlot, string | null>,
    reforgeShards: 0,
    workshopLevels: {},
    pendingBuildParts: {},
    pendingBuildVehicleId: "push_mower",
    unlockedLocationIds: ["curbside"],
    unlockedCircuitIds: ["backyard_derby"],
    unlockedVehicleIds: ["push_mower"],
    _vehicleIdCounter: 0,
    // New systems — defaults used on fresh game start.
    // On prestige, these are overridden explicitly to preserve cross-prestige fields.
    materials: { ...INITIAL_MATERIALS },
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
    tutorialStep: 0,
    tutorialDismissed: false,
    tutorialMinimized: false,
    tutorialSkippedSteps: [],
    tutorialLastAdvanceTime: Date.now(),
    racerSkills: createDefaultSkills(),
    // Multi-layer prestige defaults
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
    racerAttributes: createDefaultAttributes(),
    unlockedFeatures: [],
    lifetimeLPAllTime: 0,
    lifetimeScrapResets: 0,
    crewRoster: [],
    crewSlots: 0,
    // Achievements & lifetime stats (never reset)
    earnedAchievements: [],
    lifetimeRacesAllTime: 0,
    lifetimeWinsAllTime: 0,
    lifetimeScrapBucksAllTime: 0,
    lifetimePartsScavengedAllTime: 0,
    lifetimeVehiclesBuiltAllTime: 0,
    bestWinStreakAllTime: 0,
    highestVehicleTierBuilt: 0,
    totalForgeTokensEarned: 0,
    uniqueVehicleTypesBuilt: [],
    // Playstyle upgrades (reset on Team Reset)
    unlockedPlaystyleNodes: [],
  };
}

// ── Workshop upgrade helpers (exported for tick.ts and UI) ───────────────────
export function _getUpgradeLevel(state: GameState, upgradeId: string): number {
  return state.workshopLevels[upgradeId] ?? 0;
}
export function _getUpgradeEffectValue(state: GameState, upgradeId: string): number {
  const level = _getUpgradeLevel(state, upgradeId);
  if (level === 0) return 0;
  const def = getUpgradeById(upgradeId);
  if (!def) return 0;
  return def.effect.valuePerLevel * level;
}

/** Calculate fatigue from total races this run (logarithmic curve) */
export function calculateFatigue(lifetimeRaces: number, fatigueOffset: number = 0): number {
  const effectiveRaces = Math.max(0, lifetimeRaces - fatigueOffset);
  if (effectiveRaces <= 0) return 0;
  return Math.min(99, Math.floor(25 * Math.log2(1 + effectiveRaces / 100)));
}

/**
 * Check all challenge definitions against the current progress snapshot.
 * Returns newly-completed challenge IDs and their combined rewards.
 */
function checkChallenges(
  state: Pick<GameState, "completedChallenges">,
  progress: Record<string, number>,
  alreadyCompleted: string[],
): { completed: string[]; rewards: ChallengeRewardType[] } {
  const completed: string[] = [];
  const rewards: ChallengeRewardType[] = [];

  for (const challenge of CHALLENGE_DEFINITIONS) {
    if (alreadyCompleted.includes(challenge.id) || completed.includes(challenge.id)) continue;
    const current = progress[challenge.trackingKey] ?? 0;
    if (current >= challenge.target) {
      completed.push(challenge.id);
      rewards.push(...challenge.rewards);
    }
  }

  return { completed, rewards };
}

type SetState = (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void;
type GetState = () => GameState;

/** Append an activity log entry (keeps last MAX_LOG_ENTRIES). */
function _appendLog(set: SetState, get: GetState, category: LogCategory, message: string, deltas?: { scrapDelta?: number; repDelta?: number; lpDelta?: number }) {
  const s = get() as GameState;
  const entry: ActivityLogEntry = {
    id: s._logIdCounter,
    timestamp: Date.now(),
    category,
    message,
    ...deltas,
  };
  set({
    activityLog: [...s.activityLog, entry].slice(-MAX_LOG_ENTRIES),
    _logIdCounter: s._logIdCounter + 1,
  });
}

/** Grant XP to a skill and recalculate level. Returns the updated skills object. */
function _grantXp(skills: RacerSkills, skill: SkillName, amount: number): RacerSkills {
  const current = skills[skill];
  const newXp = current.xp + amount;
  const { level } = levelFromXp(newXp);
  return {
    ...skills,
    [skill]: { xp: newXp, level: Math.min(level, MAX_SKILL_LEVEL) },
  };
}

function createActions(set: SetState, get: GetState) {
  return {
    manualScavenge: () => {
      const state = get() as GameState;
      const location = getLocationById(state.selectedLocationId);
      if (!location) return;
      const extraLuck = _getUpgradeEffectValue(state, "keen_eye");
      const extraParts = Math.floor(_getUpgradeEffectValue(state, "deep_pockets"));
      const fatigue = state.fatigue;
      const gb = getGearBonuses(state.equippedGear, state.equippedLootGear, state.lootGearInventory, state.unlockedTalentNodes, TALENT_NODES, state.equippedStationEquipment, state.stationEquipmentInventory);
      const scavSkill = getSkillBonuses(state.racerSkills, location.tier);
      const parts = scavenge(location, state.prestigeBonus.luckBonus + extraLuck + scavSkill.scavengingLuckBonus, fatigue, gb.scavenge_luck_bonus, gb.scavenge_yield_pct + scavSkill.scavengingYieldBonus);
      for (let i = 0; i < extraParts; i++) {
        const bonus = scavenge(location, state.prestigeBonus.luckBonus + extraLuck + scavSkill.scavengingLuckBonus, fatigue, gb.scavenge_luck_bonus, gb.scavenge_yield_pct + scavSkill.scavengingYieldBonus);
        if (bonus.length > 0) parts.push(bonus[0]);
      }
      /* ── Early-game boost: first 30 clicks on first prestige guarantee enough to build ── */
      const isFirstPrestige = state.prestigeCount === 0;
      const clickNum = state.manualScavengeClicks; // 0-indexed
      if (isFirstPrestige && clickNum < 30) {
        // First upgrade junk / zero-value parts so every drop sells for $1+
        for (const p of parts) {
          if (p.definitionId === "misc_junk" || p.definitionId === "elec_none" || p.definitionId === "wheel_busted") {
            p.definitionId = "misc_seat";
          }
          if (p.condition === "rusted") p.condition = "worn";
        }
        // Then force engine / wheel (overrides any swap above)
        const hasEngine = state.inventory.some((p) =>
          p.definitionId === "engine_small" || p.definitionId === "engine_lawn",
        );
        const hasWheel = state.inventory.some((p) =>
          p.definitionId === "wheel_busted" || p.definitionId === "wheel_basic",
        );
        if (clickNum === 3 && !hasEngine) {
          parts[0] = { id: makePartId(), definitionId: "engine_small", condition: "decent", foundAt: location.id, type: "part" };
        } else if (clickNum === 7 && !hasWheel) {
          parts[0] = { id: makePartId(), definitionId: "wheel_busted", condition: "worn", foundAt: location.id, type: "part" };
        }
      }

      // Thorough Search: chance to double the parts found (applies to click & hold)
      const doubleChance = _getUpgradeEffectValue(state, "thorough_search");
      if (doubleChance > 0 && random() < doubleChance) {
        const dupes = parts.map((p) => ({ ...p, id: makePartId() }));
        parts.push(...dupes);
      }
      // Roll for gear/mod drops
      const { gearDrops, modDrop } = rollGearDrops({
        source: "scavenge",
        sourceTier: location.tier,
        sourceId: location.id,
        winStreak: state.winStreak,
        gearDropRateScavengeBonus: _getUpgradeEffectValue(state, "gear_scavenger") + getGameEffectValue(TEAM_UPGRADE_DEFINITIONS, state.teamUpgradeLevels, "gear_drop_rate"),
        gearDropRateRaceBonus: _getUpgradeEffectValue(state, "trophy_hunter"),
        rarityBonus: Math.floor(_getUpgradeEffectValue(state, "rarity_sense")),
        doubleDropChance: _getUpgradeEffectValue(state, "double_drop"),
        modDropRateBonus: _getUpgradeEffectValue(state, "mod_hunter"),
      });
      set((s: GameState) => {
        const newClicks = s.manualScavengeClicks + 1;
        const justUnlocked = !s.autoScavengeUnlocked && newClicks >= 500;
        return {
          inventory: [...s.inventory, ...parts],
          stationEquipmentInventory: gearDrops.length > 0 ? [...s.stationEquipmentInventory, ...gearDrops.map(convertLegacyLootDrop)] : s.stationEquipmentInventory,
          reforgeShards: s.reforgeShards + (modDrop ? 1 : 0),
          manualScavengeClicks: newClicks,
          autoScavengeUnlocked: s.autoScavengeUnlocked || justUnlocked,
          racerSkills: _grantXp(s.racerSkills, "scavenging", 5),
          unlockEvents: justUnlocked
            ? [...s.unlockEvents, "Auto-Scavenge Enabled! Parts collect themselves now."]
            : s.unlockEvents,
          // Lifetime stats for achievements
          lifetimePartsScavengedAllTime: s.lifetimePartsScavengedAllTime + parts.length,
        };
      });
      const gearMsg = gearDrops.length > 0 ? ` + ${gearDrops.map((g) => g.name).join(", ")}` : "";
      _appendLog(set, get, "scavenge", `Scavenged ${parts.length} part${parts.length !== 1 ? "s" : ""} at ${location.name}${gearMsg}`);
    },

    sellPart: (partId: string) => {
      const state = get() as GameState;
      const part = state.inventory.find((p) => p.id === partId);
      if (!part) return;
      const gb = getGearBonuses(state.equippedGear, state.equippedLootGear, state.lootGearInventory, state.unlockedTalentNodes, TALENT_NODES, state.equippedStationEquipment, state.stationEquipmentInventory);
      const def = part.type === "addon" ? getAddonById(part.definitionId) : getPartById(part.definitionId);
      if (!def) return;
      const mult = CONDITION_MULTIPLIERS[part.condition];
      const value = Math.floor(def.scrapValue * mult * (1 + gb.sell_value_bonus_pct));
      set((s: GameState) => ({
        inventory: s.inventory.filter((p) => p.id !== partId),
        scrapBucks: s.scrapBucks + value,
        lifetimeScrapBucks: s.lifetimeScrapBucks + value,
      }));
      _appendLog(set, get, "sell", `Sold ${def.name} (${part.condition}) for $${value}`, { scrapDelta: value });
    },

    sellAllJunk: () => {
      import("@/data/parts").then(({ getPartById, CONDITION_MULTIPLIERS }) => {
        const state = get() as GameState;
        const gb = getGearBonuses(state.equippedGear, state.equippedLootGear, state.lootGearInventory, state.unlockedTalentNodes, TALENT_NODES, state.equippedStationEquipment, state.stationEquipmentInventory);
        let total = 0;
        for (const part of state.inventory) {
          const def = part.type === "addon" ? getAddonById(part.definitionId) : getPartById(part.definitionId);
          if (!def) continue;
          const mult = CONDITION_MULTIPLIERS[part.condition];
          total += Math.floor(def.scrapValue * mult * (1 + gb.sell_value_bonus_pct));
        }
        const count = state.inventory.length;
        set((s: GameState) => ({
          inventory: [],
          scrapBucks: s.scrapBucks + total,
          lifetimeScrapBucks: s.lifetimeScrapBucks + total,
        }));
        if (count > 0) _appendLog(set, get, "sell", `Sold all ${count} parts for $${total}`, { scrapDelta: total });
      });
    },

    sellAllScrap: () => {
      import("@/data/parts").then(({ getPartById, CONDITION_MULTIPLIERS }) => {
        const state = get() as GameState;
        const gb = getGearBonuses(state.equippedGear, undefined, undefined, undefined, undefined, state.equippedStationEquipment, state.stationEquipmentInventory);
        let total = 0;
        const toSell: string[] = [];
        for (const part of state.inventory) {
          if (part.type !== "part") continue;
          const def = getPartById(part.definitionId);
          if (!def || def.category !== "misc") continue;
          const mult = CONDITION_MULTIPLIERS[part.condition];
          total += Math.floor(def.scrapValue * mult * (1 + gb.sell_value_bonus_pct));
          toSell.push(part.id);
        }
        if (toSell.length === 0) return;
        set((s: GameState) => ({
          inventory: s.inventory.filter((p) => !toSell.includes(p.id)),
          scrapBucks: s.scrapBucks + total,
          lifetimeScrapBucks: s.lifetimeScrapBucks + total,
        }));
        _appendLog(set, get, "sell", `Sold ${toSell.length} scrap parts for $${total}`, { scrapDelta: total });
      });
    },

    sellBelowQuality: (threshold: PartCondition) => {
      import("@/data/parts").then(({ getPartById, CONDITION_MULTIPLIERS }) => {
        import("@/data/addons").then(({ getAddonById }) => {
          const state = get() as GameState;
          const gb = getGearBonuses(state.equippedGear, undefined, undefined, undefined, undefined, state.equippedStationEquipment, state.stationEquipmentInventory);
          const thresholdIdx = CONDITIONS.indexOf(threshold);
          let total = 0;
          const toSell: string[] = [];
          for (const part of state.inventory) {
            if (CONDITIONS.indexOf(part.condition) >= thresholdIdx) continue;
            let scrapValue = 0;
            if (part.type === "part") {
              const def = getPartById(part.definitionId);
              if (!def) continue;
              scrapValue = def.scrapValue;
            } else {
              const def = getAddonById(part.definitionId);
              if (!def) continue;
              scrapValue = def.scrapValue;
            }
            const mult = CONDITION_MULTIPLIERS[part.condition];
            total += Math.floor(scrapValue * mult * (1 + gb.sell_value_bonus_pct));
            toSell.push(part.id);
          }
          if (toSell.length === 0) return;
          set((s: GameState) => ({
            inventory: s.inventory.filter((p) => !toSell.includes(p.id)),
            scrapBucks: s.scrapBucks + total,
            lifetimeScrapBucks: s.lifetimeScrapBucks + total,
          }));
          _appendLog(set, get, "sell", `Sold ${toSell.length} parts below ${threshold} for $${total}`, { scrapDelta: total });
        });
      });
    },

    setPendingVehicle: (vehicleId: string) => {
      set({ pendingBuildVehicleId: vehicleId, pendingBuildParts: {} });
    },

    setPendingPart: (slot: string, part: ScavengedPart | null) => {
      set((s: GameState) => ({
        pendingBuildParts: { ...s.pendingBuildParts, [slot]: part },
      }));
    },

    buildSelectedVehicle: () => {
      const state = get() as GameState;
      const { pendingBuildVehicleId, pendingBuildParts, _vehicleIdCounter } = state;
      if (!pendingBuildVehicleId) return;

      const vehicleDef = getVehicleById(pendingBuildVehicleId);
      if (!vehicleDef) return;

      // Validate all required slots are filled
      for (const slotCfg of vehicleDef.slots) {
        if (slotCfg.required && !pendingBuildParts[slotCfg.slot]) return;
      }

      const gb = getGearBonuses(state.equippedGear, state.equippedLootGear, state.lootGearInventory, state.unlockedTalentNodes, TALENT_NODES, state.equippedStationEquipment, state.stationEquipmentInventory);
      const buildReduction = _getUpgradeEffectValue(state, "bargain_builder") + gb.build_cost_reduction_pct;
      const actualBuildCost = Math.max(0, Math.floor(vehicleDef.buildCost * (1 - buildReduction)));
      if (state.scrapBucks < actualBuildCost) return;

      // Build InstalledPart records and collect used part IDs
      const usedPartIds = new Set<string>();
      const builtParts: Record<string, InstalledPart> = {};
      for (const slotCfg of vehicleDef.slots) {
        const part = pendingBuildParts[slotCfg.slot];
        if (part) {
          usedPartIds.add(part.id);
          builtParts[slotCfg.slot] = { part, addons: [] };
        }
      }

      const built = buildVehicle(vehicleDef, builtParts, _vehicleIdCounter);

      set((s: GameState) => {
        const remainingInventory = s.inventory.filter((p) => !usedPartIds.has(p.id));
        const newPendingParts: Record<string, ScavengedPart | null> = {};
        for (const slotCfg of vehicleDef.slots) {
          const usedPart = pendingBuildParts[slotCfg.slot];
          if (usedPart) {
            const replacement = remainingInventory.find(
              (p) => p.definitionId === usedPart.definitionId && p.condition === usedPart.condition,
            );
            if (replacement) {
              newPendingParts[slotCfg.slot] = replacement;
            }
          }
        }
        const mb = getPrestigeMilestoneBonuses(s.prestigeCount);
        const newUniqueTypes = s.uniqueVehicleTypesBuilt.includes(vehicleDef.id)
          ? s.uniqueVehicleTypesBuilt
          : [...s.uniqueVehicleTypesBuilt, vehicleDef.id];
        return {
          garage: [...s.garage, built],
          inventory: remainingInventory,
          scrapBucks: s.scrapBucks - actualBuildCost,
          _vehicleIdCounter: s._vehicleIdCounter + 1,
          pendingBuildParts: newPendingParts,
          // Auto-activate via prestige milestone system
          activeVehicleId: (s.activeVehicleId === null && mb.autoActivateVehicle) ? built.id : s.activeVehicleId,
          racerSkills: _grantXp(s.racerSkills, "mechanics", 20),
          // Lifetime stats for achievements
          lifetimeVehiclesBuiltAllTime: s.lifetimeVehiclesBuiltAllTime + 1,
          highestVehicleTierBuilt: Math.max(s.highestVehicleTierBuilt, vehicleDef.tier),
          uniqueVehicleTypesBuilt: newUniqueTypes,
        };
      });
      _appendLog(set, get, "build", `Built ${vehicleDef.name} for $${actualBuildCost}`, { scrapDelta: -actualBuildCost });
      // Log auto-activation when it triggers via milestone
      const postBuild = get() as GameState;
      if (postBuild.activeVehicleId === built.id && getPrestigeMilestoneBonuses(postBuild.prestigeCount).autoActivateVehicle) {
        _appendLog(set, get, "build", `Auto-activated ${vehicleDef.name} (prestige perk)`);
      }
      // Check achievements after building
      postBuild.checkAchievements();
    },

    setActiveVehicle: (vehicleId: string) => {
      set({ activeVehicleId: vehicleId });
    },

    sellVehicle: (vehicleId: string) => {
      const state = get() as GameState;
      const vehicle = state.garage.find((v) => v.id === vehicleId);
      if (!vehicle) return;
      const vehicleDef = getVehicleById(vehicle.definitionId);
      const value = vehicleDef?.sellValue ?? 10;
      set((s: GameState) => ({
        garage: s.garage.filter((v) => v.id !== vehicleId),
        scrapBucks: s.scrapBucks + value,
        lifetimeScrapBucks: s.lifetimeScrapBucks + value,
        activeVehicleId: s.activeVehicleId === vehicleId ? null : s.activeVehicleId,
        vehicleLoadouts: s.vehicleLoadouts.filter((loadout) => loadout.vehicleId !== vehicleId),
      }));
      _appendLog(set, get, "sell", `Sold ${vehicleDef?.name ?? "vehicle"} for $${value}`, { scrapDelta: value });
    },

    saveVehicleLoadout: (vehicleId: string, name: string) => {
      const state = get() as GameState;
      const vehicle = state.garage.find((candidate) => candidate.id === vehicleId);
      const cleanName = name.trim().slice(0, 40);
      if (!vehicle || !cleanName) return;
      const loadout: VehicleLoadout = {
        id: `loadout_${Date.now()}_${state.vehicleLoadouts.length}`,
        name: cleanName,
        vehicleId,
        vehicleDefinitionId: vehicle.definitionId,
        createdAt: Date.now(),
        parts: Object.fromEntries(Object.entries(vehicle.parts).map(([slot, installed]) => [slot, {
          partId: installed.part.id,
          addonIds: installed.addons.map((addon) => addon.id),
        }])),
      };
      set((current: GameState) => ({ vehicleLoadouts: [...current.vehicleLoadouts, loadout] }));
      _appendLog(set, get, "build", `Saved vehicle loadout ${cleanName}`);
    },

    applyVehicleLoadout: (loadoutId: string) => {
      const state = get() as GameState;
      const loadout = state.vehicleLoadouts.find((candidate) => candidate.id === loadoutId);
      const vehicle = loadout ? state.garage.find((candidate) => candidate.id === loadout.vehicleId) : undefined;
      if (!loadout || !vehicle || vehicle.definitionId !== loadout.vehicleDefinitionId) return;

      const available = [
        ...state.inventory,
        ...Object.values(vehicle.parts).flatMap((installed) => [installed.part, ...installed.addons]),
      ];
      const byId = new Map(available.map((part) => [part.id, part]));
      const usedIds = new Set<string>();
      const parts: Record<string, InstalledPart> = {};
      for (const [slot, saved] of Object.entries(loadout.parts)) {
        const part = byId.get(saved.partId);
        const addons = saved.addonIds.map((id) => byId.get(id));
        if (!part || addons.some((addon) => !addon)) return;
        usedIds.add(part.id);
        addons.forEach((addon) => usedIds.add(addon!.id));
        parts[slot] = { part, addons: addons as ScavengedPart[] };
      }

      const gear = getGearBonuses(state.equippedGear, state.equippedLootGear, state.lootGearInventory, state.unlockedTalentNodes, TALENT_NODES, state.equippedStationEquipment, state.stationEquipmentInventory);
      const handlingBonus = _getUpgradeEffectValue(state, "tuned_suspension") + gear.race_handling_pct;
      const definition = getVehicleById(vehicle.definitionId);
      if (!definition) return;
      const updated = { ...vehicle, parts, stats: calculateStats(definition, parts, vehicle.condition, handlingBonus) };
      set((current: GameState) => ({
        inventory: available.filter((part) => !usedIds.has(part.id)),
        garage: current.garage.map((candidate) => candidate.id === vehicle.id ? updated : candidate),
      }));
      _appendLog(set, get, "build", `Applied vehicle loadout ${loadout.name}`);
    },

    deleteVehicleLoadout: (loadoutId: string) => {
      set((state: GameState) => ({ vehicleLoadouts: state.vehicleLoadouts.filter((loadout) => loadout.id !== loadoutId) }));
    },

    setSelectedLocation: (locationId: string) => {
      set({ selectedLocationId: locationId });
    },

    setSelectedCircuit: (circuitId: string) => {
      set({ selectedCircuitId: circuitId });
    },

    setSelectedSellBelowQuality: (threshold: PartCondition) => {
      set({ selectedSellBelowQuality: threshold });
    },

    enterRace: () => {
      const state = get() as GameState;
      if (state.isRacing) return;
      if (!state.activeVehicleId) return;

      const vehicle = state.garage.find((v) => v.id === state.activeVehicleId);
      const circuit = getCircuitById(state.selectedCircuitId);
      if (!vehicle || !circuit) return;
      if (state.scrapBucks < circuit.entryFee) return;
      if ((vehicle.condition ?? 100) <= 0) return;

      // Pre-compute the outcome immediately so the UI can animate it
      const gb = getGearBonuses(state.equippedGear, state.equippedLootGear, state.lootGearInventory, state.unlockedTalentNodes, TALENT_NODES, state.equippedStationEquipment, state.stationEquipmentInventory);
      // Scavenger's Eye upgrade increases salvage drop chance and max condition
      const scavengerEyeLevel = _getUpgradeLevel(state, "scavengers_eye");
      const salvageDropChance = scavengerEyeLevel >= 1 ? 0.30 : 0.15;
      const salvageMaxCondition = scavengerEyeLevel >= 1 ? 2 : 1;
      const momentumWinBonus = getMomentumEffectValue(state.activeMomentumTiers, "race_win_bonus");
      const sb = getSkillBonuses(state.racerSkills, circuit.tier);
      // Force DNF on the very first race of a new save so the tutorial
      // reliably reaches the repair step. Tutorial step 10 is "Hit Enter Race!"
      // right before the one-and-only race we want to break down.
      const isFirstEverRace = state.lifetimeRacesAllTime === 0 && state.tutorialStep === 10;
      const outcome = simulateRace(
        vehicle, circuit,
        state.prestigeBonus.scrapMultiplier,
        state.fatigue,
        gb.race_performance_pct + getGameEffectValue(TEAM_UPGRADE_DEFINITIONS, state.teamUpgradeLevels, "base_race_performance"),
        gb.race_dnf_reduction,
        salvageDropChance,
        salvageMaxCondition,
        momentumWinBonus,
        gb.forge_token_chance_bonus + getGameEffectValue(TEAM_UPGRADE_DEFINITIONS, state.teamUpgradeLevels, "forge_token_rate"),
        sb.drivingPerformanceMult,
        sb.drivingDnfReduction,
        isFirstEverRace,
        state.currentRacePlan,
      );
      const events = generateRaceEvents(outcome, circuit, circuit.raceDuration);
      const racingVehicleId = vehicle.id; // capture for timeout callback

      set({
        isRacing: true,
        scrapBucks: state.scrapBucks - circuit.entryFee,
        raceEvents: events,
        raceStartTime: Date.now(),
        precomputedOutcome: outcome,
      });

      setTimeout(() => {
        set((s: GameState) => {
          // Apply prestige + momentum rep multiplier
          const mRepMult = getMomentumEffectValue(s.activeMomentumTiers, "rep_multiplier");
          const effectiveRepEarned = outcome.repEarned * s.prestigeBonus.repMultiplier * (1 + mRepMult);
          const newRep = s.repPoints + effectiveRepEarned;
          const newUnlockedCircuits = [...s.unlockedCircuitIds];
          const newUnlockedLocations = [...s.unlockedLocationIds];
          const newUnlockedVehicles = [...s.unlockedVehicleIds];
          const newUnlockEvents = [...s.unlockEvents];

          // Unlock circuits by rep
          if (newRep >= 25000 && !newUnlockedCircuits.includes("dirt_track")) { newUnlockedCircuits.push("dirt_track"); newUnlockEvents.push("Dirt Track Unlocked! Real gravel, real glory."); }
          if (newRep >= 200000 && !newUnlockedCircuits.includes("regional_circuit")) { newUnlockedCircuits.push("regional_circuit"); newUnlockEvents.push("Regional Circuit Unlocked! Somebody brought a trailer."); }
          if (newRep >= 800000 && !newUnlockedCircuits.includes("national_circuit")) { newUnlockedCircuits.push("national_circuit"); newUnlockEvents.push("National Circuit Unlocked! Corporate sponsors. Cameras."); }
          if (newRep >= 2500000 && !newUnlockedCircuits.includes("world_championship")) { newUnlockedCircuits.push("world_championship"); newUnlockEvents.push("World Championship Unlocked! The big leagues."); }

          // Unlock locations by rep
          if (newRep >= 40000 && !newUnlockedLocations.includes("neighborhood_yards")) { newUnlockedLocations.push("neighborhood_yards"); newUnlockEvents.push("New Location: Neighborhood Yards!"); }
          if (newRep >= 175000 && !newUnlockedLocations.includes("local_junkyard")) { newUnlockedLocations.push("local_junkyard"); newUnlockEvents.push("New Location: Local Junkyard — better parts await!"); }
          if (newRep >= 600000 && !newUnlockedLocations.includes("salvage_auction")) { newUnlockedLocations.push("salvage_auction"); newUnlockEvents.push("New Location: Salvage Auction!"); }
          if (newRep >= 2000000 && !newUnlockedLocations.includes("industrial_surplus")) { newUnlockedLocations.push("industrial_surplus"); newUnlockEvents.push("New Location: Industrial Surplus!"); }
          if (newRep >= 5000000 && !newUnlockedLocations.includes("military_scrapyard")) { newUnlockedLocations.push("military_scrapyard"); newUnlockEvents.push("New Location: Military Scrapyard!"); }

          // Unlock vehicles by rep
          if (newRep >= 40000 && !newUnlockedVehicles.includes("beater_car")) { newUnlockedVehicles.push("beater_car"); newUnlockEvents.push("Beater Car Blueprint Unlocked!"); }
          if (newRep >= 175000 && !newUnlockedVehicles.includes("street_racer")) { newUnlockedVehicles.push("street_racer"); newUnlockEvents.push("Street Racer Blueprint Unlocked!"); }
          if (newRep >= 500000 && !newUnlockedVehicles.includes("stock_car")) { newUnlockedVehicles.push("stock_car"); newUnlockEvents.push("Stock Car Blueprint Unlocked!"); }

          // Win streak
          const newStreak = outcome.result === "win" ? s.winStreak + 1 : 0;
          const newBestStreak = Math.max(s.bestWinStreak, newStreak);
          if (newStreak === 3) newUnlockEvents.push("3-Win Streak! You're on fire!");
          if (newStreak === 5) newUnlockEvents.push("5 WINS! Unstoppable!");
          if (newStreak === 10) newUnlockEvents.push("10 WINS! LEGENDARY!");

          // Unlock vehicles by race achievement
          if (outcome.result === "win" && s.selectedCircuitId === "backyard_derby" && !newUnlockedVehicles.includes("riding_mower")) {
            newUnlockedVehicles.push("riding_mower");
            newUnlockEvents.push("Riding Mower Blueprint Unlocked! Sit-down racing starts here.");
          }
          if (newStreak >= 5 && s.selectedCircuitId === "backyard_derby" && !newUnlockedVehicles.includes("go_kart")) {
            newUnlockedVehicles.push("go_kart");
            newUnlockEvents.push("Go-Kart Blueprint Unlocked! 5-win mastery of the backyard.");
          }
          if (outcome.result === "win" && s.selectedCircuitId === "regional_circuit" && !newUnlockedVehicles.includes("rally_car")) {
            newUnlockedVehicles.push("rally_car");
            newUnlockEvents.push("Rally Car Blueprint Unlocked! You proved you belong on a real track.");
          }
          if (outcome.result === "win" && s.selectedCircuitId === "national_circuit" && !newUnlockedVehicles.includes("prototype_racer")) {
            newUnlockedVehicles.push("prototype_racer");
            newUnlockEvents.push("Prototype Racer Blueprint Unlocked! The engineers are watching.");
          }
          if (outcome.result === "win" && s.selectedCircuitId === "world_championship" && !newUnlockedVehicles.includes("supercar")) {
            newUnlockedVehicles.push("supercar");
            newUnlockEvents.push("Supercar Blueprint Unlocked! The rags-to-races dream is real.");
          }

          // (Auto-scavenge unlocks at 100 manual clicks; auto-race unlocks after first prestige)

          // Apply vehicle wear to the vehicle that started the race
          const wearReduction = _getUpgradeEffectValue(s, "reinforced_chassis");
          const racingV = s.garage.find((v) => v.id === racingVehicleId);
          const wearAmount = racingV ? calculateWear(racingV, outcome.result, wearReduction, s.fatigue, gb.race_wear_reduction_pct, sb.enduranceWearReduction, outcome.planEvaluation?.wearMultiplier ?? 1) : 0;
          const handlingBonus = _getUpgradeEffectValue(s, "tuned_suspension") + gb.race_handling_pct;
          const updatedGarage = s.garage.map((v) => {
            if (v.id !== racingVehicleId) return v;
            const newCond = Math.max(0, (v.condition ?? 100) - wearAmount);
            const vDef = getVehicleById(v.definitionId);
            return {
              ...v,
              condition: newCond,
              totalRaces: (v.totalRaces ?? 0) + 1,
              stats: vDef ? calculateStats(vDef, v.parts, newCond, handlingBonus) : v.stats,
            };
          });

          // Apply consolation sponsor bonus
          const consolationBonus = _getUpgradeEffectValue(s, "consolation_sponsor");
          let finalScraps = outcome.result !== "win" && consolationBonus > 0
            ? Math.floor(outcome.scrapsEarned * (1 + consolationBonus))
            : outcome.scrapsEarned;
          // Gear race scrap bonus
          if (gb.race_scrap_bonus_pct > 0) {
            finalScraps = Math.floor(finalScraps * (1 + gb.race_scrap_bonus_pct));
          }
          // Momentum scrap multiplier
          const mScrapMult = getMomentumEffectValue(s.activeMomentumTiers, "scrap_multiplier");
          if (mScrapMult > 0) finalScraps = Math.floor(finalScraps * (1 + mScrapMult));

          const newLifetimeRaces = s.lifetimeRaces + 1;
          const fatigueOffset = getLegacyEffectValue(s.legacyUpgradeLevels, "leg_fatigue_offset") + sb.enduranceFatigueOffset;
          const rawFatigue = calculateFatigue(newLifetimeRaces, fatigueOffset);
          const ownerFatigueReduction = getGameEffectValue(OWNER_UPGRADE_DEFINITIONS, s.ownerUpgradeLevels, "fatigue_rate_reduction");
          const fatigueCap = Math.max(0, 99 - getGameEffectValue(TEAM_UPGRADE_DEFINITIONS, s.teamUpgradeLevels, "fatigue_cap_reduction"));
          const newFatigue = Math.min(fatigueCap, Math.floor(rawFatigue * (1 - gb.fatigue_rate_reduction - ownerFatigueReduction)));

          // Gear drop roll from manual race
          const raceVehicle = s.garage.find((v) => v.id === racingVehicleId);
          const vehiclePerf = raceVehicle?.stats
            ? raceVehicle.stats.speed / (circuit.difficulty || 1)
            : 1;
          const { gearDrops: raceGearDrops, modDrop: raceModDrop } = rollGearDrops({
            source: "race",
            sourceTier: circuit.tier,
            sourceId: circuit.id,
            raceResult: outcome.result,
            winStreak: newStreak,
            vehiclePerformance: vehiclePerf,
            gearDropRateScavengeBonus: _getUpgradeEffectValue(s, "gear_scavenger") + getGameEffectValue(TEAM_UPGRADE_DEFINITIONS, s.teamUpgradeLevels, "gear_drop_rate"),
            gearDropRateRaceBonus: _getUpgradeEffectValue(s, "trophy_hunter") + getGameEffectValue(TEAM_UPGRADE_DEFINITIONS, s.teamUpgradeLevels, "gear_drop_rate"),
            rarityBonus: Math.floor(_getUpgradeEffectValue(s, "rarity_sense")),
            doubleDropChance: _getUpgradeEffectValue(s, "double_drop"),
            modDropRateBonus: _getUpgradeEffectValue(s, "mod_hunter"),
          });
          let newStationEquipmentInventory = raceGearDrops.length > 0
            ? [...s.stationEquipmentInventory, ...raceGearDrops.map(convertLegacyLootDrop)]
            : s.stationEquipmentInventory;
          const newReforgeShards = s.reforgeShards + (raceModDrop ? 1 : 0);
          if (raceGearDrops.length > 0) newUnlockEvents.push(`Station Equipment: ${raceGearDrops.map((g) => g.name).join(", ")}!`);
          if (raceModDrop) newUnlockEvents.push("Reforge Shard found!");

          // Salvage drop and forge token from race
          let newInventory = outcome.salvageDrop
            ? [...s.inventory, outcome.salvageDrop]
            : s.inventory;
          let newDefeatedRivalIds = s.defeatedRivalIds;
          let newDiscoveredBlueprintIds = s.discoveredBlueprintIds;
          const rival = outcome.rivalId ? getRivalById(outcome.rivalId) : undefined;
          if (outcome.result === "win" && rival && !s.defeatedRivalIds.includes(rival.id)) {
            newDefeatedRivalIds = [...s.defeatedRivalIds, rival.id];
            newUnlockEvents.push(`Rival defeated: ${rival.name}! Reward: ${rival.reward.label}`);
            if (rival.reward.type === "blueprint") newDiscoveredBlueprintIds = [...s.discoveredBlueprintIds, rival.reward.id];
            if (rival.reward.type === "addon") newInventory = [...newInventory, { id: makePartId(), definitionId: rival.reward.id, condition: "pristine", foundAt: `rival_${rival.id}`, type: "addon" }];
            if (rival.reward.type === "station_set") {
              const setSlots = rival.reward.id === "redline" ? ["diagnostics", "lift", "logistics", "pit_equipment"] as const : ["diagnostics", "lift", "logistics", "pit_equipment"] as const;
              const stationItem = forgeStationEquipment(setSlots[s.defeatedRivalIds.length % setSlots.length], "rare");
              newStationEquipmentInventory = [...newStationEquipmentInventory, { ...stationItem, setId: rival.reward.id as "redline" | "slipstream", source: rival.name }];
            }
          }
          const newForgeTokens = s.forgeTokens + (outcome.forgeTokenDrop ? 1 : 0);
          const newRaceSalvage = s.lifetimeTotalRaceSalvage + (outcome.salvageDrop ? 1 : 0);

          // Challenge tracking for win streaks, fatigue, lifetimeRaces
          const newChallengeProgress = {
            ...s.challengeProgress,
            winStreak: newStreak,
            fatigue: newFatigue,
            lifetimeRaces: newLifetimeRaces,
            totalRaceSalvage: newRaceSalvage,
          };
          const { completed: newCompleted, rewards } = checkChallenges(s, newChallengeProgress, s.completedChallenges);
          const challengeScrap = rewards.reduce((acc, r) => acc + (r.type === "scrap" ? r.amount : 0), 0);
          const challengeMatRewards = rewards.filter((r) => r.type === "material") as Extract<ChallengeRewardType, { type: "material" }>[];
          const challengeTokenRewards = rewards.filter((r) => r.type === "forgeToken") as Extract<ChallengeRewardType, { type: "forgeToken" }>[];
          const newMaterials = { ...s.materials };
          for (const mr of challengeMatRewards) newMaterials[mr.material] = (newMaterials[mr.material] ?? 0) + mr.amount;

          // Dealer board auto-refresh
          const newTick = s.gameTick + 1;
          const newDealerBoard = (s.repPoints >= DEALER_UNLOCK_REP && shouldRefreshDealer(s.dealerBoard, newTick))
            ? generateDealerBoard(newRep, newTick)
            : s.dealerBoard;

          // Grant Driving XP (10 base + 5 bonus on win)
          let updatedSkills = _grantXp(s.racerSkills, "driving", outcome.result === "win" ? 15 : 10);
          // Grant Endurance XP when racing at high fatigue
          if (newFatigue >= 60) updatedSkills = _grantXp(updatedSkills, "endurance", 10);
          else if (newFatigue >= 40) updatedSkills = _grantXp(updatedSkills, "endurance", 5);

          return {
            isRacing: false,
            lastRaceOutcome: outcome,
            raceHistory: [outcome, ...s.raceHistory].slice(0, 20),
            scrapBucks: s.scrapBucks + finalScraps + challengeScrap,
            lifetimeScrapBucks: s.lifetimeScrapBucks + finalScraps + challengeScrap,
            repPoints: newRep,
            unlockedCircuitIds: newUnlockedCircuits,
            unlockedLocationIds: newUnlockedLocations,
            unlockedVehicleIds: newUnlockedVehicles,
            autoRaceUnlocked: s.autoRaceUnlocked || newRep >= 50000,
            autoScavengeUnlocked: s.autoScavengeUnlocked || newRep >= 25000,
            raceEvents: [],
            raceStartTime: null,
            precomputedOutcome: null,
            winStreak: newStreak,
            bestWinStreak: newBestStreak,
            unlockEvents: newUnlockEvents,
            garage: updatedGarage,
            lifetimeRaces: newLifetimeRaces,
            fatigue: newFatigue,
            racerSkills: updatedSkills,
            stationEquipmentInventory: newStationEquipmentInventory,
            reforgeShards: newReforgeShards,
            inventory: newInventory,
            defeatedRivalIds: newDefeatedRivalIds,
            discoveredBlueprintIds: newDiscoveredBlueprintIds,
            forgeTokens: newForgeTokens + challengeTokenRewards.reduce((t, r) => t + r.amount, 0),
            lifetimeTotalRaceSalvage: newRaceSalvage,
            challengeProgress: newChallengeProgress,
            completedChallenges: [...s.completedChallenges, ...newCompleted],
            materials: newMaterials,
            gameTick: newTick,
            dealerBoard: newDealerBoard,
            // Lifetime stats for achievements (never reset)
            lifetimeRacesAllTime: s.lifetimeRacesAllTime + 1,
            lifetimeWinsAllTime: s.lifetimeWinsAllTime + (outcome.result === "win" ? 1 : 0),
            lifetimeScrapBucksAllTime: s.lifetimeScrapBucksAllTime + finalScraps + challengeScrap,
            bestWinStreakAllTime: Math.max(s.bestWinStreakAllTime, newBestStreak),
            totalForgeTokensEarned: s.totalForgeTokensEarned + (newForgeTokens - s.forgeTokens),
          };
        });
        // Check achievements after race
        (get() as GameState).checkAchievements();
        // Check momentum tiers after race
        (get() as GameState).checkMomentumTiers();
        const resultLabel = outcome.result === "win" ? "Won" : outcome.result === "loss" ? "Lost" : "DNF";
        const rewardMsg = outcome.result === "dnf" ? "" : ` +$${outcome.scrapsEarned}${outcome.repEarned > 0 ? `, +${Math.round(outcome.repEarned)} rep` : ""}`;
        _appendLog(set, get, "race", `Race: ${resultLabel} at ${circuit.name}!${rewardMsg}`, { scrapDelta: outcome.scrapsEarned, repDelta: Math.round(outcome.repEarned) });
      }, circuit.raceDuration);
    },

    setRacePlan: (plan: RacePlan) => set({ currentRacePlan: { ...plan } }),
    applyRacePlanPreset: (preset: keyof typeof RACE_PLAN_PRESETS) => set({ currentRacePlan: { ...RACE_PLAN_PRESETS[preset] } }),

    startFleetAssignment: (vehicleId: string, circuitId: string, crewId?: string) => {
      const state = get() as GameState;
      const vehicle = state.garage.find((candidate) => candidate.id === vehicleId);
      const circuit = getCircuitById(circuitId);
      const completedCircuit = state.raceHistory.some((outcome) => outcome.circuitId === circuitId && outcome.result === "win");
      const baseSlots = 1 + Math.floor(getGameEffectValue(TEAM_UPGRADE_DEFINITIONS, state.teamUpgradeLevels, "active_vehicle_slot"));
      if (!vehicle || !circuit || vehicleId === state.activeVehicleId || !completedCircuit || state.fleetAssignments.filter((assignment) => assignment.status === "running").length >= baseSlots) return;
      if (state.fleetAssignments.some((assignment) => assignment.status === "running" && assignment.vehicleId === vehicleId)) return;
      const assignment: FleetAssignment = { id: `fleet_${Date.now()}_${state.fleetAssignments.length}`, vehicleId, crewId: crewId ?? null, circuitId, plan: { ...state.currentRacePlan }, status: "running", remainingTicks: Math.max(3, circuit.tier + 3), accumulatedWear: 0, rewards: { scrap: 0, materials: 0 } };
      set((current: GameState) => ({ fleetAssignments: [...current.fleetAssignments, assignment] }));
    },

    advanceFleetAssignments: (ticks = 1) => {
      const state = get() as GameState;
      if (!state.fleetAssignments.some((assignment) => assignment.status === "running") && !state.hostedEvents.some((event) => event.status === "running")) return;
      set((current: GameState) => ({ fleetAssignments: current.fleetAssignments.map((assignment) => {
        if (assignment.status !== "running") return assignment;
        const remainingTicks = Math.max(0, assignment.remainingTicks - Math.max(1, ticks));
        if (remainingTicks > 0) return { ...assignment, remainingTicks };
        const circuit = getCircuitById(assignment.circuitId);
        return { ...assignment, remainingTicks: 0, status: "complete", accumulatedWear: assignment.accumulatedWear + 5, rewards: { scrap: Math.floor((circuit?.rewardBase ?? 0) * 0.6), materials: Math.max(1, Math.floor((circuit?.tier ?? 0) * 0.6)) } };
      }), hostedEvents: current.hostedEvents.map((event) => event.status !== "running" ? event : event.remainingTicks > ticks ? { ...event, remainingTicks: event.remainingTicks - ticks } : { ...event, remainingTicks: 0, status: "complete" }) }));
    },

    collectFleetAssignment: (assignmentId: string) => {
      const state = get() as GameState;
      const assignment = state.fleetAssignments.find((candidate) => candidate.id === assignmentId && candidate.status === "complete");
      if (!assignment) return;
      const materialKeys = Object.keys(state.materials) as MaterialType[];
      const material = materialKeys[(getCircuitById(assignment.circuitId)?.tier ?? 0) % materialKeys.length];
      set((current: GameState) => ({
        scrapBucks: current.scrapBucks + assignment.rewards.scrap,
        lifetimeScrapBucks: current.lifetimeScrapBucks + assignment.rewards.scrap,
        materials: { ...current.materials, [material]: current.materials[material] + assignment.rewards.materials },
        garage: current.garage.map((vehicle) => vehicle.id === assignment.vehicleId ? { ...vehicle, condition: Math.max(0, vehicle.condition - assignment.accumulatedWear), totalRaces: vehicle.totalRaces + 1 } : vehicle),
        crewRoster: current.crewRoster.map((crew) => crew.id === assignment.crewId ? grantCrewXp(crew, 5, 1 + getGameEffectValue(TEAM_UPGRADE_DEFINITIONS, current.teamUpgradeLevels, "crew_xp_multiplier")) : crew),
        fleetAssignments: current.fleetAssignments.filter((candidate) => candidate.id !== assignmentId),
      }));
    },

    updateOwnedTrackConfig: (config: OwnedTrackConfig) => set({ ownedTrackConfig: { ...config } }),

    hostTrackEvent: () => {
      const state = get() as GameState;
      const maxEvents = 1 + (state.trackPerkLevels.track_multi ?? 0);
      if (state.trackEraCount < 1 || state.hostedEvents.filter((event) => event.status === "running").length >= maxEvents) return;
      const config = state.ownedTrackConfig;
      const lengthMult = config.length === "long" ? 2 : config.length === "medium" ? 1.4 : 1;
      const sponsorMult = 1 + (state.trackPerkLevels.track_sponsors ?? 0) * 0.2;
      const reward = Math.floor(10000 * config.riskReward * lengthMult * (config.endurance ? 2 : 1) * (config.timeRule === "night" ? 1.25 : 1) * sponsorMult);
      const sponsors = ["Rustbelt Tools", "Midnight Fuel", "Backlot Salvage", "Apex Fabrication"];
      const event: HostedEvent = { id: `event_${Date.now()}_${state.hostedEvents.length}`, name: `${config.timeRule === "night" ? "Midnight " : ""}${config.endurance ? "Endurance " : ""}Invitational`, config: { ...config }, sponsor: sponsors[state.hostedEvents.length % sponsors.length], remainingTicks: config.endurance ? 10 : 5, status: "running", reward };
      set((current: GameState) => ({ hostedEvents: [...current.hostedEvents, event] }));
    },

    collectHostedEvent: (eventId: string) => {
      const state = get() as GameState;
      const event = state.hostedEvents.find((candidate) => candidate.id === eventId && candidate.status === "complete");
      if (!event) return;
      const cascade = state.trackPerkLevels.track_cascade ?? 0;
      set((current: GameState) => ({ scrapBucks: current.scrapBucks + event.reward, lifetimeScrapBucks: current.lifetimeScrapBucks + event.reward, legacyPoints: current.legacyPoints + cascade, teamPoints: current.teamPoints + cascade, ownerPoints: current.ownerPoints + cascade, hostedEvents: current.hostedEvents.filter((candidate) => candidate.id !== eventId) }));
    },

    clearUnlockEvents: () => {
      set({ unlockEvents: [] });
    },

    clearActivityLog: () => {
      set({ activityLog: [] });
    },

    advanceTutorial: () => {
      const step = (get() as GameState).tutorialStep;
      // Each new step starts fully visible — minimized state is per-step, not persistent
      set({ tutorialStep: step >= 21 ? -1 : step + 1, tutorialLastAdvanceTime: Date.now(), tutorialMinimized: false });
    },

    skipTutorial: () => {
      set({ tutorialStep: -1, tutorialDismissed: false, tutorialMinimized: false });
    },

    toggleTutorialMinimized: () => {
      set({ tutorialMinimized: !(get() as GameState).tutorialMinimized });
    },

    dismissTutorial: () => {
      const step = (get() as GameState).tutorialStep;
      // If on intro, advance to step 1 so highlights activate
      if (step === 0) {
        set({ tutorialStep: 1, tutorialDismissed: true });
      } else {
        set({ tutorialDismissed: true });
      }
    },

    repairVehicle: (vehicleId: string) => {
      const state = get() as GameState;
      const vehicle = state.garage.find((v) => v.id === vehicleId);
      if (!vehicle || (vehicle.condition ?? 100) >= 100) return;
      const vehicleDef = getVehicleById(vehicle.definitionId);
      if (!vehicleDef) return;
      const gb = getGearBonuses(state.equippedGear, state.equippedLootGear, state.lootGearInventory, state.unlockedTalentNodes, TALENT_NODES, state.equippedStationEquipment, state.stationEquipmentInventory);
      const reduction = _getUpgradeEffectValue(state, "budget_repairs") + gb.repair_cost_reduction_pct;
      const cost = calculateRepairCost(vehicleDef, vehicle.condition ?? 100, 100, reduction, state.fatigue);
      // Free repair during tutorial repair step
      const isTutorialRepair = state.tutorialStep === 13;
      const actualCost = isTutorialRepair ? 0 : cost;
      if (state.scrapBucks < actualCost) return;
      const handlingBonus = _getUpgradeEffectValue(state, "tuned_suspension") + gb.race_handling_pct;
      set((s: GameState) => ({
        scrapBucks: s.scrapBucks - actualCost,
        garage: s.garage.map((v) => v.id !== vehicleId ? v : {
          ...v,
          condition: 100,
          stats: calculateStats(vehicleDef, v.parts, 100, handlingBonus),
        }),
        racerSkills: _grantXp(s.racerSkills, "mechanics", 5),
      }));
      _appendLog(set, get, "build", `Repaired ${vehicleDef.name} for $${actualCost}`, { scrapDelta: -actualCost });
    },

    swapPart: (vehicleId: string, slot: string, newPart: ScavengedPart) => {
      const state = get() as GameState;
      if (_getUpgradeLevel(state, "toolkit") < 1) return;
      const vehicle = state.garage.find((v) => v.id === vehicleId);
      if (!vehicle) return;

      const installed = vehicle.parts[slot];
      if (!installed) return;
      const oldPart = installed.part;
      const noDegrade = _getUpgradeLevel(state, "gentle_swap") >= 1;
      const returnedPart: ScavengedPart = noDegrade ? oldPart : {
        ...oldPart,
        condition: degradeCondition(oldPart.condition as PartCondition),
      };

      const vehicleDef = getVehicleById(vehicle.definitionId);
      if (!vehicleDef) return;
      const slotCfg = vehicleDef.slots.find((s) => s.slot === slot);
      if (!slotCfg || !slotCfg.acceptableParts.includes(newPart.definitionId)) return;

      const capacity = CONDITION_ADDON_SLOTS[newPart.condition] ?? 0;
      const retainedAddons = installed.addons.slice(0, capacity);
      const returnedAddons = installed.addons.slice(capacity);
      const newParts = { ...vehicle.parts, [slot]: { part: newPart, addons: retainedAddons } };
      const gbSwap = getGearBonuses(state.equippedGear, state.equippedLootGear, state.lootGearInventory, state.unlockedTalentNodes, TALENT_NODES, state.equippedStationEquipment, state.stationEquipmentInventory);
      const handlingBonus = _getUpgradeEffectValue(state, "tuned_suspension") + gbSwap.race_handling_pct;
      const newStats = calculateStats(vehicleDef, newParts, vehicle.condition ?? 100, handlingBonus);

      set((s: GameState) => ({
        garage: s.garage.map((v) => v.id !== vehicleId ? v : {
          ...v,
          parts: newParts,
          stats: newStats,
        }),
        inventory: [
          ...s.inventory.filter((p) => p.id !== newPart.id),
          returnedPart,
          ...returnedAddons,
        ],
      }));
    },

    installAddon: (vehicleId: string, slot: string, addonId: string) => {
      const state = get() as GameState;
      if (_getUpgradeLevel(state, "addon_bench") < 1) return;
      const vehicle = state.garage.find((candidate) => candidate.id === vehicleId);
      const installed = vehicle?.parts[slot];
      const addon = state.inventory.find((part) => part.id === addonId && part.type === "addon");
      const addonDef = addon ? getAddonById(addon.definitionId) : undefined;
      if (!vehicle || !installed || !addon || !addonDef || addonDef.targetSlot !== slot) return;
      const capacity = CONDITION_ADDON_SLOTS[installed.part.condition] ?? 0;
      if (installed.addons.length >= capacity) return;
      const vehicleDef = getVehicleById(vehicle.definitionId);
      if (!vehicleDef) return;

      const parts = {
        ...vehicle.parts,
        [slot]: { ...installed, addons: [...installed.addons, addon] },
      };
      const gear = getGearBonuses(state.equippedGear, state.equippedLootGear, state.lootGearInventory, state.unlockedTalentNodes, TALENT_NODES, state.equippedStationEquipment, state.stationEquipmentInventory);
      const handlingBonus = _getUpgradeEffectValue(state, "tuned_suspension") + gear.race_handling_pct;
      set((current: GameState) => ({
        inventory: current.inventory.filter((part) => part.id !== addonId),
        garage: current.garage.map((candidate) => candidate.id === vehicleId
          ? { ...candidate, parts, stats: calculateStats(vehicleDef, parts, candidate.condition, handlingBonus) }
          : candidate),
      }));
      _appendLog(set, get, "build", `Installed ${addonDef.name} on ${vehicleDef.name}`);
    },

    removeAddon: (vehicleId: string, slot: string, addonId: string) => {
      const state = get() as GameState;
      const vehicle = state.garage.find((candidate) => candidate.id === vehicleId);
      const installed = vehicle?.parts[slot];
      const addon = installed?.addons.find((candidate) => candidate.id === addonId);
      if (!vehicle || !installed || !addon) return;
      const vehicleDef = getVehicleById(vehicle.definitionId);
      if (!vehicleDef) return;
      const parts = {
        ...vehicle.parts,
        [slot]: { ...installed, addons: installed.addons.filter((candidate) => candidate.id !== addonId) },
      };
      const gear = getGearBonuses(state.equippedGear, state.equippedLootGear, state.lootGearInventory, state.unlockedTalentNodes, TALENT_NODES, state.equippedStationEquipment, state.stationEquipmentInventory);
      const handlingBonus = _getUpgradeEffectValue(state, "tuned_suspension") + gear.race_handling_pct;
      set((current: GameState) => ({
        inventory: [...current.inventory, addon],
        garage: current.garage.map((candidate) => candidate.id === vehicleId
          ? { ...candidate, parts, stats: calculateStats(vehicleDef, parts, candidate.condition, handlingBonus) }
          : candidate),
      }));
    },

    refurbishPart: (partId: string) => {
      const state = get() as GameState;
      if (_getUpgradeLevel(state, "refurbishment_bench") < 1) return;
      const part = state.inventory.find((p) => p.id === partId);
      if (!part) return;
      const gb = getGearBonuses(state.equippedGear, state.equippedLootGear, state.lootGearInventory, state.unlockedTalentNodes, TALENT_NODES, state.equippedStationEquipment, state.stationEquipmentInventory);
      const reduction = _getUpgradeEffectValue(state, "cheap_refurb") + gb.refurb_cost_reduction_pct;
      const result = calculateRefurbishCost(part, reduction);
      if (!result) return;
      if (state.scrapBucks < result.cost) return;
      set((s: GameState) => ({
        scrapBucks: s.scrapBucks - result.cost,
        inventory: s.inventory.map((p) => p.id !== partId ? p : {
          ...p,
          condition: result.newCondition,
        }),
      }));
      _appendLog(set, get, "build", `Refurbished part to ${result.newCondition} for $${result.cost}`, { scrapDelta: -result.cost });
    },

    purchaseUpgrade: (upgradeId: string) => {
      const state = get() as GameState;
      const def = getUpgradeById(upgradeId);
      if (!def) return;
      const currentLevel = state.workshopLevels[upgradeId] ?? 0;
      if (currentLevel >= def.maxLevel) return;

      if (def.unlockRequirement) {
        if (def.unlockRequirement.repPoints && state.repPoints < def.unlockRequirement.repPoints) return;
        if (def.unlockRequirement.workshopUpgradeId) {
          const reqLevel = state.workshopLevels[def.unlockRequirement.workshopUpgradeId] ?? 0;
          if (reqLevel < 1) return;
        }
        if (def.unlockRequirement.workshopUpgradeIds) {
          for (const reqId of def.unlockRequirement.workshopUpgradeIds) {
            if ((state.workshopLevels[reqId] ?? 0) < 1) return;
          }
        }
      }

      const cost = getUpgradeCost(def, currentLevel);
      if (state.scrapBucks < cost) return;
      set((s: GameState) => ({
        scrapBucks: s.scrapBucks - cost,
        workshopLevels: { ...s.workshopLevels, [upgradeId]: currentLevel + 1 },
      }));
      _appendLog(set, get, "upgrade", `Bought ${def.name} Lv.${currentLevel + 1} for $${cost}`, { scrapDelta: -cost });
    },

    purchaseGear: (gearId: string) => {
      const state = get() as GameState;
      const def = getGearById(gearId);
      if (!def) return;
      if (state.ownedGearIds.includes(gearId)) return;
      if (def.unlockRequirement?.repPoints && state.repPoints < def.unlockRequirement.repPoints) return;
      if (state.scrapBucks < def.cost) return;
      set((s: GameState) => ({
        scrapBucks: s.scrapBucks - def.cost,
        ownedGearIds: [...s.ownedGearIds, gearId],
        equippedGear: { ...s.equippedGear, [def.slot]: gearId },
      }));
      _appendLog(set, get, "gear", `Bought ${def.name} for $${def.cost}`, { scrapDelta: -def.cost });
    },

    equipGear: (gearId: string) => {
      const state = get() as GameState;
      if (!state.ownedGearIds.includes(gearId)) return;
      const def = getGearById(gearId);
      if (!def) return;
      set((s: GameState) => ({
        equippedGear: { ...s.equippedGear, [def.slot]: gearId },
      }));
    },

    equipLootGear: (lootGearId: string) => {
      const state = get() as GameState;
      const item = state.lootGearInventory.find((g) => g.id === lootGearId);
      if (!item) return;
      set((s: GameState) => ({
        equippedLootGear: { ...s.equippedLootGear, [item.slot]: lootGearId },
      }));
    },

    unequipLootGear: (slot: GearSlot) => {
      set((s: GameState) => ({
        equippedLootGear: { ...s.equippedLootGear, [slot]: null },
      }));
    },

    enhanceLootGear: (lootGearId: string) => {
      const state = get() as GameState;
      const item = state.lootGearInventory.find((g) => g.id === lootGearId);
      if (!item) return;
      const masteryLevel = Math.floor(_getUpgradeEffectValue(state, "enhancement_mastery"));
      const maxLevel = getMaxEnhancementLevel(masteryLevel);
      if (item.enhancementLevel >= maxLevel) return;
      const cost = getEnhancementCost(item);
      if (state.scrapBucks < cost) return;
      const newLevel = item.enhancementLevel + 1;
      const newModSlots = getModSlots(newLevel);
      set((s: GameState) => ({
        scrapBucks: s.scrapBucks - cost,
        lootGearInventory: s.lootGearInventory.map((g) =>
          g.id !== lootGearId ? g : { ...g, enhancementLevel: newLevel, modSlots: newModSlots }
        ),
      }));
      _appendLog(set, get, "gear", `Enhanced ${item.name} to Lv.${newLevel} for $${cost}`, { scrapDelta: -cost });
    },

    salvageLootGear: (lootGearId: string) => {
      const state = get() as GameState;
      const item = state.lootGearInventory.find((g) => g.id === lootGearId);
      if (!item) return;
      const salvageBonus = _getUpgradeEffectValue(state, "gear_recycler");
      const value = getSalvageValue(item, salvageBonus);
      // Return installed mods to inventory
      const returnedMods = item.mods;
      set((s: GameState) => ({
        scrapBucks: s.scrapBucks + value,
        lifetimeScrapBucks: s.lifetimeScrapBucks + value,
        lootGearInventory: s.lootGearInventory.filter((g) => g.id !== lootGearId),
        // Unequip if this item was equipped
        equippedLootGear: s.equippedLootGear[item.slot] === lootGearId
          ? { ...s.equippedLootGear, [item.slot]: null }
          : s.equippedLootGear,
        gearModInventory: [...s.gearModInventory, ...returnedMods],
      }));
    },

    installMod: (lootGearId: string, modInstanceId: string) => {
      const state = get() as GameState;
      const item = state.lootGearInventory.find((g) => g.id === lootGearId);
      if (!item) return;
      if (item.mods.length >= item.modSlots) return;
      const mod = state.gearModInventory.find((m) => m.id === modInstanceId);
      if (!mod) return;
      // Check mod is compatible with this slot
      import("@/data/gearMods").then(({ getModTemplateById }) => {
        const template = getModTemplateById(mod.templateId);
        if (!template || !template.slots.includes(item.slot)) return;
        set((s: GameState) => ({
          lootGearInventory: s.lootGearInventory.map((g) =>
            g.id !== lootGearId ? g : { ...g, mods: [...g.mods, mod] }
          ),
          gearModInventory: s.gearModInventory.filter((m) => m.id !== modInstanceId),
        }));
      });
    },

    removeMod: (lootGearId: string, modIndex: number) => {
      const state = get() as GameState;
      const item = state.lootGearInventory.find((g) => g.id === lootGearId);
      if (!item || modIndex < 0 || modIndex >= item.mods.length) return;
      const mod = item.mods[modIndex];
      const preserveMod = _getUpgradeLevel(state, "careful_modding") >= 1;
      set((s: GameState) => ({
        lootGearInventory: s.lootGearInventory.map((g) =>
          g.id !== lootGearId ? g : { ...g, mods: g.mods.filter((_, i) => i !== modIndex) }
        ),
        gearModInventory: preserveMod
          ? [...s.gearModInventory, mod]
          : s.gearModInventory,
      }));
    },

    unlockTalentNode: (nodeId: string) => {
      const state = get() as GameState;
      if (state.unlockedTalentNodes.includes(nodeId)) return;
      const node = getTalentNodeById(nodeId);
      if (!node) return;
      if (node.prerequisiteNodeId && !state.unlockedTalentNodes.includes(node.prerequisiteNodeId)) return;
      if (node.mutuallyExclusiveWith && state.unlockedTalentNodes.includes(node.mutuallyExclusiveWith)) return;
      if (state.scrapBucks < node.cost) return;
      set((s: GameState) => ({
        scrapBucks: s.scrapBucks - node.cost,
        unlockedTalentNodes: [...s.unlockedTalentNodes, nodeId],
      }));
    },

    respecTalentTree: (treeId: string) => {
      const state = get() as GameState;
      const treeNodes = TALENT_NODES.filter((n) => n.treeId === treeId);
      const unlockedInTree = treeNodes.filter((n) => state.unlockedTalentNodes.includes(n.id));
      if (unlockedInTree.length === 0) return;
      const totalCost = unlockedInTree.reduce((sum, n) => sum + n.cost, 0);
      const respecCost = Math.floor(totalCost * 1.5);
      if (state.scrapBucks < respecCost) return;
      const unlockedInTreeIds = new Set(unlockedInTree.map((n) => n.id));
      set((s: GameState) => ({
        scrapBucks: s.scrapBucks - respecCost,
        unlockedTalentNodes: s.unlockedTalentNodes.filter((id) => !unlockedInTreeIds.has(id)),
      }));
    },

    forgeStationItem: (slot: GarageStationSlot, rarity: StationEquipmentRarity) => {
      const state = get() as GameState;
      const cost = STATION_FORGE_COST[rarity];
      if (state.scrapBucks < cost) return;
      const item = forgeStationEquipment(slot, rarity);
      set((current: GameState) => ({ scrapBucks: current.scrapBucks - cost, stationEquipmentInventory: [...current.stationEquipmentInventory, item] }));
      _appendLog(set, get, "gear", `Forged ${item.name} for $${cost}`, { scrapDelta: -cost });
    },

    equipStationItem: (itemId: string) => {
      const state = get() as GameState;
      const item = state.stationEquipmentInventory.find((candidate) => candidate.id === itemId);
      if (!item) return;
      set((current: GameState) => ({ equippedStationEquipment: { ...current.equippedStationEquipment, [item.slot]: item.id } }));
    },

    reforgeStationItem: (itemId: string) => {
      const state = get() as GameState;
      if ((state.workshopLevels.careful_modding ?? 0) < 1) return;
      const item = state.stationEquipmentInventory.find((candidate) => candidate.id === itemId);
      if (!item) return;
      const cost = REFORGE_COST_SHARDS[item.rarity];
      if (state.reforgeShards < cost) return;
      const reforged = reforgeStationEquipment(item);
      set((current: GameState) => ({ reforgeShards: current.reforgeShards - cost, stationEquipmentInventory: current.stationEquipmentInventory.map((candidate) => candidate.id === itemId ? reforged : candidate) }));
    },

    enhanceStationItem: (itemId: string) => {
      const state = get() as GameState;
      const item = state.stationEquipmentInventory.find((candidate) => candidate.id === itemId);
      const maxLevel = Math.min(13, 4 + (state.workshopLevels.enhancement_mastery ?? 0) * 3);
      if (!item || item.enhancementLevel >= maxLevel) return;
      const rarityMultiplier = { common: 1, uncommon: 2, rare: 4, epic: 8, legendary: 16 }[item.rarity];
      const cost = 100 * rarityMultiplier * (item.enhancementLevel + 1);
      if (state.scrapBucks < cost) return;
      set((current: GameState) => ({ scrapBucks: current.scrapBucks - cost, stationEquipmentInventory: current.stationEquipmentInventory.map((candidate) => candidate.id === itemId ? { ...candidate, enhancementLevel: candidate.enhancementLevel + 1 } : candidate) }));
      _appendLog(set, get, "gear", `Enhanced ${item.name} to +${item.enhancementLevel + 1}`, { scrapDelta: -cost });
    },

    salvageStationItem: (itemId: string) => {
      const state = get() as GameState;
      const item = state.stationEquipmentInventory.find((candidate) => candidate.id === itemId);
      if (!item || state.equippedStationEquipment[item.slot] === item.id) return;
      const baseShards = SHARDS_PER_SALVAGE[item.rarity] + (state.workshopLevels.mod_hunter ?? 0);
      const shards = Math.max(1, Math.floor(baseShards * (1 + (state.workshopLevels.gear_recycler ?? 0) * 0.25)));
      set((current: GameState) => ({ stationEquipmentInventory: current.stationEquipmentInventory.filter((candidate) => candidate.id !== itemId), reforgeShards: current.reforgeShards + shards }));
    },

    unlockLocation: (locationId: string) => {
      set((s: GameState) => ({
        unlockedLocationIds: s.unlockedLocationIds.includes(locationId)
          ? s.unlockedLocationIds
          : [...s.unlockedLocationIds, locationId],
      }));
    },

    unlockCircuit: (circuitId: string) => {
      set((s: GameState) => ({
        unlockedCircuitIds: s.unlockedCircuitIds.includes(circuitId)
          ? s.unlockedCircuitIds
          : [...s.unlockedCircuitIds, circuitId],
      }));
    },

    prestige: () => {
      const state = get() as GameState;

      // Build run stats for LP calculation
      const runStats: RunStats = {
        lifetimeScrapBucks: state.lifetimeScrapBucks,
        lifetimeRaces: state.lifetimeRaces,
        fatigue: state.fatigue,
        repPoints: state.repPoints,
        highestCircuitTier: deriveHighestCircuitTier(state.unlockedCircuitIds),
        workshopUpgradesBought: Object.values(state.workshopLevels).reduce((a, b) => a + b, 0),
      };

      const result = doPrestige(
        state.prestigeCount,
        runStats,
        state.legacyUpgradeLevels,
        state.activeMomentumTiers,
        state.workshopLevels,
      );

      const newPrestigeCount = result.prestigeCount;
      const newProgress = { ...state.challengeProgress, prestigeCount: newPrestigeCount };
      const { completed, rewards } = checkChallenges(state, newProgress, state.completedChallenges);
      const matRewards = rewards.filter((r) => r.type === "material") as Extract<ChallengeRewardType, { type: "material" }>[];
      const tokenRewards = rewards.filter((r) => r.type === "forgeToken") as Extract<ChallengeRewardType, { type: "forgeToken" }>[];
      const teamStartingMaterials = getGameEffectValue(TEAM_UPGRADE_DEFINITIONS, state.teamUpgradeLevels, "starting_materials");
      const newMaterials = Object.fromEntries(Object.keys(INITIAL_MATERIALS).map((key) => [key, teamStartingMaterials])) as Record<MaterialType, number>;
      for (const mr of matRewards) newMaterials[mr.material] = (newMaterials[mr.material] ?? 0) + mr.amount;

      // Muscle Memory: starting auto-scavenge clicks
      const startingClicks = result.startingScavClicks;
      const autoScavUnlocked = startingClicks >= 500;

      // Merge starting locations/circuits with defaults
      const startingLocations = Array.from(new Set(["curbside", ...result.startingLocationIds]));
      const startingCircuits = Array.from(new Set(["backyard_derby", ...result.startingCircuitIds]));

      // LP earned
      const lpEarned = Math.floor(result.legacyPointsEarned * (1 + getGameEffectValue(TEAM_UPGRADE_DEFINITIONS, state.teamUpgradeLevels, "lp_multiplier")));
      const newLp = state.legacyPoints + lpEarned;
      const newLifetimeLp = state.lifetimeLegacyPoints + lpEarned;

      const unlockEvents: string[] = [];
      if (lpEarned > 0) {
        unlockEvents.push(`+${lpEarned} Legacy Points earned!`);
      }
      // Prestige milestone notifications
      const newMilestones = getNewlyUnlockedMilestones(newPrestigeCount);
      for (const m of newMilestones) {
        unlockEvents.push(`Milestone: ${m.name} — ${m.description}`);
      }
      const milestoneBonuses = getPrestigeMilestoneBonuses(newPrestigeCount);

      set({
        ...createInitialState(),
        prestigeCount: newPrestigeCount,
        prestigeBonus: result.bonuses,
        // Legacy system persists
        legacyPoints: newLp,
        lifetimeLegacyPoints: newLifetimeLp,
        legacyUpgradeLevels: state.legacyUpgradeLevels,
        activeMomentumTiers: [],
        currentEra: state.currentEra,
        // Blueprint Memory: keep workshop upgrades
        workshopLevels: result.keptWorkshopUpgrades,
        unlockedVehicleIds: ["push_mower"],
        unlockedLocationIds: startingLocations,
        unlockedCircuitIds: startingCircuits,
        fatigue: 0,
        lifetimeRaces: 0,
        // Seed Money: starting scrap
        scrapBucks: result.startingScrap + getGameEffectValue(TEAM_UPGRADE_DEFINITIONS, state.teamUpgradeLevels, "quick_start_bonus") + getGameEffectValue(OWNER_UPGRADE_DEFINITIONS, state.ownerUpgradeLevels, "starting_scrap"),
        lifetimeScrapBucks: result.startingScrap + getGameEffectValue(TEAM_UPGRADE_DEFINITIONS, state.teamUpgradeLevels, "quick_start_bonus") + getGameEffectValue(OWNER_UPGRADE_DEFINITIONS, state.ownerUpgradeLevels, "starting_scrap"),
        // Auto-race via prestige milestone system
        autoRaceUnlocked: milestoneBonuses.autoRace,
        // Auto-scavenge stays unlocked once earned, via Muscle Memory, or via milestone
        autoScavengeUnlocked: state.autoScavengeUnlocked || autoScavUnlocked || milestoneBonuses.startWithAutoScavenge || getGameEffectValue(TEAM_UPGRADE_DEFINITIONS, state.teamUpgradeLevels, "quick_start_bonus") > 0,
        manualScavengeClicks: Math.min(startingClicks, 500),
        raceTickProgress: 0,
        unlockEvents,
        // Shared station equipment persists through Scrap Reset
        stationEquipmentInventory: state.stationEquipmentInventory,
        equippedStationEquipment: state.equippedStationEquipment,
        reforgeShards: state.reforgeShards,
        // Legacy compatibility fields persist until migration removes them
        equippedGear: state.equippedGear,
        ownedGearIds: state.ownedGearIds,
        // Loot gear persists through prestige
        lootGearInventory: state.lootGearInventory,
        equippedLootGear: state.equippedLootGear,
        gearModInventory: state.gearModInventory,
        unlockedTalentNodes: state.unlockedTalentNodes,
        // New systems: materials, tokens, challenges persist
        materials: newMaterials,
        forgeTokens: state.forgeTokens + tokenRewards.reduce((t, r) => t + r.amount, 0),
        completedChallenges: [...state.completedChallenges, ...completed],
        challengeProgress: {
          ...newProgress,
          // Reset per-run trackers
          fatigueDrinksPurchased: 0,
        },
        lifetimeTotalDecomposed: state.lifetimeTotalDecomposed,
        lifetimeTotalEnhanced: state.lifetimeTotalEnhanced,
        lifetimeTotalTradeUps: state.lifetimeTotalTradeUps,
        lifetimeTotalRaceSalvage: state.lifetimeTotalRaceSalvage,
        highestConditionReached: state.highestConditionReached,
        tutorialStep: state.tutorialStep,
        tutorialDismissed: state.tutorialDismissed,
        tutorialMinimized: state.tutorialMinimized,
        tutorialSkippedSteps: state.tutorialSkippedSteps,
        tutorialLastAdvanceTime: state.tutorialLastAdvanceTime,
        dealerBoard: [],
        gameTick: 0,
        // Activity log persists through prestige
        activityLog: state.activityLog,
        _logIdCounter: state._logIdCounter,
        // Multi-layer prestige: persist through Scrap Reset
        teamPoints: state.teamPoints,
        lifetimeTeamPoints: state.lifetimeTeamPoints,
        teamUpgradeLevels: state.teamUpgradeLevels,
        teamEraCount: state.teamEraCount,
        lifetimeLPThisTeamEra: state.lifetimeLPThisTeamEra + lpEarned,
        ownerPoints: state.ownerPoints,
        lifetimeOwnerPoints: state.lifetimeOwnerPoints,
        ownerUpgradeLevels: state.ownerUpgradeLevels,
        ownerEraCount: state.ownerEraCount,
        lifetimeTPThisOwnerEra: state.lifetimeTPThisOwnerEra,
        trackPrestigeTokens: state.trackPrestigeTokens,
        lifetimeTrackTokens: state.lifetimeTrackTokens,
        trackPerkLevels: state.trackPerkLevels,
        trackEraCount: state.trackEraCount,
        lifetimeOPThisTrackEra: state.lifetimeOPThisTrackEra,
        hostedEvents: state.hostedEvents,
        ownedTrackConfig: state.ownedTrackConfig,
        racerAttributes: state.racerAttributes,
        unlockedFeatures: state.unlockedFeatures,
        defeatedRivalIds: state.defeatedRivalIds,
        discoveredBlueprintIds: state.discoveredBlueprintIds,
        lifetimeLPAllTime: state.lifetimeLPAllTime + lpEarned,
        lifetimeScrapResets: state.lifetimeScrapResets + 1,
        crewRoster: state.crewRoster,
        crewSlots: state.crewSlots,
        // Achievements & lifetime stats persist through all resets
        earnedAchievements: state.earnedAchievements,
        lifetimeRacesAllTime: state.lifetimeRacesAllTime,
        lifetimeWinsAllTime: state.lifetimeWinsAllTime,
        lifetimeScrapBucksAllTime: state.lifetimeScrapBucksAllTime,
        lifetimePartsScavengedAllTime: state.lifetimePartsScavengedAllTime,
        lifetimeVehiclesBuiltAllTime: state.lifetimeVehiclesBuiltAllTime,
        bestWinStreakAllTime: state.bestWinStreakAllTime,
        highestVehicleTierBuilt: state.highestVehicleTierBuilt,
        totalForgeTokensEarned: state.totalForgeTokensEarned,
        uniqueVehicleTypesBuilt: state.uniqueVehicleTypesBuilt,
        // Playstyle nodes persist through Scrap Reset
        unlockedPlaystyleNodes: state.unlockedPlaystyleNodes,
        vehicleLoadouts: [],
      });
      _appendLog(set, get, "prestige", `Prestige #${newPrestigeCount}! Earned ${lpEarned} Legacy Points`, { lpDelta: lpEarned });
      // Check feature unlocks and achievements after prestige
      (get() as GameState).checkFeatureUnlocks();
      (get() as GameState).checkAchievements();
    },

    purchaseLegacyUpgrade: (upgradeId: string) => {
      const state = get() as GameState;
      const def = LEGACY_UPGRADES_BY_ID[upgradeId];
      if (!def) return;
      const currentLevel = state.legacyUpgradeLevels[upgradeId] ?? 0;
      if (currentLevel >= def.maxLevel) return;
      const cost = legacyUpgradeCost(def, currentLevel + 1);
      if (state.legacyPoints < cost) return;
      const newLevels = { ...state.legacyUpgradeLevels, [upgradeId]: currentLevel + 1 };
      set({
        legacyPoints: state.legacyPoints - cost,
        legacyUpgradeLevels: newLevels,
        // Recompute prestige bonus from new upgrade levels
        prestigeBonus: calculatePrestigeBonus(newLevels),
      });
      _appendLog(set, get, "prestige", `Bought ${def.name} Lv.${currentLevel + 1} for ${cost} LP`, { lpDelta: -cost });
    },

    checkMomentumTiers: () => {
      const state = get() as GameState;
      const highestTier = deriveHighestCircuitTier(state.unlockedCircuitIds);
      const newTiers = getActiveMomentumTiers(
        state.lifetimeRaces,
        state.fatigue,
        state.repPoints,
        state.lifetimeScrapBucks,
        highestTier,
      );
      // Only update if changed
      if (newTiers.length !== state.activeMomentumTiers.length ||
          newTiers.some((t, i) => t !== state.activeMomentumTiers[i])) {
        set({ activeMomentumTiers: newTiers });
      }
    },

    applyTickResult: (partsFound: ScavengedPart[], scrapsEarned: number, repEarned: number, vehicleWear?: number, vehicleRepair?: number, newRaceTickProgress?: number, lootGearDrops?: LootGearItem[], modDrops?: InstalledMod[], racesCompleted?: number) => {
      set((s: GameState) => {
        let updatedGarage = s.garage;
        if ((vehicleWear || vehicleRepair) && s.activeVehicleId) {
          const gbTick = getGearBonuses(s.equippedGear, s.equippedLootGear, s.lootGearInventory, s.unlockedTalentNodes, TALENT_NODES, s.equippedStationEquipment, s.stationEquipmentInventory);
          const handlingBonus = _getUpgradeEffectValue(s, "tuned_suspension") + gbTick.race_handling_pct;
          updatedGarage = s.garage.map((v) => {
            if (v.id !== s.activeVehicleId) return v;
            let newCond = v.condition ?? 100;
            if (vehicleWear) newCond = Math.max(0, newCond - vehicleWear);
            if (vehicleRepair) newCond = Math.min(100, newCond + vehicleRepair);
            const vDef = getVehicleById(v.definitionId);
            return {
              ...v,
              condition: newCond,
              totalRaces: vehicleWear ? (v.totalRaces ?? 0) + (racesCompleted ?? 1) : (v.totalRaces ?? 0),
              stats: vDef ? calculateStats(vDef, v.parts, newCond, handlingBonus) : v.stats,
            };
          });
        }
        const raced = !!vehicleWear;
        const newLifetimeRaces = raced ? s.lifetimeRaces + (racesCompleted ?? 1) : s.lifetimeRaces;
        const fatigueOffset = getLegacyEffectValue(s.legacyUpgradeLevels, "leg_fatigue_offset");
        const gbFatigue = getGearBonuses(s.equippedGear, s.equippedLootGear, s.lootGearInventory, s.unlockedTalentNodes, TALENT_NODES, s.equippedStationEquipment, s.stationEquipmentInventory);
        const rawFatigue = raced ? calculateFatigue(newLifetimeRaces, fatigueOffset) : s.fatigue;
        const ownerFatigueReduction = getGameEffectValue(OWNER_UPGRADE_DEFINITIONS, s.ownerUpgradeLevels, "fatigue_rate_reduction");
        const fatigueCap = Math.max(0, 99 - getGameEffectValue(TEAM_UPGRADE_DEFINITIONS, s.teamUpgradeLevels, "fatigue_cap_reduction"));
        const newFatigue = raced ? Math.min(fatigueCap, Math.floor(rawFatigue * (1 - gbFatigue.fatigue_rate_reduction - ownerFatigueReduction))) : s.fatigue;
        // Grant skill XP from auto-tick actions
        let tickSkills = s.racerSkills;
        if (partsFound.length > 0) tickSkills = _grantXp(tickSkills, "scavenging", 1);
        if (raced) {
          tickSkills = _grantXp(tickSkills, "driving", 10 * (racesCompleted ?? 1));
          if (newFatigue >= 60) tickSkills = _grantXp(tickSkills, "endurance", 10 * (racesCompleted ?? 1));
          else if (newFatigue >= 40) tickSkills = _grantXp(tickSkills, "endurance", 5 * (racesCompleted ?? 1));
        }

        return {
          inventory: [...s.inventory, ...partsFound],
          scrapBucks: s.scrapBucks + scrapsEarned,
          lifetimeScrapBucks: s.lifetimeScrapBucks + scrapsEarned,
          repPoints: s.repPoints + repEarned,
          garage: updatedGarage,
          lifetimeRaces: newLifetimeRaces,
          fatigue: newFatigue,
          racerSkills: tickSkills,
          stationEquipmentInventory: lootGearDrops && lootGearDrops.length > 0
            ? [...s.stationEquipmentInventory, ...lootGearDrops.map(convertLegacyLootDrop)]
            : s.stationEquipmentInventory,
          reforgeShards: s.reforgeShards + (modDrops?.length ?? 0),
          raceTickProgress: newRaceTickProgress ?? s.raceTickProgress,
          lastActiveTimestamp: Date.now(),
          // Lifetime stats for achievements
          lifetimePartsScavengedAllTime: s.lifetimePartsScavengedAllTime + partsFound.length,
          lifetimeScrapBucksAllTime: s.lifetimeScrapBucksAllTime + scrapsEarned,
          lifetimeRacesAllTime: raced ? s.lifetimeRacesAllTime + (racesCompleted ?? 1) : s.lifetimeRacesAllTime,
        };
      });
      // Check momentum tier activations after state update
      (get() as GameState).checkMomentumTiers();
      // Log auto-tick summary
      const tickParts: string[] = [];
      if (scrapsEarned > 0) tickParts.push(`+$${scrapsEarned}`);
      if (repEarned > 0) tickParts.push(`+${Math.round(repEarned)} rep`);
      if (partsFound.length > 0) tickParts.push(`${partsFound.length} parts`);
      if (lootGearDrops && lootGearDrops.length > 0) tickParts.push(`${lootGearDrops.length} gear`);
      if (tickParts.length > 0) {
        _appendLog(set, get, "tick", `Auto: ${tickParts.join(", ")}`, { scrapDelta: scrapsEarned || undefined, repDelta: repEarned ? Math.round(repEarned) : undefined });
      }
    },

    // ── Challenge helpers ────────────────────────────────────────────────────

    // Internal helper: check and award challenges based on current state snapshot.
    // Called after any state-changing action that could complete a challenge.

    // ── New system actions ───────────────────────────────────────────────────

    decomposePart: (partId: string) => {
      const state = get() as GameState;
      const part = state.inventory.find((p) => p.id === partId);
      if (!part) return;

      const result = decomposePart(part, state.fatigue);
      if (!result) return;

      // Apply legacy decompose yield multiplier + gear material bonus
      const decompYieldMult = 1 + getLegacyEffectValue(state.legacyUpgradeLevels, "leg_decompose_yield");
      const gb = getGearBonuses(state.equippedGear, state.equippedLootGear, state.lootGearInventory, state.unlockedTalentNodes, TALENT_NODES, state.equippedStationEquipment, state.stationEquipmentInventory);
      const newMaterials = { ...state.materials };
      for (const [mat, qty] of Object.entries(result.materials) as [MaterialType, number][]) {
        const bonusQty = Math.floor(qty * decompYieldMult * (1 + gb.material_bonus_pct));
        newMaterials[mat] = (newMaterials[mat] ?? 0) + bonusQty;
      }

      const newDecomposed = state.lifetimeTotalDecomposed + 1;
      const newProgress = { ...state.challengeProgress, totalDecomposed: newDecomposed };
      const { completed, rewards } = checkChallenges(state, newProgress, state.completedChallenges);
      const scrapReward = rewards.reduce((s, r) => s + (r.type === "scrap" ? r.amount : 0), 0);
      const matRewards = rewards.filter((r) => r.type === "material") as Extract<ChallengeRewardType, { type: "material" }>[];
      const tokenRewards = rewards.filter((r) => r.type === "forgeToken") as Extract<ChallengeRewardType, { type: "forgeToken" }>[];
      for (const mr of matRewards) newMaterials[mr.material] = (newMaterials[mr.material] ?? 0) + mr.amount;

      set((s: GameState) => ({
        inventory: s.inventory.filter((p) => p.id !== partId),
        materials: newMaterials,
        lifetimeTotalDecomposed: newDecomposed,
        challengeProgress: newProgress,
        completedChallenges: [...s.completedChallenges, ...completed],
        scrapBucks: s.scrapBucks + scrapReward,
        forgeTokens: s.forgeTokens + tokenRewards.reduce((t, r) => t + r.amount, 0),
      }));
      const matSummary = Object.entries(result.materials).filter(([, q]) => q > 0).map(([m, q]) => `${q} ${m}`).join(", ");
      _appendLog(set, get, "craft", `Decomposed part into ${matSummary}`);
    },

    decomposeAllJunk: () => {
      const state = get() as GameState;
      const cost = 50;
      if (state.scrapBucks < cost) return;
      const junk = state.inventory.filter((p) => p.condition === "rusted" || p.condition === "worn");
      if (junk.length === 0) return;

      const { materials: matYield, count } = decomposeMany(junk, state.fatigue);
      // Apply legacy decompose yield multiplier + gear material bonus
      const decompYieldMult = 1 + getLegacyEffectValue(state.legacyUpgradeLevels, "leg_decompose_yield");
      const gbDecompose = getGearBonuses(state.equippedGear, state.equippedLootGear, state.lootGearInventory, state.unlockedTalentNodes, TALENT_NODES, state.equippedStationEquipment, state.stationEquipmentInventory);
      const newMaterials = { ...state.materials };
      for (const [mat, qty] of Object.entries(matYield) as [MaterialType, number][]) {
        const bonusQty = Math.floor(qty * decompYieldMult * (1 + gbDecompose.material_bonus_pct));
        newMaterials[mat] = (newMaterials[mat] ?? 0) + bonusQty;
      }
      const junkIds = new Set(junk.map((p) => p.id));
      const newDecomposed = state.lifetimeTotalDecomposed + count;
      const newProgress = { ...state.challengeProgress, totalDecomposed: newDecomposed };
      const { completed, rewards } = checkChallenges(state, newProgress, state.completedChallenges);
      const scrapReward = rewards.reduce((s, r) => s + (r.type === "scrap" ? r.amount : 0), 0);
      const matRewards = rewards.filter((r) => r.type === "material") as Extract<ChallengeRewardType, { type: "material" }>[];
      const tokenRewards = rewards.filter((r) => r.type === "forgeToken") as Extract<ChallengeRewardType, { type: "forgeToken" }>[];
      for (const mr of matRewards) newMaterials[mr.material] = (newMaterials[mr.material] ?? 0) + mr.amount;

      set((s: GameState) => ({
        inventory: s.inventory.filter((p) => !junkIds.has(p.id)),
        materials: newMaterials,
        scrapBucks: s.scrapBucks - cost + scrapReward,
        lifetimeTotalDecomposed: newDecomposed,
        challengeProgress: newProgress,
        completedChallenges: [...s.completedChallenges, ...completed],
        forgeTokens: s.forgeTokens + tokenRewards.reduce((t, r) => t + r.amount, 0),
      }));
    },

    enhancePart: (partId: string) => {
      const state = get() as GameState;
      if (_getUpgradeLevel(state, "tuning_bench") < 1) return;
      const part = state.inventory.find((p) => p.id === partId);
      if (!part) return;
      const condIdx = CONDITIONS.indexOf(part.condition as PartCondition);
      if (condIdx < 0 || condIdx >= 7) return; // can't enhance beyond mythic (artifact = forge)

      // Look up part category
      const def = PART_DEFINITIONS.find((d) => d.id === part.definitionId);
      if (!def) return;

      const targetIdx = condIdx + 1;
      const cost = calculateEnhancementCost(targetIdx, def.category, state.fatigue);
      if (!cost) return;
      if (!canAffordEnhancement(cost, state.materials)) return;

      const newMaterials = { ...state.materials };
      for (const [mat, qty] of Object.entries(cost) as [MaterialType, number][]) {
        newMaterials[mat] = Math.max(0, (newMaterials[mat] ?? 0) - qty);
      }
      const newCondition = CONDITIONS[targetIdx] as PartCondition;
      const newHighest = Math.max(state.highestConditionReached, targetIdx);
      const newEnhanced = state.lifetimeTotalEnhanced + 1;
      const newProgress = {
        ...state.challengeProgress,
        totalEnhanced: newEnhanced,
        highestConditionReached: newHighest,
      };
      const { completed, rewards } = checkChallenges(state, newProgress, state.completedChallenges);
      const scrapReward = rewards.reduce((s, r) => s + (r.type === "scrap" ? r.amount : 0), 0);
      const matRewards = rewards.filter((r) => r.type === "material") as Extract<ChallengeRewardType, { type: "material" }>[];
      const tokenRewards = rewards.filter((r) => r.type === "forgeToken") as Extract<ChallengeRewardType, { type: "forgeToken" }>[];
      for (const mr of matRewards) newMaterials[mr.material] = (newMaterials[mr.material] ?? 0) + mr.amount;

      set((s: GameState) => ({
        inventory: s.inventory.map((p) => p.id !== partId ? p : { ...p, condition: newCondition }),
        materials: newMaterials,
        highestConditionReached: newHighest,
        lifetimeTotalEnhanced: newEnhanced,
        challengeProgress: newProgress,
        completedChallenges: [...s.completedChallenges, ...completed],
        scrapBucks: s.scrapBucks + scrapReward,
        forgeTokens: s.forgeTokens + tokenRewards.reduce((t, r) => t + r.amount, 0),
        racerSkills: _grantXp(s.racerSkills, "mechanics", 10),
      }));
    },

    forgePart: (partId: string) => {
      const state = get() as GameState;
      if (_getUpgradeLevel(state, "artifact_forge") < 1) return;
      const part = state.inventory.find((p) => p.id === partId);
      if (!part || part.condition !== "mythic") return;
      if (state.forgeTokens < ARTIFACT_FORGE_TOKEN_COST) return;
      if (!canAffordEnhancement(ARTIFACT_FORGE_COST, state.materials)) return;

      const newMaterials = { ...state.materials };
      for (const [mat, qty] of Object.entries(ARTIFACT_FORGE_COST) as [MaterialType, number][]) {
        newMaterials[mat] = Math.max(0, (newMaterials[mat] ?? 0) - qty);
      }
      const newHighest = Math.max(state.highestConditionReached, 8);
      const newProgress = { ...state.challengeProgress, highestConditionReached: newHighest };
      const { completed, rewards } = checkChallenges(state, newProgress, state.completedChallenges);
      const scrapReward = rewards.reduce((s, r) => s + (r.type === "scrap" ? r.amount : 0), 0);
      const tokenRewards = rewards.filter((r) => r.type === "forgeToken") as Extract<ChallengeRewardType, { type: "forgeToken" }>[];

      set((s: GameState) => ({
        inventory: s.inventory.map((p) => p.id !== partId ? p : { ...p, condition: "artifact" as PartCondition }),
        materials: newMaterials,
        forgeTokens: s.forgeTokens - ARTIFACT_FORGE_TOKEN_COST + tokenRewards.reduce((t, r) => t + r.amount, 0),
        highestConditionReached: newHighest,
        challengeProgress: newProgress,
        completedChallenges: [...s.completedChallenges, ...completed],
        scrapBucks: s.scrapBucks + scrapReward,
      }));
      _appendLog(set, get, "craft", `Forged part to artifact quality!`);
    },

    craftPart: (recipe: CraftRecipe) => {
      const state = get() as GameState;
      if (_getUpgradeLevel(state, "parts_bin") < 1) return;
      if (!canAffordRecipe(recipe, state.materials)) return;

      // Pick a random part definition from the recipe's category at T0/T1
      const eligible = PART_DEFINITIONS.filter(
        (d) => d.category === recipe.category && d.minTier <= 1,
      );
      if (eligible.length === 0) return;
      const def = eligible[randInt(0, eligible.length - 1)];

      const newPart: ScavengedPart = {
        id: makePartId(),
        definitionId: def.id,
        condition: recipe.resultCondition as PartCondition,
        foundAt: "craft_bench",
        type: "part",
      };

      const newMaterials = { ...state.materials };
      for (const [mat, qty] of Object.entries(recipe.cost) as [MaterialType, number][]) {
        newMaterials[mat] = Math.max(0, (newMaterials[mat] ?? 0) - qty);
      }

      set((s: GameState) => ({
        inventory: [...s.inventory, newPart],
        materials: newMaterials,
      }));
      _appendLog(set, get, "craft", `Crafted ${def.name} (${recipe.resultCondition})`);
    },

    tradeUpParts: (partIds: [string, string, string]) => {
      const state = get() as GameState;
      if (_getUpgradeLevel(state, "parts_trader") < 1) return;

      const parts = partIds.map((id) => state.inventory.find((p) => p.id === id)).filter(Boolean) as ScavengedPart[];
      if (parts.length !== 3) return;

      // All 3 must be same category and same condition
      const condition = parts[0].condition as PartCondition;
      const condIdx = CONDITIONS.indexOf(condition);
      if (condIdx < 0 || condIdx >= 5) return; // trade-up caps at polished (5)

      const defs = parts.map((p) => PART_DEFINITIONS.find((d) => d.id === p.definitionId));
      if (defs.some((d) => !d)) return;
      const category = defs[0]!.category;
      if (!defs.every((d) => d?.category === category)) return;
      if (!parts.every((p) => p.condition === condition)) return;

      const targetCondition = CONDITIONS[condIdx + 1] as PartCondition;
      const eligible = PART_DEFINITIONS.filter((d) => d.category === category && d.minTier <= 1);
      if (eligible.length === 0) return;
      const def = eligible[randInt(0, eligible.length - 1)];

      const newPart: ScavengedPart = {
        id: makePartId(),
        definitionId: def.id,
        condition: targetCondition,
        foundAt: "trade_up",
        type: "part",
      };

      const usedIds = new Set(partIds);
      const newTradeUps = state.lifetimeTotalTradeUps + 1;
      const newProgress = { ...state.challengeProgress, totalTradeUps: newTradeUps };
      const { completed, rewards } = checkChallenges(state, newProgress, state.completedChallenges);
      const scrapReward = rewards.reduce((s, r) => s + (r.type === "scrap" ? r.amount : 0), 0);
      const matRewards = rewards.filter((r) => r.type === "material") as Extract<ChallengeRewardType, { type: "material" }>[];
      const tokenRewards = rewards.filter((r) => r.type === "forgeToken") as Extract<ChallengeRewardType, { type: "forgeToken" }>[];
      const newMaterials = { ...state.materials };
      for (const mr of matRewards) newMaterials[mr.material] = (newMaterials[mr.material] ?? 0) + mr.amount;

      set((s: GameState) => ({
        inventory: [...s.inventory.filter((p) => !usedIds.has(p.id)), newPart],
        lifetimeTotalTradeUps: newTradeUps,
        challengeProgress: newProgress,
        completedChallenges: [...s.completedChallenges, ...completed],
        scrapBucks: s.scrapBucks + scrapReward,
        forgeTokens: s.forgeTokens + tokenRewards.reduce((t, r) => t + r.amount, 0),
        materials: newMaterials,
      }));
      _appendLog(set, get, "trade", `Traded up 3 parts into ${def.name} (${targetCondition})`);
    },

    buyFromDealer: (listingId: string) => {
      const state = get() as GameState;
      if (state.repPoints < DEALER_UNLOCK_REP) return;
      const listing = state.dealerBoard.find((l) => l.id === listingId);
      if (!listing) return;
      if (state.scrapBucks < listing.price) return;

      const newPart: ScavengedPart = {
        id: makePartId(),
        definitionId: listing.definitionId,
        condition: listing.condition as PartCondition,
        foundAt: "dealer",
        type: "part",
      };

      set((s: GameState) => ({
        scrapBucks: s.scrapBucks - listing.price,
        inventory: [...s.inventory, newPart],
        dealerBoard: s.dealerBoard.filter((l) => l.id !== listingId),
      }));
      _appendLog(set, get, "trade", `Bought ${listing.definitionId} from dealer for $${listing.price}`, { scrapDelta: -listing.price });
    },

    refreshDealer: () => {
      const state = get() as GameState;
      const cost = Math.max(0, Math.floor(300 * (1 - getGameEffectValue(OWNER_UPGRADE_DEFINITIONS, state.ownerUpgradeLevels, "unlock_cost_reduction"))));
      if (state.scrapBucks < cost) return;
      if (state.repPoints < DEALER_UNLOCK_REP) return;
      const newBoard = generateDealerBoard(state.repPoints, state.gameTick);
      set((s: GameState) => ({
        scrapBucks: s.scrapBucks - cost,
        dealerBoard: newBoard,
      }));
    },

    convertScrapToMaterial: (material: MaterialType) => {
      const state = get() as GameState;
      const conversionLevel = getGameEffectValue(OWNER_UPGRADE_DEFINITIONS, state.ownerUpgradeLevels, "material_conversion");
      const cost = conversionLevel > 0 ? 100 : 200;
      const yield_ = conversionLevel > 0 ? 10 : 5;
      const basicMaterials: MaterialType[] = ["metalScrap", "rubberCompound", "greaseSludge"];
      if (!basicMaterials.includes(material) && conversionLevel < 1) return;
      if (state.scrapBucks < cost) return;
      set((s: GameState) => ({
        scrapBucks: s.scrapBucks - cost,
        materials: { ...s.materials, [material]: (s.materials[material] ?? 0) + yield_ },
      }));
      _appendLog(set, get, "trade", `Converted $${cost} into ${yield_} ${material}`, { scrapDelta: -cost });
    },

    purchaseFatigueDrink: () => {
      const state = get() as GameState;
      const cost = 500;
      const maxPurchasesPerRun = 3;
      const purchased = state.challengeProgress["fatigueDrinksPurchased"] ?? 0;
      if (purchased >= maxPurchasesPerRun) return;
      if (state.scrapBucks < cost) return;
      if (state.fatigue <= 0) return;
      set((s: GameState) => ({
        scrapBucks: s.scrapBucks - cost,
        fatigue: Math.max(0, s.fatigue - 10),
        challengeProgress: {
          ...s.challengeProgress,
          fatigueDrinksPurchased: purchased + 1,
        },
      }));
      _appendLog(set, get, "upgrade", `Bought Fatigue Drink for $${cost} (-10 fatigue)`, { scrapDelta: -cost });
    },

    // ── Dev / admin actions ──────────────────────────────────────────────────

    devSetScrapBucks: (amount: number) => {
      set({ scrapBucks: amount, lifetimeScrapBucks: Math.max(get().lifetimeScrapBucks, amount) });
    },

    devAddScrapBucks: (amount: number) => {
      set((s: GameState) => ({
        scrapBucks: s.scrapBucks + amount,
        lifetimeScrapBucks: s.lifetimeScrapBucks + Math.max(0, amount),
      }));
    },

    devSetRepPoints: (amount: number) => {
      set({ repPoints: amount });
    },

    devAddRepPoints: (amount: number) => {
      set((s: GameState) => ({ repPoints: s.repPoints + amount }));
    },

    devSetPrestigeCount: (count: number) => {
      const state = get() as GameState;
      const bonus = calculatePrestigeBonus(state.legacyUpgradeLevels);
      set({ prestigeCount: count, prestigeBonus: bonus });
    },

    devUnlockAll: () => {
      import("@/data/locations").then(({ LOCATION_DEFINITIONS }) => {
        import("@/data/circuits").then(({ CIRCUIT_DEFINITIONS }) => {
          import("@/data/vehicles").then(({ VEHICLE_DEFINITIONS }) => {
            set({
              unlockedLocationIds: LOCATION_DEFINITIONS.map((l) => l.id),
              unlockedCircuitIds: CIRCUIT_DEFINITIONS.map((c) => c.id),
              unlockedVehicleIds: VEHICLE_DEFINITIONS.map((v) => v.id),
              autoScavengeUnlocked: true,
              autoRaceUnlocked: true,
            });
          });
        });
      });
    },

    devLockAll: () => {
      set({
        unlockedLocationIds: ["curbside"],
        unlockedCircuitIds: ["backyard_derby"],
        unlockedVehicleIds: ["push_mower"],
        autoScavengeUnlocked: false,
        autoRaceUnlocked: false,
      });
    },

    devAddPartsToInventory: (partIds: string[], condition: string, count: number) => {
      import("@/engine/scavenge").then(({ makePartId }) => {
        const newParts: ScavengedPart[] = [];
        for (let i = 0; i < count; i++) {
          for (const defId of partIds) {
            newParts.push({
              id: makePartId(),
              definitionId: defId,
              condition: condition as ScavengedPart["condition"],
              foundAt: "dev_panel",
              type: "part",
            });
          }
        }
        set((s: GameState) => ({ inventory: [...s.inventory, ...newParts] }));
      });
    },

    devClearInventory: () => {
      set({ inventory: [] });
    },

    devClearGarage: () => {
      set({ garage: [], activeVehicleId: null });
    },

    devSetAutoUnlocks: (scavengeUnlocked: boolean, raceUnlocked: boolean) => {
      set({ autoScavengeUnlocked: scavengeUnlocked, autoRaceUnlocked: raceUnlocked });
    },

    // ── Multi-layer prestige actions ────────────────────────────────────────────

    teamReset: () => {
      const state = get() as GameState;
      const stats = {
        lifetimeLPThisTeamEra: state.lifetimeLPThisTeamEra,
        teamEraCount: state.teamEraCount,
        unspentLP: state.legacyPoints,
      };
      const tpEarned = calculateTeamPoints(stats);
      const newTP = state.teamPoints + tpEarned;
      const newLifetimeTP = state.lifetimeTeamPoints + tpEarned;

      set({
        ...createInitialState(),
        // Team layer persists
        teamPoints: newTP,
        lifetimeTeamPoints: newLifetimeTP,
        teamUpgradeLevels: state.teamUpgradeLevels,
        teamEraCount: state.teamEraCount + 1,
        lifetimeLPThisTeamEra: 0,
        // Owner layer persists
        ownerPoints: state.ownerPoints,
        lifetimeOwnerPoints: state.lifetimeOwnerPoints,
        ownerUpgradeLevels: state.ownerUpgradeLevels,
        ownerEraCount: state.ownerEraCount,
        lifetimeTPThisOwnerEra: state.lifetimeTPThisOwnerEra + tpEarned,
        // Track layer persists
        trackPrestigeTokens: state.trackPrestigeTokens,
        lifetimeTrackTokens: state.lifetimeTrackTokens,
        trackPerkLevels: state.trackPerkLevels,
        trackEraCount: state.trackEraCount,
        lifetimeOPThisTrackEra: state.lifetimeOPThisTrackEra,
        hostedEvents: state.hostedEvents,
        ownedTrackConfig: state.ownedTrackConfig,
        workshopLevels: (state.trackPerkLevels.track_eternal ?? 0) > 0 ? state.workshopLevels : {},
        // Attributes persist through Team Reset
        racerAttributes: createDefaultAttributes(),
        // Feature unlocks never reset
        unlockedFeatures: state.unlockedFeatures,
        defeatedRivalIds: state.defeatedRivalIds,
        discoveredBlueprintIds: state.discoveredBlueprintIds,
        lifetimeLPAllTime: state.lifetimeLPAllTime,
        lifetimeScrapResets: state.lifetimeScrapResets,
        // Standard gear persists
        equippedGear: state.equippedGear,
        ownedGearIds: state.ownedGearIds,
        // Challenges persist
        completedChallenges: state.completedChallenges,
        // Crew resets on Team Reset
        crewRoster: [],
        crewSlots: 1 + (state.teamUpgradeLevels["team_crew_slots"] ?? 0),
        // Log persists
        activityLog: state.activityLog,
        _logIdCounter: state._logIdCounter,
        // Lifetime stats persist
        lifetimeTotalDecomposed: state.lifetimeTotalDecomposed,
        lifetimeTotalEnhanced: state.lifetimeTotalEnhanced,
        lifetimeTotalTradeUps: state.lifetimeTotalTradeUps,
        lifetimeTotalRaceSalvage: state.lifetimeTotalRaceSalvage,
        highestConditionReached: state.highestConditionReached,
        // Achievements & lifetime stats persist through all resets
        earnedAchievements: state.earnedAchievements,
        lifetimeRacesAllTime: state.lifetimeRacesAllTime,
        lifetimeWinsAllTime: state.lifetimeWinsAllTime,
        lifetimeScrapBucksAllTime: state.lifetimeScrapBucksAllTime,
        lifetimePartsScavengedAllTime: state.lifetimePartsScavengedAllTime,
        lifetimeVehiclesBuiltAllTime: state.lifetimeVehiclesBuiltAllTime,
        bestWinStreakAllTime: state.bestWinStreakAllTime,
        highestVehicleTierBuilt: state.highestVehicleTierBuilt,
        totalForgeTokensEarned: state.totalForgeTokensEarned,
        uniqueVehicleTypesBuilt: state.uniqueVehicleTypesBuilt,
        // Playstyle nodes RESET on Team Reset
        unlockedPlaystyleNodes: [],
      });
      _appendLog(set, get, "prestige", `Team Reset! Earned ${tpEarned} Team Points`, {});
      (get() as GameState).checkFeatureUnlocks();
      (get() as GameState).checkAchievements();
    },

    purchaseTeamUpgrade: (upgradeId: string) => {
      const state = get() as GameState;
      const def = TEAM_UPGRADES_BY_ID[upgradeId];
      if (!def) return;
      const currentLevel = state.teamUpgradeLevels[upgradeId] ?? 0;
      if (currentLevel >= def.maxLevel) return;
      const cost = teamUpgradeCost(def, currentLevel + 1);
      if (state.teamPoints < cost) return;
      set({
        teamPoints: state.teamPoints - cost,
        teamUpgradeLevels: { ...state.teamUpgradeLevels, [upgradeId]: currentLevel + 1 },
      });
    },

    ownerReset: () => {
      const state = get() as GameState;
      const stats = {
        lifetimeTPThisOwnerEra: state.lifetimeTPThisOwnerEra,
        ownerEraCount: state.ownerEraCount,
        unspentTP: state.teamPoints,
      };
      const opEarned = calculateOwnerPoints(stats);
      const newOP = state.ownerPoints + opEarned;
      const newLifetimeOP = state.lifetimeOwnerPoints + opEarned;

      set({
        ...createInitialState(),
        // Owner layer persists
        ownerPoints: newOP,
        lifetimeOwnerPoints: newLifetimeOP,
        ownerUpgradeLevels: state.ownerUpgradeLevels,
        ownerEraCount: state.ownerEraCount + 1,
        lifetimeTPThisOwnerEra: 0,
        // Track layer persists
        trackPrestigeTokens: state.trackPrestigeTokens,
        lifetimeTrackTokens: state.lifetimeTrackTokens,
        trackPerkLevels: state.trackPerkLevels,
        trackEraCount: state.trackEraCount,
        lifetimeOPThisTrackEra: state.lifetimeOPThisTrackEra + opEarned,
        hostedEvents: state.hostedEvents,
        ownedTrackConfig: state.ownedTrackConfig,
        workshopLevels: (state.trackPerkLevels.track_eternal ?? 0) > 0 ? state.workshopLevels : {},
        // Feature unlocks never reset
        unlockedFeatures: state.unlockedFeatures,
        defeatedRivalIds: state.defeatedRivalIds,
        discoveredBlueprintIds: state.discoveredBlueprintIds,
        lifetimeLPAllTime: state.lifetimeLPAllTime,
        lifetimeScrapResets: state.lifetimeScrapResets,
        // Standard gear persists
        equippedGear: state.equippedGear,
        ownedGearIds: state.ownedGearIds,
        completedChallenges: state.completedChallenges,
        activityLog: state.activityLog,
        _logIdCounter: state._logIdCounter,
        lifetimeTotalDecomposed: state.lifetimeTotalDecomposed,
        lifetimeTotalEnhanced: state.lifetimeTotalEnhanced,
        lifetimeTotalTradeUps: state.lifetimeTotalTradeUps,
        lifetimeTotalRaceSalvage: state.lifetimeTotalRaceSalvage,
        highestConditionReached: state.highestConditionReached,
        // Achievements & lifetime stats persist through all resets
        earnedAchievements: state.earnedAchievements,
        lifetimeRacesAllTime: state.lifetimeRacesAllTime,
        lifetimeWinsAllTime: state.lifetimeWinsAllTime,
        lifetimeScrapBucksAllTime: state.lifetimeScrapBucksAllTime,
        lifetimePartsScavengedAllTime: state.lifetimePartsScavengedAllTime,
        lifetimeVehiclesBuiltAllTime: state.lifetimeVehiclesBuiltAllTime,
        bestWinStreakAllTime: state.bestWinStreakAllTime,
        highestVehicleTierBuilt: state.highestVehicleTierBuilt,
        totalForgeTokensEarned: state.totalForgeTokensEarned,
        uniqueVehicleTypesBuilt: state.uniqueVehicleTypesBuilt,
        // Playstyle nodes reset on Team Reset (already reset in parent layer)
        unlockedPlaystyleNodes: [],
      });
      _appendLog(set, get, "prestige", `Owner Reset! Earned ${opEarned} Owner Points`, {});
      (get() as GameState).checkFeatureUnlocks();
      (get() as GameState).checkAchievements();
    },

    purchaseOwnerUpgrade: (upgradeId: string) => {
      const state = get() as GameState;
      const def = OWNER_UPGRADES_BY_ID[upgradeId];
      if (!def) return;
      const currentLevel = state.ownerUpgradeLevels[upgradeId] ?? 0;
      if (currentLevel >= def.maxLevel) return;
      const cost = ownerUpgradeCost(def, currentLevel + 1);
      if (state.ownerPoints < cost) return;
      const unlockedFeatures = [...state.unlockedFeatures];
      const feature = def.effect.type === "unlock_adv_circuits" ? "advanced_circuits" : def.effect.type === "unlock_t9_vehicles" ? "vehicle_mastery" : def.effect.type === "unlock_research" ? "new_workshop_cats" : null;
      if (feature && !unlockedFeatures.includes(feature)) unlockedFeatures.push(feature);
      set({
        ownerPoints: state.ownerPoints - cost,
        ownerUpgradeLevels: { ...state.ownerUpgradeLevels, [upgradeId]: currentLevel + 1 },
        unlockedFeatures,
        autoScavengeUnlocked: state.autoScavengeUnlocked || def.effect.type === "auto_all",
        autoRaceUnlocked: state.autoRaceUnlocked || def.effect.type === "auto_all",
      });
    },

    trackReset: () => {
      const state = get() as GameState;
      const stats = {
        lifetimeOPThisTrackEra: state.lifetimeOPThisTrackEra,
        trackEraCount: state.trackEraCount,
        unspentOP: state.ownerPoints,
      };
      const ptEarned = calculateTrackTokens(stats);
      const newPT = state.trackPrestigeTokens + ptEarned;
      const newLifetimePT = state.lifetimeTrackTokens + ptEarned;

      set({
        ...createInitialState(),
        // Track layer persists
        trackPrestigeTokens: newPT,
        lifetimeTrackTokens: newLifetimePT,
        trackPerkLevels: state.trackPerkLevels,
        trackEraCount: state.trackEraCount + 1,
        lifetimeOPThisTrackEra: 0,
        ownedTrackConfig: state.ownedTrackConfig,
        workshopLevels: (state.trackPerkLevels.track_eternal ?? 0) > 0 ? state.workshopLevels : {},
        // Feature unlocks never reset
        unlockedFeatures: state.unlockedFeatures,
        defeatedRivalIds: state.defeatedRivalIds,
        discoveredBlueprintIds: state.discoveredBlueprintIds,
        lifetimeLPAllTime: state.lifetimeLPAllTime,
        lifetimeScrapResets: state.lifetimeScrapResets,
        // Standard gear persists
        equippedGear: state.equippedGear,
        ownedGearIds: state.ownedGearIds,
        completedChallenges: state.completedChallenges,
        activityLog: state.activityLog,
        _logIdCounter: state._logIdCounter,
        lifetimeTotalDecomposed: state.lifetimeTotalDecomposed,
        lifetimeTotalEnhanced: state.lifetimeTotalEnhanced,
        lifetimeTotalTradeUps: state.lifetimeTotalTradeUps,
        lifetimeTotalRaceSalvage: state.lifetimeTotalRaceSalvage,
        highestConditionReached: state.highestConditionReached,
        // Achievements & lifetime stats persist through all resets
        earnedAchievements: state.earnedAchievements,
        lifetimeRacesAllTime: state.lifetimeRacesAllTime,
        lifetimeWinsAllTime: state.lifetimeWinsAllTime,
        lifetimeScrapBucksAllTime: state.lifetimeScrapBucksAllTime,
        lifetimePartsScavengedAllTime: state.lifetimePartsScavengedAllTime,
        lifetimeVehiclesBuiltAllTime: state.lifetimeVehiclesBuiltAllTime,
        bestWinStreakAllTime: state.bestWinStreakAllTime,
        highestVehicleTierBuilt: state.highestVehicleTierBuilt,
        totalForgeTokensEarned: state.totalForgeTokensEarned,
        uniqueVehicleTypesBuilt: state.uniqueVehicleTypesBuilt,
        // Playstyle nodes reset
        unlockedPlaystyleNodes: [],
      });
      _appendLog(set, get, "prestige", `Track Reset! Earned ${ptEarned} Prestige Tokens`, {});
      (get() as GameState).checkFeatureUnlocks();
      (get() as GameState).checkAchievements();
    },

    purchaseTrackPerk: (perkId: string) => {
      const state = get() as GameState;
      const def = TRACK_PERKS_BY_ID[perkId];
      if (!def) return;
      const currentLevel = state.trackPerkLevels[perkId] ?? 0;
      if (currentLevel >= def.maxLevel) return;
      const cost = trackPerkCost(def, currentLevel + 1);
      if (state.trackPrestigeTokens < cost) return;
      const unlockedFeatures = def.effect.type === "custom_circuits" && !state.unlockedFeatures.includes("track_customization") ? [...state.unlockedFeatures, "track_customization"] : state.unlockedFeatures;
      let crewRoster = state.crewRoster;
      let crewSlots = state.crewSlots;
      if (def.effect.type === "crew_auto_recruit" && currentLevel === 0) {
        crewSlots = Math.max(crewSlots, 4);
        crewRoster = (["mechanic", "scout", "driver", "trader"] as CrewRole[]).map((role, index) => ({ id: `academy_${role}`, name: ["Mara", "Rook", "Ace", "Ledger"][index], role, level: 1, xp: 0, specialization: null }));
      }
      set({
        trackPrestigeTokens: state.trackPrestigeTokens - cost,
        trackPerkLevels: { ...state.trackPerkLevels, [perkId]: currentLevel + 1 },
        unlockedFeatures,
        crewRoster,
        crewSlots,
      });
    },

    allocateAttribute: (attr: AttributeName, delta: number) => {
      const state = get() as GameState;
      const current = state.racerAttributes[attr];
      const newVal = Math.max(0, Math.min(20, current + delta));
      if (newVal === current) return;
      // Check available points
      const maxPoints = (state.teamUpgradeLevels["team_attr_points"] ?? 0) * 2;
      const totalUsed = Object.values(state.racerAttributes).reduce((a, b) => a + b, 0);
      if (delta > 0 && totalUsed >= maxPoints) return;
      set({
        racerAttributes: { ...state.racerAttributes, [attr]: newVal },
      });
    },

    recruitCrewMember: (role: CrewRole) => {
      const state = get() as GameState;
      if (state.teamEraCount < 1 || state.crewRoster.length >= state.crewSlots || state.teamPoints < 1) return;
      const names: Record<CrewRole, string[]> = { mechanic: ["Mara", "Wrench", "June"], scout: ["Scout", "Rook", "Piper"], driver: ["Ace", "Nova", "Mick"], trader: ["Ledger", "Cass", "Hank"] };
      const startingLevel = 1 + Math.floor(getGameEffectValue(OWNER_UPGRADE_DEFINITIONS, state.ownerUpgradeLevels, "crew_starting_level"));
      const member: CrewMember = { id: `crew_${Date.now()}_${state.crewRoster.length}`, name: names[role][state.crewRoster.filter((crew) => crew.role === role).length % names[role].length], role, level: startingLevel, xp: startingLevel <= 1 ? 0 : 50 * (Math.pow(2, startingLevel - 1) - 1), specialization: null };
      set((current: GameState) => ({ teamPoints: current.teamPoints - 1, crewRoster: [...current.crewRoster, member] }));
    },

    specializeCrewMember: (crewId: string, spec: string) => {
      const state = get() as GameState;
      set({
        crewRoster: state.crewRoster.map((m) =>
          m.id === crewId && m.level >= 5 ? { ...m, specialization: spec as CrewMember["specialization"] } : m
        ),
      });
    },

    checkFeatureUnlocks: () => {
      const state = get() as GameState;
      const stats = {
        lifetimeScrapResets: state.lifetimeScrapResets,
        lifetimeLPAllTime: state.lifetimeLPAllTime,
        lifetimeTeamPoints: state.lifetimeTeamPoints,
        teamEraCount: state.teamEraCount,
        ownerEraCount: state.ownerEraCount,
        trackEraCount: state.trackEraCount,
        reachedCircuitTier: deriveHighestCircuitTier(state.unlockedCircuitIds),
        reachedCircuitTierCount: 0,
      };
      const newUnlocked = [...state.unlockedFeatures];
      const newEvents = [...state.unlockEvents];
      for (const condition of FEATURE_UNLOCK_DEFINITIONS) {
        if (!newUnlocked.includes(condition.id) && checkFeatureUnlock(condition, stats)) {
          newUnlocked.push(condition.id);
          newEvents.push(`Feature Unlocked: ${condition.name}!`);
        }
      }
      if (newUnlocked.length > state.unlockedFeatures.length) {
        set({ unlockedFeatures: newUnlocked, unlockEvents: newEvents });
      }
    },

    checkAchievements: () => {
      const state = get() as GameState;
      const stats: AchievementStats = {
        lifetimeRacesAllTime: state.lifetimeRacesAllTime,
        lifetimeWinsAllTime: state.lifetimeWinsAllTime,
        lifetimeScrapBucksAllTime: state.lifetimeScrapBucksAllTime,
        lifetimePartsScavengedAllTime: state.lifetimePartsScavengedAllTime,
        lifetimeVehiclesBuiltAllTime: state.lifetimeVehiclesBuiltAllTime,
        bestWinStreakAllTime: state.bestWinStreakAllTime,
        highestVehicleTierBuilt: state.highestVehicleTierBuilt,
        totalForgeTokensEarned: state.totalForgeTokensEarned,
        uniqueVehicleTypesBuiltCount: state.uniqueVehicleTypesBuilt.length,
        lifetimeScrapResets: state.lifetimeScrapResets,
        lifetimeLPAllTime: state.lifetimeLPAllTime,
        teamEraCount: state.teamEraCount,
        ownerEraCount: state.ownerEraCount,
        lifetimeTotalDecomposed: state.lifetimeTotalDecomposed,
        highestConditionReached: state.highestConditionReached,
      };
      const newlyEarned = checkAchievements(stats, state.earnedAchievements);
      if (newlyEarned.length > 0) {
        const newEvents = [...state.unlockEvents];
        for (const id of newlyEarned) {
          const def = ACHIEVEMENTS_BY_ID[id];
          if (def) {
            const rewardText = def.reward.type === "bonus" ? ` — ${def.reward.description}` : def.reward.type === "title" ? ` — Title: ${def.reward.title}` : "";
            newEvents.push(`Achievement: ${def.name}!${rewardText}`);
          }
        }
        set({
          earnedAchievements: [...state.earnedAchievements, ...newlyEarned],
          unlockEvents: newEvents,
        });
        _appendLog(set, get, "prestige", `Earned ${newlyEarned.length} achievement(s)`);
      }
    },

    purchasePlaystyleNode: (nodeId: string) => {
      const state = get() as GameState;
      const node = PLAYSTYLE_NODES_BY_ID[nodeId];
      if (!node) return;
      if (!canUnlockPlaystyleNode(nodeId, state.unlockedPlaystyleNodes)) return;
      if (state.legacyPoints < node.lpCost) return;
      set({
        legacyPoints: state.legacyPoints - node.lpCost,
        unlockedPlaystyleNodes: [...state.unlockedPlaystyleNodes, nodeId],
      });
      _appendLog(set, get, "prestige", `Unlocked playstyle node: ${node.name} for ${node.lpCost} LP`, { lpDelta: -node.lpCost });
    },

    respecPlaystylePath: (path: PlaystylePath) => {
      const state = get() as GameState;
      const invested = getPlaystylePathRespecCost(path, state.unlockedPlaystyleNodes);
      if (invested === 0) return;
      const refund = Math.floor(invested * 0.5);
      const remaining = state.unlockedPlaystyleNodes.filter((id) => {
        const n = PLAYSTYLE_NODES_BY_ID[id];
        return n && n.path !== path;
      });
      set({
        unlockedPlaystyleNodes: remaining,
        legacyPoints: state.legacyPoints + refund,
      });
      _appendLog(set, get, "prestige", `Respecced ${path} playstyle path — refunded ${refund} LP`, { lpDelta: refund });
    },

    resetSave: () => {
      set({ ...createInitialState() });
    },

    devResetSave: () => {
      set({ ...createInitialState() });
    },

    devQuickStart: () => {
      const state = get() as GameState;

      // Build a T1 Riding Mower with good-condition parts
      const vehicleDef = getVehicleById("riding_mower");
      if (!vehicleDef) return;

      const partDefs: Record<string, string> = {
        engine: "engine_lawn",
        wheel: "wheel_basic",
        frame: "frame_mower",
      };

      const builtParts: Record<string, InstalledPart> = {};
      for (const [slot, defId] of Object.entries(partDefs)) {
        builtParts[slot] = {
          part: {
            id: `qs_${slot}_${Date.now()}`,
            definitionId: defId,
            condition: "good" as PartCondition,
            foundAt: "dev_quick_start",
            type: "part",
          },
          addons: [],
        };
      }

      const built = buildVehicle(vehicleDef, builtParts, state._vehicleIdCounter);

      set({
        scrapBucks: Math.max(state.scrapBucks, 500),
        lifetimeScrapBucks: Math.max(state.lifetimeScrapBucks, 500),
        repPoints: Math.max(state.repPoints, 50),
        garage: [...state.garage, built],
        activeVehicleId: built.id,
        _vehicleIdCounter: state._vehicleIdCounter + 1,
        unlockedVehicleIds: [...new Set([...state.unlockedVehicleIds, "push_mower", "riding_mower"])],
        unlockedCircuitIds: [...new Set([...state.unlockedCircuitIds, "backyard_derby"])],
        selectedCircuitId: "backyard_derby",
      });
    },
  };
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...createInitialState(),
      ...createActions(set, get),
    }),
    {
      name: PERSISTENCE_STORAGE_KEY,
      version: PERSISTENCE_VERSION,
    storage: createJSONStorage(() => {
      if (typeof localStorage === "undefined") {
        return {
          getItem: () => null,
          setItem: () => undefined,
          removeItem: () => undefined,
        };
      }
      return {
        getItem: (name) => {
          const raw = localStorage.getItem(name);
          backupPersistedStoreBeforeMigration(raw);
          return raw;
        },
        setItem: (name, value) => localStorage.setItem(name, value),
        removeItem: (name) => localStorage.removeItem(name),
      };
    }),
      migrate: migratePersistedState,
      partialize: getPersistedGameState,
    },
  ),
);
