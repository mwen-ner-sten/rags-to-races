import { z } from "zod";
import type { GameState } from "./store";
import { TALENT_NODES } from "@/data/talentNodes";
import { GARAGE_STATION_IDS, type GarageStationSlot } from "@/data/garageStations";
import type { StationEquipment, StationEquipmentEffect } from "@/data/stationEquipment";
import { DEFAULT_EQUIPPED_GEAR, DEFAULT_OWNED_GEAR, getGearById, type GearSlot } from "@/data/gear";
import { ensureAcademyRoster } from "@/engine/crew";
import { getGameEffectValue } from "@/data/gameEffects";
import { OWNER_UPGRADE_DEFINITIONS } from "@/data/ownerUpgrades";
import { getVehicleIdsUnlockedByProgress } from "@/data/vehicles";
import { CONDITIONS, CORE_SLOTS } from "@/data/parts";
import { INITIAL_MATERIALS } from "@/data/materials";
import { PENDING_MANUAL_RACE_ENTRY_FEE_KEY } from "@/config/gameplayLimits";

export const PERSISTENCE_VERSION = 3;
export const PERSISTENCE_STORAGE_KEY = "rags-to-races-save";
export const RECOVERY_BACKUP_KEY = "rags-to-races-recovery-backup";

const finiteNonNegative = z.number().finite().min(0);
const finitePercentage = z.number().finite().min(0).max(100);
const nonEmptyString = z.string().min(1);

const partConditionSchema = z.enum(CONDITIONS as [
  (typeof CONDITIONS)[number],
  ...(typeof CONDITIONS)[number][],
]);

/**
 * Save files are user-controlled input. Keep these schemas structural rather
 * than tying them to the current content catalog so removed/forward-compatible
 * definition IDs can still be shown or sold safely.
 */
const scavengedPartSchema = z.object({
  id: nonEmptyString,
  definitionId: nonEmptyString,
  condition: partConditionSchema,
  foundAt: z.string().default("legacy_save"),
  type: z.enum(["part", "addon"]).default("part"),
}).passthrough();

const installedPartSchema = z.object({
  part: scavengedPartSchema,
  // Add-ons predate the current persistence version, but very old saves may
  // not have recorded an explicit empty list.
  addons: z.array(scavengedPartSchema).default([]),
}).passthrough();

const vehicleStatsSchema = z.object({
  speed: finiteNonNegative,
  handling: finiteNonNegative,
  reliability: finiteNonNegative,
  weight: finiteNonNegative,
  performance: finiteNonNegative,
}).passthrough();

const builtVehicleSchema = z.object({
  id: nonEmptyString,
  definitionId: nonEmptyString,
  parts: z.record(z.string(), installedPartSchema),
  stats: vehicleStatsSchema,
  builtAt: finiteNonNegative.default(0),
  condition: finitePercentage.default(100),
  totalRaces: finiteNonNegative.default(0),
}).passthrough();

const vehicleLoadoutSchema = z.object({
  id: nonEmptyString,
  name: nonEmptyString,
  vehicleId: nonEmptyString,
  vehicleDefinitionId: nonEmptyString,
  createdAt: finiteNonNegative,
  parts: z.record(z.string(), z.object({
    partId: nonEmptyString,
    addonIds: z.array(nonEmptyString),
  }).passthrough()),
}).passthrough();

const engineeringReportTextSchema = z.string().min(1).max(2_000);
const engineeringReportSchema = z.object({
  headline: engineeringReportTextSchema,
  focus: z.enum(["power", "grip", "aero", "reliability", "fuel"]),
  priority: z.enum(["repair", "component", "setup"]),
  component: engineeringReportTextSchema.optional(),
  slot: z.enum(CORE_SLOTS as [
    (typeof CORE_SLOTS)[number],
    ...(typeof CORE_SLOTS)[number][],
  ]).optional(),
  observation: engineeringReportTextSchema,
  action: engineeringReportTextSchema,
});

const raceOutcomeSchema = z.object({
  result: z.enum(["win", "loss", "dnf"]),
  position: finiteNonNegative,
  totalRacers: finiteNonNegative,
  scrapsEarned: finiteNonNegative,
  repEarned: finiteNonNegative,
  log: z.array(z.string()),
  salvageDrop: scavengedPartSchema.optional(),
  forgeTokenDrop: z.boolean().optional(),
  rivalId: z.string().optional(),
  rivalRewardClaimed: z.boolean().optional(),
  circuitId: nonEmptyString,
  engineeringReport: engineeringReportSchema.optional(),
}).passthrough();

