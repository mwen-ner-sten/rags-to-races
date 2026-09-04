"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  backupPersistedStoreBeforeMigration,
  getPersistedGameState,
  mergePersistedGameState,
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
import type { PartCategory, PartCondition } from "@/data/parts";
import { CONDITIONS, CONDITION_ADDON_SLOTS, getPartById } from "@/data/parts";
import { getAddonById } from "@/data/addons";
import type { InstalledPart } from "@/engine/build";
import { getGearBonuses } from "@/engine/gear";
import { random } from "@/utils/random";
import { RARITY_LABELS, type GearSlot, type LootGearItem, type InstalledMod } from "@/data/lootGear";
import { getModTemplateById } from "@/data/gearMods";
import { getEnhancementCost, getMaxEnhancementLevel, getModSlots, getSalvageValue } from "@/engine/gearEnhance";
import { rollGearDrops, rollStationDrops } from "@/engine/gearDrop";
import { calculatePrestigeBonus, calculateScrapResetAward, doPrestige, deriveHighestCircuitTier, getLegacyEffectValue } from "@/engine/prestige";
import { generateRaceEvents } from "@/engine/raceEvents";
import { scavenge, makePartId } from "@/engine/scavenge";
import { buildVehicle, calculateStats, calculateRepairCost, calculateRefurbishCost, degradeCondition, validateBuildSelection } from "@/engine/build";
import { simulateRace, calculateWear, compactRaceHistory } from "@/engine/race";
import { applyRacePayout, collectBonuses, racePerformanceMultiplier, sellValueBonus } from "@/engine/bonuses";
import { vehiclePerformance, withDerivedStats } from "@/engine/performance";
import { getUpgradeEffectValue as _getUpgradeEffectValue, getUpgradeLevel as _getUpgradeLevel } from "@/engine/workshopEffects";
import { decomposePart, decomposeMany } from "@/engine/decompose";
import { getLocationById, normalizeScoutingOrder } from "@/data/locations";
import { getCircuitById, type EventId } from "@/data/circuits";
import { addEventWin, eventWinsFromOutcomes, getEventDefinition, isEventOpen, mergeEventWins, newlyOpenedEventIds, type EventWins } from "@/engine/eventLadder";
import { getActiveEventCircuit } from "@/engine/raceExpectation";
import { evaluateSystemReveals, nextRustedPileSinceTick, SYSTEM_REVEALS_BY_ID, type WorkshopSystem } from "@/data/featureUnlocks";
import { WORKSHOP_REVEAL_PREFIX, WORKSHOP_TABS } from "@/data/workshopTabs";
import { getVehicleById, getVehicleIdsUnlockedByProgress } from "@/data/vehicles";
import { getUpgradeById, getUpgradeCost, UPGRADE_DEFINITIONS } from "@/data/upgrades";
import { INITIAL_MATERIALS, type MaterialType } from "@/data/materials";
import type { DealerListing } from "@/data/dealer";
import { generateDealerBoard, shouldRefreshDealer, isDealerOpen } from "@/data/dealer";
import { CHALLENGE_DEFINITIONS, type ChallengeRewardType } from "@/data/challenges";
import { calculateEnhancementCost, canAffordEnhancement, ARTIFACT_FORGE_COST, ARTIFACT_FORGE_TOKEN_COST } from "@/data/enhancement";
import type { CraftRecipe } from "@/data/craftRecipes";
import { PART_DEFINITIONS } from "@/data/parts";
import { randInt } from "@/utils/random";
import type { RacerSkills, SkillName } from "@/data/racerSkills";
import { createDefaultSkills, levelFromXp, MAX_SKILL_LEVEL } from "@/data/racerSkills";
import { getSkillBonuses } from "@/engine/skills";
import { TEAM_UPGRADES_BY_ID, teamUpgradeCost } from "@/data/teamUpgrades";
import { OWNER_UPGRADE_DEFINITIONS, OWNER_UPGRADES_BY_ID, ownerUpgradeCost } from "@/data/ownerUpgrades";
import { TRACK_PERK_DEFINITIONS, TRACK_PERKS_BY_ID, trackPerkCost } from "@/data/trackPerks";
import { calculateTeamPoints, calculateOwnerPoints, calculateTrackTokens } from "@/engine/prestige";
import { FEATURE_UNLOCK_DEFINITIONS, checkFeatureUnlock } from "@/data/featureUnlocks";
import { getSpecializationsForRole, type CrewMember, type CrewRole } from "@/data/crew";
import { createCrewAtLevel, ensureAcademyRoster, grantCrewRoleXp, grantCrewXp } from "@/engine/crew";
import { getPrestigeMilestoneBonuses, getNewlyUnlockedMilestones } from "@/data/prestigeMilestones";
import { checkAchievements } from "@/engine/achievements";
import { ACHIEVEMENTS_BY_ID, type AchievementStats } from "@/data/achievements";
import { PLAYSTYLE_NODES_BY_ID, canUnlockPlaystyleNode, getPlaystylePathRespecCost, type PlaystylePath } from "@/data/playstyleUpgrades";
import { GARAGE_STATION_IDS, type GarageStationSlot } from "@/data/garageStations";
import type { StationEquipment, StationEquipmentRarity } from "@/data/stationEquipment";
import { forgeStationEquipment, STATION_FORGE_COST } from "@/engine/stationForge";
import { getMaxStationEnhancementLevel, getStationEnhancementCost } from "@/engine/stationEquipment";
import { canReforgeStationEquipment, getStationSalvageYield, reforgeStationEquipment, REFORGE_COST_SHARDS } from "@/engine/stationReforge";
import { DEFAULT_RACE_PLAN, RACE_PLAN_PRESETS, type RacePlan } from "@/data/raceStrategy";
import { getRivalById } from "@/data/rivals";
import type { FleetAssignment } from "@/data/fleet";
import { getGameEffectValue } from "@/data/gameEffects";
import { TEAM_UPGRADE_DEFINITIONS } from "@/data/teamUpgrades";
import { calculateHostedEventTerms, DEFAULT_TRACK_CONFIG, normalizeHostedEventConfig, type HostedEvent, type OwnedTrackConfig } from "@/data/trackVenue";
import { getPartSaleValue } from "@/engine/sale";
import { autoSellJunkParts, getAutoSellThreshold } from "@/engine/autoSell";
import { getPermanentRuntimeBonuses, multiplyReward, reduceMaterialCost } from "@/engine/permanentBonuses";
import { AUTO_RACE_MIN_CONDITION_DEFAULT, LOOSE_INVENTORY_LIMIT, LOOT_GEAR_INVENTORY_LIMIT, PENDING_MANUAL_RACE_ENTRY_FEE_KEY, STATION_EQUIPMENT_INVENTORY_LIMIT } from "@/config/gameplayLimits";
import { canOwnerReset, canScrapReset, canTeamReset, canTrackReset, FATIGUE, getScrapResetProgress, REP_DECAY } from "@/config/progression";
import { fatigueAfterRace, fatigueAfterTick, roundFatigue } from "@/engine/fatigue";
import {
  applyCompletedProjects,
  createEnhanceProject,
  createUpgradeProject,
  ENHANCEMENT_PROJECT_MIN_INDEX,
  findEnhanceProject,
  findUpgradeProject,
  hasFreeProjectSlot,
  projectCancelRefund,
  type Project,
} from "@/engine/projects";
import { formatTime } from "@/utils/format";
import { canEnterSelectedRace, canScavengeSelectedLocation, getVehicleCircuitIneligibilityReason } from "@/engine/eligibility";
import { canAffordRep as canAffordRepCost, getCircuitRepCost, getLocationRepCost, getVehicleRepCost, getWorkshopLineRepCost } from "@/engine/progressionUnlocks";
import {
  BULK_DECOMPOSE_COST,
  FATIGUE_DRINK_COST,
  FATIGUE_DRINK_PROGRESS_KEY,
  FATIGUE_DRINK_RECOVERY,
  FATIGUE_DRINK_RUN_LIMIT,
} from "@/data/workshopActions";

// ── Activity log ────────────────────────────────────────────────────────────
export type LogCategory = "scavenge" | "sell" | "race" | "build" | "upgrade" | "prestige" | "achievement" | "gear" | "craft" | "trade" | "tick";

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

export interface AutomationSettlementMeta {
  partsScavenged: number;
  partsAutoSold: number;
  scavengesCompleted: number;
  racesCompleted: number;
  winsCompleted: number;
  finalWinStreak: number;
  bestWinStreak: number;
  recentRaceOutcomes: RaceOutcome[];
  winningCircuitIds: string[];
  defeatedRivalIds: string[];
  circuitWinStreaks: Record<string, number>;
  /** Exact wins per venue event from a batched simulation; live ticks derive them from the outcomes. */
  eventWins?: EventWins;
  raceSalvageFound: number;
  forgeTokensFound: number;
  entryFeesPaid: number;
  challengesEvaluated: boolean;
  completedChallengeIds: string[];
  challengeForgeTokens: number;
  challengeMaterials: Partial<Record<MaterialType, number>>;
  ticksProcessed: number;
  /** Rep removed by decay over the settled ticks (see REP_DECAY). */
  repDecayed?: number;
  /** Exact evolved state supplied by batched/offline simulation. */
  finalFatigue?: number;
  finalRepPoints?: number;
  finalVehicleCondition?: number | null;
  finalRacerSkills?: RacerSkills;
  finalCrewRoster?: CrewMember[];
  finalActiveMomentumTiers?: string[];
  newAchievementIds?: string[];
  /** Station equipment scavenged over the settled ticks (already bounded by a batched/offline simulation). */
  stationEquipmentDrops?: StationEquipment[];
  /** Automated station drops converted to shards after the inventory ceiling. */
  stationEquipmentAutoSalvaged?: number;
  /** Loose Reforge Shards found while scavenging in a live single-tick settlement. */
  reforgeShardDrops?: number;
  /** Shards already aggregated by a batched/offline simulation. */
  reforgeShardsFound?: number;
  /** Loot gear a batched/offline simulation already auto-salvaged past the Locker ceiling... */
  lootGearAutoSalvaged?: number;
  /** ...and the Scrap Bucks that paid (already inside scrapsEarned). */
  lootGearSalvageScrap?: number;
  /** Projects still running after the settled ticks (engine/projects). */
  finalProjects?: Project[];
  /** Projects that finished during the settled ticks; applied here exactly once. */
  completedProjects?: Project[];
}

const MAX_LOG_ENTRIES = 200;
let raceSessionCounter = 0;

export interface GameState {
  // Currency
  scrapBucks: number;
  /** Spendable Rep balance: pays for unlocks and decays toward the legacy floor. */
  repPoints: number;
  /** Rep earned this run; never reduced by spending or decay. Gates lifetime thresholds. */
  lifetimeRep: number;
  /** Rep earned across every run; never resets. */
  lifetimeRepAllTime: number;
  /** Floor Rep decay cannot cross: 10% of lifetime Rep banked at each Scrap Reset. */
  legacyRepFloor: number;
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
  /** The garage scavenges on its own from the first tick; dev tools can pause it. */
  autoScavengeUnlocked: boolean;
  /** Counts manual scavenge button clicks (drives the opening pity script and stats). */
  manualScavengeClicks: number;
  /** Optional category weighting for manual scavenging only. */
  scoutingOrder: PartCategory | null;

  // Racing
  selectedCircuitId: string;
  isRacing: boolean;
  /** Ephemeral token that prevents an old race timer from settling into a replaced save. */
  activeRaceSessionId: string | null;
  /** Auto-race runs from the first vehicle; dev tools can pause it. */
  autoRaceUnlocked: boolean;
  /** Auto-race waits while the active vehicle's condition is below this. */
  autoRaceMinCondition: number;
  /** Auto-race rests while fatigue is above this (engine/fatigue). */
  autoRaceMaxFatigue: number;
  /** Tick counter toward next auto-race fire (0 to raceTicksNeeded-1) */
  raceTickProgress: number;
  lastRaceOutcome: RaceOutcome | null;
  raceHistory: RaceOutcome[];
  raceEvents: RaceEvent[];
  raceStartTime: number | null;
  precomputedOutcome: RaceOutcome | null;
  currentRacePlan: RacePlan;
  defeatedRivalIds: string[];
  /** Wins per venue event this run; opens Heats and Features (engine/eventLadder). */
  eventWins: EventWins;
  /** Event the player pinned per venue; absent means auto-race picks the best contestable one. */
  pinnedEventIds: Record<string, EventId>;
  /** Workshop systems that have revealed on relevance; never hidden again (data/featureUnlocks). */
  revealedSystems: WorkshopSystem[];
  /** Tick at which a rusted part first sat in the pile (Decompose reveals after a full tick). */
  rustedPileSinceTick: number | null;
  discoveredBlueprintIds: string[];
  fleetAssignments: FleetAssignment[];
  ownedTrackConfig: OwnedTrackConfig;
  hostedEvents: HostedEvent[];

  // Streaks
  winStreak: number;
  bestWinStreak: number;

  // Fatigue (daily rhythm — engine/fatigue)
  fatigue: number;          // 0-99, rises per race, recovers with wall-clock time
  lifetimeRaces: number;    // total races this run (feeds LP and momentum only)

  // Unlock notifications (transient)
  unlockEvents: string[];

  // Activity log (persists through prestige)
  activityLog: ActivityLogEntry[];
  _logIdCounter: number;

  // Loot gear (persists through prestige)
  lootGearInventory: LootGearItem[];
  equippedLootGear: Record<GearSlot, string | null>;
  gearModInventory: InstalledMod[];
  stationEquipmentInventory: StationEquipment[];
  equippedStationEquipment: Record<GarageStationSlot, string | null>;
  reforgeShards: number;

