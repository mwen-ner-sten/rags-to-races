"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ScavengedPart } from "@/engine/scavenge";
import type { BuiltVehicle } from "@/engine/build";
import type { RaceOutcome } from "@/engine/race";
import type { RaceEvent } from "@/engine/raceEvents";
import type { PrestigeBonus, RunStats } from "@/engine/prestige";
import { LEGACY_UPGRADES_BY_ID, legacyUpgradeCost } from "@/data/legacyUpgrades";
import { getActiveMomentumTiers, getMomentumEffectValue } from "@/data/momentumBonuses";
import type { PartCondition, CoreSlot } from "@/data/parts";
import { CONDITIONS } from "@/data/parts";
import type { InstalledPart } from "@/engine/build";
import type { GearSlot } from "@/data/gear";
import { getGearById, DEFAULT_EQUIPPED_GEAR, DEFAULT_OWNED_GEAR } from "@/data/gear";
import { getGearBonuses } from "@/engine/gear";
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
import { CHALLENGE_DEFINITIONS, SNAPSHOT_TRACKING_KEYS, type ChallengeRewardType } from "@/data/challenges";
import { calculateEnhancementCost, canAffordEnhancement, ARTIFACT_FORGE_COST, ARTIFACT_FORGE_TOKEN_COST } from "@/data/enhancement";
import type { CraftRecipe } from "@/data/craftRecipes";
import { canAffordRecipe } from "@/data/craftRecipes";
import { PART_DEFINITIONS } from "@/data/parts";
import { randInt } from "@/utils/random";

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

  // Scavenging
  selectedLocationId: string;
  isScavenging: boolean;
  autoScavengeUnlocked: boolean;
  /** Counts manual scavenge button clicks; auto-scavenge unlocks at 100 */
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

  // Streaks
  winStreak: number;
  bestWinStreak: number;

  // Fatigue (aging mechanic)
  fatigue: number;          // 0-99, increases with races, penalizes everything
  lifetimeRaces: number;    // total races this run (drives fatigue curve)

  // Unlock notifications (transient)
  unlockEvents: string[];

  // Gear (persists through prestige)
  equippedGear: Record<GearSlot, string>;
  ownedGearIds: string[];

  // Loot gear (persists through prestige)
  lootGearInventory: LootGearItem[];
  equippedLootGear: Record<GearSlot, string | null>;
  gearModInventory: InstalledMod[];
  unlockedTalentNodes: string[];

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

  // Lifetime stats (for challenge tracking, persist through prestige)
  lifetimeTotalDecomposed: number;
  lifetimeTotalEnhanced: number;
  lifetimeTotalTradeUps: number;
  lifetimeTotalRaceSalvage: number;
  highestConditionReached: number; // index into CONDITIONS

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
  setSelectedLocation: (locationId: string) => void;
  setSelectedCircuit: (circuitId: string) => void;
  enterRace: () => void;
  clearUnlockEvents: () => void;
  advanceTutorial: () => void;
  skipTutorial: () => void;
  repairVehicle: (vehicleId: string) => void;
  swapPart: (vehicleId: string, slot: string, newPart: ScavengedPart) => void;
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
  unlockLocation: (locationId: string) => void;
  unlockCircuit: (circuitId: string) => void;
  prestige: () => void;
  purchaseLegacyUpgrade: (upgradeId: string) => void;
  checkMomentumTiers: () => void;
  applyTickResult: (partsFound: ScavengedPart[], scrapsEarned: number, repEarned: number, vehicleWear?: number, vehicleRepair?: number, newRaceTickProgress?: number, lootGearDrops?: LootGearItem[], modDrops?: InstalledMod[]) => void;

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
}