const dealerListingSchema = z.object({
  id: nonEmptyString,
  definitionId: nonEmptyString,
  condition: partConditionSchema,
  price: finiteNonNegative,
  expiresAt: finiteNonNegative,
}).passthrough();

const crewMemberSchema = z.object({
  id: nonEmptyString,
  name: nonEmptyString,
  role: z.enum(["mechanic", "scout", "driver", "trader"]),
  level: finiteNonNegative,
  xp: finiteNonNegative,
  specialization: z.enum([
    "tuner",
    "salvage_expert",
    "treasure_hunter",
    "bulk_hauler",
    "speed_demon",
    "safety_first",
    "fence",
    "negotiator",
  ]).nullable().default(null),
}).passthrough();

const gearSlotSchema = z.enum(["head", "body", "hands", "feet", "tool", "accessory"]);
const stationSlotSchema = z.enum(["diagnostics", "lift", "workbench", "logistics", "fabrication", "pit_equipment"]);
const equipmentRaritySchema = z.enum(["common", "uncommon", "rare", "epic", "legendary"]);
const stationAttributeSchema = z.enum([
  "reflexes", "endurance", "instinct", "engineering", "charisma",
  "fortune", "power", "grip", "aero", "weight_reduction",
]);
const stationBonusSchema = z.enum([
  "scavenge_luck_bonus", "scavenge_yield_pct", "sell_value_bonus_pct",
  "race_performance_pct", "race_dnf_reduction", "race_handling_pct",
  "race_wear_reduction_pct", "race_scrap_bonus_pct", "build_cost_reduction_pct",
  "repair_cost_reduction_pct", "refurb_cost_reduction_pct",
  "tick_speed_reduction_ms", "fatigue_rate_reduction", "material_bonus_pct",
  "forge_token_chance_bonus",
]);
const stationEffectSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("attribute"), attribute: stationAttributeSchema, value: z.number().finite() }),
  z.object({ type: z.literal("bonus"), bonus: stationBonusSchema, value: z.number().finite() }),
]);
const stationEquipmentSchema = z.object({
  id: nonEmptyString,
  slot: stationSlotSchema,
  rarity: equipmentRaritySchema,
  name: nonEmptyString,
  effects: z.array(stationEffectSchema),
  enhancementLevel: finiteNonNegative,
  setId: z.enum(["grease_monkey", "redline", "scrapper", "slipstream"]).optional(),
  source: z.string(),
}).passthrough();

const installedModSchema = z.object({
  id: nonEmptyString,
  templateId: nonEmptyString,
  name: nonEmptyString,
  effectType: nonEmptyString,
  value: z.number().finite(),
}).passthrough();
const lootGearSchema = z.object({
  id: nonEmptyString,
  slot: gearSlotSchema,
  rarity: equipmentRaritySchema,
  name: nonEmptyString,
  effects: z.array(z.object({ type: nonEmptyString, value: z.number().finite() }).passthrough()),
  enhancementLevel: finiteNonNegative,
  modSlots: finiteNonNegative,
  mods: z.array(installedModSchema),
  source: z.string(),
}).passthrough();

const racePlanSchema = z.object({
  tire: z.enum(["soft", "medium", "hard", "wet"]),
  fuelLoad: z.enum(["light", "balanced", "heavy"]),
  gearing: z.enum(["short", "balanced", "long"]),
  aero: z.enum(["low", "balanced", "high"]),
  suspension: z.enum(["soft", "balanced", "stiff"]),
  aggression: z.enum(["conserve", "balanced", "push"]),
  pitStrategy: z.enum(["none", "reactive", "scheduled"]),
}).passthrough();

const fleetAssignmentSchema = z.object({
  id: nonEmptyString,
  vehicleId: nonEmptyString,
  crewId: z.string().nullable(),
  circuitId: nonEmptyString,
  plan: racePlanSchema,
  status: z.enum(["running", "complete"]),
  remainingTicks: finiteNonNegative,
  accumulatedWear: finiteNonNegative,
  rewards: z.object({ scrap: finiteNonNegative, materials: finiteNonNegative }).passthrough(),
}).passthrough();

const ownedTrackConfigSchema = z.object({
  surface: z.enum(["grass", "gravel", "asphalt"]),
  length: z.enum(["short", "medium", "long"]),
  cornerDensity: z.enum(["low", "medium", "high"]),
  timeRule: z.enum(["day", "night", "variable_weather"]),
  vehicleClass: z.enum(["open", "scrap", "street", "prototype"]),
  endurance: z.boolean(),
  riskReward: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
}).passthrough();
const hostedEventSchema = z.object({
  id: nonEmptyString,
  name: nonEmptyString,
  config: ownedTrackConfigSchema,
  sponsor: z.string(),
  remainingTicks: finiteNonNegative,
  status: z.enum(["running", "complete"]),
  reward: finiteNonNegative,
}).passthrough();

