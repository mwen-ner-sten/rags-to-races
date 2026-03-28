"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ScavengedPart } from "@/engine/scavenge";
import type { BuiltVehicle } from "@/engine/build";
import type { RaceOutcome } from "@/engine/race";
import type { PrestigeBonus } from "@/engine/prestige";
import { calculatePrestigeBonus, doPrestige } from "@/engine/prestige";
import { scavenge } from "@/engine/scavenge";
import { buildVehicle } from "@/engine/build";
import { simulateRace } from "@/engine/race";
import { getLocationById } from "@/data/locations";
import { getCircuitById } from "@/data/circuits";
import { getVehicleById } from "@/data/vehicles";

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
  unlockLocation: (locationId: string) => void;
  unlockCircuit: (circuitId: string) => void;
  prestige: () => void;
  applyTickResult: (partsFound: ScavengedPart[], scrapsEarned: number, repEarned: number) => void;

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
    pendingBuildParts: { engine: null, wheel: null, frame: null, fuel: null },
    pendingBuildVehicleId: "push_mower",
    unlockedLocationIds: ["curbside"],
    unlockedCircuitIds: ["backyard_derby"],
    unlockedVehicleIds: ["push_mower"],
    _vehicleIdCounter: 0,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createActions(set: any, get: any) {
  return {
    manualScavenge: () => {
      const state = get() as GameState;
      const location = getLocationById(state.selectedLocationId);
      if (!location) return;
      const parts = scavenge(location, state.prestigeBonus.luckBonus);
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

      if (state.scrapBucks < vehicleDef.buildCost) return;

      const usedPartIds = new Set([engine.id, wheel.id, frame.id, fuel.id]);
      const built = buildVehicle(vehicleDef, { engine, wheel, frame, fuel }, _vehicleIdCounter);

      set((s: GameState) => ({
        garage: [...s.garage, built],
        inventory: s.inventory.filter((p) => !usedPartIds.has(p.id)),
        scrapBucks: s.scrapBucks - vehicleDef.buildCost,
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

      set({ isRacing: true, scrapBucks: state.scrapBucks - circuit.entryFee });

      setTimeout(() => {
        const outcome = simulateRace(vehicle, circuit, get().prestigeBonus.scrapMultiplier);
        set((s: GameState) => {
          const newRep = s.repPoints + outcome.repEarned;
          const newUnlockedCircuits = [...s.unlockedCircuitIds];
          const newUnlockedLocations = [...s.unlockedLocationIds];
          const newUnlockedVehicles = [...s.unlockedVehicleIds];

          // Unlock circuits by rep
          if (newRep >= 10 && !newUnlockedCircuits.includes("dirt_track")) newUnlockedCircuits.push("dirt_track");
          if (newRep >= 30 && !newUnlockedCircuits.includes("regional_circuit")) newUnlockedCircuits.push("regional_circuit");
          if (newRep >= 80 && !newUnlockedCircuits.includes("national_circuit")) newUnlockedCircuits.push("national_circuit");
          if (newRep >= 200 && !newUnlockedCircuits.includes("world_championship")) newUnlockedCircuits.push("world_championship");

          // Unlock locations by rep
          if (newRep >= 5 && !newUnlockedLocations.includes("neighborhood_yards")) newUnlockedLocations.push("neighborhood_yards");
          if (newRep >= 20 && !newUnlockedLocations.includes("local_junkyard")) newUnlockedLocations.push("local_junkyard");
          if (newRep >= 60 && !newUnlockedLocations.includes("salvage_auction")) newUnlockedLocations.push("salvage_auction");
          if (newRep >= 150 && !newUnlockedLocations.includes("industrial_surplus")) newUnlockedLocations.push("industrial_surplus");
          if (newRep >= 400 && !newUnlockedLocations.includes("military_scrapyard")) newUnlockedLocations.push("military_scrapyard");

          // Unlock vehicles by rep
          if (newRep >= 5 && !newUnlockedVehicles.includes("beater_car")) newUnlockedVehicles.push("beater_car");
          if (newRep >= 20 && !newUnlockedVehicles.includes("street_racer")) newUnlockedVehicles.push("street_racer");
          if (newRep >= 80 && !newUnlockedVehicles.includes("stock_car")) newUnlockedVehicles.push("stock_car");

          // Unlock go-kart after winning backyard derby
          if (outcome.result === "win" && s.selectedCircuitId === "backyard_derby" && !newUnlockedVehicles.includes("go_kart")) {
            newUnlockedVehicles.push("go_kart");
          }

          return {
            isRacing: false,
            lastRaceOutcome: outcome,
            raceHistory: [outcome, ...s.raceHistory].slice(0, 20),
            scrapBucks: s.scrapBucks + outcome.scrapsEarned,
            lifetimeScrapBucks: s.lifetimeScrapBucks + outcome.scrapsEarned,
            repPoints: newRep,
            unlockedCircuitIds: newUnlockedCircuits,
            unlockedLocationIds: newUnlockedLocations,
            unlockedVehicleIds: newUnlockedVehicles,
            autoRaceUnlocked: s.autoRaceUnlocked || newRep >= 15,
            autoScavengeUnlocked: s.autoScavengeUnlocked || newRep >= 8,
          };
        });
      }, circuit.raceDuration);
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
        unlockedVehicleIds: ["push_mower"],
        unlockedLocationIds: ["curbside"],
        unlockedCircuitIds: ["backyard_derby"],
      });
    },

    applyTickResult: (partsFound: ScavengedPart[], scrapsEarned: number, repEarned: number) => {
      set((s: GameState) => ({
        inventory: [...s.inventory, ...partsFound],
        scrapBucks: s.scrapBucks + scrapsEarned,
        lifetimeScrapBucks: s.lifetimeScrapBucks + scrapsEarned,
        repPoints: s.repPoints + repEarned,
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
        pendingBuildVehicleId: state.pendingBuildVehicleId,
      }),
    },
  ),
);