function initialState(): Omit<GameState, keyof ReturnType<typeof createActions>> {
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
    selectedLocationId: "curbside",
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
    equippedGear: { ...DEFAULT_EQUIPPED_GEAR },
    ownedGearIds: [...DEFAULT_OWNED_GEAR],
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
  return Math.min(99, Math.floor(25 * Math.log2(1 + effectiveRaces / 25)));
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createActions(set: any, get: any) {
  return {
    manualScavenge: () => {
      const state = get() as GameState;
      const location = getLocationById(state.selectedLocationId);
      if (!location) return;
      const extraLuck = _getUpgradeEffectValue(state, "keen_eye");
      const extraParts = Math.floor(_getUpgradeEffectValue(state, "deep_pockets"));
      const fatigue = state.fatigue;
      const gb = getGearBonuses(state.equippedGear, state.equippedLootGear, state.lootGearInventory, state.unlockedTalentNodes, TALENT_NODES);
      const parts = scavenge(location, state.prestigeBonus.luckBonus + extraLuck, fatigue, gb.scavenge_luck_bonus, gb.scavenge_yield_pct);
      for (let i = 0; i < extraParts; i++) {
        const bonus = scavenge(location, state.prestigeBonus.luckBonus + extraLuck, fatigue, gb.scavenge_luck_bonus, gb.scavenge_yield_pct);
        if (bonus.length > 0) parts.push(bonus[0]);
      }

      /* ── Tutorial boost: first 30 clicks guarantee enough to build ───── */
      const isTutorial = state.tutorialStep >= 1 && state.tutorialStep <= 2;
      const clickNum = state.manualScavengeClicks; // 0-indexed
      if (isTutorial && clickNum < 30) {
        const hasEngine = state.inventory.some((p) =>
          p.definitionId === "engine_small" || p.definitionId === "engine_lawn",
        );
        const hasWheel = state.inventory.some((p) =>
          p.definitionId === "wheel_busted" || p.definitionId === "wheel_basic",
        );
        // Force engine on click 3, wheel on click 7 if missing
        if (clickNum === 3 && !hasEngine) {
          parts[0] = { id: makePartId(), definitionId: "engine_small", condition: "decent", foundAt: location.id, type: "part" };
        } else if (clickNum === 7 && !hasWheel) {
          parts[0] = { id: makePartId(), definitionId: "wheel_busted", condition: "worn", foundAt: location.id, type: "part" };
        }
        for (const p of parts) {
          // Swap worthless junk for sellable seats ($1+ each)
          if (p.definitionId === "misc_junk") p.definitionId = "misc_seat";
          // Floor condition to "worn" so nothing sells for $0
          if (p.condition === "rusted") p.condition = "worn";
        }
      }

      // Roll for gear/mod drops
      const { gearDrops, modDrop } = rollGearDrops({
        source: "scavenge",
        sourceTier: location.tier,
        sourceId: location.id,
        winStreak: state.winStreak,
        gearDropRateScavengeBonus: _getUpgradeEffectValue(state, "gear_scavenger"),
        gearDropRateRaceBonus: _getUpgradeEffectValue(state, "trophy_hunter"),
        rarityBonus: Math.floor(_getUpgradeEffectValue(state, "rarity_sense")),
        doubleDropChance: _getUpgradeEffectValue(state, "double_drop"),
        modDropRateBonus: _getUpgradeEffectValue(state, "mod_hunter"),
      });
      set((s: GameState) => {
        const newClicks = s.manualScavengeClicks + 1;
        const justUnlocked = !s.autoScavengeUnlocked && newClicks >= 100;
        return {
          inventory: [...s.inventory, ...parts],
          lootGearInventory: gearDrops.length > 0 ? [...s.lootGearInventory, ...gearDrops] : s.lootGearInventory,
          gearModInventory: modDrop ? [...s.gearModInventory, modDrop] : s.gearModInventory,
          manualScavengeClicks: newClicks,
          autoScavengeUnlocked: s.autoScavengeUnlocked || justUnlocked,
          unlockEvents: justUnlocked
            ? [...s.unlockEvents, "Auto-Scavenge Enabled! Parts collect themselves now."]
            : s.unlockEvents,
        };
      });
    },

    sellPart: (partId: string) => {
      const state = get() as GameState;
      const part = state.inventory.find((p) => p.id === partId);
      if (!part) return;
      const gb = getGearBonuses(state.equippedGear, state.equippedLootGear, state.lootGearInventory, state.unlockedTalentNodes, TALENT_NODES);
      // Import inline to avoid circular — scrap value from definition
      import("@/data/parts").then(({ getPartById, CONDITION_MULTIPLIERS }) => {
        const def = getPartById(part.definitionId);
        if (!def) return;
        const mult = CONDITION_MULTIPLIERS[part.condition];
        const value = Math.floor(def.scrapValue * mult * (1 + gb.sell_value_bonus_pct));
        set((s: GameState) => ({
          inventory: s.inventory.filter((p) => p.id !== partId),
          scrapBucks: s.scrapBucks + value,
          lifetimeScrapBucks: s.lifetimeScrapBucks + value,
        }));
      });
    },

    sellAllJunk: () => {
      import("@/data/parts").then(({ getPartById, CONDITION_MULTIPLIERS }) => {
        const state = get() as GameState;
        const gb = getGearBonuses(state.equippedGear, state.equippedLootGear, state.lootGearInventory, state.unlockedTalentNodes, TALENT_NODES);
        let total = 0;
        for (const part of state.inventory) {
          const def = getPartById(part.definitionId);
          if (!def) continue;
          const mult = CONDITION_MULTIPLIERS[part.condition];
          total += Math.floor(def.scrapValue * mult * (1 + gb.sell_value_bonus_pct));
        }
        set((s: GameState) => ({
          inventory: [],
          scrapBucks: s.scrapBucks + total,
          lifetimeScrapBucks: s.lifetimeScrapBucks + total,
        }));
      });
    },

    sellAllScrap: () => {
      import("@/data/parts").then(({ getPartById, CONDITION_MULTIPLIERS }) => {
        const state = get() as GameState;
        const gb = getGearBonuses(state.equippedGear);
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
      });
    },

    sellBelowQuality: (threshold: PartCondition) => {
      import("@/data/parts").then(({ getPartById, CONDITION_MULTIPLIERS }) => {
        import("@/data/addons").then(({ getAddonById }) => {
          const state = get() as GameState;
          const gb = getGearBonuses(state.equippedGear);
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

      const gb = getGearBonuses(state.equippedGear, state.equippedLootGear, state.lootGearInventory, state.unlockedTalentNodes, TALENT_NODES);
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

      set((s: GameState) => ({
        garage: [...s.garage, built],
        inventory: s.inventory.filter((p) => !usedPartIds.has(p.id)),
        scrapBucks: s.scrapBucks - actualBuildCost,
        _vehicleIdCounter: s._vehicleIdCounter + 1,
        pendingBuildParts: {},
        activeVehicleId: s.activeVehicleId ?? built.id,
      }));
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
      }));
    },

    setSelectedLocation: (locationId: string) => {
      set({ selectedLocationId: locationId });
    },

    setSelectedCircuit: (circuitId: string) => {
      set({ selectedCircuitId: circuitId });
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
      const gb = getGearBonuses(state.equippedGear, state.equippedLootGear, state.lootGearInventory, state.unlockedTalentNodes, TALENT_NODES);
      // Scavenger's Eye upgrade increases salvage drop chance and max condition
      const scavengerEyeLevel = _getUpgradeLevel(state, "scavengers_eye");
      const salvageDropChance = scavengerEyeLevel >= 1 ? 0.30 : 0.15;
      const salvageMaxCondition = scavengerEyeLevel >= 1 ? 2 : 1;
      const momentumWinBonus = getMomentumEffectValue(state.activeMomentumTiers, "race_win_bonus");
      const outcome = simulateRace(
        vehicle, circuit,
        state.prestigeBonus.scrapMultiplier,
        state.fatigue,
        gb.race_performance_pct,
        gb.race_dnf_reduction,
        salvageDropChance,
        salvageMaxCondition,
        momentumWinBonus,
        gb.forge_token_chance_bonus,
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
          const effectiveRepEarned = Math.floor(outcome.repEarned * s.prestigeBonus.repMultiplier * (1 + mRepMult));
          const newRep = s.repPoints + effectiveRepEarned;
          const newUnlockedCircuits = [...s.unlockedCircuitIds];
          const newUnlockedLocations = [...s.unlockedLocationIds];
          const newUnlockedVehicles = [...s.unlockedVehicleIds];
          const newUnlockEvents = [...s.unlockEvents];

          // Unlock circuits by rep
          if (newRep >= 5000 && !newUnlockedCircuits.includes("dirt_track")) { newUnlockedCircuits.push("dirt_track"); newUnlockEvents.push("Dirt Track Unlocked! Real gravel, real glory."); }
          if (newRep >= 50000 && !newUnlockedCircuits.includes("regional_circuit")) { newUnlockedCircuits.push("regional_circuit"); newUnlockEvents.push("Regional Circuit Unlocked! Somebody brought a trailer."); }
          if (newRep >= 200000 && !newUnlockedCircuits.includes("national_circuit")) { newUnlockedCircuits.push("national_circuit"); newUnlockEvents.push("National Circuit Unlocked! Corporate sponsors. Cameras."); }
          if (newRep >= 600000 && !newUnlockedCircuits.includes("world_championship")) { newUnlockedCircuits.push("world_championship"); newUnlockEvents.push("World Championship Unlocked! The big leagues."); }

          // Unlock locations by rep
          if (newRep >= 8000 && !newUnlockedLocations.includes("neighborhood_yards")) { newUnlockedLocations.push("neighborhood_yards"); newUnlockEvents.push("New Location: Neighborhood Yards!"); }
          if (newRep >= 35000 && !newUnlockedLocations.includes("local_junkyard")) { newUnlockedLocations.push("local_junkyard"); newUnlockEvents.push("New Location: Local Junkyard — better parts await!"); }
          if (newRep >= 120000 && !newUnlockedLocations.includes("salvage_auction")) { newUnlockedLocations.push("salvage_auction"); newUnlockEvents.push("New Location: Salvage Auction!"); }
          if (newRep >= 400000 && !newUnlockedLocations.includes("industrial_surplus")) { newUnlockedLocations.push("industrial_surplus"); newUnlockEvents.push("New Location: Industrial Surplus!"); }
          if (newRep >= 1000000 && !newUnlockedLocations.includes("military_scrapyard")) { newUnlockedLocations.push("military_scrapyard"); newUnlockEvents.push("New Location: Military Scrapyard!"); }

          // Unlock vehicles by rep
          if (newRep >= 8000 && !newUnlockedVehicles.includes("beater_car")) { newUnlockedVehicles.push("beater_car"); newUnlockEvents.push("Beater Car Blueprint Unlocked!"); }
          if (newRep >= 35000 && !newUnlockedVehicles.includes("street_racer")) { newUnlockedVehicles.push("street_racer"); newUnlockEvents.push("Street Racer Blueprint Unlocked!"); }
          if (newRep >= 100000 && !newUnlockedVehicles.includes("stock_car")) { newUnlockedVehicles.push("stock_car"); newUnlockEvents.push("Stock Car Blueprint Unlocked!"); }

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
          const wearAmount = racingV ? calculateWear(racingV, outcome.result, wearReduction, s.fatigue, gb.race_wear_reduction_pct) : 0;
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
          const fatigueOffset = getLegacyEffectValue(s.legacyUpgradeLevels, "leg_fatigue_offset");
          const rawFatigue = calculateFatigue(newLifetimeRaces, fatigueOffset);
          const newFatigue = Math.floor(rawFatigue * (1 - gb.fatigue_rate_reduction));

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
            gearDropRateScavengeBonus: _getUpgradeEffectValue(s, "gear_scavenger"),
            gearDropRateRaceBonus: _getUpgradeEffectValue(s, "trophy_hunter"),
            rarityBonus: Math.floor(_getUpgradeEffectValue(s, "rarity_sense")),
            doubleDropChance: _getUpgradeEffectValue(s, "double_drop"),
            modDropRateBonus: _getUpgradeEffectValue(s, "mod_hunter"),
          });
          const newLootGearInventory = raceGearDrops.length > 0
            ? [...s.lootGearInventory, ...raceGearDrops]
            : s.lootGearInventory;
          const newGearModInventory = raceModDrop
            ? [...s.gearModInventory, raceModDrop]
            : s.gearModInventory;
          if (raceGearDrops.length > 0) newUnlockEvents.push(`Gear Drop: ${raceGearDrops.map((g) => g.name).join(", ")}!`);
          if (raceModDrop) newUnlockEvents.push(`Mod Found: ${raceModDrop.name}!`);

          // Salvage drop and forge token from race
          const newInventory = outcome.salvageDrop
            ? [...s.inventory, outcome.salvageDrop]
            : s.inventory;
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
            autoRaceUnlocked: s.autoRaceUnlocked || newRep >= 8000,
            autoScavengeUnlocked: s.autoScavengeUnlocked || newRep >= 3000,
            raceEvents: [],
            raceStartTime: null,
            precomputedOutcome: null,
            winStreak: newStreak,
            bestWinStreak: newBestStreak,
            unlockEvents: newUnlockEvents,
            garage: updatedGarage,
            lifetimeRaces: newLifetimeRaces,
            fatigue: newFatigue,
            lootGearInventory: newLootGearInventory,
            gearModInventory: newGearModInventory,
            inventory: newInventory,
            forgeTokens: newForgeTokens + challengeTokenRewards.reduce((t, r) => t + r.amount, 0),
            lifetimeTotalRaceSalvage: newRaceSalvage,
            challengeProgress: newChallengeProgress,
            completedChallenges: [...s.completedChallenges, ...newCompleted],
            materials: newMaterials,
            gameTick: newTick,
            dealerBoard: newDealerBoard,
          };
        });
        // Check momentum tiers after race
        (get() as GameState).checkMomentumTiers();
      }, circuit.raceDuration);
    },

    clearUnlockEvents: () => {
      set({ unlockEvents: [] });
    },

    advanceTutorial: () => {
      const step = (get() as GameState).tutorialStep;
      set({ tutorialStep: step >= 16 ? -1 : step + 1 });
    },

    skipTutorial: () => {
      set({ tutorialStep: -1 });
    },

    repairVehicle: (vehicleId: string) => {
      const state = get() as GameState;
      const vehicle = state.garage.find((v) => v.id === vehicleId);
      if (!vehicle || (vehicle.condition ?? 100) >= 100) return;
      const vehicleDef = getVehicleById(vehicle.definitionId);
      if (!vehicleDef) return;
      const gb = getGearBonuses(state.equippedGear, state.equippedLootGear, state.lootGearInventory, state.unlockedTalentNodes, TALENT_NODES);
      const reduction = _getUpgradeEffectValue(state, "budget_repairs") + gb.repair_cost_reduction_pct;
      const cost = calculateRepairCost(vehicleDef, vehicle.condition ?? 100, 100, reduction, state.fatigue);
      if (state.scrapBucks < cost) return;
      const handlingBonus = _getUpgradeEffectValue(state, "tuned_suspension") + gb.race_handling_pct;
      set((s: GameState) => ({
        scrapBucks: s.scrapBucks - cost,
        garage: s.garage.map((v) => v.id !== vehicleId ? v : {
          ...v,
          condition: 100,
          stats: calculateStats(vehicleDef, v.parts, 100, handlingBonus),
        }),
      }));
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

      const newParts = { ...vehicle.parts, [slot]: { part: newPart, addons: installed.addons } };
      const gbSwap = getGearBonuses(state.equippedGear, state.equippedLootGear, state.lootGearInventory, state.unlockedTalentNodes, TALENT_NODES);
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
        ],
      }));
    },

    refurbishPart: (partId: string) => {
      const state = get() as GameState;
      if (_getUpgradeLevel(state, "refurbishment_bench") < 1) return;
      const part = state.inventory.find((p) => p.id === partId);
      if (!part) return;
      const gb = getGearBonuses(state.equippedGear, state.equippedLootGear, state.lootGearInventory, state.unlockedTalentNodes, TALENT_NODES);
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
      const newMaterials = { ...state.materials };
      for (const mr of matRewards) newMaterials[mr.material] = (newMaterials[mr.material] ?? 0) + mr.amount;

      // Muscle Memory: starting auto-scavenge clicks
      const startingClicks = result.startingScavClicks;
      const autoScavUnlocked = startingClicks >= 100;

      // Merge starting locations/circuits with defaults
      const startingLocations = Array.from(new Set(["curbside", ...result.startingLocationIds]));
      const startingCircuits = Array.from(new Set(["backyard_derby", ...result.startingCircuitIds]));

      // LP earned
      const lpEarned = result.legacyPointsEarned;
      const newLp = state.legacyPoints + lpEarned;
      const newLifetimeLp = state.lifetimeLegacyPoints + lpEarned;

      const unlockEvents: string[] = [];
      if (newPrestigeCount === 1) {
        unlockEvents.push("Auto-Race Enabled! Your scrap heap races itself!");
      }
      if (lpEarned > 0) {
        unlockEvents.push(`+${lpEarned} Legacy Points earned!`);
      }

      set({
        ...initialState(),
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
        scrapBucks: result.startingScrap,
        lifetimeScrapBucks: result.startingScrap,
        // Auto-race unlocks permanently after first prestige
        autoRaceUnlocked: newPrestigeCount >= 1,
        // Auto-scavenge stays unlocked once earned, or via Muscle Memory talent
        autoScavengeUnlocked: state.autoScavengeUnlocked || autoScavUnlocked,
        manualScavengeClicks: Math.min(startingClicks, 100),
        raceTickProgress: 0,
        unlockEvents,
        // Gear persists through prestige
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
        dealerBoard: [],
        gameTick: 0,
      });
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

    applyTickResult: (partsFound: ScavengedPart[], scrapsEarned: number, repEarned: number, vehicleWear?: number, vehicleRepair?: number, newRaceTickProgress?: number, lootGearDrops?: LootGearItem[], modDrops?: InstalledMod[]) => {
      set((s: GameState) => {
        let updatedGarage = s.garage;
        if ((vehicleWear || vehicleRepair) && s.activeVehicleId) {
          const gbTick = getGearBonuses(s.equippedGear, s.equippedLootGear, s.lootGearInventory, s.unlockedTalentNodes, TALENT_NODES);
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
              totalRaces: vehicleWear ? (v.totalRaces ?? 0) + 1 : (v.totalRaces ?? 0),
              stats: vDef ? calculateStats(vDef, v.parts, newCond, handlingBonus) : v.stats,
            };
          });
        }
        const raced = !!vehicleWear;
        const newLifetimeRaces = raced ? s.lifetimeRaces + 1 : s.lifetimeRaces;
        const fatigueOffset = getLegacyEffectValue(s.legacyUpgradeLevels, "leg_fatigue_offset");
        const gbFatigue = getGearBonuses(s.equippedGear, s.equippedLootGear, s.lootGearInventory, s.unlockedTalentNodes, TALENT_NODES);
        const rawFatigue = raced ? calculateFatigue(newLifetimeRaces, fatigueOffset) : s.fatigue;
        const newFatigue = raced ? Math.floor(rawFatigue * (1 - gbFatigue.fatigue_rate_reduction)) : s.fatigue;
        return {
          inventory: [...s.inventory, ...partsFound],
          scrapBucks: s.scrapBucks + scrapsEarned,
          lifetimeScrapBucks: s.lifetimeScrapBucks + scrapsEarned,
          repPoints: s.repPoints + repEarned,
          garage: updatedGarage,
          lifetimeRaces: newLifetimeRaces,
          fatigue: newFatigue,
          lootGearInventory: lootGearDrops && lootGearDrops.length > 0
            ? [...s.lootGearInventory, ...lootGearDrops]
            : s.lootGearInventory,
          gearModInventory: modDrops && modDrops.length > 0
            ? [...s.gearModInventory, ...modDrops]
            : s.gearModInventory,
          raceTickProgress: newRaceTickProgress ?? s.raceTickProgress,
          lastActiveTimestamp: Date.now(),
        };
      });
      // Check momentum tier activations after state update
      (get() as GameState).checkMomentumTiers();
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
      const gb = getGearBonuses(state.equippedGear, state.equippedLootGear, state.lootGearInventory, state.unlockedTalentNodes, TALENT_NODES);
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
      const gbDecompose = getGearBonuses(state.equippedGear, state.equippedLootGear, state.lootGearInventory, state.unlockedTalentNodes, TALENT_NODES);
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
    },

    refreshDealer: () => {
      const state = get() as GameState;
      const cost = 300;
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
      const cost = 200;
      const yield_ = 5;
      // Only basic materials can be purchased with scrap
      const basicMaterials: MaterialType[] = ["metalScrap", "rubberCompound", "greaseSludge"];
      if (!basicMaterials.includes(material)) return;
      if (state.scrapBucks < cost) return;
      set((s: GameState) => ({
        scrapBucks: s.scrapBucks - cost,
        materials: { ...s.materials, [material]: (s.materials[material] ?? 0) + yield_ },
      }));
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

    devResetSave: () => {
      set({ ...initialState() });
    },
  };
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...initialState(),
      ...createActions(set, get),
    }),
    {
      name: "rags-to-races-save",
      version: 1,
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Record<string, unknown>;
        if (version === 0) {
          // Existing save: grant retroactive LP based on old prestige count
          const oldPrestigeCount = (state.prestigeCount as number) ?? 0;
          const retroactiveLp = Math.floor(oldPrestigeCount * 3);
          return {
            ...state,
            legacyPoints: retroactiveLp,
            lifetimeLegacyPoints: retroactiveLp,
            legacyUpgradeLevels: {},
            activeMomentumTiers: [],
            currentEra: 1,
          };
        }
        return state;
      },
      partialize: (state) => ({
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
        selectedLocationId: state.selectedLocationId,
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
        // New systems (all persist)
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
      }),
    },
  ),
);