const activityLogSchema = z.object({
  id: finiteNonNegative,
  timestamp: finiteNonNegative,
  category: z.enum(["scavenge", "sell", "race", "build", "upgrade", "prestige", "achievement", "gear", "craft", "trade", "tick"]),
  message: z.string(),
  scrapDelta: z.number().finite().optional(),
  repDelta: z.number().finite().optional(),
  lpDelta: z.number().finite().optional(),
}).passthrough();

const skillStateSchema = z.object({ xp: finiteNonNegative, level: finiteNonNegative }).passthrough();
const racerSkillsSchema = z.object({
  driving: skillStateSchema,
  mechanics: skillStateSchema,
  scavenging: skillStateSchema,
  endurance: skillStateSchema,
}).passthrough();
const racerAttributesSchema = z.object({
  reflexes: finiteNonNegative,
  endurance: finiteNonNegative,
  charisma: finiteNonNegative,
  instinct: finiteNonNegative,
  engineering: finiteNonNegative,
  fortune: finiteNonNegative,
}).passthrough();

const nonNegativeNumberMap = z.record(z.string(), finiteNonNegative);
const materialsSchema = z.object(
  Object.fromEntries(
    Object.keys(INITIAL_MATERIALS).map((material) => [material, finiteNonNegative.optional()]),
  ) as Record<keyof typeof INITIAL_MATERIALS, z.ZodOptional<typeof finiteNonNegative>>,
).catchall(finiteNonNegative);

/**
 * Applied after version migrations so legacy equipment can first be converted
 * to the current representation. This covers the nested records that renderers
 * and economy actions dereference directly.
 */
