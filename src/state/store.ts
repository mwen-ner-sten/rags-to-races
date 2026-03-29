"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ScavengedPart } from "@/engine/scavenge";
import type { BuiltVehicle } from "@/engine/build";
import type { RaceOutcome } from "@/engine/race";
import type { RaceEvent } from "@/engine/raceEvents";
import type { PrestigeBonus } from "@/engine/prestige";
import type { PartCondition } from "@/data/parts";
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

  // Unlock notifications (transient)
  unlockEvents: string[];

  // Workshop upgrades
  workshopLevels: Record<string, number>;

  // Build UI state
  pendingBuildParts: {
    engine: ScavengedPart | null;
    wheel: ScavengedPart | null;
    frame: ScavengedPart | null;
    fuel: ScavengedPart | null;
  };
  pendingBuildVehicleId: string | null;

  // Unlocks
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
  setPendingPart: (slot: "engine" | "wheel" | "frame" | "fuel", part: ScavengedPart | null) => void;
  buildSelectedVehicle: () => void;
  setActiveVehicle: (vehicleId: string) => void;
  sellVehicle: (vehicleId: string) => void;
  setSelectedLocation: (locationId: string) => void;
  setSelectedCircuit: (circuitId: string) => void;
  enterRace: () => void;
  clearUnlockEvents: () => void;
  repairVehicle: (vehicleId: string) => void;
  swapPart: (vehicleId: string, slot: "engine" | "wheel" | "frame" | "fuel", newPart: ScavengedPart) => void;
  refurbishPart: (partId: string) => void;
  purchaseUpgrade: (upgradeId: string) => void;
  unlockLocation: (locationId: string) => void;
  unlockCircuit: (circuitId: string) => void;
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
    unlockEvents: [],
    workshopLevels: {},
    pendingBuildParts: { engine: null, wheel: null, frame: null, fuel: null },
    pendingBuildVehicleId: "push_mower",
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createActions(set: any, get: any) {
  return {
    manualScavenge: () => {
      const state = get() as GameState;
      const location = getLocationById(state.selectedLocationId);
      if (!location) return;
      const extraLuck = _getUpgradeEffectValue(state, "keen_eye");
      const extraParts = Math.floor(_getUpgradeEffectValue(state, "deep_pockets"));
      const parts = scavenge(location, state.prestigeBonus.luckBonus + extraLuck);
      for (let i = 0; i < extraParts; i++) {
        const bonus = scavenge(location, state.prestigeBonus.luckBonus + extraLuck);
        if (bonus.length > 0) parts.push(bonus[0]);
      }
      set((s: GameState) => ({
        inventory: [...s.inventory, ...parts],
      }));
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
      set({ pendingBuildVehicleId: vehicleId, pendingBuildParts: { engine: null, wheel: null, frame: null, fuel: null } });
    },

    setPendingPart: (slot: "engine" | "wheel" | "frame" | "fuel", part: ScavengedPart | null) => {
      set((s: GameState) => ({
        pendingBuildParts: { ...s.pendingBuildParts, [slot]: part },
      }));
    },

    buildSelectedVehicle: () => {
      const state = get() as GameState;
      const { pendingBuildVehicleId, pendingBuildParts, _vehicleIdCounter } = state;
      if (!pendingBuildVehicleId) return;
      const { engine, wheel, frame, fuel } = pendingBuildParts;
      if (!engine || !wheel || !frame || !fuel) return;

      const vehicleDef = getVehicleById(pendingBuildVehicleId);
      if (!vehicleDef) return;

      const buildReduction = _getUpgradeEffectValue(state, "bargain_builder");
      const actualBuildCost = Math.max(0, Math.floor(vehicleDef.buildCost * (1 - buildReduction)));
      if (state.scrapBucks < actualBuildCost) return;

      const usedPartIds = new Set([engine.id, wheel.id, frame.id, fuel.id]);
      const built = buildVehicle(vehicleDef, { engine, wheel, frame, fuel }, _vehicleIdCounter);

      set((s: GameState) => ({
        garage: [...s.garage, built],
        inventory: s.inventory.filter((p) => !usedPartIds.has(p.id)),
        scrapBucks: s.scrapBucks - actualBuildCost,
        _vehicleIdCounter: s._vehicleIdCounter + 1,
        pendingBuildParts: { engine: null, wheel: null, frame: null, fuel: null },
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
      const outcome = simulateRace(vehicle, circuit, state.prestigeBonus.scrapMultiplier);
      const events = generateRaceEvents(outcome, circuit, circuit.raceDuration);

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
          if (newRep >= 10 && !newUnlockedCircuits.includes("dirt_track")) { newUnlockedCircuits.push("dirt_track"); newUnlockEvents.push("Dirt Track Unlocked! Real gravel, real glory."); }
          if (newRep >= 30 && !newUnlockedCircuits.includes("regional_circuit")) { newUnlockedCircuits.push("regional_circuit"); newUnlockEvents.push("Regional Circuit Unlocked! Somebody brought a trailer."); }
          if (newRep >= 80 && !newUnlockedCircuits.includes("national_circuit")) { newUnlockedCircuits.push("national_circuit"); newUnlockEvents.push("National Circuit Unlocked! Corporate sponsors. Cameras."); }
          if (newRep >= 200 && !newUnlockedCircuits.includes("world_championship")) { newUnlockedCircuits.push("world_championship"); newUnlockEvents.push("World Championship Unlocked! The big leagues."); }

          // Unlock locations by rep
          if (newRep >= 5 && !newUnlockedLocations.includes("neighborhood_yards")) { newUnlockedLocations.push("neighborhood_yards"); newUnlockEvents.push("New Location: Neighborhood Yards!"); }
          if (newRep >= 20 && !newUnlockedLocations.includes("local_junkyard")) { newUnlockedLocations.push("local_junkyard"); newUnlockEvents.push("New Location: Local Junkyard — better parts await!"); }
          if (newRep >= 60 && !newUnlockedLocations.includes("salvage_auction")) { newUnlockedLocations.push("salvage_auction"); newUnlockEvents.push("New Location: Salvage Auction!"); }
          if (newRep >= 150 && !newUnlockedLocations.includes("industrial_surplus")) { newUnlockedLocations.push("industrial_surplus"); newUnlockEvents.push("New Location: Industrial Surplus!"); }
          if (newRep >= 400 && !newUnlockedLocations.includes("military_scrapyard")) { newUnlockedLocations.push("military_scrapyard"); newUnlockEvents.push("New Location: Military Scrapyard!"); }

          // Unlock vehicles by rep
          if (newRep >= 5 && !newUnlockedVehicles.includes("beater_car")) { newUnlockedVehicles.push("beater_car"); newUnlockEvents.push("Beater Car Blueprint Unlocked!"); }
          if (newRep >= 20 && !newUnlockedVehicles.includes("street_racer")) { newUnlockedVehicles.push("street_racer"); newUnlockEvents.push("Street Racer Blueprint Unlocked!"); }
          if (newRep >= 80 && !newUnlockedVehicles.includes("stock_car")) { newUnlockedVehicles.push("stock_car"); newUnlockEvents.push("Stock Car Blueprint Unlocked!"); }

          // Unlock go-kart after winning backyard derby
          if (outcome.result === "win" && s.selectedCircuitId === "backyard_derby" && !newUnlockedVehicles.includes("go_kart")) {
            newUnlockedVehicles.push("go_kart");
            newUnlockEvents.push("Go-Kart Blueprint Unlocked!");
          }

          // Auto-unlock notifications
          if (!s.autoScavengeUnlocked && newRep >= 8) newUnlockEvents.push("Auto-Scavenge Enabled! Parts collect themselves now.");
          if (!s.autoRaceUnlocked && newRep >= 15) newUnlockEvents.push("Auto-Race Enabled! Your scrap heap races itself!");

          // Win streak
          const newStreak = outcome.result === "win" ? s.winStreak + 1 : 0;
          const newBestStreak = Math.max(s.bestWinStreak, newStreak);
          if (newStreak === 3) newUnlockEvents.push("3-Win Streak! You're on fire!");
          if (newStreak === 5) newUnlockEvents.push("5 WINS! Unstoppable!");
          if (newStreak === 10) newUnlockEvents.push("10 WINS! LEGENDARY!");

          // Apply vehicle wear
          const wearReduction = _getUpgradeEffectValue(s, "reinforced_chassis");
          const activeV = s.garage.find((v) => v.id === s.activeVehicleId);
          const wearAmount = activeV ? calculateWear(activeV, outcome.result, wearReduction) : 0;
          const handlingBonus = _getUpgradeEffectValue(s, "tuned_suspension");
          const updatedGarage = s.garage.map((v) => {
            if (v.id !== s.activeVehicleId) return v;
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
            autoRaceUnlocked: s.autoRaceUnlocked || newRep >= 15,
            autoScavengeUnlocked: s.autoScavengeUnlocked || newRep >= 8,
            raceEvents: [],
            raceStartTime: null,
            precomputedOutcome: null,
            winStreak: newStreak,
            bestWinStreak: newBestStreak,
            unlockEvents: newUnlockEvents,
            garage: updatedGarage,
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
      const cost = calculateRepairCost(vehicleDef, vehicle.condition ?? 100, 100, reduction);
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

    swapPart: (vehicleId: string, slot: "engine" | "wheel" | "frame" | "fuel", newPart: ScavengedPart) => {
      const state = get() as GameState;
      if (_getUpgradeLevel(state, "toolkit") < 1) return;
      const vehicle = state.garage.find((v) => v.id === vehicleId);
      if (!vehicle) return;

      const oldPart = vehicle.parts[slot];
      const noDegrade = _getUpgradeLevel(state, "gentle_swap") >= 1;
      const returnedPart: ScavengedPart = noDegrade ? oldPart : {
        ...oldPart,
        condition: degradeCondition(oldPart.condition as PartCondition),
      };

      const vehicleDef = getVehicleById(vehicle.definitionId);
      if (!vehicleDef) return;
      if (!vehicleDef.requiredParts[slot].includes(newPart.definitionId)) return;

      const newParts = { ...vehicle.parts, [slot]: newPart };
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
            if (vehicleWear) {
              const vDef = getVehicleById(v.definitionId);
              return {
                ...v,
                condition: newCond,
                totalRaces: (v.totalRaces ?? 0) + 1,
                stats: vDef ? calculateStats(vDef, v.parts, newCond, handlingBonus) : v.stats,
              };
            }
            return { ...v, condition: newCond };
          });
        }
        return {
          inventory: [...s.inventory, ...partsFound],
          scrapBucks: s.scrapBucks + scrapsEarned,
          lifetimeScrapBucks: s.lifetimeScrapBucks + scrapsEarned,
          repPoints: s.repPoints + repEarned,
          garage: updatedGarage,
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
        unlockedLocationIds: state.unlockedLocationIds,
        unlockedCircuitIds: state.unlockedCircuitIds,
        unlockedVehicleIds: state.unlockedVehicleIds,
        _vehicleIdCounter: state._vehicleIdCounter,
        raceHistory: state.raceHistory,
        winStreak: state.winStreak,
        bestWinStreak: state.bestWinStreak,
        workshopLevels: state.workshopLevels,
        pendingBuildVehicleId: state.pendingBuildVehicleId,
      }),
    },
  ),
);
