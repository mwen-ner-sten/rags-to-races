"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ScavengedPart } from "@/engine/scavenge";
import type { BuiltVehicle } from "@/engine/build";
import type { RaceOutcome } from "@/engine/race";
import type { RaceEvent } from "@/engine/raceEvents";
import type { PrestigeBonus } from "@/engine/prestige";
import type { PartCondition, CoreSlot } from "@/data/parts";
import type { InstalledPart } from "@/engine/build";
import { calculatePrestigeBonus, doPrestige } from "@/engine/prestige";
import { generateRaceEvents } from "@/engine/raceEvents";
import { scavenge } from "@/engine/scavenge";
import { buildVehicle, calculateStats, calculateRepairCost, calculateRefurbishCost, degradeCondition } from "@/engine/build";
import { simulateRace, calculateWear } from "@/engine/race";
import { getLocationById } from "@/data/locations";
import { getCircuitById } from "@/data/circuits";
import { getVehicleById } from "@/data/vehicles";
import { getUpgradeById, getUpgradeCost } from "@/data/upgrades";

export interface GameState {
  // Currency
  scrapBucks: number;
  repPoints: number;
  lifetimeScrapBucks: number;

  // Prestige
  prestigeCount: number;
  prestigeBonus: PrestigeBonus;

  // Inventory
  inventory: ScavengedPart[];

  // Garage (built vehicles)
  garage: BuiltVehicle[];
  activeVehicleId: string | null;

  // Scavenging
  selectedLocationId: string;
  isScavenging: boolean;
  autoScavengeUnlocked: boolean;

  // Racing
  selectedCircuitId: string;
  isRacing: boolean;
  autoRaceUnlocked: boolean;
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

  // Workshop upgrades
  workshopLevels: Record<string, number>;

  // Build UI state
  pendingBuildParts: Record<string, ScavengedPart | null>;
  pendingBuildVehicleId: string | null;

  // Unlocks
  introCompleted: boolean;
  unlockedFeatureIds: string[];
  unlockedLocationIds: string[];
  unlockedCircuitIds: string[];
  unlockedVehicleIds: string[];

  // Vehicle build counter (for unique IDs)
  _vehicleIdCounter: number;