const currentStateSafetySchema = z.object({
  scrapBucks: finiteNonNegative.optional(),
  repPoints: finiteNonNegative.optional(),
  lifetimeScrapBucks: finiteNonNegative.optional(),
  prestigeCount: finiteNonNegative.optional(),
  legacyPoints: finiteNonNegative.optional(),
  lifetimeLegacyPoints: finiteNonNegative.optional(),
  currentEra: finiteNonNegative.optional(),
  manualScavengeClicks: finiteNonNegative.optional(),
  raceTickProgress: finiteNonNegative.optional(),
  winStreak: finiteNonNegative.optional(),
  bestWinStreak: finiteNonNegative.optional(),
  lifetimeRaces: finiteNonNegative.optional(),
  _vehicleIdCounter: finiteNonNegative.optional(),
  _logIdCounter: finiteNonNegative.optional(),
  reforgeShards: finiteNonNegative.optional(),
  forgeTokens: finiteNonNegative.optional(),
  gameTick: finiteNonNegative.optional(),
  lastActiveTimestamp: finiteNonNegative.optional(),
  teamPoints: finiteNonNegative.optional(),
  lifetimeTeamPoints: finiteNonNegative.optional(),
  teamEraCount: finiteNonNegative.optional(),
  lifetimeLPThisTeamEra: finiteNonNegative.optional(),
  ownerPoints: finiteNonNegative.optional(),
  lifetimeOwnerPoints: finiteNonNegative.optional(),
  ownerEraCount: finiteNonNegative.optional(),
  lifetimeTPThisOwnerEra: finiteNonNegative.optional(),
  trackPrestigeTokens: finiteNonNegative.optional(),
  lifetimeTrackTokens: finiteNonNegative.optional(),
  trackEraCount: finiteNonNegative.optional(),
  lifetimeOPThisTrackEra: finiteNonNegative.optional(),
  crewSlots: finiteNonNegative.optional(),
  lifetimeLPAllTime: finiteNonNegative.optional(),
  lifetimeScrapResets: finiteNonNegative.optional(),
  lifetimeRacesAllTime: finiteNonNegative.optional(),
  lifetimeWinsAllTime: finiteNonNegative.optional(),
  lifetimeScrapBucksAllTime: finiteNonNegative.optional(),
  lifetimePartsScavengedAllTime: finiteNonNegative.optional(),
  lifetimeVehiclesBuiltAllTime: finiteNonNegative.optional(),
  bestWinStreakAllTime: finiteNonNegative.optional(),
  highestVehicleTierBuilt: finiteNonNegative.optional(),
  totalForgeTokensEarned: finiteNonNegative.optional(),
  lifetimeTotalDecomposed: finiteNonNegative.optional(),
  lifetimeTotalEnhanced: finiteNonNegative.optional(),
  lifetimeTotalTradeUps: finiteNonNegative.optional(),
  lifetimeTotalRaceSalvage: finiteNonNegative.optional(),
  highestConditionReached: finiteNonNegative.optional(),
  autoScavengeUnlocked: z.boolean().optional(),
  autoRaceUnlocked: z.boolean().optional(),
  activeVehicleId: z.string().nullable().optional(),
  selectedLocationId: z.string().optional(),
  selectedSellBelowQuality: partConditionSchema.optional(),
  selectedCircuitId: z.string().optional(),
  tutorialStep: z.number().finite().min(-1).optional(),
  tutorialDismissed: z.boolean().optional(),
  tutorialMinimized: z.boolean().optional(),
  tutorialSkippedSteps: z.array(finiteNonNegative).optional(),
  tutorialLastAdvanceTime: finiteNonNegative.optional(),
  activeMomentumTiers: z.array(nonEmptyString).optional(),
  unlockedLocationIds: z.array(nonEmptyString).optional(),
  unlockedCircuitIds: z.array(nonEmptyString).optional(),
  unlockedVehicleIds: z.array(nonEmptyString).optional(),
  completedChallenges: z.array(nonEmptyString).optional(),
  earnedAchievements: z.array(nonEmptyString).optional(),
  unlockedFeatures: z.array(nonEmptyString).optional(),
  defeatedRivalIds: z.array(nonEmptyString).optional(),
  discoveredBlueprintIds: z.array(nonEmptyString).optional(),
  unlockedPlaystyleNodes: z.array(nonEmptyString).optional(),
  uniqueVehicleTypesBuilt: z.array(nonEmptyString).optional(),
  prestigeBonus: z.object({
    scrapMultiplier: finiteNonNegative,
    luckBonus: finiteNonNegative,
    repMultiplier: finiteNonNegative,
  }).passthrough().optional(),
  currentRacePlan: racePlanSchema.optional(),
  inventory: z.array(scavengedPartSchema).optional(),
  garage: z.array(builtVehicleSchema).optional(),
  vehicleLoadouts: z.array(vehicleLoadoutSchema).optional(),
  raceHistory: z.array(raceOutcomeSchema).optional(),
  fleetAssignments: z.array(fleetAssignmentSchema).optional(),
  ownedTrackConfig: ownedTrackConfigSchema.optional(),
  hostedEvents: z.array(hostedEventSchema).optional(),
  pendingBuildVehicleId: z.string().nullable().optional(),
  pendingBuildParts: z.record(z.string(), scavengedPartSchema.nullable()).optional(),
  materials: materialsSchema.optional(),
  dealerBoard: z.array(dealerListingSchema).optional(),
  fatigue: z.number().finite().min(0).max(99).optional(),
  workshopLevels: nonNegativeNumberMap.optional(),
  legacyUpgradeLevels: nonNegativeNumberMap.optional(),
  teamUpgradeLevels: nonNegativeNumberMap.optional(),
  ownerUpgradeLevels: nonNegativeNumberMap.optional(),
  trackPerkLevels: nonNegativeNumberMap.optional(),
  challengeProgress: nonNegativeNumberMap.optional(),
  crewRoster: z.array(crewMemberSchema).optional(),
  activityLog: z.array(activityLogSchema).optional(),
  racerSkills: racerSkillsSchema.optional(),
  racerAttributes: racerAttributesSchema.optional(),
  equippedGear: z.record(gearSlotSchema, nonEmptyString).optional(),
  ownedGearIds: z.array(nonEmptyString).optional(),
  lootGearInventory: z.array(lootGearSchema).optional(),
  equippedLootGear: z.record(gearSlotSchema, z.string().nullable()).optional(),
  gearModInventory: z.array(installedModSchema).optional(),
  unlockedTalentNodes: z.array(nonEmptyString).optional(),
  stationEquipmentInventory: z.array(stationEquipmentSchema).optional(),
  equippedStationEquipment: z.record(stationSlotSchema, z.string().nullable()).optional(),
}).strip();

const persistedStateSchema = z
  .object({
    scrapBucks: finiteNonNegative.optional(),
    repPoints: finiteNonNegative.optional(),
    lifetimeScrapBucks: finiteNonNegative.optional(),
    prestigeCount: finiteNonNegative.optional(),
    legacyPoints: finiteNonNegative.optional(),
    lifetimeLegacyPoints: finiteNonNegative.optional(),
    inventory: z.array(z.unknown()).optional(),
    garage: z.array(z.unknown()).optional(),
    raceHistory: z.array(z.unknown()).optional(),
    unlockedLocationIds: z.array(z.string()).optional(),
    unlockedCircuitIds: z.array(z.string()).optional(),
    unlockedVehicleIds: z.array(z.string()).optional(),
    completedChallenges: z.array(z.string()).optional(),
    earnedAchievements: z.array(z.string()).optional(),
    unlockedFeatures: z.array(z.string()).optional(),
  })
  .catchall(z.unknown());

