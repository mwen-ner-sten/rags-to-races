import { describe, expect, it } from "vitest";
import { createInitialState, getEffectiveVehicleHandlingBonus, useGameStore } from "@/state/store";
import type { GameState } from "@/state/store";
import { getPersistedGameState, mergePersistedGameState } from "@/state/persistence";
import { calculateStats } from "@/engine/build";
import { getVehicleById } from "@/data/vehicles";
import {
  SAVE_FORMAT,
  SAVE_VERSION,
  createSaveEnvelope,
  decodeSavePayload,
} from "../saveLoad";

describe("save envelope", () => {
  it("accounts for every store field, excluding only deliberate race-animation transients", () => {
    const state = createInitialState();
    const persistedKeys = new Set(Object.keys(getPersistedGameState(state as GameState)));
    const transientKeys = new Set([
      "isScavenging",
      "isRacing",
      "activeRaceSessionId",
      "lastRaceOutcome",
      "raceEvents",
      "raceStartTime",
      "precomputedOutcome",
      "unlockEvents",
    ]);

    expect(Object.keys(state).filter((key) => !persistedKeys.has(key))).toEqual(
      expect.arrayContaining([...transientKeys]),
    );
    expect(Object.keys(state).filter((key) => !persistedKeys.has(key))).toHaveLength(transientKeys.size);
  });

  it("round-trips the complete canonical persisted state", () => {
    const state = createInitialState();
    const envelope = createSaveEnvelope("Round trip", {
      ...state,
      scrapBucks: 1234,
      legacyPoints: 9,
      lifetimeLPThisTeamEra: 9,
      teamPoints: 4,
      lifetimeTPThisOwnerEra: 4,
      unlockedFeatures: ["team"],
      raceHistory: [{
        result: "loss" as const,
        position: 4,
        totalRacers: 8,
        scrapsEarned: 12,
        repEarned: 2,
        log: ["Saved result"],
        vehicleId: "persisted-race-vehicle",
        circuitId: "backyard_derby",
        engineeringReport: {
          headline: "Stored diagnosis",
          focus: "grip" as const,
          priority: "component" as const,
          component: "Basic Tire",
          slot: "wheel" as const,
          observation: "Stored observation",
          action: "Stored action",
        },
      }],
    });

    const decoded = decodeSavePayload(JSON.stringify(envelope));

    expect(decoded.envelope.state).toEqual(envelope.state);
    expect(decoded.envelope.state.raceHistory?.[0]?.vehicleId).toBe("persisted-race-vehicle");
    expect(decoded.envelope.state.raceHistory?.[0]?.engineeringReport?.slot).toBe("wheel");
    expect(decoded.envelope.state).toEqual(
      getPersistedGameState({
        ...state,
        scrapBucks: 1234,
        legacyPoints: 9,
        lifetimeLPThisTeamEra: 9,
        teamPoints: 4,
        lifetimeTPThisOwnerEra: 4,
        unlockedFeatures: ["team"],
        raceHistory: [{
          result: "loss" as const,
          position: 4,
          totalRacers: 8,
          scrapsEarned: 12,
          repEarned: 2,
          log: ["Saved result"],
          vehicleId: "persisted-race-vehicle",
          circuitId: "backyard_derby",
          engineeringReport: {
            headline: "Stored diagnosis",
            focus: "grip" as const,
            priority: "component" as const,
            component: "Basic Tire",
            slot: "wheel" as const,
            observation: "Stored observation",
            action: "Stored action",
          },
        }],
      } as GameState),
    );
  });

  it.each(["__proto__", "constructor", "unknown"])(
    "rejects a persisted engineering report with unsafe slot %s",
    (slot) => {
      const state = createInitialState();
      const envelope = createSaveEnvelope("Unsafe diagnosis", {
        ...state,
        raceHistory: [{
          result: "loss" as const,
          position: 4,
          totalRacers: 8,
          scrapsEarned: 12,
          repEarned: 2,
          log: ["Saved result"],
          vehicleId: "persisted-race-vehicle",
          circuitId: "backyard_derby",
          engineeringReport: {
            headline: "Stored diagnosis",
            focus: "grip" as const,
            priority: "component" as const,
            slot: slot as "wheel",
            observation: "Stored observation",
            action: "Stored action",
          },
        }],
      });

      expect(() => decodeSavePayload(JSON.stringify(envelope))).toThrow("Invalid persisted game state");
    },
  );

  it.each([
    ["an empty vehicle ID", ""],
    ["an object vehicle ID", { malformed: true }],
    ["an overlong vehicle ID", "v".repeat(201)],
  ])("rejects %s while legacy race outcomes may omit vehicleId", (_label, vehicleId) => {
    const state = createInitialState();
    const outcome = {
      result: "loss" as const,
      position: 4,
      totalRacers: 8,
      scrapsEarned: 12,
      repEarned: 2,
      log: ["Saved result"],
      circuitId: "backyard_derby",
    };
    const legacyEnvelope = createSaveEnvelope("Legacy outcome", { ...state, raceHistory: [outcome] });
    expect(() => decodeSavePayload(JSON.stringify(legacyEnvelope))).not.toThrow();

    const malformedEnvelope = createSaveEnvelope("Malformed provenance", {
      ...state,
      raceHistory: [{ ...outcome, vehicleId: vehicleId as never }],
    });
    expect(() => decodeSavePayload(JSON.stringify(malformedEnvelope))).toThrow("Invalid persisted game state");
  });

  it("migrates a legacy manual export without inventing missing run state", () => {
    const decoded = decodeSavePayload(
      JSON.stringify({
        version: "1.0",
        exportedAt: 100,
        label: "Old export",
        state: {
          scrapBucks: 50,
          repPoints: 8,
          inventory: [],
          garage: [],
        },
      }),
    );

    expect(decoded.sourceVersion).toBe(1);
    expect(decoded.envelope.format).toBe(SAVE_FORMAT);
    expect(decoded.envelope.version).toBe(SAVE_VERSION);
    expect(decoded.envelope.state.scrapBucks).toBe(50);
    expect(decoded.envelope.state.teamPoints).toBeUndefined();
  });

  it("migrates the original version-zero browser save", () => {
    const decoded = decodeSavePayload(
      JSON.stringify({ state: { prestigeCount: 3, scrapBucks: 10 }, version: 0 }),
    );

    expect(decoded.envelope.state.legacyPoints).toBe(9);
    expect(decoded.envelope.state.lifetimeLegacyPoints).toBe(9);
    expect(decoded.envelope.state.currentEra).toBe(1);
  });

  it("backfills missing era earnings from balances without lowering recorded earnings", () => {
    const initial = createInitialState() as GameState;
    const backfilled = mergePersistedGameState({
      legacyPoints: 75,
      teamPoints: 30,
      ownerPoints: 12,
    }, initial);

    expect(backfilled.lifetimeLPThisTeamEra).toBe(75);
    expect(backfilled.lifetimeTPThisOwnerEra).toBe(30);
    expect(backfilled.lifetimeOPThisTrackEra).toBe(12);

    const preserved = mergePersistedGameState({
      legacyPoints: 10,
      lifetimeLPThisTeamEra: 80,
      teamPoints: 5,
      lifetimeTPThisOwnerEra: 40,
      ownerPoints: 2,
      lifetimeOPThisTrackEra: 20,
    }, initial);

    expect(preserved.lifetimeLPThisTeamEra).toBe(80);
    expect(preserved.lifetimeTPThisOwnerEra).toBe(40);
    expect(preserved.lifetimeOPThisTrackEra).toBe(20);
  });

  it("refunds legacy talents into Garage Philosophy LP during version-three migration", () => {
    const decoded = decodeSavePayload(JSON.stringify({
      state: { legacyPoints: 2, unlockedTalentNodes: ["racer_t1_rev", "racer_t2_smooth"] },
      version: 2,
    }));

    expect(decoded.envelope.state.legacyPoints).toBe(25);
    expect(decoded.envelope.state.unlockedTalentNodes).toEqual([]);
    expect(decoded.envelope.state.vehicleLoadouts).toEqual([]);
  });

  it("reconciles structured vehicle unlocks in an existing current-version save", () => {
    const backyardWins = Array.from({ length: 5 }, () => ({
      result: "win" as const,
      position: 1,
      totalRacers: 8,
      scrapsEarned: 10,
      repEarned: 1,
      log: [],
      circuitId: "backyard_derby",
    }));
    const decoded = decodeSavePayload(JSON.stringify({
      format: SAVE_FORMAT,
      version: SAVE_VERSION,
      build: "pre-reconciliation-v3",
      exportedAt: 100,
      label: "Stale vehicle unlocks",
      state: {
        repPoints: 100_000,
        unlockedVehicleIds: ["push_mower"],
        ownerUpgradeLevels: { owner_vehicle_mastery: 1 },
        raceHistory: backyardWins,
      },
    }));

    expect(decoded.sourceVersion).toBe(SAVE_VERSION);
    expect(decoded.envelope.state.unlockedVehicleIds).toEqual([
      "push_mower",
      "hypercar",
      "prototype_x",
      "riding_mower",
      "go_kart",
      "beater_car",
      "street_racer",
      "stock_car",
      "supercar",
    ]);

    const hydrated = mergePersistedGameState(
      {
        repPoints: 100_000,
        unlockedVehicleIds: ["push_mower"],
        ownerUpgradeLevels: { owner_vehicle_mastery: 1 },
        raceHistory: backyardWins,
      },
      createInitialState() as GameState,
    );
    expect(hydrated.unlockedVehicleIds).toEqual(decoded.envelope.state.unlockedVehicleIds);

    const staleAfterTrackReset = mergePersistedGameState(
      {
        unlockedFeatures: ["crew_system", "vehicle_mastery", "advanced_circuits"],
        unlockedVehicleIds: ["push_mower", "hypercar", "prototype_x"],
        unlockedCircuitIds: ["backyard_derby", "continental_grand_prix", "endurance_series"],
        ownerUpgradeLevels: {},
      },
      createInitialState() as GameState,
    );
    expect(staleAfterTrackReset.unlockedFeatures).toEqual(["crew_system"]);
    expect(staleAfterTrackReset.unlockedVehicleIds).toEqual(["push_mower"]);
    expect(staleAfterTrackReset.unlockedCircuitIds).toEqual(["backyard_derby"]);
  });

  it("maps legacy outfit slots to stations and salvages unmappable effects", () => {
    const decoded = decodeSavePayload(JSON.stringify({ state: {
      materials: { metalScrap: 2 },
      lootGearInventory: [{ id: "old-head", slot: "head", rarity: "rare", name: "Old Visor", enhancementLevel: 4, source: "old", effects: [{ type: "race_dnf_reduction", value: 0.03 }, { type: "obsolete_magic", value: 1 }] }],
      equippedLootGear: { head: "old-head" },
      ownedGearIds: [],
      legacyPoints: 0,
    }, version: 2 }));

    expect(decoded.envelope.state.stationEquipmentInventory?.[0]).toMatchObject({ id: "old-head", slot: "diagnostics", rarity: "rare", enhancementLevel: 4 });
    expect(decoded.envelope.state.equippedStationEquipment?.diagnostics).toBe("old-head");
    expect(decoded.envelope.state.materials?.metalScrap).toBe(6);
  });

  it("rejects corrupt state before it can be loaded", () => {
    expect(() =>
      decodeSavePayload(
        JSON.stringify({
          format: SAVE_FORMAT,
          version: SAVE_VERSION,
          build: "test",
          exportedAt: Date.now(),
          label: "Corrupt",
          state: { scrapBucks: -1 },
        }),
      ),
    ).toThrow("Invalid persisted game state");
  });

  it.each([
    ["null garage entries", { garage: [null] }],
    ["negative material balances", { materials: { metalScrap: -1 } }],
    ["non-numeric fatigue", { fatigue: "broken" }],
    ["null vehicle loadouts", { vehicleLoadouts: [null] }],
    ["malformed inventory entries", { inventory: [{ id: 7 }] }],
    ["null race-history entries", { raceHistory: [null] }],
    ["null station-equipment entries", { stationEquipmentInventory: [null] }],
    ["a null station-equipment map", { equippedStationEquipment: null }],
    ["null Fleet assignments", { fleetAssignments: [null] }],
    ["null hosted events", { hostedEvents: [null] }],
    ["null activity entries", { activityLog: [null] }],
    ["malformed racer skills", { racerSkills: { driving: null } }],
    ["malformed racer attributes", { racerAttributes: { reflexes: "bad" } }],
    ["null loot-gear entries", { lootGearInventory: [null] }],
    ["a null equipped-loot map", { equippedLootGear: null }],
    ["null gear mods", { gearModInventory: [null] }],
    ["a null momentum list", { activeMomentumTiers: null }],
    ["a null playstyle list", { unlockedPlaystyleNodes: null }],
    ["a null tutorial-skip list", { tutorialSkippedSteps: null }],
  ])("rejects %s in a current save envelope", (_label, corruptState) => {
    expect(() => decodeSavePayload(JSON.stringify({
      format: SAVE_FORMAT,
      version: SAVE_VERSION,
      build: "test",
      exportedAt: Date.now(),
      label: "Corrupt nested state",
      state: corruptState,
    }))).toThrow("Invalid persisted game state");
  });

  it("rejects malformed nested state in a raw Zustand payload", () => {
    expect(() => decodeSavePayload(JSON.stringify({
      version: SAVE_VERSION,
      state: { garage: [null] },
    }))).toThrow("not a recognized Rags to Races save");
  });

  it("falls back to the live initial state when browser hydration is corrupt", () => {
    const initial = createInitialState() as GameState;
    const hydrated = mergePersistedGameState(
      {
        garage: [null],
        materials: { metalScrap: -10 },
        fatigue: "broken",
        vehicleLoadouts: [null],
        raceHistory: [{
          result: "loss",
          position: 4,
          totalRacers: 8,
          scrapsEarned: 12,
          repEarned: 2,
          log: ["Malformed provenance"],
          circuitId: "backyard_derby",
          vehicleId: { malformed: true },
        }],
      },
      initial,
    );

    expect(hydrated).toBe(initial);
    expect(hydrated.garage).toEqual([]);
    expect(hydrated.materials.metalScrap).toBe(0);
    expect(hydrated.fatigue).toBe(0);
  });

  it("hydrates vehicle stats from parts and active handling modifiers instead of stale persisted stats", () => {
    const initial = createInitialState() as GameState;
    const mower = getVehicleById("push_mower")!;
    const parts = {
      engine: { part: { id: "engine", definitionId: "engine_small", condition: "good" as const, foundAt: "test", type: "part" as const }, addons: [] },
      wheel: { part: { id: "wheel", definitionId: "wheel_basic", condition: "good" as const, foundAt: "test", type: "part" as const }, addons: [] },
    };
    const hydrated = mergePersistedGameState({
      workshopLevels: { tuned_suspension: 2 },
      garage: [{
        id: "hydrated-mower",
        definitionId: mower.id,
        parts,
        stats: { speed: 0, handling: 0, reliability: 0, weight: 0, performance: 0 },
        builtAt: 1,
        condition: 100,
        totalRaces: 0,
      }],
    }, initial);

    expect(hydrated.garage[0].stats).toEqual(
      calculateStats(mower, parts, 100, getEffectiveVehicleHandlingBonus(hydrated)),
    );
  });

  it("strips action-name injection before an import or browser merge can replace live actions", () => {
    const decoded = decodeSavePayload(JSON.stringify({
      format: SAVE_FORMAT,
      version: SAVE_VERSION,
      build: "test",
      exportedAt: Date.now(),
      label: "Injected actions",
      state: {
        scrapBucks: 10,
        manualScavenge: null,
        prestige: "broken",
      },
    }));

    expect(decoded.envelope.state).not.toHaveProperty("manualScavenge");
    expect(decoded.envelope.state).not.toHaveProperty("prestige");

    const live = useGameStore.getState();
    const hydrated = mergePersistedGameState(
      {
        scrapBucks: 10,
        manualScavenge: null,
        prestige: "broken",
      },
      live,
    );
    expect(hydrated.manualScavenge).toBe(live.manualScavenge);
    expect(hydrated.prestige).toBe(live.prestige);
    expect(() => hydrated.manualScavenge()).not.toThrow();
  });

  it("normalizes safe legacy part defaults and fills newly added materials", () => {
    const decoded = decodeSavePayload(JSON.stringify({
      version: "1.0",
      exportedAt: 100,
      state: {
        inventory: [{
          id: "legacy-engine",
          definitionId: "engine_small",
          condition: "worn",
        }],
        garage: [],
        materials: { metalScrap: 2 },
      },
    }));

    expect(decoded.envelope.state.inventory?.[0]).toMatchObject({
      id: "legacy-engine",
      foundAt: "legacy_save",
      type: "part",
    });
    expect(decoded.envelope.state.materials).toEqual({
      metalScrap: 2,
      rubberCompound: 0,
      heatCore: 0,
      circuitFragment: 0,
      carbonDust: 0,
      greaseSludge: 0,
    });
  });

  it("refuses saves from a newer schema", () => {
    expect(() =>
      decodeSavePayload(
        JSON.stringify({
          format: SAVE_FORMAT,
          version: SAVE_VERSION + 1,
          build: "future",
          exportedAt: Date.now(),
          label: "Future",
          state: {},
        }),
      ),
    ).toThrow(`supports up to ${SAVE_VERSION}`);
  });
});