  // Actions
  manualScavenge: () => void;
  sellPart: (partId: string) => void;
  sellAllJunk: () => void;
  setPendingVehicle: (vehicleId: string) => void;
  setPendingPart: (slot: string, part: ScavengedPart | null) => void;
  buildSelectedVehicle: () => void;
  setActiveVehicle: (vehicleId: string) => void;
  sellVehicle: (vehicleId: string) => void;
  setSelectedLocation: (locationId: string) => void;
  setSelectedCircuit: (circuitId: string) => void;
  enterRace: () => void;
  clearUnlockEvents: () => void;
  repairVehicle: (vehicleId: string) => void;
  swapPart: (vehicleId: string, slot: string, newPart: ScavengedPart) => void;
  refurbishPart: (partId: string) => void;
  purchaseUpgrade: (upgradeId: string) => void;
  unlockLocation: (locationId: string) => void;
  unlockCircuit: (circuitId: string) => void;
  completeIntro: () => void;
  prestige: () => void;
  applyTickResult: (partsFound: ScavengedPart[], scrapsEarned: number, repEarned: number, vehicleWear?: number, vehicleRepair?: number) => void;

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
    prestigeBonus: calculatePrestigeBonus(0),
    inventory: [],
    garage: [],
    activeVehicleId: null,
    selectedLocationId: "curbside",
    isScavenging: false,
    autoScavengeUnlocked: false,
    selectedCircuitId: "backyard_derby",
    isRacing: false,
    autoRaceUnlocked: false,
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
    workshopLevels: {},
    pendingBuildParts: {},
    pendingBuildVehicleId: "push_mower",
    introCompleted: false,
    unlockedFeatureIds: ["intro"],
    unlockedLocationIds: ["curbside"],
    unlockedCircuitIds: ["backyard_derby"],
    unlockedVehicleIds: ["push_mower"],
    _vehicleIdCounter: 0,
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
export function calculateFatigue(lifetimeRaces: number): number {
  if (lifetimeRaces <= 0) return 0;
  return Math.min(99, Math.floor(25 * Math.log2(1 + lifetimeRaces / 25)));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createActions(set: any, get: any) {
  const unlockFeature = (state: GameState, featureId: string, message: string): Pick<GameState, "unlockedFeatureIds" | "unlockEvents"> => {
    if (state.unlockedFeatureIds.includes(featureId)) {
      return { unlockedFeatureIds: state.unlockedFeatureIds, unlockEvents: state.unlockEvents };
    }
    return {
      unlockedFeatureIds: [...state.unlockedFeatureIds, featureId],
      unlockEvents: [...state.unlockEvents, message],
    };
  };

  return {
    manualScavenge: () => {
      const state = get() as GameState;
      const location = getLocationById(state.selectedLocationId);
      if (!location) return;
      const extraLuck = _getUpgradeEffectValue(state, "keen_eye");
      const extraParts = Math.floor(_getUpgradeEffectValue(state, "deep_pockets"));
      const fatigue = state.fatigue;
      const parts = scavenge(location, state.prestigeBonus.luckBonus + extraLuck, fatigue);
      for (let i = 0; i < extraParts; i++) {
        const bonus = scavenge(location, state.prestigeBonus.luckBonus + extraLuck, fatigue);
        if (bonus.length > 0) parts.push(bonus[0]);
      }
      set((s: GameState) => {
        const nextInventory = [...s.inventory, ...parts];
        const unlocks = nextInventory.length > 0
          ? unlockFeature(s, "garage", "Garage Unlocked! Time to bolt parts together.")
          : { unlockedFeatureIds: s.unlockedFeatureIds, unlockEvents: s.unlockEvents };
        return {
          inventory: nextInventory,
          unlockedFeatureIds: unlocks.unlockedFeatureIds,
          unlockEvents: unlocks.unlockEvents,
        };
      });
    },

    sellPart: (partId: string) => {
      const state = get() as GameState;
      const part = state.inventory.find((p) => p.id === partId);
      if (!part) return;
      // Import inline to avoid circular — scrap value from definition
      import("@/data/parts").then(({ getPartById, CONDITION_MULTIPLIERS }) => {
        const def = getPartById(part.definitionId);
        if (!def) return;
        const mult = CONDITION_MULTIPLIERS[part.condition];
        const value = Math.floor(def.scrapValue * mult);
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
        let total = 0;
        for (const part of state.inventory) {
          const def = getPartById(part.definitionId);
          if (!def) continue;
          const mult = CONDITION_MULTIPLIERS[part.condition];
          total += Math.floor(def.scrapValue * mult);
        }
        set((s: GameState) => ({
          inventory: [],
          scrapBucks: s.scrapBucks + total,
          lifetimeScrapBucks: s.lifetimeScrapBucks + total,
        }));
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

      const buildReduction = _getUpgradeEffectValue(state, "bargain_builder");
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
        ...((() => {
          const nextGarage = [...s.garage, built];
          const unlockRace = unlockFeature(s, "race", "Race Unlocked! Get that machine on the track.");
          const unlockWorkshop = unlockFeature(
            { ...s, unlockedFeatureIds: unlockRace.unlockedFeatureIds, unlockEvents: unlockRace.unlockEvents },
            "workshop",
            "Workshop Unlocked! Fine-tune your junkyard engineering.",
          );
          return {
            garage: nextGarage,
            unlockedFeatureIds: unlockWorkshop.unlockedFeatureIds,
            unlockEvents: unlockWorkshop.unlockEvents,
          };
        })()),
        inventory: s.inventory.filter((p) => !usedPartIds.has(p.id)),
        scrapBucks: s.scrapBucks - actualBuildCost,
        _vehicleIdCounter: s._vehicleIdCounter + 1,
        pendingBuildParts: {},
        activeVehicleId: s.activeVehicleId ?? built.id,
        // Unlock riding mower after first build
        unlockedVehicleIds: s.unlockedVehicleIds.includes("riding_mower")
          ? s.unlockedVehicleIds
          : [...s.unlockedVehicleIds, "riding_mower"],
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
      const outcome = simulateRace(vehicle, circuit, state.prestigeBonus.scrapMultiplier, state.fatigue);
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
          const newRep = s.repPoints + outcome.repEarned;
          const newUnlockedCircuits = [...s.unlockedCircuitIds];
          const newUnlockedLocations = [...s.unlockedLocationIds];
          const newUnlockedVehicles = [...s.unlockedVehicleIds];
          const newUnlockEvents = [...s.unlockEvents];

          // Unlock circuits by rep
          if (newRep >= 18 && !newUnlockedCircuits.includes("dirt_track")) { newUnlockedCircuits.push("dirt_track"); newUnlockEvents.push("Dirt Track Unlocked! Real gravel, real glory."); }
          if (newRep >= 50 && !newUnlockedCircuits.includes("regional_circuit")) { newUnlockedCircuits.push("regional_circuit"); newUnlockEvents.push("Regional Circuit Unlocked! Somebody brought a trailer."); }
          if (newRep >= 130 && !newUnlockedCircuits.includes("national_circuit")) { newUnlockedCircuits.push("national_circuit"); newUnlockEvents.push("National Circuit Unlocked! Corporate sponsors. Cameras."); }
          if (newRep >= 350 && !newUnlockedCircuits.includes("world_championship")) { newUnlockedCircuits.push("world_championship"); newUnlockEvents.push("World Championship Unlocked! The big leagues."); }

          // Unlock locations by rep
          if (newRep >= 8 && !newUnlockedLocations.includes("neighborhood_yards")) { newUnlockedLocations.push("neighborhood_yards"); newUnlockEvents.push("New Location: Neighborhood Yards!"); }
          if (newRep >= 35 && !newUnlockedLocations.includes("local_junkyard")) { newUnlockedLocations.push("local_junkyard"); newUnlockEvents.push("New Location: Local Junkyard — better parts await!"); }
          if (newRep >= 100 && !newUnlockedLocations.includes("salvage_auction")) { newUnlockedLocations.push("salvage_auction"); newUnlockEvents.push("New Location: Salvage Auction!"); }
          if (newRep >= 250 && !newUnlockedLocations.includes("industrial_surplus")) { newUnlockedLocations.push("industrial_surplus"); newUnlockEvents.push("New Location: Industrial Surplus!"); }
          if (newRep >= 600 && !newUnlockedLocations.includes("military_scrapyard")) { newUnlockedLocations.push("military_scrapyard"); newUnlockEvents.push("New Location: Military Scrapyard!"); }

          // Unlock vehicles by rep
          if (newRep >= 8 && !newUnlockedVehicles.includes("beater_car")) { newUnlockedVehicles.push("beater_car"); newUnlockEvents.push("Beater Car Blueprint Unlocked!"); }
          if (newRep >= 35 && !newUnlockedVehicles.includes("street_racer")) { newUnlockedVehicles.push("street_racer"); newUnlockEvents.push("Street Racer Blueprint Unlocked!"); }
          if (newRep >= 120 && !newUnlockedVehicles.includes("stock_car")) { newUnlockedVehicles.push("stock_car"); newUnlockEvents.push("Stock Car Blueprint Unlocked!"); }

          // Unlock go-kart after winning backyard derby
          if (outcome.result === "win" && s.selectedCircuitId === "backyard_derby" && !newUnlockedVehicles.includes("go_kart")) {
            newUnlockedVehicles.push("go_kart");
            newUnlockEvents.push("Go-Kart Blueprint Unlocked!");
          }

          let newUnlockedFeatures = s.unlockedFeatureIds;
          if (newRep >= 5 && !newUnlockedFeatures.includes("community")) {
            newUnlockedFeatures = [...newUnlockedFeatures, "community"];
            newUnlockEvents.push("Community Unlocked! Rivals and fans are starting to notice.");
          }

          // Auto-unlock notifications
          if (!s.autoScavengeUnlocked && newRep >= 15) newUnlockEvents.push("Auto-Scavenge Enabled! Parts collect themselves now.");
          if (!s.autoRaceUnlocked && newRep >= 30) newUnlockEvents.push("Auto-Race Enabled! Your scrap heap races itself!");

          // Win streak
          const newStreak = outcome.result === "win" ? s.winStreak + 1 : 0;
          const newBestStreak = Math.max(s.bestWinStreak, newStreak);
          if (newStreak === 3) newUnlockEvents.push("3-Win Streak! You're on fire!");
          if (newStreak === 5) newUnlockEvents.push("5 WINS! Unstoppable!");
          if (newStreak === 10) newUnlockEvents.push("10 WINS! LEGENDARY!");

          // Apply vehicle wear to the vehicle that started the race
          const wearReduction = _getUpgradeEffectValue(s, "reinforced_chassis");
          const racingV = s.garage.find((v) => v.id === racingVehicleId);
          const wearAmount = racingV ? calculateWear(racingV, outcome.result, wearReduction, s.fatigue) : 0;
          const handlingBonus = _getUpgradeEffectValue(s, "tuned_suspension");
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
          const finalScraps = outcome.result !== "win" && consolationBonus > 0
            ? Math.floor(outcome.scrapsEarned * (1 + consolationBonus))
            : outcome.scrapsEarned;

          const newLifetimeRaces = s.lifetimeRaces + 1;
          const newFatigue = calculateFatigue(newLifetimeRaces);

          return {
            isRacing: false,
            lastRaceOutcome: outcome,
            raceHistory: [outcome, ...s.raceHistory].slice(0, 20),
            scrapBucks: s.scrapBucks + finalScraps,
            lifetimeScrapBucks: s.lifetimeScrapBucks + finalScraps,
            repPoints: newRep,
            unlockedCircuitIds: newUnlockedCircuits,
            unlockedLocationIds: newUnlockedLocations,
            unlockedVehicleIds: newUnlockedVehicles,
            unlockedFeatureIds: newUnlockedFeatures,
            autoRaceUnlocked: s.autoRaceUnlocked || newRep >= 30,
            autoScavengeUnlocked: s.autoScavengeUnlocked || newRep >= 15,
            raceEvents: [],
            raceStartTime: null,
            precomputedOutcome: null,
            winStreak: newStreak,
            bestWinStreak: newBestStreak,
            unlockEvents: newUnlockEvents,
            garage: updatedGarage,
            lifetimeRaces: newLifetimeRaces,
            fatigue: newFatigue,
          };
        });
      }, circuit.raceDuration);
    },

    clearUnlockEvents: () => {
      set({ unlockEvents: [] });
    },

    repairVehicle: (vehicleId: string) => {
      const state = get() as GameState;
      const vehicle = state.garage.find((v) => v.id === vehicleId);
      if (!vehicle || (vehicle.condition ?? 100) >= 100) return;
      const vehicleDef = getVehicleById(vehicle.definitionId);
      if (!vehicleDef) return;
      const reduction = _getUpgradeEffectValue(state, "budget_repairs");
      const cost = calculateRepairCost(vehicleDef, vehicle.condition ?? 100, 100, reduction, state.fatigue);
      if (state.scrapBucks < cost) return;
      const handlingBonus = _getUpgradeEffectValue(state, "tuned_suspension");
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
      const handlingBonus = _getUpgradeEffectValue(state, "tuned_suspension");
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
      const reduction = _getUpgradeEffectValue(state, "cheap_refurb");
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
      }

      const cost = getUpgradeCost(def, currentLevel);
      if (state.scrapBucks < cost) return;
      set((s: GameState) => ({
        scrapBucks: s.scrapBucks - cost,
        workshopLevels: { ...s.workshopLevels, [upgradeId]: currentLevel + 1 },
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

    completeIntro: () => {
      set((s: GameState) => {
        if (s.introCompleted) return s;
        return {
          introCompleted: true,
          unlockedFeatureIds: [...s.unlockedFeatureIds, "junkyard", "shop", "settings"],
          unlockEvents: [...s.unlockEvents, "Intro Complete! Scavenge your first parts to unlock the Garage."],
        };
      });
    },

    prestige: () => {
      const state = get() as GameState;
      const kept = doPrestige(state.prestigeCount);
      set({
        ...initialState(),
        prestigeCount: kept.prestigeCount,
        prestigeBonus: kept.bonuses,
        workshopLevels: {},
        unlockedVehicleIds: ["push_mower"],
        unlockedLocationIds: ["curbside"],
        unlockedCircuitIds: ["backyard_derby"],
        fatigue: 0,
        lifetimeRaces: 0,
      });
    },

    applyTickResult: (partsFound: ScavengedPart[], scrapsEarned: number, repEarned: number, vehicleWear?: number, vehicleRepair?: number) => {
      set((s: GameState) => {
        let updatedGarage = s.garage;
        if ((vehicleWear || vehicleRepair) && s.activeVehicleId) {
          const handlingBonus = _getUpgradeEffectValue(s, "tuned_suspension");
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
        const newFatigue = raced ? calculateFatigue(newLifetimeRaces) : s.fatigue;
        return {
          inventory: [...s.inventory, ...partsFound],
          scrapBucks: s.scrapBucks + scrapsEarned,
          lifetimeScrapBucks: s.lifetimeScrapBucks + scrapsEarned,
          repPoints: s.repPoints + repEarned,
          garage: updatedGarage,
          lifetimeRaces: newLifetimeRaces,
          fatigue: newFatigue,
        };
      });
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
      const bonus = calculatePrestigeBonus(count);
      set({ prestigeCount: count, prestigeBonus: bonus });
    },

    devUnlockAll: () => {
      import("@/data/locations").then(({ LOCATION_DEFINITIONS }) => {
        import("@/data/circuits").then(({ CIRCUIT_DEFINITIONS }) => {
          import("@/data/vehicles").then(({ VEHICLE_DEFINITIONS }) => {
            set({
              introCompleted: true,
              unlockedFeatureIds: ["intro", "junkyard", "garage", "race", "community", "workshop", "shop", "settings", "dev"],
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
        introCompleted: false,
        unlockedFeatureIds: ["intro"],
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
      partialize: (state) => ({
        scrapBucks: state.scrapBucks,
        repPoints: state.repPoints,
        lifetimeScrapBucks: state.lifetimeScrapBucks,
        prestigeCount: state.prestigeCount,
        prestigeBonus: state.prestigeBonus,
        inventory: state.inventory,
        garage: state.garage,
        activeVehicleId: state.activeVehicleId,
        selectedLocationId: state.selectedLocationId,
        selectedCircuitId: state.selectedCircuitId,
        autoScavengeUnlocked: state.autoScavengeUnlocked,
        autoRaceUnlocked: state.autoRaceUnlocked,
        introCompleted: state.introCompleted,
        unlockedFeatureIds: state.unlockedFeatureIds,
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
        pendingBuildVehicleId: state.pendingBuildVehicleId,
      }),
    },
  ),
);
