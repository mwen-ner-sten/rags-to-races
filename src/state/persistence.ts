import { z } from "zod";
import type { GameState } from "./store";
import { TALENT_NODES } from "@/data/talentNodes";
import { GARAGE_STATION_IDS, type GarageStationSlot } from "@/data/garageStations";
import type { StationEquipment, StationEquipmentEffect } from "@/data/stationEquipment";
import { DEFAULT_EQUIPPED_GEAR, DEFAULT_OWNED_GEAR, getGearById, type GearSlot } from "@/data/gear";

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