  // Workshop upgrades
  workshopLevels: Record<string, number>;
  /** Timed workshop projects in flight (engine/projects). */
  projects: Project[];

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
  setScoutingOrder: (order: PartCategory | null) => void;
  setAutoRaceMinCondition: (condition: number) => void;
  setAutoRaceMaxFatigue: (fatigue: number) => void;
  setSelectedCircuit: (circuitId: string) => void;
  /** Pin an event at a venue (null lets auto-race choose the best contestable open event). */
  setSelectedEvent: (circuitId: string, eventId: EventId | null) => void;
  /** Record Workshop systems that have become relevant; announces the ones without a tab of their own. */
  checkWorkshopReveals: () => void;
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
  /** Queue an unlock announcement once; duplicates already pending are ignored. */
  announceUnlock: (message: string) => void;
  advanceTutorial: () => void;
  skipTutorial: () => void;
  dismissTutorial: () => void;
  toggleTutorialMinimized: () => void;
  repairVehicle: (vehicleId: string) => void;
  swapPart: (vehicleId: string, slot: string, newPart: ScavengedPart) => void;
  installAddon: (vehicleId: string, slot: string, addonId: string) => void;
  removeAddon: (vehicleId: string, slot: string, addonId: string) => void;
  refurbishPart: (partId: string) => void;
  /** Buy the next level of a workshop line: pays now, starts a timed project. */
  purchaseUpgrade: (upgradeId: string) => void;
  /** Queue a prepared project if a slot is free; returns whether it started. */
  startProject: (project: Project) => boolean;
  /** Abandon a running project and refund half of what it cost. */
  cancelProject: (projectId: string) => void;
  equipLootGear: (lootGearId: string) => void;
  unequipLootGear: (slot: GearSlot) => void;
  enhanceLootGear: (lootGearId: string) => void;
  salvageLootGear: (lootGearId: string) => void;
  installMod: (lootGearId: string, modInstanceId: string) => void;
  removeMod: (lootGearId: string, modIndex: number) => void;
  forgeStationItem: (slot: GarageStationSlot, rarity: StationEquipmentRarity) => void;
  equipStationItem: (itemId: string) => void;
  unequipStationItem: (slot: GarageStationSlot) => void;
  reforgeStationItem: (itemId: string) => void;
  enhanceStationItem: (itemId: string) => void;
  salvageStationItem: (itemId: string) => void;
  /** Spend Rep to open a location (tier-0 entries are free). */
  unlockLocation: (locationId: string) => void;
  /** Spend Rep to open a circuit (tier-0 entries are free). */
  unlockCircuit: (circuitId: string) => void;
  /** Spend Rep to open a Rep-priced vehicle blueprint. */
  unlockVehicle: (vehicleId: string) => void;
  /** Whether the spendable Rep balance covers `cost`. */
  canAffordRep: (cost: number) => boolean;
  prestige: () => void;
  purchaseLegacyUpgrade: (upgradeId: string) => void;
  checkMomentumTiers: () => void;
  applyTickResult: (partsFound: ScavengedPart[], scrapsEarned: number, repEarned: number, vehicleWear?: number, vehicleRepair?: number, newRaceTickProgress?: number, lootGearDrops?: LootGearItem[], modDrops?: InstalledMod[], meta?: AutomationSettlementMeta) => void;

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
    lifetimeRep: 0,
    lifetimeRepAllTime: 0,
    legacyRepFloor: 0,
    lifetimeScrapBucks: 0,
    prestigeCount: 0,
    prestigeBonus: calculatePrestigeBonus({}),
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
    autoScavengeUnlocked: true,
    manualScavengeClicks: 0,
    scoutingOrder: null,
    selectedCircuitId: "backyard_derby",
    isRacing: false,
    activeRaceSessionId: null,
    autoRaceUnlocked: true,
    autoRaceMinCondition: AUTO_RACE_MIN_CONDITION_DEFAULT,
    autoRaceMaxFatigue: FATIGUE.AUTO_RACE_MAX_DEFAULT,
    raceTickProgress: 0,
    lastRaceOutcome: null,
    raceHistory: [],
    raceEvents: [],
    raceStartTime: null,
    precomputedOutcome: null,
    currentRacePlan: { ...DEFAULT_RACE_PLAN },
    defeatedRivalIds: [],
    eventWins: {},
    pinnedEventIds: {},
    revealedSystems: [],
    rustedPileSinceTick: null,
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
    lootGearInventory: [],
    equippedLootGear: { head: null, body: null, hands: null, feet: null, tool: null, accessory: null },
    gearModInventory: [],
    stationEquipmentInventory: [],
    equippedStationEquipment: Object.fromEntries(GARAGE_STATION_IDS.map((slot) => [slot, null])) as Record<GarageStationSlot, string | null>,
    reforgeShards: 0,
    workshopLevels: {},
    projects: [],
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

function getResetVehicleUnlockIds(
  ownerUpgradeLevels: Record<string, number>,
): string[] {
  return getVehicleIdsUnlockedByProgress({
    reputation: 0,
    wonCircuitIds: [],
    circuitWinStreaks: {},
    ownerUpgradeLevels,
  });
}

function getResetCircuitUnlockIds(
  ownerUpgradeLevels: Record<string, number>,
): string[] {
  return (ownerUpgradeLevels.owner_adv_circuits ?? 0) > 0
    ? ["backyard_derby", "continental_grand_prix", "endurance_series"]
    : ["backyard_derby"];
}

/**
 * Rep-priced blueprints are bought with `unlockVehicle`; only race-progress
 * and Owner-upgrade requirements still resolve automatically.
 */
const NO_AUTO_REPUTATION_UNLOCK = 0;

// ── Workshop upgrade helpers (engine/workshopEffects; re-exported for tick.ts and UI) ──
export { _getUpgradeEffectValue, _getUpgradeLevel };

function recalculateGarageStatsForStationEquipment(
  state: GameState,
  equippedStationEquipment: Record<GarageStationSlot, string | null>,
  stationEquipmentInventory: StationEquipment[],
): BuiltVehicle[] {
  const gear = getGearBonuses(
    state.equippedLootGear,
    state.lootGearInventory,
    equippedStationEquipment,
    stationEquipmentInventory,
  );
  const handlingBonus = _getUpgradeEffectValue(state, "tuned_suspension") + gear.race_handling_pct;
  return state.garage.map((vehicle) => {
    const definition = getVehicleById(vehicle.definitionId);
    return definition
      ? { ...vehicle, stats: calculateStats(definition, vehicle.parts, vehicle.condition ?? 100, handlingBonus) }
      : vehicle;
  });
}

/**
 * Sell-value bonus (multiplier − 1) used by manual, bulk, and automated
 * sales. Composed by engine/bonuses so equipment, momentum ("+10% scrap from
 * all sources") and permanent bonuses follow the one algebra.
 */
export function getSellValueBonus(state: GameState): number {
  return sellValueBonus(collectBonuses(state));
}

export function grantTraderSaleXp(state: GameState, itemsSold: number): CrewMember[] {
  if (itemsSold <= 0) return state.crewRoster;
  const multiplier = 1 + getGameEffectValue(
    TEAM_UPGRADE_DEFINITIONS,
    state.teamUpgradeLevels,
    "crew_xp_multiplier",
  );
  return grantCrewRoleXp(state.crewRoster, "trader", itemsSold, multiplier);
}

export function getCrewXpMultiplier(state: GameState): number {
  return 1 + getGameEffectValue(
    TEAM_UPGRADE_DEFINITIONS,
    state.teamUpgradeLevels,
    "crew_xp_multiplier",
  );
}

/** Exact dealer listing price shared by the button and the purchase action. */
export function getDealerPurchasePrice(state: GameState, listing: DealerListing): number {
  return Math.max(
    0,
    Math.floor(
      listing.price * (1 - getPermanentRuntimeBonuses(state).dealerDiscount),
    ),
  );
}

export function getVehicleSaleValue(state: GameState, vehicle: BuiltVehicle): number {
  const definition = getVehicleById(vehicle.definitionId);
  if (!definition) return 0;
  const conditionMultiplier = Math.max(0.1, (vehicle.condition ?? 100) / 100);
  return Math.max(
    1,
    Math.floor(
      definition.sellValue * conditionMultiplier * (1 + getSellValueBonus(state)),
    ),
  );
}

export function getVehicleRepairCost(state: GameState, vehicle: BuiltVehicle): number {
  const definition = getVehicleById(vehicle.definitionId);
  if (!definition || (vehicle.condition ?? 100) >= 100) return 0;
  const gear = getGearBonuses(
    state.equippedLootGear,
    state.lootGearInventory,
    state.equippedStationEquipment,
    state.stationEquipmentInventory,
  );
  const reduction =
    _getUpgradeEffectValue(state, "budget_repairs") +
    gear.repair_cost_reduction_pct +
    getPermanentRuntimeBonuses(state).repairCostReduction;
  return calculateRepairCost(
    definition,
    vehicle.condition ?? 100,
    100,
    reduction,
    state.fatigue,
  );
}

export function getVehicleBuildCost(
  state: GameState,
  definition: NonNullable<ReturnType<typeof getVehicleById>>,
): number {
  const gear = getGearBonuses(
    state.equippedLootGear,
    state.lootGearInventory,
    state.equippedStationEquipment,
    state.stationEquipmentInventory,
  );
  const reduction =
    _getUpgradeEffectValue(state, "bargain_builder") +
    gear.build_cost_reduction_pct +
    getPermanentRuntimeBonuses(state).buildCostReduction;
  return Math.max(0, Math.floor(definition.buildCost * (1 - Math.min(0.95, reduction))));
}

/** Exact refurbishment quote shared by the Junkyard button and store action. */
export function getPartRefurbishQuote(
  state: GameState,
  part: ScavengedPart,
): ReturnType<typeof calculateRefurbishCost> {
  const gear = getGearBonuses(
    state.equippedLootGear,
    state.lootGearInventory,
    state.equippedStationEquipment,
    state.stationEquipmentInventory,
  );
  const reduction =
    _getUpgradeEffectValue(state, "cheap_refurb") +
    gear.refurb_cost_reduction_pct +
    getPermanentRuntimeBonuses(state).repairCostReduction;
  return calculateRefurbishCost(part, reduction);
}

export function getDealerRefreshCost(state: GameState): number {
  const reduction = getGameEffectValue(
    OWNER_UPGRADE_DEFINITIONS,
    state.ownerUpgradeLevels,
    "unlock_cost_reduction",
  );
  return Math.max(0, Math.floor(300 * (1 - reduction)));
}

export function getMaterialSourcingTerms(
  state: GameState,
  material: MaterialType,
): { available: boolean; cost: number; yield: number } {
  const synthesis = getGameEffectValue(
    OWNER_UPGRADE_DEFINITIONS,
    state.ownerUpgradeLevels,
    "material_conversion",
  );
  const basicMaterials: MaterialType[] = [
    "metalScrap",
    "rubberCompound",
    "greaseSludge",
  ];
  return {
    available: synthesis > 0 || basicMaterials.includes(material),
    cost: synthesis > 0 ? 100 : 200,
    yield: multiplyReward(
      synthesis > 0 ? 10 : 5,
      getPermanentRuntimeBonuses(state).materialYieldMult,
    ),
  };
}

export function getReducedEnhancementCost(
  state: GameState,
  cost: Partial<Record<MaterialType, number>>,
): Partial<Record<MaterialType, number>> {
  return reduceMaterialCost(
    cost,
    getPermanentRuntimeBonuses(state).enhancementCostReduction,
  );
}

export function getReducedCraftCost(
  state: GameState,
  cost: Partial<Record<MaterialType, number>>,
): Partial<Record<MaterialType, number>> {
  return reduceMaterialCost(
    cost,
    getPermanentRuntimeBonuses(state).craftCostReduction,
  );
}

export interface VehicleLoadoutResolution {
  valid: boolean;
  reason: string | null;
  parts: Record<string, InstalledPart>;
  inventory: ScavengedPart[];
}

/** Resolve a named loadout against current (possibly degraded) parts safely. */
export function resolveVehicleLoadout(
  vehicle: BuiltVehicle,
  inventory: readonly ScavengedPart[],
  loadout: VehicleLoadout,
): VehicleLoadoutResolution {
  const invalid = (reason: string): VehicleLoadoutResolution => ({
    valid: false,
    reason,
    parts: {},
    inventory: [...inventory],
  });
  const definition = getVehicleById(vehicle.definitionId);
  if (!definition || loadout.vehicleId !== vehicle.id || loadout.vehicleDefinitionId !== vehicle.definitionId) {
    return invalid("This loadout belongs to a different vehicle");
  }

  const available = [
    ...inventory,
    ...Object.values(vehicle.parts).flatMap((installed) => [installed.part, ...installed.addons]),
  ];
  const byId = new Map(available.map((part) => [part.id, part]));
  const usedIds = new Set<string>();
  const parts: Record<string, InstalledPart> = {};

  for (const [slot, saved] of Object.entries(loadout.parts)) {
    const slotDefinition = definition.slots.find((candidate) => candidate.slot === slot);
    if (!slotDefinition) return invalid(`Saved slot ${slot} is not valid for this vehicle`);
    const part = byId.get(saved.partId);
    if (!part) return invalid(`The saved ${slot} part is no longer available`);
    if (usedIds.has(part.id)) return invalid("A saved item is assigned more than once");
    if (getAddonById(part.definitionId) || !slotDefinition.acceptableParts.includes(part.definitionId)) {
      return invalid(`The saved ${slot} part is no longer compatible`);
    }

    const addons: ScavengedPart[] = [];
    for (const addonId of saved.addonIds) {
      const addon = byId.get(addonId);
      const addonDefinition = addon ? getAddonById(addon.definitionId) : undefined;
      if (!addon || !addonDefinition) return invalid(`A saved ${slot} add-on is no longer available`);
      if (usedIds.has(addon.id) || addon.id === part.id) return invalid("A saved item is assigned more than once");
      if (addonDefinition.targetSlot !== slot) return invalid(`A saved add-on is not compatible with ${slot}`);
      usedIds.add(addon.id);
      addons.push(addon);
    }

    const capacity = CONDITION_ADDON_SLOTS[part.condition as PartCondition] ?? 0;
    if (addons.length > capacity) {
      return invalid(`Saved ${slot} uses ${addons.length} add-ons, but ${part.condition} condition allows ${capacity}`);
    }
    usedIds.add(part.id);
    parts[slot] = { part, addons };
  }

  for (const slot of definition.slots) {
    if (slot.required && !parts[slot.slot]) return invalid(`The loadout is missing its required ${slot.slot} part`);
  }

  return {
    valid: true,
    reason: null,
    parts,
    inventory: available.filter((part) => !usedIds.has(part.id)),
  };
}

export function getWorkshopUpgradePurchaseCost(
  state: GameState,
  upgradeId: string,
): number | null {
  const definition = getUpgradeById(upgradeId);
  if (!definition) return null;
  const currentLevel = state.workshopLevels[upgradeId] ?? 0;
  if (currentLevel >= definition.maxLevel) return 0;
  const milestoneReduction = getPrestigeMilestoneBonuses(
    state.prestigeCount,
  ).workshopCostReduction;
  const philosophyReduction = getPermanentRuntimeBonuses(
    state,
  ).workshopCostReduction;
  return Math.max(
    0,
    Math.floor(
      getUpgradeCost(definition, currentLevel) *
        (1 - Math.min(0.95, milestoneReduction + philosophyReduction)),
    ),
  );
}

/**
 * Check all challenge definitions against the current progress snapshot.
 * Returns newly-completed challenge IDs and their combined rewards.
 */
export function checkChallenges(
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

export interface ChallengeRewardBundle {
  scrap: number;
  forgeTokens: number;
  materials: Partial<Record<MaterialType, number>>;
}

/** Normalize every challenge reward through permanent economy bonuses. */
export function calculateChallengeRewardBundle(
  state: GameState,
  rewards: ChallengeRewardType[],
): ChallengeRewardBundle {
  const permanent = getPermanentRuntimeBonuses(state);
  const scrap = multiplyReward(
    rewards.reduce(
      (total, reward) => total + (reward.type === "scrap" ? reward.amount : 0),
      0,
    ),
    permanent.allScrapIncomeMult,
  );
  const forgeTokens = rewards.reduce(
    (total, reward) =>
      total + (reward.type === "forgeToken" ? reward.amount : 0),
    0,
  );
  const materials: Partial<Record<MaterialType, number>> = {};
  for (const reward of rewards) {
    if (reward.type !== "material") continue;
    materials[reward.material] =
      (materials[reward.material] ?? 0) +
      multiplyReward(reward.amount, permanent.materialYieldMult);
  }
  return { scrap, forgeTokens, materials };
}

export function addRewardMaterials(
  materials: Record<MaterialType, number>,
  rewards: Partial<Record<MaterialType, number>>,
): Record<MaterialType, number> {
  const updated = { ...materials };
  for (const [material, amount] of Object.entries(rewards) as [MaterialType, number][]) {
    updated[material] = (updated[material] ?? 0) + amount;
  }
  return updated;
}

function challengeCompletionEvents(completedIds: string[]): string[] {
  return completedIds.map((id) => {
    const challenge = CHALLENGE_DEFINITIONS.find((candidate) => candidate.id === id);
    return challenge
      ? `Challenge Complete: ${challenge.name}! ${challenge.completionText}`
      : `Challenge Complete: ${id}`;
  });
}

function announceChallengeCompletions(
  set: SetState,
  get: GetState,
  completedIds: string[],
  bundle: ChallengeRewardBundle,
): void {
  if (completedIds.length === 0) return;
  const rewardParts = [
    bundle.scrap > 0 ? `$${bundle.scrap}` : "",
    bundle.forgeTokens > 0 ? `${bundle.forgeTokens} Forge Token${bundle.forgeTokens === 1 ? "" : "s"}` : "",
    ...Object.entries(bundle.materials).map(([material, amount]) => `${amount} ${material}`),
  ].filter(Boolean);
  for (const id of completedIds) {
    const challenge = CHALLENGE_DEFINITIONS.find((candidate) => candidate.id === id);
    _appendLog(
      set,
      get,
      "upgrade",
      `Challenge complete: ${challenge?.name ?? id}${rewardParts.length > 0 ? ` — ${rewardParts.join(", ")}` : ""}`,
    );
  }
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
export function _grantXp(skills: RacerSkills, skill: SkillName, amount: number): RacerSkills {
  const current = skills[skill];
  const newXp = current.xp + amount;
  const { level } = levelFromXp(newXp);
  return {
    ...skills,
    [skill]: { xp: newXp, level: Math.min(level, MAX_SKILL_LEVEL) },
  };
}

function _selectBestBuildParts(vehicleId: string, inventory: ScavengedPart[]): Record<string, ScavengedPart> {
  const vehicle = getVehicleById(vehicleId);
  if (!vehicle) return {};
  const selected: Record<string, ScavengedPart> = {};
  const usedIds = new Set<string>();
  for (const slot of vehicle.slots) {
    const best = inventory
      .filter((part) => part.type === "part" && !usedIds.has(part.id) && slot.acceptableParts.includes(part.definitionId))
      .sort((left, right) => {
        const conditionDelta = CONDITIONS.indexOf(right.condition) - CONDITIONS.indexOf(left.condition);
        if (conditionDelta !== 0) return conditionDelta;
        const leftDefinition = getPartById(left.definitionId);
        const rightDefinition = getPartById(right.definitionId);
        const leftScore = (leftDefinition?.basePower ?? 0) + (leftDefinition?.baseReliability ?? 0) - (leftDefinition?.baseWeight ?? 0) * 0.01;
        const rightScore = (rightDefinition?.basePower ?? 0) + (rightDefinition?.baseReliability ?? 0) - (rightDefinition?.baseWeight ?? 0) * 0.01;
        return rightScore - leftScore;
      })[0];
    if (!best) continue;
    selected[slot.slot] = best;
    usedIds.add(best.id);
  }
  return selected;
}

/**
 * What auto-salvaging a loot gear piece pays: the Locker's own Salvage price
 * (engine/gearEnhance) under the recycler line and permanent income bonuses.
 */
export function getLootGearSalvageScrap(state: GameState, item: LootGearItem): number {
  return multiplyReward(
    getSalvageValue(item, _getUpgradeEffectValue(state, "gear_recycler")),
    getPermanentRuntimeBonuses(state).allScrapIncomeMult,
  );
}

/**
 * The Locker keeps what fits under LOOT_GEAR_INVENTORY_LIMIT; every drop past
 * it is salvaged for Scrap Bucks on the spot (config/gameplayLimits).
 */
function settleLootGearDrops(
  state: GameState,
  ownedCount: number,
  drops: LootGearItem[],
): { kept: LootGearItem[]; salvaged: LootGearItem[]; scrap: number } {
  const room = Math.max(0, LOOT_GEAR_INVENTORY_LIMIT - ownedCount);
  const kept = drops.slice(0, room);
  const salvaged = drops.slice(room);
  const scrap = salvaged.reduce((total, item) => total + getLootGearSalvageScrap(state, item), 0);
  return { kept, salvaged, scrap };
}

/** Stations keep what fits under STATION_EQUIPMENT_INVENTORY_LIMIT; the rest becomes Reforge Shards. */
function settleStationDrops(
  state: GameState,
  ownedCount: number,
  drops: StationEquipment[],
): { kept: StationEquipment[]; salvaged: StationEquipment[]; shards: number } {
  const room = Math.max(0, STATION_EQUIPMENT_INVENTORY_LIMIT - ownedCount);
  const kept = drops.slice(0, room);
  const salvaged = drops.slice(room);
  const shards = salvaged.reduce(
    (total, item) => total + getStationSalvageYield(item, state.workshopLevels.mod_hunter ?? 0, state.workshopLevels.gear_recycler ?? 0),
    0,
  );
  return { kept, salvaged, shards };
}

/** Toast copy for a loot gear drop: "Found Rare Chrome Gloves". */
export function lootGearDropAnnouncement(item: LootGearItem): string {
  return `Found ${RARITY_LABELS[item.rarity]} ${item.name}`;
}

/** Toast copy for a gear mod drop. */
export function gearModDropAnnouncement(mod: InstalledMod): string {
  return `Gear Mod: ${mod.name}!`;
}

/** Toast copy for scavenged station equipment. */
function stationDropAnnouncement(items: StationEquipment[]): string {
  return `Station Equipment: ${items.map((item) => item.name).join(", ")}!`;
}

function _randomStartingWorkshopLevels(count: number): Record<string, number> {
  if (count <= 0) return {};
  const candidates = UPGRADE_DEFINITIONS
    .filter((upgrade) => !upgrade.unlockRequirement)
    .map((upgrade) => upgrade.id)
    .sort(() => random() - 0.5)
    .slice(0, count);
  return Object.fromEntries(candidates.map((id) => [id, 1]));
}

function hasFleetAssignment(state: GameState, vehicleId: string): boolean {
  return state.fleetAssignments.some((assignment) => assignment.vehicleId === vehicleId);
}

function isVehicleMutationLocked(state: GameState, vehicleId: string): boolean {
  return hasFleetAssignment(state, vehicleId)
    || (state.isRacing && state.activeVehicleId === vehicleId);
}

function createActions(set: SetState, get: GetState) {
  return {
    manualScavenge: () => {
      const state = get() as GameState;
      if (!canScavengeSelectedLocation(state)) return;
      const location = getLocationById(state.selectedLocationId);
      if (!location) return;
      const extraLuck = _getUpgradeEffectValue(state, "keen_eye");
      const extraParts = Math.floor(_getUpgradeEffectValue(state, "deep_pockets"));
      const fatigue = state.fatigue;
      const gb = getGearBonuses(state.equippedLootGear, state.lootGearInventory, state.equippedStationEquipment, state.stationEquipmentInventory);
      const scavSkill = getSkillBonuses(state.racerSkills, location.tier);
      const milestoneBonuses = getPrestigeMilestoneBonuses(state.prestigeCount);
      const permanentBonuses = getPermanentRuntimeBonuses(state);
      const scoutingOrder = normalizeScoutingOrder(state.scoutingOrder, location);
      const scavengeLuck = state.prestigeBonus.luckBonus + milestoneBonuses.scavengeLuckBonus + permanentBonuses.scavengeLuckBonus + extraLuck + scavSkill.scavengingLuckBonus;
      const scavengeYield = gb.scavenge_yield_pct + scavSkill.scavengingYieldBonus + milestoneBonuses.scavengeYieldMult + permanentBonuses.scavengeYieldMult;
      const parts = scavenge(location, scavengeLuck, fatigue, gb.scavenge_luck_bonus, scavengeYield, permanentBonuses.scavengeQualityBonus, scoutingOrder);
      for (let i = 0; i < extraParts; i++) {
        const bonus = scavenge(location, scavengeLuck, fatigue, gb.scavenge_luck_bonus, scavengeYield, permanentBonuses.scavengeQualityBonus, scoutingOrder);
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
      // Tick-one auto-sell is the rule on every path, manual clicks included:
      // a rusted find never reaches inventory, it becomes Scrap Bucks the
      // instant it is found. The player still gets to see what they found via
      // the activity log below, which names each auto-sold part and its price.
      const autoSale = autoSellJunkParts(parts, getAutoSellThreshold(state), getSellValueBonus(state));
      // The junkyard is where shop equipment turns up: station gear and loose shards.
      const { stationDrops, shardDrop } = rollStationDrops({
        sourceTier: location.tier,
        sourceId: location.id,
        lifetimeRep: state.lifetimeRep,
        gearDropRateScavengeBonus: _getUpgradeEffectValue(state, "gear_scavenger") + getGameEffectValue(TEAM_UPGRADE_DEFINITIONS, state.teamUpgradeLevels, "gear_drop_rate"),
        rarityBonus: Math.floor(_getUpgradeEffectValue(state, "rarity_sense")),
        doubleDropChance: _getUpgradeEffectValue(state, "double_drop"),
        modDropRateBonus: _getUpgradeEffectValue(state, "mod_hunter"),
      });
      const stationFinds = settleStationDrops(state, state.stationEquipmentInventory.length, stationDrops);
      set((s: GameState) => {
        const newClicks = s.manualScavengeClicks + 1;
        let updatedCrew = grantCrewRoleXp(s.crewRoster, "scout", 5, getCrewXpMultiplier(s));
        if (autoSale.soldParts.length > 0) updatedCrew = grantTraderSaleXp({ ...s, crewRoster: updatedCrew }, autoSale.soldParts.length);
        return {
          inventory: [...s.inventory, ...autoSale.keptParts],
          scrapBucks: s.scrapBucks + autoSale.scrapEarned,
          lifetimeScrapBucks: s.lifetimeScrapBucks + autoSale.scrapEarned,
          stationEquipmentInventory: stationFinds.kept.length > 0 ? [...s.stationEquipmentInventory, ...stationFinds.kept] : s.stationEquipmentInventory,
          reforgeShards: s.reforgeShards + (shardDrop ? 1 : 0) + stationFinds.shards,
          unlockEvents: stationFinds.kept.length > 0 ? [...s.unlockEvents, stationDropAnnouncement(stationFinds.kept)] : s.unlockEvents,
          manualScavengeClicks: newClicks,
          scoutingOrder,
          racerSkills: _grantXp(s.racerSkills, "scavenging", 5),
          crewRoster: updatedCrew,
          // Lifetime stats for achievements
          lifetimePartsScavengedAllTime: s.lifetimePartsScavengedAllTime + parts.length,
          lifetimeScrapBucksAllTime: s.lifetimeScrapBucksAllTime + autoSale.scrapEarned,
        };
      });
      const gearMsg = stationFinds.kept.length > 0 ? ` + ${stationFinds.kept.map((item) => item.name).join(", ")}` : "";
      const overflowMsg = stationFinds.salvaged.length > 0 ? ` (${stationFinds.salvaged.length} station item${stationFinds.salvaged.length === 1 ? "" : "s"} salvaged for ${stationFinds.shards} shards: shelf full)` : "";
      const shardMsg = shardDrop ? " + 1 Reforge Shard" : "";
      _appendLog(set, get, "scavenge", `Scavenged ${parts.length} part${parts.length !== 1 ? "s" : ""} at ${location.name}${gearMsg}${shardMsg}${overflowMsg}`);
      if (autoSale.soldParts.length > 0) {
        const soldNames = autoSale.soldParts
          .map((p) => `${(p.type === "addon" ? getAddonById(p.definitionId) : getPartById(p.definitionId))?.name ?? p.definitionId} (${p.condition})`)
          .join(", ");
        _appendLog(set, get, "sell", `Auto-sold ${soldNames} for $${autoSale.scrapEarned}`, { scrapDelta: autoSale.scrapEarned });
      }
      (get() as GameState).checkAchievements();
    },

    sellPart: (partId: string) => {
      const state = get() as GameState;
      const part = state.inventory.find((p) => p.id === partId);
      if (!part) return;
      const def = part.type === "addon" ? getAddonById(part.definitionId) : getPartById(part.definitionId);
      if (!def) return;
      const value = getPartSaleValue(part, getSellValueBonus(state));
      if (value === undefined) return;
      set((s: GameState) => ({
        inventory: s.inventory.filter((p) => p.id !== partId),
        scrapBucks: s.scrapBucks + value,
        lifetimeScrapBucks: s.lifetimeScrapBucks + value,
        lifetimeScrapBucksAllTime: s.lifetimeScrapBucksAllTime + value,
        crewRoster: grantTraderSaleXp(s, 1),
      }));
      _appendLog(set, get, "sell", `Sold ${def.name} (${part.condition}) for $${value}`, { scrapDelta: value });
      (get() as GameState).checkAchievements();
    },

    sellAllJunk: () => {
      const state = get() as GameState;
      const sellValueBonus = getSellValueBonus(state);
      const saleValues = state.inventory.flatMap((part) => {
        const value = getPartSaleValue(part, sellValueBonus);
        return value === undefined ? [] : [{ id: part.id, value }];
      });
      if (saleValues.length === 0) return;
      const soldIds = new Set(saleValues.map(({ id }) => id));
      const total = saleValues.reduce((sum, { value }) => sum + value, 0);
      set((s: GameState) => ({
        inventory: s.inventory.filter((part) => !soldIds.has(part.id)),
        scrapBucks: s.scrapBucks + total,
        lifetimeScrapBucks: s.lifetimeScrapBucks + total,
        lifetimeScrapBucksAllTime: s.lifetimeScrapBucksAllTime + total,
        crewRoster: grantTraderSaleXp(s, saleValues.length),
      }));
      _appendLog(set, get, "sell", `Sold all ${saleValues.length} parts for $${total}`, { scrapDelta: total });
      (get() as GameState).checkAchievements();
    },

    sellAllScrap: () => {
      const state = get() as GameState;
      const sellValueBonus = getSellValueBonus(state);
      const saleValues = state.inventory.flatMap((part) => {
        if (part.type !== "part") return [];
        const def = getPartById(part.definitionId);
        if (!def || def.category !== "misc") return [];
        const value = getPartSaleValue(part, sellValueBonus);
        return value === undefined ? [] : [{ id: part.id, value }];
      });
      if (saleValues.length === 0) return;
      const soldIds = new Set(saleValues.map(({ id }) => id));
      const total = saleValues.reduce((sum, { value }) => sum + value, 0);
      set((s: GameState) => ({
        inventory: s.inventory.filter((part) => !soldIds.has(part.id)),
        scrapBucks: s.scrapBucks + total,
        lifetimeScrapBucks: s.lifetimeScrapBucks + total,
        lifetimeScrapBucksAllTime: s.lifetimeScrapBucksAllTime + total,
        crewRoster: grantTraderSaleXp(s, saleValues.length),
      }));
      _appendLog(set, get, "sell", `Sold ${saleValues.length} scrap parts for $${total}`, { scrapDelta: total });
      (get() as GameState).checkAchievements();
    },

    sellBelowQuality: (threshold: PartCondition) => {
      const state = get() as GameState;
      const sellValueBonus = getSellValueBonus(state);
      const thresholdIdx = CONDITIONS.indexOf(threshold);
      const saleValues = state.inventory.flatMap((part) => {
        if (CONDITIONS.indexOf(part.condition) >= thresholdIdx) return [];
        const value = getPartSaleValue(part, sellValueBonus);
        return value === undefined ? [] : [{ id: part.id, value }];
      });
      if (saleValues.length === 0) return;
      const soldIds = new Set(saleValues.map(({ id }) => id));
      const total = saleValues.reduce((sum, { value }) => sum + value, 0);
      set((s: GameState) => ({
        inventory: s.inventory.filter((part) => !soldIds.has(part.id)),
        scrapBucks: s.scrapBucks + total,
        lifetimeScrapBucks: s.lifetimeScrapBucks + total,
        lifetimeScrapBucksAllTime: s.lifetimeScrapBucksAllTime + total,
        crewRoster: grantTraderSaleXp(s, saleValues.length),
      }));
      _appendLog(set, get, "sell", `Sold ${saleValues.length} parts below ${threshold} for $${total}`, { scrapDelta: total });
      (get() as GameState).checkAchievements();
    },

    setPendingVehicle: (vehicleId: string) => {
      const state = get() as GameState;
      const autoSelect = _getUpgradeLevel(state, "auto_fitter") >= 1 || getPrestigeMilestoneBonuses(state.prestigeCount).autoEquipBest;
      set({
        pendingBuildVehicleId: vehicleId,
        pendingBuildParts: autoSelect ? _selectBestBuildParts(vehicleId, state.inventory) : {},
      });
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

      const buildSelection = validateBuildSelection(vehicleDef, pendingBuildParts, state.inventory);
      if (!buildSelection.valid) return;

      const actualBuildCost = getVehicleBuildCost(state, vehicleDef);
      if (state.scrapBucks < actualBuildCost) return;

      // Build InstalledPart records and collect used part IDs
      const usedPartIds = new Set<string>();
      const builtParts: Record<string, InstalledPart> = {};
      for (const slotCfg of vehicleDef.slots) {
        const part = buildSelection.parts[slotCfg.slot];
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
          crewRoster: grantCrewRoleXp(s.crewRoster, "mechanic", 20, getCrewXpMultiplier(s)),
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
      const state = get() as GameState;
      if (state.isRacing || hasFleetAssignment(state, vehicleId)) return;
      if (!state.garage.some((vehicle) => vehicle.id === vehicleId)) return;
      set({ activeVehicleId: vehicleId });
    },

    sellVehicle: (vehicleId: string) => {
      const state = get() as GameState;
      const vehicle = state.garage.find((v) => v.id === vehicleId);
      if (!vehicle || isVehicleMutationLocked(state, vehicleId)) return;
      const vehicleDef = getVehicleById(vehicle.definitionId);
      const value = getVehicleSaleValue(state, vehicle);
      set((s: GameState) => ({
        garage: s.garage.filter((v) => v.id !== vehicleId),
        scrapBucks: s.scrapBucks + value,
        lifetimeScrapBucks: s.lifetimeScrapBucks + value,
        lifetimeScrapBucksAllTime: s.lifetimeScrapBucksAllTime + value,
        activeVehicleId: s.activeVehicleId === vehicleId ? null : s.activeVehicleId,
        vehicleLoadouts: s.vehicleLoadouts.filter((loadout) => loadout.vehicleId !== vehicleId),
        crewRoster: grantTraderSaleXp(s, 1),
      }));
      _appendLog(set, get, "sell", `Sold ${vehicleDef?.name ?? "vehicle"} for $${value}`, { scrapDelta: value });
      (get() as GameState).checkAchievements();
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
      if (!loadout || !vehicle || vehicle.definitionId !== loadout.vehicleDefinitionId || isVehicleMutationLocked(state, vehicle.id)) return;

      const resolved = resolveVehicleLoadout(vehicle, state.inventory, loadout);
      if (!resolved.valid) return;

      const gear = getGearBonuses(state.equippedLootGear, state.lootGearInventory, state.equippedStationEquipment, state.stationEquipmentInventory);
      const handlingBonus = _getUpgradeEffectValue(state, "tuned_suspension") + gear.race_handling_pct;
      const definition = getVehicleById(vehicle.definitionId);
      if (!definition) return;
      const updated = { ...vehicle, parts: resolved.parts, stats: calculateStats(definition, resolved.parts, vehicle.condition, handlingBonus) };
      set((current: GameState) => ({
        inventory: resolved.inventory,
        garage: current.garage.map((candidate) => candidate.id === vehicle.id ? updated : candidate),
      }));
      _appendLog(set, get, "build", `Applied vehicle loadout ${loadout.name}`);
    },

    deleteVehicleLoadout: (loadoutId: string) => {
      set((state: GameState) => ({ vehicleLoadouts: state.vehicleLoadouts.filter((loadout) => loadout.id !== loadoutId) }));
    },

    setSelectedLocation: (locationId: string) => {
      const state = get() as GameState;
      set({
        selectedLocationId: locationId,
        scoutingOrder: normalizeScoutingOrder(
          state.scoutingOrder,
          getLocationById(locationId),
        ),
      });
    },

    setScoutingOrder: (order: PartCategory | null) => {
      const state = get() as GameState;
      set({
        scoutingOrder: normalizeScoutingOrder(
          order,
          getLocationById(state.selectedLocationId),
        ),
      });
    },

    setAutoRaceMinCondition: (condition: number) => {
      set({ autoRaceMinCondition: Math.max(0, Math.min(100, Math.floor(condition))) });
    },

    setAutoRaceMaxFatigue: (fatigue: number) => {
      set({ autoRaceMaxFatigue: Math.max(0, Math.min(FATIGUE.MAX, Math.floor(fatigue))) });
    },

    setSelectedCircuit: (circuitId: string) => {
      set({ selectedCircuitId: circuitId });
    },

    setSelectedEvent: (circuitId: string, eventId: EventId | null) => {
      const state = get() as GameState;
      if (!getCircuitById(circuitId)) return;
      if (eventId && !isEventOpen(eventId, state.eventWins?.[circuitId])) return;
      const { [circuitId]: _previous, ...rest } = state.pinnedEventIds ?? {};
      void _previous;
      set({ pinnedEventIds: eventId ? { ...rest, [circuitId]: eventId } : rest });
    },

    checkWorkshopReveals: () => {
      const state = get() as GameState;
      const rustedPileSinceTick = nextRustedPileSinceTick(state);
      const newlyRevealed = evaluateSystemReveals({ ...state, rustedPileSinceTick });
      if (newlyRevealed.length === 0) {
        if (rustedPileSinceTick !== state.rustedPileSinceTick) set({ rustedPileSinceTick });
        return;
      }
      const tabIds = new Set<string>(WORKSHOP_TABS.map((tab) => tab.id));
      // Sections with a tab are announced by WorkshopRevealWatcher when they appear;
      // systems living inside an existing section announce themselves here.
      const announcements = newlyRevealed
        .filter((id) => !tabIds.has(id))
        .map((id) => `${WORKSHOP_REVEAL_PREFIX}${SYSTEM_REVEALS_BY_ID[id].label}`);
      const dealerOpensNow = newlyRevealed.includes("dealer") && state.dealerBoard.length === 0;
      set((s: GameState) => ({
        revealedSystems: [...s.revealedSystems, ...newlyRevealed.filter((id) => !s.revealedSystems.includes(id))],
        rustedPileSinceTick,
        unlockEvents: announcements.length > 0 ? [...s.unlockEvents, ...announcements] : s.unlockEvents,
        dealerBoard: dealerOpensNow ? generateDealerBoard(s.lifetimeRep, s.gameTick) : s.dealerBoard,
      }));
    },

    setSelectedSellBelowQuality: (threshold: PartCondition) => {
      set({ selectedSellBelowQuality: threshold });
    },

    enterRace: () => {
      const state = get() as GameState;
      // The venue resolved to the event being entered: pinned, or the best contestable open one.
      const circuit = getActiveEventCircuit(state);
      if (!canEnterSelectedRace(state, circuit)) return;

      const vehicle = state.garage.find((v) => v.id === state.activeVehicleId);
      if (!vehicle || !circuit) return;

      // Pre-compute the outcome immediately so the UI can animate it
      const gb = getGearBonuses(state.equippedLootGear, state.lootGearInventory, state.equippedStationEquipment, state.stationEquipmentInventory);
      // Scavenger's Eye upgrade increases salvage drop chance and max condition
      const scavengerEyeLevel = _getUpgradeLevel(state, "scavengers_eye");
      const salvageDropChance = scavengerEyeLevel >= 1 ? 0.30 : 0.15;
      const salvageMaxCondition = scavengerEyeLevel >= 1 ? 2 : 1;
      const momentumWinBonus = getMomentumEffectValue(state.activeMomentumTiers, "race_win_bonus");
      const sb = getSkillBonuses(state.racerSkills, circuit.tier);
      const permanentBonuses = getPermanentRuntimeBonuses(state);
      const bonuses = collectBonuses(state, circuit.tier);
      // Stats are derived at entry from parts + condition (engine/performance), matching automation.
      const handlingBonusPct = _getUpgradeEffectValue(state, "tuned_suspension") + gb.race_handling_pct;
      const raceVehicle = withDerivedStats(vehicle, handlingBonusPct);
      const outcome = simulateRace(
        raceVehicle, circuit,
        state.fatigue,
        racePerformanceMultiplier(bonuses) - 1,
        gb.race_dnf_reduction + permanentBonuses.raceDnfFlatReduction,
        salvageDropChance,
        salvageMaxCondition,
        momentumWinBonus,
        gb.forge_token_chance_bonus + getGameEffectValue(TEAM_UPGRADE_DEFINITIONS, state.teamUpgradeLevels, "forge_token_rate"),
        0, // racer skills are already inside the composed performance bonus
        sb.drivingDnfReduction,
        false,
        state.currentRacePlan,
        permanentBonuses.raceDnfChanceMultiplier,
        handlingBonusPct,
      );
      const events = generateRaceEvents(outcome, circuit, circuit.raceDuration);
      const racingVehicleId = vehicle.id; // capture for timeout callback
      const raceSessionId = `manual_race_${Date.now()}_${raceSessionCounter++}`;

      set({
        isRacing: true,
        activeRaceSessionId: raceSessionId,
        scrapBucks: state.scrapBucks - circuit.entryFee,
        challengeProgress: {
          ...state.challengeProgress,
          [PENDING_MANUAL_RACE_ENTRY_FEE_KEY]: circuit.entryFee,
        },
        raceEvents: events,
        raceStartTime: Date.now(),
        precomputedOutcome: outcome,
      });

      setTimeout(() => {
        let settledCurrentSession = false;
        // Overflow the Locker could not hold, for the log line below (set inside the settle closure).
        const raceLootSalvage = { count: 0, scrap: 0 };
        set((s: GameState) => {
          if (s.activeRaceSessionId !== raceSessionId) return s;
          const sessionVehicleStillValid = s.isRacing
            && s.activeVehicleId === racingVehicleId
            && s.garage.some((candidate) => candidate.id === racingVehicleId);
          if (!sessionVehicleStillValid) {
            const pendingEntryFee = s.challengeProgress[PENDING_MANUAL_RACE_ENTRY_FEE_KEY] ?? 0;
            return {
              isRacing: false,
              activeRaceSessionId: null,
              scrapBucks: s.scrapBucks + pendingEntryFee,
              challengeProgress: {
                ...s.challengeProgress,
                [PENDING_MANUAL_RACE_ENTRY_FEE_KEY]: 0,
              },
              raceEvents: [],
              raceStartTime: null,
              precomputedOutcome: null,
            };
          }
          settledCurrentSession = true;
          // One bonus algebra for Scrap Bucks and Rep (engine/bonuses), shared with automation.
          const payout = applyRacePayout(collectBonuses(s, circuit.tier), outcome, outcome.result === "win" ? s.winStreak + 1 : 0);
          const effectiveRepEarned = payout.rep;
          const newRep = s.repPoints + effectiveRepEarned;
          const newLifetimeRep = s.lifetimeRep + effectiveRepEarned;
          const newUnlockedCircuits = [...s.unlockedCircuitIds];
          const newUnlockedLocations = [...s.unlockedLocationIds];
          const newUnlockedVehicles = [...s.unlockedVehicleIds];
          const newUnlockEvents = [...s.unlockEvents];

          // Win streak
          const newStreak = outcome.result === "win" ? s.winStreak + 1 : 0;
          const newBestStreak = Math.max(s.bestWinStreak, newStreak);
          if (newStreak === 3) newUnlockEvents.push("3-Win Streak! You're on fire!");
          if (newStreak === 5) newUnlockEvents.push("5 WINS! Unstoppable!");
          if (newStreak === 10) newUnlockEvents.push("10 WINS! LEGENDARY!");

          // Every blueprint label and transition is driven by one structured contract.
          const recentOutcomes = [outcome, ...s.raceHistory];
          const wonCircuitIds = [...new Set(recentOutcomes.filter((race) => race.result === "win").map((race) => race.circuitId))];
          let currentCircuitWinStreak = 0;
          for (const race of recentOutcomes) {
            if (race.result !== "win" || race.circuitId !== outcome.circuitId) break;
            currentCircuitWinStreak += 1;
          }
          const unlockedByProgress = getVehicleIdsUnlockedByProgress({
            reputation: NO_AUTO_REPUTATION_UNLOCK,
            wonCircuitIds,
            circuitWinStreaks: { [outcome.circuitId]: currentCircuitWinStreak },
            ownerUpgradeLevels: s.ownerUpgradeLevels,
          });
          for (const vehicleId of unlockedByProgress) {
            if (newUnlockedVehicles.includes(vehicleId)) continue;
            newUnlockedVehicles.push(vehicleId);
            const vehicleDefinition = getVehicleById(vehicleId);
            newUnlockEvents.push(`${vehicleDefinition?.name ?? vehicleId} Blueprint Unlocked!`);
          }

          // Automation is progression-based: manual scavenging or the first Scrap Reset.

          // Apply vehicle wear to the vehicle that started the race
          const wearReduction = _getUpgradeEffectValue(s, "reinforced_chassis");
          const legacyWearReduction = getLegacyEffectValue(s.legacyUpgradeLevels, "leg_wear_reduction");
          // calculateWear derives reliability from parts + condition — the same numbers the race used.
          const wearAmount = calculateWear(raceVehicle, outcome.result, wearReduction + legacyWearReduction, s.fatigue, gb.race_wear_reduction_pct, sb.enduranceWearReduction, outcome.planEvaluation?.wearMultiplier ?? 1);
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

          const finalScraps = payout.scraps;
          let settledOutcome: RaceOutcome = { ...outcome, scrapsEarned: finalScraps, repEarned: effectiveRepEarned };

          const newLifetimeRaces = s.lifetimeRaces + 1;
          // Fatigue rhythm: one race adds its tier's amount; rest between ticks removes it.
          const newFatigue = fatigueAfterRace(s, s.fatigue, circuit.tier);

          // Loot gear roll from manual race (circuit-fitted, derived performance vs. difficulty).
          // You win the driver's kit at the track; it goes to the Locker.
          const vehiclePerf = vehiclePerformance(raceVehicle, circuit, handlingBonusPct) / (circuit.difficulty || 1);
          const { gearDrops: raceGearDrops, modDrop: raceModDrop } = rollGearDrops({
            sourceTier: circuit.tier,
            sourceId: circuit.id,
            raceResult: outcome.result,
            winStreak: newStreak,
            vehiclePerformance: vehiclePerf,
            lifetimeRep: s.lifetimeRep,
            gearDropRateRaceBonus: _getUpgradeEffectValue(s, "trophy_hunter") + getGameEffectValue(TEAM_UPGRADE_DEFINITIONS, s.teamUpgradeLevels, "gear_drop_rate"),
            rarityBonus: Math.floor(_getUpgradeEffectValue(s, "rarity_sense")),
            doubleDropChance: _getUpgradeEffectValue(s, "double_drop"),
            modDropRateBonus: _getUpgradeEffectValue(s, "mod_hunter"),
          });
          const lootFinds = settleLootGearDrops(s, s.lootGearInventory.length, raceGearDrops);
          const newLootGearInventory = lootFinds.kept.length > 0
            ? [...s.lootGearInventory, ...lootFinds.kept]
            : s.lootGearInventory;
          const newGearModInventory = raceModDrop ? [...s.gearModInventory, raceModDrop] : s.gearModInventory;
          // Rival station-set rewards are the only station gear a race hands out.
          let newStationEquipmentInventory = s.stationEquipmentInventory;
          for (const item of lootFinds.kept) newUnlockEvents.push(lootGearDropAnnouncement(item));
          if (raceModDrop) newUnlockEvents.push(gearModDropAnnouncement(raceModDrop));
          const lootSalvageScrap = lootFinds.scrap;
          raceLootSalvage.count = lootFinds.salvaged.length;
          raceLootSalvage.scrap = lootSalvageScrap;

          // Salvage drop and forge token from race
          let newInventory = outcome.salvageDrop
            ? [...s.inventory, outcome.salvageDrop]
            : s.inventory;
          let newDefeatedRivalIds = s.defeatedRivalIds;
          let newDiscoveredBlueprintIds = s.discoveredBlueprintIds;
          // Event ladder: a win here counts toward opening the next event at this venue.
          const newEventWins = outcome.result === "win"
            ? addEventWin(s.eventWins, circuit.venueId, circuit.eventId)
            : s.eventWins;
          for (const openedId of newlyOpenedEventIds(s.eventWins?.[circuit.venueId], newEventWins[circuit.venueId])) {
            newUnlockEvents.push(`${circuit.name} ${getEventDefinition(openedId).name} Unlocked! ${getEventDefinition(openedId).description}`);
          }
          const rival = outcome.rivalId ? getRivalById(outcome.rivalId) : undefined;
          const rivalRewardClaimed = outcome.result === "win" && !!rival && !s.defeatedRivalIds.includes(rival.id);
          if (rivalRewardClaimed && rival) {
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
          if (outcome.result === "win" && rival) {
            settledOutcome = { ...settledOutcome, rivalRewardClaimed };
          }
          const directForgeTokens = outcome.forgeTokenDrop ? 1 : 0;
          const newRaceSalvage = s.lifetimeTotalRaceSalvage + (outcome.salvageDrop ? 1 : 0);

          // Challenge tracking for win streaks, fatigue, lifetimeRaces
          const newChallengeProgress = {
            ...s.challengeProgress,
            [PENDING_MANUAL_RACE_ENTRY_FEE_KEY]: 0,
            winStreak: newStreak,
            fatigue: newFatigue,
            lifetimeRaces: newLifetimeRaces,
            totalRaceSalvage: newRaceSalvage,
          };
          const { completed: newCompleted, rewards } = checkChallenges(s, newChallengeProgress, s.completedChallenges);
          const challengeBundle = calculateChallengeRewardBundle(s, rewards);
          const newMaterials = addRewardMaterials(s.materials, challengeBundle.materials);
          newUnlockEvents.push(...challengeCompletionEvents(newCompleted));

          // Dealer board auto-refresh
          const newTick = s.gameTick + 1;
          const newDealerBoard = (isDealerOpen(s) && shouldRefreshDealer(s.dealerBoard, newTick))
            ? generateDealerBoard(newLifetimeRep, newTick)
            : s.dealerBoard;

          // Grant Driving XP (10 base + 5 bonus on win)
          let updatedSkills = _grantXp(s.racerSkills, "driving", outcome.result === "win" ? 15 : 10);
          // Grant Endurance XP when racing at high fatigue
          if (newFatigue >= 60) updatedSkills = _grantXp(updatedSkills, "endurance", 10);
          else if (newFatigue >= 40) updatedSkills = _grantXp(updatedSkills, "endurance", 5);

          return {
            isRacing: false,
            activeRaceSessionId: null,
            lastRaceOutcome: settledOutcome,
            raceHistory: compactRaceHistory([settledOutcome, ...s.raceHistory], 20),
            scrapBucks: s.scrapBucks + finalScraps + challengeBundle.scrap + lootSalvageScrap,
            lifetimeScrapBucks: s.lifetimeScrapBucks + finalScraps + challengeBundle.scrap + lootSalvageScrap,
            repPoints: newRep,
            lifetimeRep: newLifetimeRep,
            lifetimeRepAllTime: s.lifetimeRepAllTime + effectiveRepEarned,
            unlockedCircuitIds: newUnlockedCircuits,
            unlockedLocationIds: newUnlockedLocations,
            unlockedVehicleIds: newUnlockedVehicles,
            autoRaceUnlocked: s.autoRaceUnlocked,
            autoScavengeUnlocked: s.autoScavengeUnlocked,
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
            crewRoster: grantCrewRoleXp(s.crewRoster, "driver", 10, getCrewXpMultiplier(s)),
            lootGearInventory: newLootGearInventory,
            gearModInventory: newGearModInventory,
            stationEquipmentInventory: newStationEquipmentInventory,
            inventory: newInventory,
            defeatedRivalIds: newDefeatedRivalIds,
            eventWins: newEventWins,
            discoveredBlueprintIds: newDiscoveredBlueprintIds,
            forgeTokens: s.forgeTokens + directForgeTokens + challengeBundle.forgeTokens,
            lifetimeTotalRaceSalvage: newRaceSalvage,
            challengeProgress: newChallengeProgress,
            completedChallenges: [...s.completedChallenges, ...newCompleted],
            materials: newMaterials,
            gameTick: newTick,
            dealerBoard: newDealerBoard,
            // Lifetime stats for achievements (never reset)
            lifetimeRacesAllTime: s.lifetimeRacesAllTime + 1,
            lifetimeWinsAllTime: s.lifetimeWinsAllTime + (outcome.result === "win" ? 1 : 0),
            lifetimeScrapBucksAllTime: s.lifetimeScrapBucksAllTime + finalScraps + challengeBundle.scrap + lootSalvageScrap,
            bestWinStreakAllTime: Math.max(s.bestWinStreakAllTime, newBestStreak),
            totalForgeTokensEarned: s.totalForgeTokensEarned + directForgeTokens + challengeBundle.forgeTokens,
          };
        });
        if (!settledCurrentSession) return;
        if (raceLootSalvage.count > 0) {
          _appendLog(set, get, "gear", `Locker full: auto-salvaged ${raceLootSalvage.count} loot gear drop${raceLootSalvage.count === 1 ? "" : "s"} for $${raceLootSalvage.scrap}`, { scrapDelta: raceLootSalvage.scrap });
        }
        // Check achievements after race
        (get() as GameState).checkAchievements();
        // Check momentum tiers after race
        (get() as GameState).checkMomentumTiers();
        // A lost race or a worn part on the racer can make a Workshop system relevant.
        (get() as GameState).checkWorkshopReveals();
        const resultLabel = outcome.result === "win" ? "Won" : outcome.result === "loss" ? "Lost" : "DNF";
        const settled = (get() as GameState).lastRaceOutcome ?? outcome;
        const rewardMsg = outcome.result === "dnf" ? "" : ` +$${settled.scrapsEarned}${settled.repEarned > 0 ? `, +${Math.round(settled.repEarned)} rep` : ""}`;
        _appendLog(set, get, "race", `Race: ${resultLabel} at ${circuit.name} ${circuit.eventName}!${rewardMsg}`, { scrapDelta: settled.scrapsEarned, repDelta: Math.round(settled.repEarned) });
      }, circuit.raceDuration);
    },

    setRacePlan: (plan: RacePlan) => set({ currentRacePlan: { ...plan } }),
    applyRacePlanPreset: (preset: keyof typeof RACE_PLAN_PRESETS) => set({ currentRacePlan: { ...RACE_PLAN_PRESETS[preset] } }),

    startFleetAssignment: (vehicleId: string, circuitId: string, crewId?: string) => {
      const state = get() as GameState;
      const vehicle = state.garage.find((candidate) => candidate.id === vehicleId);
      const circuit = getCircuitById(circuitId);
      const crewMember = crewId ? state.crewRoster.find((candidate) => candidate.id === crewId) : null;
      const completedCircuit = state.raceHistory.some((outcome) => outcome.circuitId === circuitId && outcome.result === "win");
      const baseSlots = 1 + Math.floor(getGameEffectValue(TEAM_UPGRADE_DEFINITIONS, state.teamUpgradeLevels, "active_vehicle_slot"));
      const physicalIneligibility = getVehicleCircuitIneligibilityReason(vehicle, circuit);
      if (!vehicle || !circuit || physicalIneligibility || vehicleId === state.activeVehicleId || !completedCircuit || state.fleetAssignments.filter((assignment) => assignment.status === "running").length >= baseSlots) return;
      if (crewId && !crewMember) return;
      if (state.fleetAssignments.some((assignment) => assignment.vehicleId === vehicleId)) return;
      if (crewMember && state.fleetAssignments.some((assignment) => assignment.crewId === crewMember.id)) return;
      const assignment: FleetAssignment = { id: `fleet_${Date.now()}_${state.fleetAssignments.length}`, vehicleId, crewId: crewId ?? null, circuitId, plan: { ...state.currentRacePlan }, status: "running", remainingTicks: Math.max(3, circuit.tier + 3), accumulatedWear: 0, rewards: { scrap: 0, materials: 0 } };
      set((current: GameState) => ({ fleetAssignments: [...current.fleetAssignments, assignment] }));
      const vehicleName = getVehicleById(vehicle.definitionId)?.name ?? vehicle.definitionId;
      _appendLog(set, get, "tick", `Fleet program started: ${vehicleName} at ${circuit.name}${crewMember ? ` with ${crewMember.name}` : " (uncrewed)"}`);
    },

    advanceFleetAssignments: (ticks = 1) => {
      const state = get() as GameState;
      if (!state.fleetAssignments.some((assignment) => assignment.status === "running") && !state.hostedEvents.some((event) => event.status === "running")) return;
      set((current: GameState) => ({ fleetAssignments: current.fleetAssignments.map((assignment) => {
        if (assignment.status !== "running") return assignment;
        const remainingTicks = Math.max(0, assignment.remainingTicks - Math.max(1, ticks));
        if (remainingTicks > 0) return { ...assignment, remainingTicks };
        const circuit = getCircuitById(assignment.circuitId);
        const permanent = getPermanentRuntimeBonuses(current);
        return {
          ...assignment,
          remainingTicks: 0,
          status: "complete",
          accumulatedWear: assignment.accumulatedWear + 5,
          rewards: {
            scrap: multiplyReward(
              Math.floor((circuit?.rewardBase ?? 0) * 0.6),
              permanent.allScrapIncomeMult,
            ),
            materials: Math.max(
              1,
              multiplyReward(
                Math.max(1, Math.floor((circuit?.tier ?? 0) * 0.6)),
                permanent.materialYieldMult,
              ),
            ),
          },
        };
      }), hostedEvents: current.hostedEvents.map((event) => event.status !== "running" ? event : event.remainingTicks > ticks ? { ...event, remainingTicks: event.remainingTicks - ticks } : { ...event, remainingTicks: 0, status: "complete" }) }));
    },

    collectFleetAssignment: (assignmentId: string) => {
      const state = get() as GameState;
      const assignment = state.fleetAssignments.find((candidate) => candidate.id === assignmentId && candidate.status === "complete");
      if (!assignment) return;
      if (!state.garage.some((vehicle) => vehicle.id === assignment.vehicleId)) {
        // Reconcile legacy/corrupt assignments without paying rewards for a
        // vehicle that no longer exists.
        set((current: GameState) => ({
          fleetAssignments: current.fleetAssignments.filter((candidate) => candidate.id !== assignmentId),
        }));
        return;
      }
      const materialKeys = Object.keys(state.materials) as MaterialType[];
      const material = materialKeys[(getCircuitById(assignment.circuitId)?.tier ?? 0) % materialKeys.length];
      const crewXpMultiplier = 1 + getGameEffectValue(TEAM_UPGRADE_DEFINITIONS, state.teamUpgradeLevels, "crew_xp_multiplier");
      const crewXpAward = Math.floor(5 * crewXpMultiplier);
      set((current: GameState) => {
        const gear = getGearBonuses(current.equippedLootGear, current.lootGearInventory, current.equippedStationEquipment, current.stationEquipmentInventory);
        const handlingBonus = _getUpgradeEffectValue(current, "tuned_suspension") + gear.race_handling_pct;
        return {
          scrapBucks: current.scrapBucks + assignment.rewards.scrap,
          lifetimeScrapBucks: current.lifetimeScrapBucks + assignment.rewards.scrap,
          lifetimeScrapBucksAllTime: current.lifetimeScrapBucksAllTime + assignment.rewards.scrap,
          materials: { ...current.materials, [material]: current.materials[material] + assignment.rewards.materials },
          garage: current.garage.map((vehicle) => {
            if (vehicle.id !== assignment.vehicleId) return vehicle;
            const condition = Math.max(0, (vehicle.condition ?? 100) - assignment.accumulatedWear);
            const definition = getVehicleById(vehicle.definitionId);
            return {
              ...vehicle,
              condition,
              totalRaces: (vehicle.totalRaces ?? 0) + 1,
              stats: definition ? calculateStats(definition, vehicle.parts, condition, handlingBonus) : vehicle.stats,
            };
          }),
          crewRoster: current.crewRoster.map((crew) => crew.id === assignment.crewId ? grantCrewXp(crew, 5, crewXpMultiplier) : crew),
          fleetAssignments: current.fleetAssignments.filter((candidate) => candidate.id !== assignmentId),
        };
      });
      const assignedCrew = state.crewRoster.find((candidate) => candidate.id === assignment.crewId);
      _appendLog(set, get, "tick", `Fleet program collected: +$${assignment.rewards.scrap}, +${assignment.rewards.materials} ${material}, -${assignment.accumulatedWear} vehicle condition${assignedCrew ? `, ${assignedCrew.name} +${crewXpAward} XP` : ""}`, { scrapDelta: assignment.rewards.scrap });
      (get() as GameState).checkAchievements();
    },

    updateOwnedTrackConfig: (config: OwnedTrackConfig) => {
      const state = get() as GameState;
      set({
        ownedTrackConfig: normalizeHostedEventConfig(config, {
          customCircuits: Boolean(state.trackPerkLevels.track_custom_circuits),
          nightRacing: Boolean(state.trackPerkLevels.track_night_racing),
          enduranceMode: Boolean(state.trackPerkLevels.track_endurance),
        }),
      });
    },

    hostTrackEvent: () => {
      const state = get() as GameState;
      const maxEvents = 1 + (state.trackPerkLevels.track_multi ?? 0);
      if (state.trackEraCount < 1 || state.hostedEvents.filter((event) => event.status === "running").length >= maxEvents) return;
      const config = normalizeHostedEventConfig(state.ownedTrackConfig, {
        customCircuits: Boolean(state.trackPerkLevels.track_custom_circuits),
        nightRacing: Boolean(state.trackPerkLevels.track_night_racing),
        enduranceMode: Boolean(state.trackPerkLevels.track_endurance),
      });
      const terms = calculateHostedEventTerms(
        config,
        state.trackPerkLevels.track_sponsors ?? 0,
        getPermanentRuntimeBonuses(state).allScrapIncomeMult,
      );
      const sponsors = ["Rustbelt Tools", "Midnight Fuel", "Backlot Salvage", "Apex Fabrication"];
      const event: HostedEvent = { id: `event_${Date.now()}_${state.hostedEvents.length}`, name: `${config.timeRule === "night" ? "Midnight " : ""}${config.endurance ? "Endurance " : ""}Invitational`, config: { ...config }, sponsor: sponsors[state.hostedEvents.length % sponsors.length], remainingTicks: terms.durationTicks, status: "running", reward: terms.reward };
      set((current: GameState) => ({ hostedEvents: [...current.hostedEvents, event] }));
    },

    collectHostedEvent: (eventId: string) => {
      const state = get() as GameState;
      const event = state.hostedEvents.find((candidate) => candidate.id === eventId && candidate.status === "complete");
      if (!event) return;
      set((current: GameState) => ({ scrapBucks: current.scrapBucks + event.reward, lifetimeScrapBucks: current.lifetimeScrapBucks + event.reward, lifetimeScrapBucksAllTime: current.lifetimeScrapBucksAllTime + event.reward, hostedEvents: current.hostedEvents.filter((candidate) => candidate.id !== eventId) }));
      (get() as GameState).checkAchievements();
    },

    announceUnlock: (message: string) => {
      set((s: GameState) => s.unlockEvents.includes(message) ? {} : { unlockEvents: [...s.unlockEvents, message] });
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
      set({ tutorialStep: step >= 13 ? -1 : step + 1, tutorialLastAdvanceTime: Date.now(), tutorialMinimized: false });
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
      if (!vehicle || isVehicleMutationLocked(state, vehicleId) || (vehicle.condition ?? 100) >= 100) return;
      const vehicleDef = getVehicleById(vehicle.definitionId);
      if (!vehicleDef) return;
      const gb = getGearBonuses(state.equippedLootGear, state.lootGearInventory, state.equippedStationEquipment, state.stationEquipmentInventory);
      const cost = getVehicleRepairCost(state, vehicle);
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
        crewRoster: grantCrewRoleXp(
          s.crewRoster,
          "mechanic",
          5,
          getCrewXpMultiplier(s),
        ),
      }));
      _appendLog(set, get, "build", `Repaired ${vehicleDef.name} for $${actualCost}`, { scrapDelta: -actualCost });
    },

    swapPart: (vehicleId: string, slot: string, newPart: ScavengedPart) => {
      const state = get() as GameState;
      if (_getUpgradeLevel(state, "toolkit") < 1) return;
      const vehicle = state.garage.find((v) => v.id === vehicleId);
      if (!vehicle || isVehicleMutationLocked(state, vehicleId)) return;

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
      const gbSwap = getGearBonuses(state.equippedLootGear, state.lootGearInventory, state.equippedStationEquipment, state.stationEquipmentInventory);
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
      if (isVehicleMutationLocked(state, vehicleId)) return;
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
      const gear = getGearBonuses(state.equippedLootGear, state.lootGearInventory, state.equippedStationEquipment, state.stationEquipmentInventory);
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
      if (isVehicleMutationLocked(state, vehicleId)) return;
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
      const gear = getGearBonuses(state.equippedLootGear, state.lootGearInventory, state.equippedStationEquipment, state.stationEquipmentInventory);
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
      const result = getPartRefurbishQuote(state, part);
      if (!result) return;
      if (state.scrapBucks < result.cost) return;
      set((s: GameState) => ({
        scrapBucks: s.scrapBucks - result.cost,
        inventory: s.inventory.map((p) => p.id !== partId ? p : {
          ...p,
          condition: result.newCondition,
        }),
        crewRoster: grantCrewRoleXp(
          s.crewRoster,
          "mechanic",
          5,
          getCrewXpMultiplier(s),
        ),
      }));
      _appendLog(set, get, "build", `Refurbished part to ${result.newCondition} for $${result.cost}`, { scrapDelta: -result.cost });
    },

    purchaseUpgrade: (upgradeId: string) => {
      const state = get() as GameState;
      const def = getUpgradeById(upgradeId);
      if (!def) return;
      const currentLevel = state.workshopLevels[upgradeId] ?? 0;
      if (currentLevel >= def.maxLevel) return;
      // A line can have one project in flight, and only while a slot is free.
      if (findUpgradeProject(state, upgradeId) || !hasFreeProjectSlot(state)) return;

      // Opening a Rep-gated line spends Rep once, with its first level.
      const repCost = currentLevel === 0 ? (getWorkshopLineRepCost(upgradeId) ?? 0) : 0;
      if (def.unlockRequirement) {
        if (!canAffordRepCost(state, repCost)) return;
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

      const cost = getWorkshopUpgradePurchaseCost(state, upgradeId);
      if (cost === null) return;
      if (state.scrapBucks < cost) return;
      // The purchase pays now and the level lands when the project completes
      // (computeTick credits wall-clock time; applyTickResult applies it).
      // No tutorial step waits on a workshop level (TutorialOverlay's
      // isStepConditionMet reads inventory, garage, and race state only), so
      // the Toolkit runs as an ordinary tier-1 project. If a future step does
      // wait on a level, give that line a zero-duration project here.
      const project = createUpgradeProject(state, upgradeId, currentLevel + 1, { scrap: cost, rep: repCost, materials: {} }, Date.now());
      if (!project) return;
      set((s: GameState) => ({
        scrapBucks: s.scrapBucks - cost,
        repPoints: s.repPoints - repCost,
      }));
      if (!(get() as GameState).startProject(project)) {
        // Cannot happen after the slot check above; never keep the money if it does.
        set((s: GameState) => ({ scrapBucks: s.scrapBucks + cost, repPoints: s.repPoints + repCost }));
        return;
      }
      const repNote = repCost > 0 ? ` and ${repCost} Rep` : "";
      _appendLog(set, get, "upgrade", `Started ${def.name} Lv.${currentLevel + 1} for $${cost}${repNote} · ready in ${formatTime(project.durationMs)}`, { scrapDelta: -cost, repDelta: repCost > 0 ? -repCost : undefined });
    },

    startProject: (project: Project) => {
      const state = get() as GameState;
      if (!hasFreeProjectSlot(state)) return false;
      if (state.projects.some((candidate) => candidate.id === project.id)) return false;
      set((s: GameState) => ({ projects: [...s.projects, project] }));
      return true;
    },

    cancelProject: (projectId: string) => {
      const state = get() as GameState;
      const project = state.projects.find((candidate) => candidate.id === projectId);
      if (!project) return;
      const refund = projectCancelRefund(project);
      set((s: GameState) => ({
        projects: s.projects.filter((candidate) => candidate.id !== projectId),
        scrapBucks: s.scrapBucks + refund.scrap,
        repPoints: s.repPoints + refund.rep,
        materials: addRewardMaterials(s.materials, refund.materials),
      }));
      const repNote = refund.rep > 0 ? ` and ${refund.rep} Rep` : "";
      _appendLog(set, get, "upgrade", `Cancelled ${project.label}; refunded $${refund.scrap}${repNote}`, { scrapDelta: refund.scrap, repDelta: refund.rep > 0 ? refund.rep : undefined });
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
      const value = multiplyReward(
        getSalvageValue(item, salvageBonus),
        getPermanentRuntimeBonuses(state).allScrapIncomeMult,
      );
      // Return installed mods to inventory
      const returnedMods = item.mods;
      set((s: GameState) => ({
        scrapBucks: s.scrapBucks + value,
        lifetimeScrapBucks: s.lifetimeScrapBucks + value,
        lifetimeScrapBucksAllTime: s.lifetimeScrapBucksAllTime + value,
        lootGearInventory: s.lootGearInventory.filter((g) => g.id !== lootGearId),
        // Unequip if this item was equipped
        equippedLootGear: s.equippedLootGear[item.slot] === lootGearId
          ? { ...s.equippedLootGear, [item.slot]: null }
          : s.equippedLootGear,
        gearModInventory: [...s.gearModInventory, ...returnedMods],
      }));
      _appendLog(set, get, "gear", `Salvaged ${item.name} for $${value}`, { scrapDelta: value });
      (get() as GameState).checkAchievements();
    },

    installMod: (lootGearId: string, modInstanceId: string) => {
      set((s: GameState) => {
        const item = s.lootGearInventory.find((g) => g.id === lootGearId);
        const mod = s.gearModInventory.find((m) => m.id === modInstanceId);
        if (!item || !mod || item.mods.length >= item.modSlots) return s;
        if (item.mods.some((installed) => installed.id === modInstanceId)) return s;
        const template = getModTemplateById(mod.templateId);
        if (!template || !template.slots.includes(item.slot)) return s;
        return {
          lootGearInventory: s.lootGearInventory.map((g) =>
            g.id !== lootGearId ? g : { ...g, mods: [...g.mods, mod] }
          ),
          gearModInventory: s.gearModInventory.filter((m) => m.id !== modInstanceId),
        };
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
      set((current: GameState) => {
        const equippedStationEquipment = { ...current.equippedStationEquipment, [item.slot]: item.id };
        return {
          equippedStationEquipment,
          garage: recalculateGarageStatsForStationEquipment(current, equippedStationEquipment, current.stationEquipmentInventory),
        };
      });
      _appendLog(set, get, "gear", `Installed ${item.name} at ${item.slot.replaceAll("_", " ")}`);
    },

    unequipStationItem: (slot: GarageStationSlot) => {
      const state = get() as GameState;
      const itemId = state.equippedStationEquipment[slot];
      if (!itemId) return;
      const item = state.stationEquipmentInventory.find((candidate) => candidate.id === itemId);
      set((current: GameState) => {
        const equippedStationEquipment = { ...current.equippedStationEquipment, [slot]: null };
        return {
          equippedStationEquipment,
          garage: recalculateGarageStatsForStationEquipment(current, equippedStationEquipment, current.stationEquipmentInventory),
        };
      });
      _appendLog(set, get, "gear", `Removed ${item?.name ?? "station equipment"} from ${slot.replaceAll("_", " ")}`);
    },

    reforgeStationItem: (itemId: string) => {
      const state = get() as GameState;
      if ((state.workshopLevels.careful_modding ?? 0) < 1) return;
      const item = state.stationEquipmentInventory.find((candidate) => candidate.id === itemId);
      if (!item || !canReforgeStationEquipment(item)) return;
      const cost = REFORGE_COST_SHARDS[item.rarity];
      if (state.reforgeShards < cost) return;
      const reforged = reforgeStationEquipment(item);
      set((current: GameState) => {
        const stationEquipmentInventory = current.stationEquipmentInventory.map((candidate) => candidate.id === itemId ? reforged : candidate);
        return {
          reforgeShards: current.reforgeShards - cost,
          stationEquipmentInventory,
          garage: current.equippedStationEquipment[item.slot] === itemId
            ? recalculateGarageStatsForStationEquipment(current, current.equippedStationEquipment, stationEquipmentInventory)
            : current.garage,
        };
      });
      _appendLog(set, get, "gear", `Reforged ${item.name} for ${cost} Reforge Shards`);
    },

    enhanceStationItem: (itemId: string) => {
      const state = get() as GameState;
      const item = state.stationEquipmentInventory.find((candidate) => candidate.id === itemId);
      const maxLevel = getMaxStationEnhancementLevel(state.workshopLevels.enhancement_mastery ?? 0);
      if (!item || item.enhancementLevel >= maxLevel) return;
      const cost = getStationEnhancementCost(item);
      if (state.scrapBucks < cost) return;
      set((current: GameState) => {
        const stationEquipmentInventory = current.stationEquipmentInventory.map((candidate) => candidate.id === itemId ? { ...candidate, enhancementLevel: candidate.enhancementLevel + 1 } : candidate);
        return {
          scrapBucks: current.scrapBucks - cost,
          stationEquipmentInventory,
          garage: current.equippedStationEquipment[item.slot] === itemId
            ? recalculateGarageStatsForStationEquipment(current, current.equippedStationEquipment, stationEquipmentInventory)
            : current.garage,
        };
      });
      _appendLog(set, get, "gear", `Enhanced ${item.name} to +${item.enhancementLevel + 1} for $${cost}`, { scrapDelta: -cost });
    },

    salvageStationItem: (itemId: string) => {
      const state = get() as GameState;
      const item = state.stationEquipmentInventory.find((candidate) => candidate.id === itemId);
      if (!item || state.equippedStationEquipment[item.slot] === item.id) return;
      const shards = getStationSalvageYield(item, state.workshopLevels.mod_hunter ?? 0, state.workshopLevels.gear_recycler ?? 0);
      set((current: GameState) => ({ stationEquipmentInventory: current.stationEquipmentInventory.filter((candidate) => candidate.id !== itemId), reforgeShards: current.reforgeShards + shards }));
      _appendLog(set, get, "gear", `Salvaged ${item.name} for ${shards} Reforge Shard${shards === 1 ? "" : "s"}`);
    },

    canAffordRep: (cost: number) => canAffordRepCost(get() as GameState, cost),

    unlockLocation: (locationId: string) => {
      const state = get() as GameState;
      const location = getLocationById(locationId);
      const cost = getLocationRepCost(locationId);
      if (!location || cost === undefined || state.unlockedLocationIds.includes(locationId)) return;
      if (!canAffordRepCost(state, cost)) return;
      set((s: GameState) => ({
        repPoints: s.repPoints - cost,
        unlockedLocationIds: [...s.unlockedLocationIds, locationId],
        unlockEvents: [...s.unlockEvents, `New Location: ${location.name}!`],
      }));
      if (cost > 0) _appendLog(set, get, "upgrade", `Opened ${location.name} for ${cost} Rep`, { repDelta: -cost });
    },

    unlockCircuit: (circuitId: string) => {
      const state = get() as GameState;
      const circuit = getCircuitById(circuitId);
      const cost = getCircuitRepCost(circuitId);
      if (!circuit || cost === undefined || state.unlockedCircuitIds.includes(circuitId)) return;
      if (circuit.requiredFeature && !state.unlockedFeatures.includes(circuit.requiredFeature)) return;
      if (!canAffordRepCost(state, cost)) return;
      set((s: GameState) => ({
        repPoints: s.repPoints - cost,
        unlockedCircuitIds: [...s.unlockedCircuitIds, circuitId],
        unlockEvents: [...s.unlockEvents, `${circuit.name} Unlocked! ${circuit.description}`],
      }));
      if (cost > 0) _appendLog(set, get, "upgrade", `Opened ${circuit.name} for ${cost} Rep`, { repDelta: -cost });
      (get() as GameState).checkFeatureUnlocks();
    },

    unlockVehicle: (vehicleId: string) => {
      const state = get() as GameState;
      const definition = getVehicleById(vehicleId);
      const cost = getVehicleRepCost(vehicleId);
      if (!definition || cost === undefined || state.unlockedVehicleIds.includes(vehicleId)) return;
      // Only Rep-priced blueprints are bought; the rest are earned through progress.
      if (definition.unlockRequirement.type !== "reputation") return;
      if (!canAffordRepCost(state, cost)) return;
      set((s: GameState) => ({
        repPoints: s.repPoints - cost,
        unlockedVehicleIds: [...s.unlockedVehicleIds, vehicleId],
        unlockEvents: [...s.unlockEvents, `${definition.name} Blueprint Unlocked!`],
      }));
      if (cost > 0) _appendLog(set, get, "upgrade", `Bought the ${definition.name} blueprint for ${cost} Rep`, { repDelta: -cost });
    },

    prestige: () => {
      const state = get() as GameState;
      // The gate reads lifetime Rep, this run's National Feature wins and rivals defeated.
      if (!canScrapReset(getScrapResetProgress(state))) return;

      // The legacy floor never falls: bank a share of this run's lifetime Rep.
      const legacyRepFloor = Math.max(
        state.legacyRepFloor,
        Math.floor(state.lifetimeRep * REP_DECAY.LEGACY_FLOOR_SHARE),
      );

      // Build run stats for LP calculation
      const runStats: RunStats = {
        lifetimeScrapBucks: state.lifetimeScrapBucks,
        lifetimeRaces: state.lifetimeRaces,
        fatigue: state.fatigue,
        highestCircuitTier: deriveHighestCircuitTier(state.unlockedCircuitIds),
        workshopUpgradesBought: Object.values(state.workshopLevels).reduce((a, b) => a + b, 0),
      };

      const result = doPrestige(state.prestigeCount, state.legacyUpgradeLevels, state.workshopLevels);

      const newPrestigeCount = result.prestigeCount;
      const milestoneBonuses = getPrestigeMilestoneBonuses(newPrestigeCount);
      const newProgress = { ...state.challengeProgress, prestigeCount: newPrestigeCount };
      const { completed, rewards } = checkChallenges(state, newProgress, state.completedChallenges);
      const challengeBundle = calculateChallengeRewardBundle(state, rewards);
      const teamStartingMaterials = getGameEffectValue(TEAM_UPGRADE_DEFINITIONS, state.teamUpgradeLevels, "starting_materials");
      const baseMaterials = Object.fromEntries(Object.keys(INITIAL_MATERIALS).map((key) => [key, teamStartingMaterials])) as Record<MaterialType, number>;
      const newMaterials = addRewardMaterials(baseMaterials, challengeBundle.materials);

      // Merge starting locations/circuits with defaults
      const startingLocations = Array.from(new Set(["curbside", ...result.startingLocationIds]));
      const startingCircuits = Array.from(new Set([
        ...getResetCircuitUnlockIds(state.ownerUpgradeLevels),
        ...result.startingCircuitIds,
      ]));

      // LP earned — the one formula, shared with the confirmation screen.
      const lpEarned = calculateScrapResetAward({
        currentPrestigeCount: state.prestigeCount,
        runStats,
        activeMomentumTierIds: state.activeMomentumTiers,
        teamUpgradeLevels: state.teamUpgradeLevels,
        trackPerkLevels: state.trackPerkLevels,
        earnedAchievements: state.earnedAchievements,
        unlockedPlaystyleNodes: state.unlockedPlaystyleNodes,
        crewRoster: state.crewRoster,
      }).totalLp;
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
      unlockEvents.push(...challengeCompletionEvents(completed));
      const permanentBonuses = getPermanentRuntimeBonuses(state);
      const milestoneWorkshopLevels = _randomStartingWorkshopLevels(milestoneBonuses.startWorkshopCount + permanentBonuses.startWorkshopCount);
      if (milestoneBonuses.startWithToolkit) milestoneWorkshopLevels.toolkit = 1;
      const startingScrapBeforeMilestone = result.startingScrap
        + getGameEffectValue(TEAM_UPGRADE_DEFINITIONS, state.teamUpgradeLevels, "quick_start_bonus")
        + getGameEffectValue(OWNER_UPGRADE_DEFINITIONS, state.ownerUpgradeLevels, "starting_scrap")
        + permanentBonuses.startingScrap;
      const startingScrap = Math.floor(startingScrapBeforeMilestone * (1 + milestoneBonuses.startingScrapMult)) + challengeBundle.scrap;
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
        workshopLevels: { ...milestoneWorkshopLevels, ...result.keptWorkshopUpgrades },
        unlockedVehicleIds: getResetVehicleUnlockIds(state.ownerUpgradeLevels),
        unlockedLocationIds: startingLocations,
        unlockedCircuitIds: startingCircuits,
        fatigue: 0,
        lifetimeRaces: 0,
        // Projects belong to the run that started them.
        projects: [],
        // Rep: the new run starts on the legacy floor resets have earned.
        legacyRepFloor,
        repPoints: legacyRepFloor,
        lifetimeRep: legacyRepFloor,
        lifetimeRepAllTime: Math.max(state.lifetimeRepAllTime, state.lifetimeRep),
        // Seed Money: starting scrap
        scrapBucks: startingScrap,
        lifetimeScrapBucks: startingScrap,
        // Automation is a baseline, not a reward: every run starts with it on.
        autoRaceUnlocked: true,
        autoScavengeUnlocked: true,
        manualScavengeClicks: 0,
        raceTickProgress: 0,
        unlockEvents,
        // Shared station equipment persists through Scrap Reset
        stationEquipmentInventory: state.stationEquipmentInventory,
        equippedStationEquipment: state.equippedStationEquipment,
        reforgeShards: state.reforgeShards,
        // Loot gear persists through prestige
        lootGearInventory: state.lootGearInventory,
        equippedLootGear: state.equippedLootGear,
        gearModInventory: state.gearModInventory,
        // New systems: materials, tokens, challenges persist
        materials: newMaterials,
        forgeTokens: state.forgeTokens + challengeBundle.forgeTokens,
        completedChallenges: [...state.completedChallenges, ...completed],
        challengeProgress: {
          ...newProgress,
          // Reset per-run trackers
          [PENDING_MANUAL_RACE_ENTRY_FEE_KEY]: 0,
          winStreak: 0,
          fatigue: 0,
          lifetimeRaces: 0,
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
        unlockedFeatures: state.unlockedFeatures,
        // Once revealed, a Workshop system stays revealed through every reset.
        revealedSystems: state.revealedSystems,
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
        lifetimeScrapBucksAllTime: state.lifetimeScrapBucksAllTime + challengeBundle.scrap,
        lifetimePartsScavengedAllTime: state.lifetimePartsScavengedAllTime,
        lifetimeVehiclesBuiltAllTime: state.lifetimeVehiclesBuiltAllTime,
        bestWinStreakAllTime: state.bestWinStreakAllTime,
        highestVehicleTierBuilt: state.highestVehicleTierBuilt,
        totalForgeTokensEarned: state.totalForgeTokensEarned + challengeBundle.forgeTokens,
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
        state.lifetimeRep,
        state.lifetimeScrapBucks,
        highestTier,
        getPermanentRuntimeBonuses(state).momentumThresholdReduction,
      );
      // Only update if changed
      if (newTiers.length !== state.activeMomentumTiers.length ||
          newTiers.some((t, i) => t !== state.activeMomentumTiers[i])) {
        set({ activeMomentumTiers: newTiers });
      }
    },

    applyTickResult: (partsFound: ScavengedPart[], scrapsEarned: number, repEarned: number, vehicleWear?: number, vehicleRepair?: number, newRaceTickProgress?: number, lootGearDrops?: LootGearItem[], modDrops?: InstalledMod[], meta?: AutomationSettlementMeta) => {
      const fallbackRaced = vehicleWear ? 1 : 0;
      const baseSettlement: AutomationSettlementMeta = meta ?? {
        partsScavenged: partsFound.length,
        partsAutoSold: 0,
        scavengesCompleted: partsFound.length > 0 ? 1 : 0,
        racesCompleted: fallbackRaced,
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
      };

      // Keep accelerated live automation at the same bounded-inventory
      // contract as offline simulation. Existing oversized saves remain valid,
      // but every newly produced overflow item is sold at its exact current
      // value instead of expanding the persisted state indefinitely.
      const stateBeforeSettlement = get() as GameState;
      const availableInventorySlots = Math.max(
        0,
        LOOSE_INVENTORY_LIMIT - stateBeforeSettlement.inventory.length,
      );
      const retainedParts = partsFound.slice(0, availableInventorySlots);
      const overflowParts = partsFound.slice(availableInventorySlots);
      const overflowSellValueBonus = getSellValueBonus(stateBeforeSettlement);
      const overflowScrap = overflowParts.reduce(
        (total, part) => total + (getPartSaleValue(part, overflowSellValueBonus) ?? 0),
        0,
      );
      // Race loot heads for the Locker, scavenged station gear for Stations; each
      // shelf keeps what fits and salvages the rest (config/gameplayLimits).
      const lootFinds = settleLootGearDrops(stateBeforeSettlement, stateBeforeSettlement.lootGearInventory.length, lootGearDrops ?? []);
      const stationFinds = settleStationDrops(stateBeforeSettlement, stateBeforeSettlement.stationEquipmentInventory.length, baseSettlement.stationEquipmentDrops ?? []);
      const totalScrapsEarned = scrapsEarned + overflowScrap + lootFinds.scrap;
      const settlement = overflowParts.length > 0 || stationFinds.salvaged.length > 0 || lootFinds.salvaged.length > 0
        ? {
            ...baseSettlement,
            partsAutoSold: baseSettlement.partsAutoSold + overflowParts.length,
            stationEquipmentAutoSalvaged:
              (baseSettlement.stationEquipmentAutoSalvaged ?? 0) + stationFinds.salvaged.length,
            reforgeShardsFound:
              (baseSettlement.reforgeShardsFound ?? 0) + stationFinds.shards,
            lootGearAutoSalvaged:
              (baseSettlement.lootGearAutoSalvaged ?? 0) + lootFinds.salvaged.length,
            lootGearSalvageScrap:
              (baseSettlement.lootGearSalvageScrap ?? 0) + lootFinds.scrap,
          }
        : baseSettlement;
      const tickParts: string[] = [];
      if (totalScrapsEarned > 0) tickParts.push(`+$${totalScrapsEarned}`);
      if (repEarned > 0) tickParts.push(`+${Math.round(repEarned)} rep`);
      if (retainedParts.length > 0) tickParts.push(`${retainedParts.length} parts`);
      if (settlement.partsAutoSold > 0) tickParts.push(`${settlement.partsAutoSold} auto-sold`);
      if (settlement.racesCompleted > 0) tickParts.push(`${settlement.racesCompleted} race${settlement.racesCompleted === 1 ? "" : "s"}`);
      if (lootFinds.kept.length > 0) tickParts.push(`${lootFinds.kept.length} loot gear`);
      if ((settlement.lootGearAutoSalvaged ?? 0) > 0) {
        tickParts.push(`${settlement.lootGearAutoSalvaged} loot gear auto-salvaged`);
      }
      if ((modDrops?.length ?? 0) > 0) tickParts.push(`${modDrops?.length} gear mod${modDrops?.length === 1 ? "" : "s"}`);
      if (stationFinds.kept.length > 0) tickParts.push(`${stationFinds.kept.length} station equipment`);
      if ((settlement.stationEquipmentAutoSalvaged ?? 0) > 0) {
        tickParts.push(`${settlement.stationEquipmentAutoSalvaged} station equipment auto-salvaged`);
      }
      const tickMessage = tickParts.length > 0 ? `Auto: ${tickParts.join(", ")}` : null;

      let tickChallengeAnnouncement: { ids: string[]; bundle: ChallengeRewardBundle } | null = null;
      set((s: GameState) => {
        const raced = settlement.racesCompleted > 0;
        const newLifetimeRaces = s.lifetimeRaces + settlement.racesCompleted;
        const gbTick = getGearBonuses(s.equippedLootGear, s.lootGearInventory, s.equippedStationEquipment, s.stationEquipmentInventory);
        const handlingBonus = _getUpgradeEffectValue(s, "tuned_suspension") + gbTick.race_handling_pct;
        const updatedGarage = s.garage.map((vehicle) => {
          if (vehicle.id !== s.activeVehicleId) return vehicle;
          let condition = vehicle.condition ?? 100;
          if (vehicleRepair) condition = Math.min(100, condition + vehicleRepair);
          if (vehicleWear) condition = Math.max(0, condition - vehicleWear);
          if (settlement.finalVehicleCondition != null) condition = settlement.finalVehicleCondition;
          const definition = getVehicleById(vehicle.definitionId);
          return {
            ...vehicle,
            condition,
            totalRaces: (vehicle.totalRaces ?? 0) + settlement.racesCompleted,
            stats: definition ? calculateStats(definition, vehicle.parts, condition, handlingBonus) : vehicle.stats,
          };
        });

        const activeCircuitTier = getCircuitById(s.selectedCircuitId)?.tier ?? 1;
        // Tick math (computeTick / simulateOfflineTicks) supplies the exact
        // rested-then-raced fatigue. The bare fallback credits the races only.
        const calculatedFatigue = fatigueAfterTick(s, s.fatigue, 0, settlement.racesCompleted, activeCircuitTier);
        const newFatigue = settlement.finalFatigue ?? calculatedFatigue;

        // Projects: the tick math advanced them; finished ones land here once.
        const runningProjects = settlement.finalProjects ?? s.projects;
        const completedProjects = settlement.completedProjects ?? [];
        const projectCompletion = applyCompletedProjects(
          { workshopLevels: s.workshopLevels, inventory: s.inventory, lifetimeTotalEnhanced: s.lifetimeTotalEnhanced, highestConditionReached: s.highestConditionReached },
          completedProjects,
        );

        let tickSkills = s.racerSkills;
        if (settlement.scavengesCompleted > 0) tickSkills = _grantXp(tickSkills, "scavenging", settlement.scavengesCompleted);
        if (raced) {
          tickSkills = _grantXp(tickSkills, "driving", 10 * settlement.racesCompleted + 5 * settlement.winsCompleted);
          if (newFatigue >= 60) tickSkills = _grantXp(tickSkills, "endurance", 10 * settlement.racesCompleted);
          else if (newFatigue >= 40) tickSkills = _grantXp(tickSkills, "endurance", 5 * settlement.racesCompleted);
        }

        let updatedCrew = grantCrewRoleXp(s.crewRoster, "scout", settlement.scavengesCompleted, getCrewXpMultiplier(s));
        updatedCrew = grantCrewRoleXp(updatedCrew, "driver", 10 * settlement.racesCompleted, getCrewXpMultiplier(s));
        if (settlement.partsAutoSold > 0) updatedCrew = grantTraderSaleXp({ ...s, crewRoster: updatedCrew }, settlement.partsAutoSold);

        // Decay was measured by the tick math against the pre-tick balance and
        // floor, so applying it here matches offline simulation exactly.
        const repDecayed = Math.min(settlement.repDecayed ?? 0, Math.max(0, s.repPoints + repEarned));
        const newRep = settlement.finalRepPoints ?? Math.max(0, s.repPoints + repEarned - repDecayed);
        const newLifetimeRep = s.lifetimeRep + repEarned;
        const unlockedVehicles = [...s.unlockedVehicleIds];
        const unlockEvents = [...s.unlockEvents];
        const addUnlock = (collection: string[], id: string, message: string) => {
          if (collection.includes(id)) return;
          collection.push(id);
          unlockEvents.push(message);
        };
        const combinedOutcomes = [...settlement.recentRaceOutcomes, ...s.raceHistory];
        const wonCircuitIds = [...new Set(combinedOutcomes.filter((race) => race.result === "win").map((race) => race.circuitId))];
        const circuitWinStreaks = settlement.circuitWinStreaks;
        for (const vehicleId of getVehicleIdsUnlockedByProgress({ reputation: NO_AUTO_REPUTATION_UNLOCK, wonCircuitIds, circuitWinStreaks, ownerUpgradeLevels: s.ownerUpgradeLevels })) {
          const definition = getVehicleById(vehicleId);
          addUnlock(unlockedVehicles, vehicleId, `${definition?.name ?? vehicleId} Blueprint Unlocked!`);
        }

        const newBestStreak = Math.max(s.bestWinStreak, settlement.bestWinStreak);
        for (const threshold of [3, 5, 10]) {
          if (s.bestWinStreak < threshold && newBestStreak >= threshold) unlockEvents.push(`${threshold}-Win Streak!`);
        }
        const newRaceSalvage = s.lifetimeTotalRaceSalvage + settlement.raceSalvageFound;
        for (const project of completedProjects) unlockEvents.push(`Project complete: ${project.label}`);
        const challengeProgress = {
          ...s.challengeProgress,
          winStreak: newBestStreak,
          fatigue: newFatigue,
          lifetimeRaces: newLifetimeRaces,
          totalRaceSalvage: newRaceSalvage,
          ...(projectCompletion.lifetimeTotalEnhanced !== s.lifetimeTotalEnhanced
            ? { totalEnhanced: projectCompletion.lifetimeTotalEnhanced, highestConditionReached: projectCompletion.highestConditionReached }
            : {}),
        };
        const challengeCheck = settlement.challengesEvaluated
          ? { completed: settlement.completedChallengeIds.filter((id) => !s.completedChallenges.includes(id)), rewards: [] }
          : checkChallenges(s, challengeProgress, s.completedChallenges);
        const completed = challengeCheck.completed;
        const challengeRewards = settlement.challengesEvaluated
          ? {
              scrap: 0,
              forgeTokens: settlement.challengeForgeTokens,
              materials: settlement.challengeMaterials,
            }
          : calculateChallengeRewardBundle(s, challengeCheck.rewards);
        unlockEvents.push(...challengeCompletionEvents(completed));
        for (const achievementId of settlement.newAchievementIds ?? []) {
          if (s.earnedAchievements.includes(achievementId)) continue;
          const achievement = ACHIEVEMENTS_BY_ID[achievementId];
          if (!achievement) continue;
          const rewardText = achievement.reward.type === "bonus"
            ? ` — ${achievement.reward.description}`
            : achievement.reward.type === "title"
              ? ` — Title: ${achievement.reward.title}`
              : "";
          unlockEvents.push(`Achievement: ${achievement.name}!${rewardText}`);
        }

        let inventory = retainedParts.length > 0
          ? [...projectCompletion.inventory, ...retainedParts]
          : projectCompletion.inventory;
        let stationEquipmentInventory = stationFinds.kept.length > 0
          ? [...s.stationEquipmentInventory, ...stationFinds.kept]
          : s.stationEquipmentInventory;
        const lootGearInventory = lootFinds.kept.length > 0
          ? [...s.lootGearInventory, ...lootFinds.kept]
          : s.lootGearInventory;
        const gearModInventory = (modDrops?.length ?? 0) > 0
          ? [...s.gearModInventory, ...(modDrops ?? [])]
          : s.gearModInventory;
        // A live tick toasts each find like a manual race would; a batched
        // catch-up reports them in the return summary instead of a toast storm.
        if (settlement.ticksProcessed <= 1) {
          for (const item of lootFinds.kept) unlockEvents.push(lootGearDropAnnouncement(item));
          for (const mod of modDrops ?? []) unlockEvents.push(gearModDropAnnouncement(mod));
          if (stationFinds.kept.length > 0) unlockEvents.push(stationDropAnnouncement(stationFinds.kept));
        }
        const discoveredBlueprintIds = [...s.discoveredBlueprintIds];
        // Event ladder: batched settlements report exact per-event wins; live ticks carry them on the outcomes.
        const newEventWins = mergeEventWins(s.eventWins, settlement.eventWins ?? eventWinsFromOutcomes(settlement.recentRaceOutcomes));
        for (const circuitId of Object.keys(newEventWins)) {
          for (const openedId of newlyOpenedEventIds(s.eventWins?.[circuitId], newEventWins[circuitId])) {
            const venue = getCircuitById(circuitId);
            if (venue) unlockEvents.push(`${venue.name} ${getEventDefinition(openedId).name} Unlocked! ${getEventDefinition(openedId).description}`);
          }
        }
        const defeatedRivalIds = [...s.defeatedRivalIds];
        for (const rivalId of settlement.defeatedRivalIds) {
          if (defeatedRivalIds.includes(rivalId)) continue;
          const rival = getRivalById(rivalId);
          if (!rival) continue;
          defeatedRivalIds.push(rivalId);
          unlockEvents.push(`Rival defeated: ${rival.name}! Reward: ${rival.reward.label}`);
          if (rival.reward.type === "blueprint" && !discoveredBlueprintIds.includes(rival.reward.id)) discoveredBlueprintIds.push(rival.reward.id);
          if (rival.reward.type === "addon") {
            inventory = [...inventory, { id: makePartId(), definitionId: rival.reward.id, condition: "pristine", foundAt: `rival_${rival.id}`, type: "addon" }];
          }
          if (rival.reward.type === "station_set") {
            const slots = ["diagnostics", "lift", "logistics", "pit_equipment"] as const;
            const item = forgeStationEquipment(slots[defeatedRivalIds.length % slots.length], "rare");
            stationEquipmentInventory = [...stationEquipmentInventory, { ...item, setId: rival.reward.id as "redline" | "slipstream", source: rival.name }];
          }
        }

        const history = compactRaceHistory([...settlement.recentRaceOutcomes, ...s.raceHistory], 20);
        const directAndChallengeTokens = settlement.forgeTokensFound + challengeRewards.forgeTokens;
        const earnedScrap = totalScrapsEarned + settlement.entryFeesPaid + challengeRewards.scrap;
        const newGameTick = s.gameTick + settlement.ticksProcessed;
        const newDealerBoard = (isDealerOpen(s) && shouldRefreshDealer(s.dealerBoard, newGameTick))
          ? generateDealerBoard(newLifetimeRep, newGameTick)
          : s.dealerBoard;
        const tickLogState = tickMessage
          ? {
              activityLog: [
                ...s.activityLog,
                {
                  id: s._logIdCounter,
                  timestamp: Date.now(),
                  category: "tick" as const,
                  message: tickMessage,
                  scrapDelta: totalScrapsEarned || undefined,
                  repDelta: repEarned ? Math.round(repEarned) : undefined,
                },
              ].slice(-MAX_LOG_ENTRIES),
              _logIdCounter: s._logIdCounter + 1,
            }
          : {};
        if (completed.length > 0) tickChallengeAnnouncement = { ids: completed, bundle: challengeRewards };
        return {
          inventory,
          scrapBucks: s.scrapBucks + totalScrapsEarned + challengeRewards.scrap,
          lifetimeScrapBucks: s.lifetimeScrapBucks + earnedScrap,
          repPoints: newRep,
          lifetimeRep: newLifetimeRep,
          lifetimeRepAllTime: s.lifetimeRepAllTime + repEarned,
          garage: updatedGarage,
          lifetimeRaces: newLifetimeRaces,
          fatigue: newFatigue,
          projects: runningProjects,
          workshopLevels: projectCompletion.workshopLevels,
          lifetimeTotalEnhanced: projectCompletion.lifetimeTotalEnhanced,
          highestConditionReached: projectCompletion.highestConditionReached,
          racerSkills: settlement.finalRacerSkills ?? tickSkills,
          crewRoster: settlement.finalCrewRoster ?? updatedCrew,
          stationEquipmentInventory,
          lootGearInventory,
          gearModInventory,
          reforgeShards: s.reforgeShards + (settlement.reforgeShardDrops ?? 0) + (settlement.reforgeShardsFound ?? 0),
          raceTickProgress: newRaceTickProgress ?? s.raceTickProgress,
          lastRaceOutcome: settlement.recentRaceOutcomes[0] ?? s.lastRaceOutcome,
          raceHistory: history,
          winStreak: raced ? settlement.finalWinStreak : s.winStreak,
          bestWinStreak: newBestStreak,
          unlockedVehicleIds: unlockedVehicles,
          unlockEvents,
          defeatedRivalIds,
          eventWins: newEventWins,
          discoveredBlueprintIds,
          forgeTokens: s.forgeTokens + directAndChallengeTokens,
          totalForgeTokensEarned: s.totalForgeTokensEarned + directAndChallengeTokens,
          materials: addRewardMaterials(s.materials, challengeRewards.materials),
          challengeProgress,
          completedChallenges: [...s.completedChallenges, ...completed],
          lifetimeTotalRaceSalvage: newRaceSalvage,
          lastActiveTimestamp: Date.now(),
          lifetimePartsScavengedAllTime: s.lifetimePartsScavengedAllTime + settlement.partsScavenged,
          lifetimeScrapBucksAllTime: s.lifetimeScrapBucksAllTime + earnedScrap,
          lifetimeRacesAllTime: s.lifetimeRacesAllTime + settlement.racesCompleted,
          lifetimeWinsAllTime: s.lifetimeWinsAllTime + settlement.winsCompleted,
          bestWinStreakAllTime: Math.max(s.bestWinStreakAllTime, newBestStreak),
          gameTick: newGameTick,
          dealerBoard: newDealerBoard,
          activeMomentumTiers: settlement.finalActiveMomentumTiers ?? s.activeMomentumTiers,
          earnedAchievements: [...new Set([...s.earnedAchievements, ...(settlement.newAchievementIds ?? [])])],
          ...tickLogState,
        };
      });
      if (tickChallengeAnnouncement) {
        const { ids, bundle } = tickChallengeAnnouncement as { ids: string[]; bundle: ChallengeRewardBundle };
        announceChallengeCompletions(set, get, ids, bundle);
      }
      const postTick = get() as GameState;
      postTick.checkMomentumTiers();
      postTick.checkFeatureUnlocks();
      postTick.checkAchievements();
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
      const permanent = getPermanentRuntimeBonuses(state);
      const decompYieldMult =
        1 +
        getLegacyEffectValue(state.legacyUpgradeLevels, "leg_decompose_yield") +
        permanent.materialYieldMult +
        permanent.decomposeYieldMult;
      const gb = getGearBonuses(state.equippedLootGear, state.lootGearInventory, state.equippedStationEquipment, state.stationEquipmentInventory);
      const newMaterials = { ...state.materials };
      const awardedMaterials: Partial<Record<MaterialType, number>> = {};
      for (const [mat, qty] of Object.entries(result.materials) as [MaterialType, number][]) {
        const bonusQty = Math.floor(qty * decompYieldMult * (1 + gb.material_bonus_pct));
        newMaterials[mat] = (newMaterials[mat] ?? 0) + bonusQty;
        awardedMaterials[mat] = bonusQty;
      }

      const newDecomposed = state.lifetimeTotalDecomposed + 1;
      const newProgress = { ...state.challengeProgress, totalDecomposed: newDecomposed };
      const { completed, rewards } = checkChallenges(state, newProgress, state.completedChallenges);
      const challengeBundle = calculateChallengeRewardBundle(state, rewards);
      const rewardedMaterials = addRewardMaterials(newMaterials, challengeBundle.materials);

      set((s: GameState) => ({
        inventory: s.inventory.filter((p) => p.id !== partId),
        materials: rewardedMaterials,
        lifetimeTotalDecomposed: newDecomposed,
        challengeProgress: newProgress,
        completedChallenges: [...s.completedChallenges, ...completed],
        scrapBucks: s.scrapBucks + challengeBundle.scrap,
        lifetimeScrapBucks: s.lifetimeScrapBucks + challengeBundle.scrap,
        lifetimeScrapBucksAllTime: s.lifetimeScrapBucksAllTime + challengeBundle.scrap,
        forgeTokens: s.forgeTokens + challengeBundle.forgeTokens,
        totalForgeTokensEarned: s.totalForgeTokensEarned + challengeBundle.forgeTokens,
        unlockEvents: [...s.unlockEvents, ...challengeCompletionEvents(completed)],
      }));
      const matSummary = Object.entries(awardedMaterials).filter(([, q]) => q > 0).map(([m, q]) => `${q} ${m}`).join(", ");
      _appendLog(set, get, "craft", `Decomposed part into ${matSummary}`);
      announceChallengeCompletions(set, get, completed, challengeBundle);
      (get() as GameState).checkAchievements();
    },

    decomposeAllJunk: () => {
      const state = get() as GameState;
      const freeBulkDecompose = getPrestigeMilestoneBonuses(state.prestigeCount).freeDecomposeAll;
      const cost = freeBulkDecompose ? 0 : BULK_DECOMPOSE_COST;
      if (state.scrapBucks < cost) return;
      const junk = state.inventory.filter(
        (part) =>
          (part.condition === "rusted" || part.condition === "worn") &&
          decomposePart(part, state.fatigue) !== null,
      );
      if (junk.length === 0) return;

      const { materials: matYield, count } = decomposeMany(junk, state.fatigue);
      // Apply legacy decompose yield multiplier + gear material bonus
      const permanent = getPermanentRuntimeBonuses(state);
      const decompYieldMult =
        1 +
        getLegacyEffectValue(state.legacyUpgradeLevels, "leg_decompose_yield") +
        permanent.materialYieldMult +
        permanent.decomposeYieldMult;
      const gbDecompose = getGearBonuses(state.equippedLootGear, state.lootGearInventory, state.equippedStationEquipment, state.stationEquipmentInventory);
      const newMaterials = { ...state.materials };
      const awardedMaterials: Partial<Record<MaterialType, number>> = {};
      for (const [mat, qty] of Object.entries(matYield) as [MaterialType, number][]) {
        const bonusQty = Math.floor(qty * decompYieldMult * (1 + gbDecompose.material_bonus_pct));
        newMaterials[mat] = (newMaterials[mat] ?? 0) + bonusQty;
        awardedMaterials[mat] = bonusQty;
      }
      const junkIds = new Set(junk.map((p) => p.id));
      const newDecomposed = state.lifetimeTotalDecomposed + count;
      const newProgress = { ...state.challengeProgress, totalDecomposed: newDecomposed };
      const { completed, rewards } = checkChallenges(state, newProgress, state.completedChallenges);
      const challengeBundle = calculateChallengeRewardBundle(state, rewards);
      const rewardedMaterials = addRewardMaterials(newMaterials, challengeBundle.materials);

      set((s: GameState) => ({
        inventory: s.inventory.filter((p) => !junkIds.has(p.id)),
        materials: rewardedMaterials,
        scrapBucks: s.scrapBucks - cost + challengeBundle.scrap,
        lifetimeScrapBucks: s.lifetimeScrapBucks + challengeBundle.scrap,
        lifetimeScrapBucksAllTime: s.lifetimeScrapBucksAllTime + challengeBundle.scrap,
        lifetimeTotalDecomposed: newDecomposed,
        challengeProgress: newProgress,
        completedChallenges: [...s.completedChallenges, ...completed],
        forgeTokens: s.forgeTokens + challengeBundle.forgeTokens,
        totalForgeTokensEarned: s.totalForgeTokensEarned + challengeBundle.forgeTokens,
        unlockEvents: [...s.unlockEvents, ...challengeCompletionEvents(completed)],
      }));
      const materialSummary = Object.entries(awardedMaterials)
        .filter(([, quantity]) => quantity > 0)
        .map(([material, quantity]) => `${quantity} ${material}`)
        .join(", ");
      const costText = cost === 0 ? "free" : `$${cost}`;
      _appendLog(
        set,
        get,
        "craft",
        `Bulk-decomposed ${count} rusted/worn item${count === 1 ? "" : "s"} for ${costText} into ${materialSummary}`,
        { scrapDelta: challengeBundle.scrap - cost || undefined },
      );
      announceChallengeCompletions(set, get, completed, challengeBundle);
      (get() as GameState).checkAchievements();
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
      const baseCost = calculateEnhancementCost(targetIdx, def.category, state.fatigue);
      if (!baseCost) return;
      const cost = getReducedEnhancementCost(state, baseCost);
      if (!canAffordEnhancement(cost, state.materials)) return;

      const newMaterials = { ...state.materials };
      for (const [mat, qty] of Object.entries(cost) as [MaterialType, number][]) {
        newMaterials[mat] = Math.max(0, (newMaterials[mat] ?? 0) - qty);
      }
      const newCondition = CONDITIONS[targetIdx] as PartCondition;

      // Polished and above run as timed projects in the shared queue: the
      // materials are paid now, the condition lands when the timer passes.
      if (targetIdx >= ENHANCEMENT_PROJECT_MIN_INDEX) {
        if (findEnhanceProject(state, partId) || !hasFreeProjectSlot(state)) return;
        const project = createEnhanceProject(state, partId, def.name, newCondition, { scrap: 0, rep: 0, materials: cost }, Date.now());
        set((s: GameState) => ({
          materials: newMaterials,
          racerSkills: _grantXp(s.racerSkills, "mechanics", 10),
        }));
        if (!(get() as GameState).startProject(project)) {
          set({ materials: state.materials });
          return;
        }
        _appendLog(set, get, "craft", `Started enhancing ${def.name} to ${newCondition} · ready in ${formatTime(project.durationMs)}`);
        return;
      }

      const newHighest = Math.max(state.highestConditionReached, targetIdx);
      const newEnhanced = state.lifetimeTotalEnhanced + 1;
      const newProgress = {
        ...state.challengeProgress,
        totalEnhanced: newEnhanced,
        highestConditionReached: newHighest,
      };
      const { completed, rewards } = checkChallenges(state, newProgress, state.completedChallenges);
      const challengeBundle = calculateChallengeRewardBundle(state, rewards);
      const rewardedMaterials = addRewardMaterials(newMaterials, challengeBundle.materials);

      set((s: GameState) => ({
        inventory: s.inventory.map((p) => p.id !== partId ? p : { ...p, condition: newCondition }),
        materials: rewardedMaterials,
        highestConditionReached: newHighest,
        lifetimeTotalEnhanced: newEnhanced,
        challengeProgress: newProgress,
        completedChallenges: [...s.completedChallenges, ...completed],
        scrapBucks: s.scrapBucks + challengeBundle.scrap,
        lifetimeScrapBucks: s.lifetimeScrapBucks + challengeBundle.scrap,
        lifetimeScrapBucksAllTime: s.lifetimeScrapBucksAllTime + challengeBundle.scrap,
        forgeTokens: s.forgeTokens + challengeBundle.forgeTokens,
        totalForgeTokensEarned: s.totalForgeTokensEarned + challengeBundle.forgeTokens,
        unlockEvents: [...s.unlockEvents, ...challengeCompletionEvents(completed)],
        racerSkills: _grantXp(s.racerSkills, "mechanics", 10),
      }));
      announceChallengeCompletions(set, get, completed, challengeBundle);
      (get() as GameState).checkAchievements();
    },

    forgePart: (partId: string) => {
      const state = get() as GameState;
      if (_getUpgradeLevel(state, "artifact_forge") < 1) return;
      const part = state.inventory.find((p) => p.id === partId);
      if (!part || part.condition !== "mythic") return;
      if (state.forgeTokens < ARTIFACT_FORGE_TOKEN_COST) return;
      const forgeMaterialCost = getReducedEnhancementCost(state, ARTIFACT_FORGE_COST);
      if (!canAffordEnhancement(forgeMaterialCost, state.materials)) return;

      const newMaterials = { ...state.materials };
      for (const [mat, qty] of Object.entries(forgeMaterialCost) as [MaterialType, number][]) {
        newMaterials[mat] = Math.max(0, (newMaterials[mat] ?? 0) - qty);
      }
      const newHighest = Math.max(state.highestConditionReached, 8);
      const newProgress = { ...state.challengeProgress, highestConditionReached: newHighest };
      const { completed, rewards } = checkChallenges(state, newProgress, state.completedChallenges);
      const challengeBundle = calculateChallengeRewardBundle(state, rewards);
      const rewardedMaterials = addRewardMaterials(newMaterials, challengeBundle.materials);

      set((s: GameState) => ({
        inventory: s.inventory.map((p) => p.id !== partId ? p : { ...p, condition: "artifact" as PartCondition }),
        materials: rewardedMaterials,
        forgeTokens: s.forgeTokens - ARTIFACT_FORGE_TOKEN_COST + challengeBundle.forgeTokens,
        totalForgeTokensEarned: s.totalForgeTokensEarned + challengeBundle.forgeTokens,
        highestConditionReached: newHighest,
        challengeProgress: newProgress,
        completedChallenges: [...s.completedChallenges, ...completed],
        scrapBucks: s.scrapBucks + challengeBundle.scrap,
        lifetimeScrapBucks: s.lifetimeScrapBucks + challengeBundle.scrap,
        lifetimeScrapBucksAllTime: s.lifetimeScrapBucksAllTime + challengeBundle.scrap,
        unlockEvents: [...s.unlockEvents, ...challengeCompletionEvents(completed)],
      }));
      _appendLog(set, get, "craft", `Forged part to artifact quality!`);
      announceChallengeCompletions(set, get, completed, challengeBundle);
      (get() as GameState).checkAchievements();
    },

    craftPart: (recipe: CraftRecipe) => {
      const state = get() as GameState;
      if (_getUpgradeLevel(state, "parts_bin") < 1) return;
      const craftCost = getReducedCraftCost(state, recipe.cost);
      if (!canAffordEnhancement(craftCost, state.materials)) return;

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
      for (const [mat, qty] of Object.entries(craftCost) as [MaterialType, number][]) {
        newMaterials[mat] = Math.max(0, (newMaterials[mat] ?? 0) - qty);
      }

      set((s: GameState) => ({
        inventory: [...s.inventory, newPart],
        materials: newMaterials,
        crewRoster: grantCrewRoleXp(
          s.crewRoster,
          "mechanic",
          10,
          getCrewXpMultiplier(s),
        ),
      }));
      _appendLog(set, get, "craft", `Crafted ${def.name} (${recipe.resultCondition})`);
    },

    tradeUpParts: (partIds: [string, string, string]) => {
      const state = get() as GameState;
      if (_getUpgradeLevel(state, "parts_trader") < 1) return;
      if (new Set(partIds).size !== 3) return;

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
      // Preserve the strongest underlying part model from the consumed trio.
      // A condition trade-up must never turn late-game hardware into a T0 part.
      const def = [...defs]
        .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))
        .sort((left, right) =>
          right.minTier - left.minTier ||
          (right.basePower + right.baseReliability) - (left.basePower + left.baseReliability) ||
          right.scrapValue - left.scrapValue,
        )[0];
      if (!def) return;

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
      const challengeBundle = calculateChallengeRewardBundle(state, rewards);
      const newMaterials = addRewardMaterials(state.materials, challengeBundle.materials);

      set((s: GameState) => ({
        inventory: [...s.inventory.filter((p) => !usedIds.has(p.id)), newPart],
        lifetimeTotalTradeUps: newTradeUps,
        challengeProgress: newProgress,
        completedChallenges: [...s.completedChallenges, ...completed],
        scrapBucks: s.scrapBucks + challengeBundle.scrap,
        lifetimeScrapBucks: s.lifetimeScrapBucks + challengeBundle.scrap,
        lifetimeScrapBucksAllTime: s.lifetimeScrapBucksAllTime + challengeBundle.scrap,
        forgeTokens: s.forgeTokens + challengeBundle.forgeTokens,
        totalForgeTokensEarned: s.totalForgeTokensEarned + challengeBundle.forgeTokens,
        materials: newMaterials,
        crewRoster: grantCrewRoleXp(
          s.crewRoster,
          "trader",
          1,
          getCrewXpMultiplier(s),
        ),
        unlockEvents: [...s.unlockEvents, ...challengeCompletionEvents(completed)],
      }));
      _appendLog(set, get, "trade", `Traded up 3 parts into ${def.name} (${targetCondition})`);
      announceChallengeCompletions(set, get, completed, challengeBundle);
      (get() as GameState).checkAchievements();
    },

    buyFromDealer: (listingId: string) => {
      const state = get() as GameState;
      if (!isDealerOpen(state)) return;
      const listing = state.dealerBoard.find((l) => l.id === listingId);
      if (!listing) return;
      const price = getDealerPurchasePrice(state, listing);
      if (state.scrapBucks < price) return;

      const newPart: ScavengedPart = {
        id: makePartId(),
        definitionId: listing.definitionId,
        condition: listing.condition as PartCondition,
        foundAt: "dealer",
        type: "part",
      };

      set((s: GameState) => ({
        scrapBucks: s.scrapBucks - price,
        inventory: [...s.inventory, newPart],
        dealerBoard: s.dealerBoard.filter((l) => l.id !== listingId),
        crewRoster: grantCrewRoleXp(
          s.crewRoster,
          "trader",
          1,
          getCrewXpMultiplier(s),
        ),
      }));
      _appendLog(set, get, "trade", `Bought ${listing.definitionId} from dealer for $${price}`, { scrapDelta: -price });
    },

    refreshDealer: () => {
      const state = get() as GameState;
      const cost = getDealerRefreshCost(state);
      if (state.scrapBucks < cost) return;
      if (!isDealerOpen(state)) return;
      const newBoard = generateDealerBoard(state.lifetimeRep, state.gameTick);
      set((s: GameState) => ({
        scrapBucks: s.scrapBucks - cost,
        dealerBoard: newBoard,
        crewRoster: grantCrewRoleXp(
          s.crewRoster,
          "trader",
          1,
          getCrewXpMultiplier(s),
        ),
      }));
      _appendLog(set, get, "trade", `Refreshed dealer inventory for $${cost}`, { scrapDelta: -cost });
    },

    convertScrapToMaterial: (material: MaterialType) => {
      const state = get() as GameState;
      const { available, cost, yield: yield_ } = getMaterialSourcingTerms(state, material);
      if (!available) return;
      if (state.scrapBucks < cost) return;
      set((s: GameState) => ({
        scrapBucks: s.scrapBucks - cost,
        materials: { ...s.materials, [material]: (s.materials[material] ?? 0) + yield_ },
        crewRoster: grantCrewRoleXp(
          s.crewRoster,
          "trader",
          1,
          getCrewXpMultiplier(s),
        ),
      }));
      _appendLog(set, get, "trade", `Converted $${cost} into ${yield_} ${material}`, { scrapDelta: -cost });
    },

    purchaseFatigueDrink: () => {
      const state = get() as GameState;
      const purchased = state.challengeProgress[FATIGUE_DRINK_PROGRESS_KEY] ?? 0;
      if (purchased >= FATIGUE_DRINK_RUN_LIMIT) return;
      if (state.scrapBucks < FATIGUE_DRINK_COST) return;
      if (state.fatigue <= 0) return;
      const recovered = Math.min(FATIGUE_DRINK_RECOVERY, state.fatigue);
      set((s: GameState) => ({
        scrapBucks: s.scrapBucks - FATIGUE_DRINK_COST,
        fatigue: roundFatigue(Math.max(0, s.fatigue - recovered)),
        challengeProgress: {
          ...s.challengeProgress,
          [FATIGUE_DRINK_PROGRESS_KEY]: purchased + 1,
        },
      }));
      _appendLog(set, get, "upgrade", `Bought Fatigue Drink for $${FATIGUE_DRINK_COST} (-${recovered} fatigue)`, { scrapDelta: -FATIGUE_DRINK_COST });
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
      set((s: GameState) => ({
        repPoints: amount,
        lifetimeRep: Math.max(s.lifetimeRep, amount),
        lifetimeRepAllTime: Math.max(s.lifetimeRepAllTime, amount),
      }));
    },

    devAddRepPoints: (amount: number) => {
      set((s: GameState) => ({
        repPoints: s.repPoints + amount,
        lifetimeRep: s.lifetimeRep + Math.max(0, amount),
        lifetimeRepAllTime: s.lifetimeRepAllTime + Math.max(0, amount),
      }));
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
              // Every venue's ladder fully open (one Sprint and one Heat win each).
              eventWins: Object.fromEntries(CIRCUIT_DEFINITIONS.map((c) => [c.id, { sprint: 1, heat: 1 }])),
              revealedSystems: Object.keys(SYSTEM_REVEALS_BY_ID) as WorkshopSystem[],
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
        eventWins: {},
        pinnedEventIds: {},
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
      const state = get() as GameState;
      const pendingEntryFee = state.challengeProgress[PENDING_MANUAL_RACE_ENTRY_FEE_KEY] ?? 0;
      set({
        garage: [],
        activeVehicleId: null,
        isRacing: false,
        activeRaceSessionId: null,
        scrapBucks: state.scrapBucks + pendingEntryFee,
        challengeProgress: {
          ...state.challengeProgress,
          [PENDING_MANUAL_RACE_ENTRY_FEE_KEY]: 0,
        },
        raceEvents: [],
        raceStartTime: null,
        precomputedOutcome: null,
      });
    },

    devSetAutoUnlocks: (scavengeUnlocked: boolean, raceUnlocked: boolean) => {
      set({ autoScavengeUnlocked: scavengeUnlocked, autoRaceUnlocked: raceUnlocked });
    },

    // ── Multi-layer prestige actions ────────────────────────────────────────────

    teamReset: () => {
      const state = get() as GameState;
      if (!canTeamReset({
        lifetimeLegacyPoints: state.lifetimeLPAllTime,
        lifetimeLPThisTeamEra: state.lifetimeLPThisTeamEra,
        unspentLegacyPoints: state.legacyPoints,
      })) return;
      const stats = {
        lifetimeLPThisTeamEra: state.lifetimeLPThisTeamEra,
        teamEraCount: state.teamEraCount,
        unspentLP: state.legacyPoints,
      };
      const cascadeMultiplier = 1 + getGameEffectValue(
        TRACK_PERK_DEFINITIONS,
        state.trackPerkLevels,
        "lower_currency_mult",
      );
      const tpEarned = Math.floor(calculateTeamPoints(stats) * cascadeMultiplier);
      const newTP = state.teamPoints + tpEarned;
      const newLifetimeTP = state.lifetimeTeamPoints + tpEarned;
      const permanent = getPermanentRuntimeBonuses(state);
      const bornRich = getGameEffectValue(
        OWNER_UPGRADE_DEFINITIONS,
        state.ownerUpgradeLevels,
        "starting_scrap",
      );
      const quickStart = getGameEffectValue(
        TEAM_UPGRADE_DEFINITIONS,
        state.teamUpgradeLevels,
        "quick_start_bonus",
      );
      const startingScrap = permanent.startingScrap + bornRich + quickStart;
      const academyActive = getGameEffectValue(
        TRACK_PERK_DEFINITIONS,
        state.trackPerkLevels,
        "crew_auto_recruit",
      ) > 0;
      const ownerCrewLevel = getGameEffectValue(
        OWNER_UPGRADE_DEFINITIONS,
        state.ownerUpgradeLevels,
        "crew_starting_level",
      );
      const teamCrewSlots = 1 + (state.teamUpgradeLevels.team_crew_slots ?? 0);
      const startingCrew = academyActive
        ? ensureAcademyRoster([], ownerCrewLevel > 0 ? ownerCrewLevel : 1)
        : [];
      const startingMaterials = getGameEffectValue(
        TEAM_UPGRADE_DEFINITIONS,
        state.teamUpgradeLevels,
        "starting_materials",
      );

      set({
        ...createInitialState(),
        scrapBucks: startingScrap,
        lifetimeScrapBucks: startingScrap,
        autoScavengeUnlocked: true,
        autoRaceUnlocked: true,
        materials: Object.fromEntries(
          Object.keys(INITIAL_MATERIALS).map((material) => [material, startingMaterials]),
        ) as Record<MaterialType, number>,
        tutorialStep: state.tutorialStep,
        tutorialDismissed: state.tutorialDismissed,
        tutorialMinimized: state.tutorialMinimized,
        tutorialSkippedSteps: state.tutorialSkippedSteps,
        tutorialLastAdvanceTime: state.tutorialLastAdvanceTime,
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
        unlockedVehicleIds: getResetVehicleUnlockIds(state.ownerUpgradeLevels),
        unlockedCircuitIds: getResetCircuitUnlockIds(state.ownerUpgradeLevels),
        // Feature unlocks never reset
        unlockedFeatures: state.unlockedFeatures,
        // Once revealed, a Workshop system stays revealed through every reset.
        revealedSystems: state.revealedSystems,
        defeatedRivalIds: state.defeatedRivalIds,
        discoveredBlueprintIds: state.discoveredBlueprintIds,
        lifetimeLPAllTime: state.lifetimeLPAllTime,
        lifetimeScrapResets: state.lifetimeScrapResets,
        // The Rep legacy floor is kept across every reset layer.
        legacyRepFloor: state.legacyRepFloor,
        repPoints: state.legacyRepFloor,
        lifetimeRep: state.legacyRepFloor,
        lifetimeRepAllTime: state.lifetimeRepAllTime,
        // Challenges persist
        completedChallenges: state.completedChallenges,
        // Crew resets on Team Reset
        crewRoster: startingCrew,
        crewSlots: academyActive ? Math.max(4, teamCrewSlots) : teamCrewSlots,
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
        crewSlots:
          def.effect.type === "crew_slot"
            ? state.crewSlots + def.effect.valuePerLevel
            : state.crewSlots,
      });
    },

    ownerReset: () => {
      const state = get() as GameState;
      if (!canOwnerReset({
        lifetimeTeamPoints: state.lifetimeTeamPoints,
        teamEras: state.teamEraCount,
        lifetimeTPThisOwnerEra: state.lifetimeTPThisOwnerEra,
        unspentTeamPoints: state.teamPoints,
      })) return;
      const stats = {
        lifetimeTPThisOwnerEra: state.lifetimeTPThisOwnerEra,
        ownerEraCount: state.ownerEraCount,
        unspentTP: state.teamPoints,
      };
      const cascadeMultiplier = 1 + getGameEffectValue(
        TRACK_PERK_DEFINITIONS,
        state.trackPerkLevels,
        "lower_currency_mult",
      );
      const opEarned = Math.floor(calculateOwnerPoints(stats) * cascadeMultiplier);
      const newOP = state.ownerPoints + opEarned;
      const newLifetimeOP = state.lifetimeOwnerPoints + opEarned;
      const permanent = getPermanentRuntimeBonuses(state);
      const bornRich = getGameEffectValue(
        OWNER_UPGRADE_DEFINITIONS,
        state.ownerUpgradeLevels,
        "starting_scrap",
      );
      const startingScrap = permanent.startingScrap + bornRich;
      const academyActive = getGameEffectValue(
        TRACK_PERK_DEFINITIONS,
        state.trackPerkLevels,
        "crew_auto_recruit",
      ) > 0;
      const ownerCrewLevel = getGameEffectValue(
        OWNER_UPGRADE_DEFINITIONS,
        state.ownerUpgradeLevels,
        "crew_starting_level",
      );
      const startingCrew = academyActive
        ? ensureAcademyRoster([], ownerCrewLevel > 0 ? ownerCrewLevel : 1)
        : [];

      set({
        ...createInitialState(),
        scrapBucks: startingScrap,
        lifetimeScrapBucks: startingScrap,
        autoScavengeUnlocked: true,
        autoRaceUnlocked: true,
        tutorialStep: state.tutorialStep,
        tutorialDismissed: state.tutorialDismissed,
        tutorialMinimized: state.tutorialMinimized,
        tutorialSkippedSteps: state.tutorialSkippedSteps,
        tutorialLastAdvanceTime: state.tutorialLastAdvanceTime,
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
        unlockedVehicleIds: getResetVehicleUnlockIds(state.ownerUpgradeLevels),
        unlockedCircuitIds: getResetCircuitUnlockIds(state.ownerUpgradeLevels),
        crewRoster: startingCrew,
        crewSlots: academyActive ? 4 : 0,
        // Feature unlocks never reset
        unlockedFeatures: state.unlockedFeatures,
        // Once revealed, a Workshop system stays revealed through every reset.
        revealedSystems: state.revealedSystems,
        defeatedRivalIds: state.defeatedRivalIds,
        discoveredBlueprintIds: state.discoveredBlueprintIds,
        lifetimeLPAllTime: state.lifetimeLPAllTime,
        lifetimeScrapResets: state.lifetimeScrapResets,
        // The Rep legacy floor is kept across every reset layer.
        legacyRepFloor: state.legacyRepFloor,
        repPoints: state.legacyRepFloor,
        lifetimeRep: state.legacyRepFloor,
        lifetimeRepAllTime: state.lifetimeRepAllTime,
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
      const ownerUpgradeLevels = { ...state.ownerUpgradeLevels, [upgradeId]: currentLevel + 1 };
      const unlockedVehicleIds = [...new Set([
        ...state.unlockedVehicleIds,
        ...getVehicleIdsUnlockedByProgress({
          reputation: state.repPoints,
          wonCircuitIds: state.raceHistory.filter((race) => race.result === "win").map((race) => race.circuitId),
          circuitWinStreaks: {},
          ownerUpgradeLevels,
        }),
      ])];
      const unlockedCircuitIds = def.effect.type === "unlock_adv_circuits"
        ? [...new Set([
            ...state.unlockedCircuitIds,
            "continental_grand_prix",
            "endurance_series",
          ])]
        : state.unlockedCircuitIds;
      set({
        ownerPoints: state.ownerPoints - cost,
        ownerUpgradeLevels,
        unlockedVehicleIds,
        unlockedCircuitIds,
        unlockedFeatures,
        autoScavengeUnlocked: true,
        autoRaceUnlocked: true,
      });
    },

    trackReset: () => {
      const state = get() as GameState;
      if (!canTrackReset({
        lifetimeOwnerPoints: state.lifetimeOwnerPoints,
        ownerEras: state.ownerEraCount,
        lifetimeOPThisTrackEra: state.lifetimeOPThisTrackEra,
        unspentOwnerPoints: state.ownerPoints,
      })) return;
      const stats = {
        lifetimeOPThisTrackEra: state.lifetimeOPThisTrackEra,
        trackEraCount: state.trackEraCount,
        unspentOP: state.ownerPoints,
      };
      const ptEarned = calculateTrackTokens(stats);
      const newPT = state.trackPrestigeTokens + ptEarned;
      const newLifetimePT = state.lifetimeTrackTokens + ptEarned;
      const permanent = getPermanentRuntimeBonuses(state);
      const bornRich = getGameEffectValue(
        OWNER_UPGRADE_DEFINITIONS,
        state.ownerUpgradeLevels,
        "starting_scrap",
      );
      const startingScrap = permanent.startingScrap + bornRich;
      const academyActive = getGameEffectValue(
        TRACK_PERK_DEFINITIONS,
        state.trackPerkLevels,
        "crew_auto_recruit",
      ) > 0;
      // Reset-seeding Owner effects apply to the Track Reset that consumes
      // them. Persistent Owner content still clears with the Owner layer.
      const ownerCrewLevel = getGameEffectValue(
        OWNER_UPGRADE_DEFINITIONS,
        state.ownerUpgradeLevels,
        "crew_starting_level",
      );
      const startingCrew = academyActive
        ? ensureAcademyRoster([], ownerCrewLevel > 0 ? ownerCrewLevel : 1)
        : [];

      set({
        ...createInitialState(),
        scrapBucks: startingScrap,
        lifetimeScrapBucks: startingScrap,
        autoScavengeUnlocked: true,
        autoRaceUnlocked: true,
        tutorialStep: state.tutorialStep,
        tutorialDismissed: state.tutorialDismissed,
        tutorialMinimized: state.tutorialMinimized,
        tutorialSkippedSteps: state.tutorialSkippedSteps,
        tutorialLastAdvanceTime: state.tutorialLastAdvanceTime,
        // Track layer persists
        trackPrestigeTokens: newPT,
        lifetimeTrackTokens: newLifetimePT,
        trackPerkLevels: state.trackPerkLevels,
        trackEraCount: state.trackEraCount + 1,
        lifetimeOPThisTrackEra: 0,
        ownedTrackConfig: state.ownedTrackConfig,
        workshopLevels: (state.trackPerkLevels.track_eternal ?? 0) > 0 ? state.workshopLevels : {},
        crewRoster: startingCrew,
        crewSlots: academyActive ? 4 : 0,
        // Owner-derived feature flags clear with the Owner layer.
        unlockedFeatures: state.unlockedFeatures.filter(
          (feature) => feature !== "vehicle_mastery" && feature !== "advanced_circuits",
        ),
        revealedSystems: state.revealedSystems,
        defeatedRivalIds: state.defeatedRivalIds,
        discoveredBlueprintIds: state.discoveredBlueprintIds,
        lifetimeLPAllTime: state.lifetimeLPAllTime,
        lifetimeScrapResets: state.lifetimeScrapResets,
        // The Rep legacy floor is kept across every reset layer.
        legacyRepFloor: state.legacyRepFloor,
        repPoints: state.legacyRepFloor,
        lifetimeRep: state.legacyRepFloor,
        lifetimeRepAllTime: state.lifetimeRepAllTime,
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
        const ownerCrewLevel = getGameEffectValue(
          OWNER_UPGRADE_DEFINITIONS,
          state.ownerUpgradeLevels,
          "crew_starting_level",
        );
        crewRoster = ensureAcademyRoster(
          crewRoster,
          ownerCrewLevel > 0 ? ownerCrewLevel : 1,
        );
      }
      set({
        trackPrestigeTokens: state.trackPrestigeTokens - cost,
        trackPerkLevels: { ...state.trackPerkLevels, [perkId]: currentLevel + 1 },
        unlockedFeatures,
        crewRoster,
        crewSlots,
      });
    },

    recruitCrewMember: (role: CrewRole) => {
      const state = get() as GameState;
      if (state.teamEraCount < 1 || state.crewRoster.length >= state.crewSlots || state.teamPoints < 1) return;
      const names: Record<CrewRole, string[]> = { mechanic: ["Mara", "Wrench", "June"], scout: ["Scout", "Rook", "Piper"], driver: ["Ace", "Nova", "Mick"], trader: ["Ledger", "Cass", "Hank"] };
      const ownerCrewLevel = getGameEffectValue(OWNER_UPGRADE_DEFINITIONS, state.ownerUpgradeLevels, "crew_starting_level");
      const startingLevel = ownerCrewLevel > 0 ? ownerCrewLevel : 1;
      const member = createCrewAtLevel(
        `crew_${Date.now()}_${state.crewRoster.length}`,
        names[role][state.crewRoster.filter((crew) => crew.role === role).length % names[role].length],
        role,
        startingLevel,
      );
      set((current: GameState) => ({ teamPoints: current.teamPoints - 1, crewRoster: [...current.crewRoster, member] }));
    },

    specializeCrewMember: (crewId: string, spec: string) => {
      const state = get() as GameState;
      set({
        crewRoster: state.crewRoster.map((m) =>
          m.id === crewId &&
          m.level >= 5 &&
          getSpecializationsForRole(m.role).some((definition) => definition.id === spec)
            ? { ...m, specialization: spec as CrewMember["specialization"] }
            : m
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
      // Workshop systems reveal on relevance; checked wherever feature unlocks are (ticks, purchases).
      (get() as GameState).checkWorkshopReveals();
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
        _appendLog(set, get, "achievement", `Earned ${newlyEarned.length} achievement(s)`);
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
        lifetimeRep: Math.max(state.lifetimeRep, 50),
        lifetimeRepAllTime: Math.max(state.lifetimeRepAllTime, 50),
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
      merge: mergePersistedGameState,
      partialize: getPersistedGameState,
    },
  ),
);