const zustandPayloadSchema = z.object({
  state: z.unknown(),
  version: z.number().int().nonnegative().optional(),
});

export interface RecoveryBackup {
  createdAt: number;
  source: "automatic-migration" | "slot-load" | "file-import" | "manual";
  payload: string;
}

export function getPersistedGameState(state: GameState) {
  return {
    scrapBucks: state.scrapBucks,
    repPoints: state.repPoints,
    lifetimeScrapBucks: state.lifetimeScrapBucks,
    prestigeCount: state.prestigeCount,
    prestigeBonus: state.prestigeBonus,
    legacyPoints: state.legacyPoints,
    lifetimeLegacyPoints: state.lifetimeLegacyPoints,
    legacyUpgradeLevels: state.legacyUpgradeLevels,
    activeMomentumTiers: state.activeMomentumTiers,
    currentEra: state.currentEra,
    inventory: state.inventory,
    garage: state.garage,
    activeVehicleId: state.activeVehicleId,
    vehicleLoadouts: state.vehicleLoadouts,
    selectedLocationId: state.selectedLocationId,
    selectedSellBelowQuality: state.selectedSellBelowQuality,
    selectedCircuitId: state.selectedCircuitId,
    currentRacePlan: state.currentRacePlan,
    defeatedRivalIds: state.defeatedRivalIds,
    discoveredBlueprintIds: state.discoveredBlueprintIds,
    fleetAssignments: state.fleetAssignments,
    ownedTrackConfig: state.ownedTrackConfig,
    hostedEvents: state.hostedEvents,
    autoScavengeUnlocked: state.autoScavengeUnlocked,
    manualScavengeClicks: state.manualScavengeClicks,
    autoRaceUnlocked: state.autoRaceUnlocked,
    raceTickProgress: state.raceTickProgress,
    unlockedLocationIds: state.unlockedLocationIds,
    unlockedCircuitIds: state.unlockedCircuitIds,
    unlockedVehicleIds: state.unlockedVehicleIds,
    _vehicleIdCounter: state._vehicleIdCounter,
    raceHistory: state.raceHistory,
    winStreak: state.winStreak,
    bestWinStreak: state.bestWinStreak,
    fatigue: state.fatigue,
    lifetimeRaces: state.lifetimeRaces,
    workshopLevels: state.workshopLevels,
    equippedGear: state.equippedGear,
    ownedGearIds: state.ownedGearIds,
    lootGearInventory: state.lootGearInventory,
    equippedLootGear: state.equippedLootGear,
    gearModInventory: state.gearModInventory,
    unlockedTalentNodes: state.unlockedTalentNodes,
    stationEquipmentInventory: state.stationEquipmentInventory,
    equippedStationEquipment: state.equippedStationEquipment,
    reforgeShards: state.reforgeShards,
    pendingBuildVehicleId: state.pendingBuildVehicleId,
    pendingBuildParts: state.pendingBuildParts,
    materials: state.materials,
    forgeTokens: state.forgeTokens,
    dealerBoard: state.dealerBoard,
    gameTick: state.gameTick,
    lastActiveTimestamp: state.lastActiveTimestamp,
    completedChallenges: state.completedChallenges,
    challengeProgress: state.challengeProgress,
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
    activityLog: state.activityLog,
    _logIdCounter: state._logIdCounter,
    racerSkills: state.racerSkills,
    teamPoints: state.teamPoints,
    lifetimeTeamPoints: state.lifetimeTeamPoints,
    teamUpgradeLevels: state.teamUpgradeLevels,
    teamEraCount: state.teamEraCount,
    lifetimeLPThisTeamEra: state.lifetimeLPThisTeamEra,
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
    racerAttributes: state.racerAttributes,
    unlockedFeatures: state.unlockedFeatures,
    lifetimeLPAllTime: state.lifetimeLPAllTime,
    lifetimeScrapResets: state.lifetimeScrapResets,
    crewRoster: state.crewRoster,
    crewSlots: state.crewSlots,
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
    unlockedPlaystyleNodes: state.unlockedPlaystyleNodes,
  };
}

export type PersistedGameState = ReturnType<typeof getPersistedGameState>;

