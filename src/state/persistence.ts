import { z } from "zod";
import type { GameState } from "./store";
import { TALENT_NODES } from "@/data/talentNodes";

export const PERSISTENCE_VERSION = 3;
export const PERSISTENCE_STORAGE_KEY = "rags-to-races-save";
export const RECOVERY_BACKUP_KEY = "rags-to-races-recovery-backup";

const finiteNonNegative = z.number().finite().min(0);

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
    state = {
      ...state,
      legacyPoints: (state.legacyPoints ?? 0) + lpRefund,
      unlockedTalentNodes: [],
      vehicleLoadouts: [],
    };
  }

  return state;
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
    if (version < PERSISTENCE_VERSION && !localStorage.getItem(RECOVERY_BACKUP_KEY)) {
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