export function migratePersistedState(
  persistedState: unknown,
  version: number,
): Partial<PersistedGameState> {
  const parsed = persistedStateSchema.safeParse(persistedState);
  if (!parsed.success) {
    throw new Error(`Invalid persisted game state: ${z.prettifyError(parsed.error)}`);
  }

  let state = { ...parsed.data } as Partial<PersistedGameState>;

  if (version === 0) {
    const oldPrestigeCount = typeof state.prestigeCount === "number" ? state.prestigeCount : 0;
    const retroactiveLp = Math.floor(oldPrestigeCount * 3);
    state = {
      ...state,
      legacyPoints: retroactiveLp,
      lifetimeLegacyPoints: retroactiveLp,
      legacyUpgradeLevels: {},
      activeMomentumTiers: [],
      currentEra: 1,
    };
  }

  if (version < 3) {
    const oldNodes = Array.isArray(state.unlockedTalentNodes) ? state.unlockedTalentNodes : [];
    const tierRefund = { 1: 8, 2: 15, 3: 30, 4: 60, 5: 60 } as Record<number, number>;
    const lpRefund = TALENT_NODES
      .filter((node) => oldNodes.includes(node.id))
      .reduce((total, node) => total + (tierRefund[node.tier] ?? 0), 0);
    const legacySlotMap: Record<GearSlot, GarageStationSlot> = { head: "diagnostics", body: "lift", hands: "workbench", feet: "logistics", tool: "fabrication", accessory: "pit_equipment" };
    const bonusIds = new Set(["scavenge_luck_bonus", "scavenge_yield_pct", "sell_value_bonus_pct", "race_performance_pct", "race_dnf_reduction", "race_handling_pct", "race_wear_reduction_pct", "race_scrap_bonus_pct", "build_cost_reduction_pct", "repair_cost_reduction_pct", "refurb_cost_reduction_pct", "tick_speed_reduction_ms", "fatigue_rate_reduction", "material_bonus_pct", "forge_token_chance_bonus"]);
    let salvageRefund = 0;
    const oldEquipment = Array.isArray(state.lootGearInventory) ? state.lootGearInventory : [];
    const stationEquipmentInventory: StationEquipment[] = oldEquipment.flatMap((raw) => {
      if (!raw || typeof raw !== "object") return [];
      const item = raw as { id?: unknown; slot?: unknown; rarity?: unknown; name?: unknown; effects?: unknown; enhancementLevel?: unknown; source?: unknown; setId?: unknown };
      const slot = legacySlotMap[item.slot as GearSlot];
      if (!slot || typeof item.id !== "string" || typeof item.name !== "string") return [];
      const effects: StationEquipmentEffect[] = [];
      for (const rawEffect of Array.isArray(item.effects) ? item.effects : []) {
        if (!rawEffect || typeof rawEffect !== "object") continue;
        const effect = rawEffect as { type?: unknown; value?: unknown };
        if (typeof effect.type === "string" && typeof effect.value === "number" && bonusIds.has(effect.type)) effects.push({ type: "bonus", bonus: effect.type as Extract<StationEquipmentEffect, { type: "bonus" }>["bonus"], value: effect.value });
        else salvageRefund += Math.max(1, Number(item.enhancementLevel) || 0);
      }
      return [{ id: item.id, slot, rarity: (["common", "uncommon", "rare", "epic", "legendary"] as const).includes(item.rarity as never) ? item.rarity as StationEquipment["rarity"] : "common", name: item.name, effects, enhancementLevel: Math.max(0, Number(item.enhancementLevel) || 0), source: typeof item.source === "string" ? item.source : "Legacy migration", setId: typeof item.setId === "string" ? item.setId as StationEquipment["setId"] : undefined }];
    });
    const oldEquipped = state.equippedLootGear && typeof state.equippedLootGear === "object" ? state.equippedLootGear as Record<string, string | null> : {};
    const equippedStationEquipment = Object.fromEntries(GARAGE_STATION_IDS.map((slot) => [slot, null])) as Record<GarageStationSlot, string | null>;
    for (const [legacySlot, itemId] of Object.entries(oldEquipped)) if (itemId && legacySlotMap[legacySlot as GearSlot]) equippedStationEquipment[legacySlotMap[legacySlot as GearSlot]] = itemId;
    const materials = { ...(state.materials ?? {}) } as PersistedGameState["materials"];
    const oldOwnedGear = Array.isArray(state.ownedGearIds) ? state.ownedGearIds : [];
    const staticGearRefund = oldOwnedGear.filter((id) => !DEFAULT_OWNED_GEAR.includes(id)).reduce((total, id) => total + (getGearById(id)?.tier ?? 0) * 5, 0);
    materials.metalScrap = (materials.metalScrap ?? 0) + salvageRefund + staticGearRefund;
    state = {
      ...state,
      legacyPoints: (state.legacyPoints ?? 0) + lpRefund,
      unlockedTalentNodes: [],
      vehicleLoadouts: [],
      stationEquipmentInventory,
      equippedStationEquipment,
      reforgeShards: Array.isArray(state.gearModInventory) ? state.gearModInventory.length : 0,
      materials,
      equippedGear: { ...DEFAULT_EQUIPPED_GEAR },
      ownedGearIds: [...DEFAULT_OWNED_GEAR],
      lootGearInventory: [],
      equippedLootGear: { head: null, body: null, hands: null, feet: null, tool: null, accessory: null },
      gearModInventory: [],
    };
  }

  // Validate and normalize legacy-compatible core records before any derived
  // reconciliation dereferences them (notably Academy crew and race history).
  const migratedSafety = currentStateSafetySchema.safeParse(state);
  if (!migratedSafety.success) {
    throw new Error(`Invalid persisted game state: ${z.prettifyError(migratedSafety.error)}`);
  }
  state = migratedSafety.data as Partial<PersistedGameState>;

  // Manual race animation state is intentionally transient. If a tab closes
  // mid-race, refund its persisted entry-fee escrow exactly once so reload
  // cannot consume cash without producing a result.
  const interruptedRaceEntryFee = state.challengeProgress?.[PENDING_MANUAL_RACE_ENTRY_FEE_KEY] ?? 0;
  if (interruptedRaceEntryFee > 0) {
    state = {
      ...state,
      scrapBucks: (state.scrapBucks ?? 0) + interruptedRaceEntryFee,
      challengeProgress: {
        ...(state.challengeProgress ?? {}),
        [PENDING_MANUAL_RACE_ENTRY_FEE_KEY]: 0,
      },
    };
  }

  const ownerUpgradeLevels = (state.ownerUpgradeLevels ?? {}) as Record<string, number>;
  const teamUpgradeLevels = (state.teamUpgradeLevels ?? {}) as Record<string, number>;
  const trackPerkLevels = (state.trackPerkLevels ?? {}) as Record<string, number>;
  const unlockedFeatures = new Set(state.unlockedFeatures ?? []);
  const unlockedCircuitIds = new Set(state.unlockedCircuitIds ?? []);
  const unlockedVehicleIds = new Set(state.unlockedVehicleIds ?? []);

  if ((ownerUpgradeLevels.owner_adv_circuits ?? 0) > 0) {
    unlockedFeatures.add("advanced_circuits");
    unlockedCircuitIds.add("continental_grand_prix");
    unlockedCircuitIds.add("endurance_series");
  } else {
    unlockedFeatures.delete("advanced_circuits");
    unlockedCircuitIds.delete("continental_grand_prix");
    unlockedCircuitIds.delete("endurance_series");
  }
  if ((ownerUpgradeLevels.owner_vehicle_mastery ?? 0) > 0) {
    unlockedFeatures.add("vehicle_mastery");
    unlockedVehicleIds.add("hypercar");
    unlockedVehicleIds.add("prototype_x");
  } else {
    unlockedFeatures.delete("vehicle_mastery");
    unlockedVehicleIds.delete("hypercar");
    unlockedVehicleIds.delete("prototype_x");
  }

  // Reconcile the cached blueprint list for current-version saves too. Earlier
  // builds could reach a requirement without storing its vehicle ID, and a
  // schema bump should not be required for this idempotent derived-state repair.
  const raceHistory = Array.isArray(state.raceHistory) ? state.raceHistory : [];
  const wonCircuitIds = [...new Set(
    raceHistory
      .filter((race) => race?.result === "win" && typeof race.circuitId === "string")
      .map((race) => race.circuitId),
  )];
  const circuitWinStreaks: Record<string, number> = {};
  let activeCircuitId: string | null = null;
  let activeStreak = 0;
  for (const race of raceHistory) {
    if (race?.result !== "win" || typeof race.circuitId !== "string") {
      activeCircuitId = null;
      activeStreak = 0;
      continue;
    }
    if (race.circuitId === activeCircuitId) activeStreak += 1;
    else {
      activeCircuitId = race.circuitId;
      activeStreak = 1;
    }
    circuitWinStreaks[race.circuitId] = Math.max(
      circuitWinStreaks[race.circuitId] ?? 0,
      activeStreak,
    );
  }
  for (const vehicleId of getVehicleIdsUnlockedByProgress({
    reputation: typeof state.repPoints === "number" ? state.repPoints : 0,
    wonCircuitIds,
    circuitWinStreaks,
    ownerUpgradeLevels,
  })) unlockedVehicleIds.add(vehicleId);

  const academyActive = (trackPerkLevels.track_academy ?? 0) > 0;
  const baseCrewSlots = (state.teamEraCount ?? 0) > 0 ? 1 : 0;
  const derivedCrewSlots = Math.max(
    state.crewSlots ?? 0,
    baseCrewSlots + (teamUpgradeLevels.team_crew_slots ?? 0),
    academyActive ? 4 : 0,
  );
  const ownerCrewLevel = getGameEffectValue(
    OWNER_UPGRADE_DEFINITIONS,
    ownerUpgradeLevels,
    "crew_starting_level",
  );
  const crewRoster = academyActive
    ? ensureAcademyRoster(state.crewRoster ?? [], ownerCrewLevel > 0 ? ownerCrewLevel : 1)
    : state.crewRoster ?? [];
  const autoEverything = (ownerUpgradeLevels.owner_auto_all ?? 0) > 0;

  const reconciled = {
    ...state,
    // Era-earnings counters were introduced without invalidating older save
    // versions. A current balance is the conservative lower bound for what
    // that era earned; never reduce a counter already recorded by newer saves.
    lifetimeLPThisTeamEra: Math.max(state.lifetimeLPThisTeamEra ?? 0, state.legacyPoints ?? 0),
    lifetimeTPThisOwnerEra: Math.max(state.lifetimeTPThisOwnerEra ?? 0, state.teamPoints ?? 0),
    lifetimeOPThisTrackEra: Math.max(state.lifetimeOPThisTrackEra ?? 0, state.ownerPoints ?? 0),
    unlockedFeatures: [...unlockedFeatures],
    unlockedCircuitIds: [...unlockedCircuitIds],
    unlockedVehicleIds: [...unlockedVehicleIds],
    crewSlots: derivedCrewSlots,
    crewRoster,
    autoScavengeUnlocked: Boolean(state.autoScavengeUnlocked || autoEverything),
    autoRaceUnlocked: Boolean(state.autoRaceUnlocked || autoEverything),
  };

  const safe = currentStateSafetySchema.safeParse(reconciled);
  if (!safe.success) {
    throw new Error(`Invalid persisted game state: ${z.prettifyError(safe.error)}`);
  }

  return {
    ...safe.data,
    // Legacy exports may contain only the materials that existed at the time.
    // Fill missing current keys without accepting negative/non-finite balances.
    ...(safe.data.materials
      ? { materials: { ...INITIAL_MATERIALS, ...safe.data.materials } }
      : {}),
  } as Partial<PersistedGameState>;
}

/**
 * Zustand only calls `migrate` when the stored version differs. Run the same
 * idempotent reconciliation during every hydration so derived unlock caches in
 * an existing current-version save cannot remain stale.
 */
export function mergePersistedGameState(
  persistedState: unknown,
  currentState: GameState,
): GameState {
  try {
    return {
      ...currentState,
      ...migratePersistedState(persistedState, PERSISTENCE_VERSION),
    } as GameState;
  } catch {
    // A corrupt browser payload should not poison the live Zustand state. File
    // imports and raw-save decoding still surface the validation error to the
    // user before replacing anything.
    return currentState;
  }
}

export function parseZustandPayload(raw: string): {
  state: Partial<PersistedGameState>;
  version: number;
} {
  const payload = zustandPayloadSchema.parse(JSON.parse(raw));
  const version = payload.version ?? 0;
  return {
    state: migratePersistedState(payload.state, version),
    version,
  };
}

export function writeRecoveryBackup(
  payload: string,
  source: RecoveryBackup["source"],
): void {
  if (typeof localStorage === "undefined") return;
  const backup: RecoveryBackup = { createdAt: Date.now(), source, payload };
  localStorage.setItem(RECOVERY_BACKUP_KEY, JSON.stringify(backup));
}

export function backupPersistedStoreBeforeMigration(raw: string | null): void {
  if (!raw || typeof localStorage === "undefined") return;

  try {
    const payload = zustandPayloadSchema.parse(JSON.parse(raw));
    const version = payload.version ?? 0;
    let needsBackup = version < PERSISTENCE_VERSION;
    try {
      migratePersistedState(payload.state, version);
    } catch {
      needsBackup = true;
    }
    if (needsBackup && !localStorage.getItem(RECOVERY_BACKUP_KEY)) {
      writeRecoveryBackup(raw, "automatic-migration");
    }
  } catch {
    if (!localStorage.getItem(RECOVERY_BACKUP_KEY)) {
      writeRecoveryBackup(raw, "automatic-migration");
    }
  }
}

export function readRecoveryBackup(): RecoveryBackup | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(RECOVERY_BACKUP_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as RecoveryBackup;
    if (!parsed.payload || !parsed.createdAt || !parsed.source) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearRecoveryBackup(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(RECOVERY_BACKUP_KEY);
}
