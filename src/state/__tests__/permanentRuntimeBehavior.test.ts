import { afterEach, describe, expect, it, vi } from "vitest";
import { ACHIEVEMENTS_BY_ID } from "@/data/achievements";
import { CRAFT_RECIPES } from "@/data/craftRecipes";
import type { RaceOutcome } from "@/engine/race";
import { compactRaceHistory } from "@/engine/race";
import type { BuiltVehicle } from "@/engine/build";
import type { ScavengedPart } from "@/engine/scavenge";
import { scavenge } from "@/engine/scavenge";
import { VEHICLE_DEFINITIONS, getVehicleById } from "@/data/vehicles";
import { PART_DEFINITIONS } from "@/data/parts";
import { LOCATION_DEFINITIONS, getLocationById } from "@/data/locations";
import { FEATURE_UNLOCK_DEFINITIONS } from "@/data/featureUnlocks";
import { migratePersistedState, PERSISTENCE_VERSION } from "../persistence";
import { getActiveMomentumTiers } from "@/data/momentumBonuses";
import { PLAYSTYLE_NODES_BY_ID } from "@/data/playstyleUpgrades";
import { calculateHostedEventTerms } from "@/data/trackVenue";
import { calculateOwnerPoints, calculateTeamPoints } from "@/engine/prestige";
import { getPermanentRuntimeBonuses } from "@/engine/permanentBonuses";
import { SeededRandomSource, withRandomSource } from "@/utils/random";
import {
  createInitialState,
  getDealerPurchasePrice,
  getVehicleBuildCost,
  getVehicleRepairCost,
  useGameStore,
} from "../store";

function part(
  id: string,
  definitionId: string,
  condition: ScavengedPart["condition"],
): ScavengedPart {
  return { id, definitionId, condition, type: "part", foundAt: "test" };
}

function vehicle(id: string, condition = 100): BuiltVehicle {
  return {
    id,
    definitionId: "push_mower",
    parts: {},
    stats: { speed: 10, handling: 10, reliability: 10, weight: 10, performance: 10 },
    builtAt: 1,
    condition,
    totalRaces: 0,
  };
}

function race(circuitId: string, result: RaceOutcome["result"]): RaceOutcome {
  return { circuitId, result, position: result === "win" ? 1 : 8, totalRacers: 8, scrapsEarned: 0, repEarned: 0, log: [] };
}

afterEach(() => {
  vi.useRealTimers();
  useGameStore.setState(createInitialState());
});

describe("Achievement runtime rewards", () => {
  it("applies all-source and sale bonuses to the charged sale outcome and canonical totals", () => {
    useGameStore.setState({
      ...createInitialState(),
      inventory: [part("sale", "engine_v4", "pristine")],
      earnedAchievements: ["ach_scrap_1m", "ach_scrap_10m"],
    });

    useGameStore.getState().sellPart("sale");

    const state = useGameStore.getState();
    expect(state.scrapBucks).toBe(85);
    expect(state.lifetimeScrapBucks).toBe(85);
    expect(state.lifetimeScrapBucksAllTime).toBe(85);
  });

  it("applies the all-source Scrap bonus to gear salvage and canonical totals", () => {
    useGameStore.setState({
      ...createInitialState(),
      earnedAchievements: ["ach_scrap_1m"],
      lootGearInventory: [{
        id: "salvage",
        slot: "head",
        rarity: "common",
        name: "Old Helmet",
        effects: [],
        enhancementLevel: 0,
        modSlots: 0,
        mods: [],
        source: "test",
      }],
    });

    useGameStore.getState().salvageLootGear("salvage");

    expect(useGameStore.getState()).toMatchObject({
      scrapBucks: 18,
      lifetimeScrapBucks: 18,
      lifetimeScrapBucksAllTime: 18,
    });
  });

  it("awards the Legendary challenge Scrap/Forge reward through every canonical counter", () => {
    useGameStore.setState({
      ...createInitialState(),
      workshopLevels: { tuning_bench: 1 },
      inventory: [part("legendary", "engine_v4", "polished")],
      materials: Object.fromEntries(Object.keys(createInitialState().materials).map((key) => [key, 1_000])) as ReturnType<typeof createInitialState>["materials"],
      completedChallenges: ["first_enhance"],
      highestConditionReached: 5,
    });

    useGameStore.getState().enhancePart("legendary");

    const state = useGameStore.getState();
    expect(state.completedChallenges).toContain("first_legendary");
    expect(state.scrapBucks).toBe(300);
    expect(state.lifetimeScrapBucks).toBe(300);
    expect(state.lifetimeScrapBucksAllTime).toBe(300);
    expect(state.forgeTokens).toBe(1);
    expect(state.totalForgeTokensEarned).toBe(1);
    expect(state.unlockEvents.some((event) => event.includes("Beyond the Blueprint"))).toBe(true);
    expect(state.activityLog.some((entry) => entry.message.includes("Challenge complete"))).toBe(true);
  });

  it("derives All-Terrain from the released vehicle catalog", () => {
    expect(ACHIEVEMENTS_BY_ID.ach_all_types.target).toBe(VEHICLE_DEFINITIONS.length);
  });
});

describe("Garage Philosophy and Crew behavior", () => {
  it("changes real build and repair quotes and grants Mechanic XP on repair", () => {
    const mower = getVehicleById("push_mower")!;
    const damaged = vehicle("damaged", 50);
    const mechanic = { id: "m", name: "Mara", role: "mechanic" as const, level: 5, xp: 0, specialization: "tuner" as const };
    const baseline = {
      ...createInitialState(),
      garage: [damaged],
      scrapBucks: 1_000,
    };
    const boosted = {
      ...baseline,
      earnedAchievements: ["ach_all_types"],
      unlockedPlaystyleNodes: ["ps_eng_t1"],
      crewRoster: [mechanic],
    };
    expect(getVehicleBuildCost(boosted as ReturnType<typeof useGameStore.getState>, mower)).toBeLessThan(getVehicleBuildCost(baseline as ReturnType<typeof useGameStore.getState>, mower));
    const quotedRepair = getVehicleRepairCost(boosted as ReturnType<typeof useGameStore.getState>, damaged);
    expect(quotedRepair).toBeLessThan(getVehicleRepairCost(baseline as ReturnType<typeof useGameStore.getState>, damaged));

    useGameStore.setState(boosted);
    useGameStore.getState().repairVehicle("damaged");
    expect(useGameStore.getState().scrapBucks).toBe(1_000 - quotedRepair);
    expect(useGameStore.getState().crewRoster[0].xp).toBe(5);
  });

  it("reduces actual craft costs and increases actual decomposition yield", () => {
    const recipe = CRAFT_RECIPES.find((candidate) => candidate.category === "engine" && candidate.resultCondition === "decent")!;
    useGameStore.setState({
      ...createInitialState(),
      workshopLevels: { parts_bin: 1 },
      unlockedPlaystyleNodes: ["ps_eng_t3b"],
      materials: { ...createInitialState().materials, heatCore: 10, metalScrap: 5, greaseSludge: 5 },
    });
    useGameStore.getState().craftPart(recipe);
    expect(useGameStore.getState().materials).toMatchObject({ heatCore: 4, metalScrap: 2, greaseSludge: 2 });

    const decomposeInput = part("decompose", "engine_v4", "pristine");
    const run = (nodes: string[]) => {
      useGameStore.setState({
        ...createInitialState(),
        inventory: [decomposeInput],
        unlockedPlaystyleNodes: nodes,
        completedChallenges: ["first_decompose"],
      });
      useGameStore.getState().decomposePart("decompose");
      return useGameStore.getState().materials.heatCore;
    };
    expect(run(["ps_eng_t2b"])).toBeGreaterThan(run([]));
  });

  it("applies the Racer momentum-threshold reduction to activation behavior", () => {
    expect(getActiveMomentumTiers(23, 0, 0, 0, 0)).not.toContain("momentum_warmed_up");
    expect(getActiveMomentumTiers(23, 0, 0, 0, 0, 0.25)).toContain("momentum_warmed_up");
  });

  it("applies Adrenaline Rush to both reward channels for every race", () => {
    const bonus = getPermanentRuntimeBonuses({ unlockedPlaystyleNodes: ["ps_speed_t2a"] });
    expect(bonus).toMatchObject({ raceScrapMult: 0.25, raceRepMult: 0.25 });
    expect(PLAYSTYLE_NODES_BY_ID.ps_speed_t2a.description).toContain("every race");
  });

  it("charges the discounted Dealer price and grants Trader XP", () => {
    const trader = { id: "t", name: "Ledger", role: "trader" as const, level: 10, xp: 0, specialization: "negotiator" as const };
    const listing = { id: "listing", definitionId: "engine_small", condition: "decent" as const, price: 100, expiresAt: 100 };
    useGameStore.setState({
      ...createInitialState(),
      repPoints: 8_000,
      scrapBucks: 100,
      crewRoster: [trader],
      dealerBoard: [listing],
    });
    expect(getDealerPurchasePrice(useGameStore.getState(), listing)).toBe(85);
    useGameStore.getState().buyFromDealer("listing");
    expect(useGameStore.getState().scrapBucks).toBe(15);
    expect(useGameStore.getState().crewRoster[0].xp).toBe(1);
  });

  it("preserves fractional Crew Training gains on one-XP actions", () => {
    const trader = { id: "t", name: "Ledger", role: "trader" as const, level: 1, xp: 0, specialization: null };
    const listing = { id: "listing", definitionId: "engine_small", condition: "decent" as const, price: 1, expiresAt: 100 };
    useGameStore.setState({
      ...createInitialState(),
      repPoints: 8_000,
      scrapBucks: 10,
      teamUpgradeLevels: { team_crew_xp: 1 },
      crewRoster: [trader],
      dealerBoard: [listing],
    });

    useGameStore.getState().buyFromDealer("listing");

    expect(useGameStore.getState().crewRoster[0].xp).toBeCloseTo(1.2);
  });

  it("updates Crew Quarters immediately and validates specialization roles", () => {
    useGameStore.setState({ ...createInitialState(), teamPoints: 100, teamEraCount: 1, crewSlots: 1 });
    useGameStore.getState().purchaseTeamUpgrade("team_crew_slots");
    expect(useGameStore.getState().crewSlots).toBe(2);

    const mechanic = { id: "m", name: "Mara", role: "mechanic" as const, level: 5, xp: 1_000, specialization: null };
    useGameStore.setState({ ...useGameStore.getState(), crewRoster: [mechanic] });
    useGameStore.getState().specializeCrewMember("m", "speed_demon");
    expect(useGameStore.getState().crewRoster[0].specialization).toBeNull();
    useGameStore.getState().specializeCrewMember("m", "tuner");
    expect(useGameStore.getState().crewRoster[0].specialization).toBe("tuner");
  });

  it("Talent Academy preserves recruits and fills missing roles at Crew Legends level", () => {
    const existing = { id: "existing", name: "Mara", role: "mechanic" as const, level: 5, xp: 1_000, specialization: "tuner" as const };
    useGameStore.setState({
      ...createInitialState(),
      trackPrestigeTokens: 100,
      trackEraCount: 1,
      crewRoster: [existing],
      crewSlots: 1,
      ownerUpgradeLevels: { owner_crew_legends: 1 },
    });
    useGameStore.getState().purchaseTrackPerk("track_academy");
    const state = useGameStore.getState();
    expect(state.crewSlots).toBe(4);
    expect(state.crewRoster).toHaveLength(4);
    expect(state.crewRoster.find((member) => member.id === "existing")).toEqual(existing);
    expect(state.crewRoster.filter((member) => member.id !== "existing").every((member) => member.level === 3)).toBe(true);
  });
});

describe("released Team, Owner, and Track effects", () => {
  it("enforces circuit tier and condition eligibility for Fleet Programs", () => {
    const fleetVehicle = vehicle("fleet");
    useGameStore.setState({
      ...createInitialState(),
      teamEraCount: 1,
      garage: [fleetVehicle],
      raceHistory: [race("endurance_series", "win")],
    });
    useGameStore.getState().startFleetAssignment("fleet", "endurance_series");
    expect(useGameStore.getState().fleetAssignments).toHaveLength(0);

    useGameStore.setState({
      ...useGameStore.getState(),
      garage: [{ ...fleetVehicle, condition: 0 }],
      raceHistory: [race("backyard_derby", "win")],
    });
    useGameStore.getState().startFleetAssignment("fleet", "backyard_derby");
    expect(useGameStore.getState().fleetAssignments).toHaveLength(0);
  });

  it("locks running and completed Fleet vehicles until rewards are collected", () => {
    useGameStore.setState({
      ...createInitialState(),
      teamEraCount: 1,
      garage: [vehicle("focus"), vehicle("fleet")],
      activeVehicleId: "focus",
      raceHistory: [race("backyard_derby", "win")],
    });
    useGameStore.getState().startFleetAssignment("fleet", "backyard_derby");
    expect(useGameStore.getState().fleetAssignments).toHaveLength(1);

    useGameStore.getState().setActiveVehicle("fleet");
    useGameStore.getState().sellVehicle("fleet");
    expect(useGameStore.getState().activeVehicleId).toBe("focus");
    expect(useGameStore.getState().garage.map((candidate) => candidate.id)).toContain("fleet");

    useGameStore.getState().advanceFleetAssignments(100);
    expect(useGameStore.getState().fleetAssignments[0].status).toBe("complete");
    useGameStore.getState().sellVehicle("fleet");
    expect(useGameStore.getState().garage.map((candidate) => candidate.id)).toContain("fleet");

    useGameStore.getState().collectFleetAssignment(useGameStore.getState().fleetAssignments[0].id);
    useGameStore.getState().setActiveVehicle("fleet");
    expect(useGameStore.getState().activeVehicleId).toBe("fleet");
  });

  it("makes every required pre-Owner vehicle part obtainable and behaviorally sources T7 parts at Military Scrapyard", () => {
    const highestSourceTier = Math.max(...LOCATION_DEFINITIONS.map((location) => location.maxPartTier ?? location.tier));
    for (const definition of VEHICLE_DEFINITIONS.filter((vehicleDefinition) => !vehicleDefinition.requiredFeature)) {
      for (const slot of definition.slots.filter((candidate) => candidate.required)) {
        expect(
          slot.acceptableParts.some((partId) => {
            const definition = PART_DEFINITIONS.find((candidate) => candidate.id === partId);
            return definition != null && definition.minTier <= highestSourceTier;
          }),
          `${definition.name} ${slot.slot} should have an obtainable part`,
        ).toBe(true);
      }
    }

    const military = getLocationById("military_scrapyard")!;
    const found = withRandomSource(new SeededRandomSource("military-t7-source"), () => {
      const ids = new Set<string>();
      for (let index = 0; index < 500; index++) {
        for (const item of scavenge(military, 0, 0, 0, 0, 1)) ids.add(item.definitionId);
      }
      return ids;
    });
    for (const id of ["drive_dualclutch", "exhaust_titanium", "susp_active", "aero_carbon"]) {
      expect(found.has(id), `Military Scrapyard should source ${id}`).toBe(true);
    }
  });

  it("Owner purchases unlock their concrete circuits and Material Synthesis action", () => {
    useGameStore.setState({ ...createInitialState(), ownerPoints: 100, scrapBucks: 100, earnedAchievements: ["ach_decompose_500"] });
    useGameStore.getState().purchaseOwnerUpgrade("owner_adv_circuits");
    expect(useGameStore.getState().unlockedCircuitIds).toEqual(expect.arrayContaining(["continental_grand_prix", "endurance_series"]));
    useGameStore.getState().purchaseOwnerUpgrade("owner_mat_synth");
    useGameStore.getState().convertScrapToMaterial("carbonDust");
    expect(useGameStore.getState().scrapBucks).toBe(0);
    expect(useGameStore.getState().materials.carbonDust).toBe(11);
  });

  it("preserves purchased Advanced Circuits through a Scrap Reset", () => {
    useGameStore.setState({
      ...createInitialState(),
      garage: [vehicle("one"), vehicle("two"), vehicle("three")],
      repPoints: 750,
      lifetimeScrapBucks: 20_000,
      ownerUpgradeLevels: { owner_adv_circuits: 1 },
      unlockedFeatures: ["advanced_circuits"],
      unlockedCircuitIds: ["backyard_derby", "continental_grand_prix", "endurance_series"],
    });

    useGameStore.getState().prestige();

    expect(useGameStore.getState().unlockedCircuitIds).toEqual(
      expect.arrayContaining(["continental_grand_prix", "endurance_series"]),
    );
  });

  it("reapplies retained starting effects and Cascade immediately across higher resets", () => {
    const retained = {
      earnedAchievements: ["ach_vehicles_50", "ach_lp_100"],
      ownerUpgradeLevels: {
        owner_born_rich: 2,
        owner_auto_all: 1,
        owner_crew_legends: 1,
        owner_adv_circuits: 1,
      },
      trackPerkLevels: { track_academy: 1, track_cascade: 1 },
    };
    const teamStats = { lifetimeLPThisTeamEra: 500, teamEraCount: 1, unspentLP: 10 };
    useGameStore.setState({
      ...createInitialState(),
      ...retained,
      ...teamStats,
      legacyPoints: teamStats.unspentLP,
      lifetimeLPAllTime: 200,
      teamUpgradeLevels: { team_quick_start: 2, team_crew_slots: 2, team_mat_resonance: 2 },
      unlockedFeatures: ["advanced_circuits"],
    });
    useGameStore.getState().teamReset("engineering_works");
    let reset = useGameStore.getState();
    expect(reset.teamPoints).toBe(calculateTeamPoints(teamStats) * 2);
    expect(reset.scrapBucks).toBe(11_800);
    expect(reset).toMatchObject({ autoScavengeUnlocked: true, autoRaceUnlocked: true, crewSlots: 4 });
    expect(reset.crewRoster).toHaveLength(4);
    expect(reset.crewRoster.every((member) => member.level === 3)).toBe(true);
    expect(reset.unlockedCircuitIds).toEqual(expect.arrayContaining(["continental_grand_prix", "endurance_series"]));
    expect(Object.values(reset.materials).every((amount) => amount === 2)).toBe(true);

    const ownerStats = { lifetimeTPThisOwnerEra: 1_000, ownerEraCount: 1, unspentTP: 20 };
    useGameStore.setState({ ...createInitialState(), ...retained, ...ownerStats, teamPoints: ownerStats.unspentTP, lifetimeTeamPoints: 500, teamEraCount: 3, unlockedFeatures: ["advanced_circuits"] });
    useGameStore.getState().ownerReset();
    reset = useGameStore.getState();
    expect(reset.ownerPoints).toBe(calculateOwnerPoints(ownerStats) * 2);
    expect(reset.scrapBucks).toBe(10_800);
    expect(reset).toMatchObject({ autoScavengeUnlocked: true, autoRaceUnlocked: true, crewSlots: 4 });
    expect(reset.crewRoster.every((member) => member.level === 3)).toBe(true);
    expect(reset.unlockedCircuitIds).toEqual(expect.arrayContaining(["continental_grand_prix", "endurance_series"]));

    useGameStore.setState({
      ...createInitialState(),
      ...retained,
      lifetimeOPThisTrackEra: 2_000,
      trackEraCount: 1,
      ownerPoints: 20,
      lifetimeOwnerPoints: 1_000,
      ownerEraCount: 5,
      unlockedFeatures: ["advanced_circuits", "vehicle_mastery"],
      unlockedCircuitIds: ["backyard_derby", "continental_grand_prix", "endurance_series"],
    });
    useGameStore.getState().trackReset();
    reset = useGameStore.getState();
    expect(reset.scrapBucks).toBe(10_800);
    expect(reset).toMatchObject({ autoScavengeUnlocked: true, autoRaceUnlocked: true, crewSlots: 4 });
    // Owner reset-seeding effects get one final application on the Track
    // Reset that consumes the Owner layer.
    expect(reset.crewRoster.every((member) => member.level === 3)).toBe(true);
    expect(reset.unlockedFeatures).not.toEqual(expect.arrayContaining(["advanced_circuits", "vehicle_mastery"]));
    expect(reset.unlockedCircuitIds).toEqual(["backyard_derby"]);
  });

  it("hosted-event configuration changes measured terms and Cascade does not mint flat event currencies", () => {
    const baselineConfig = createInitialState().ownedTrackConfig;
    const maxConfig = { ...baselineConfig, surface: "asphalt" as const, length: "long" as const, cornerDensity: "high" as const, timeRule: "night" as const, vehicleClass: "prototype" as const, endurance: true, riskReward: 5 as const };
    expect(calculateHostedEventTerms(maxConfig, 1).reward).toBeGreaterThan(calculateHostedEventTerms(baselineConfig).reward);
    useGameStore.setState({
      ...createInitialState(),
      trackEraCount: 1,
      trackPerkLevels: { track_custom_circuits: 1, track_night_racing: 1, track_endurance: 1, track_sponsors: 1, track_cascade: 1 },
      ownedTrackConfig: maxConfig,
      legacyPoints: 7,
      teamPoints: 8,
      ownerPoints: 9,
    });
    useGameStore.getState().hostTrackEvent();
    useGameStore.getState().advanceFleetAssignments(10);
    const event = useGameStore.getState().hostedEvents[0];
    useGameStore.getState().collectHostedEvent(event.id);
    expect(useGameStore.getState()).toMatchObject({ legacyPoints: 7, teamPoints: 8, ownerPoints: 9 });
  });

  it("retains a circuit completion certificate after more than 20 later outcomes", () => {
    const history = compactRaceHistory([
      ...Array.from({ length: 25 }, () => race("backyard_derby", "loss")),
      race("backyard_derby", "win"),
    ]);
    expect(history).toHaveLength(20);
    expect(history.some((outcome) => outcome.result === "win" && outcome.circuitId === "backyard_derby")).toBe(true);
  });
});

describe("manual race session integrity", () => {
  function beginRace(): void {
    useGameStore.setState({
      ...createInitialState(),
      scrapBucks: 1_000,
      garage: [vehicle("racing")],
      activeVehicleId: "racing",
      selectedCircuitId: "backyard_derby",
      unlockedCircuitIds: ["backyard_derby"],
      tutorialStep: -1,
      lifetimeRacesAllTime: 1,
    });
    useGameStore.getState().enterRace();
    expect(useGameStore.getState().isRacing).toBe(true);
  }

  it("does not settle an old race timer after the save is reset", () => {
    vi.useFakeTimers();
    beginRace();
    useGameStore.getState().resetSave();

    vi.runAllTimers();

    expect(useGameStore.getState()).toMatchObject({
      isRacing: false,
      activeRaceSessionId: null,
      scrapBucks: 0,
      lifetimeRaces: 0,
      raceHistory: [],
      activityLog: [],
    });
  });

  it("blocks selling the racing vehicle and settles wear into the same session", () => {
    vi.useFakeTimers();
    beginRace();

    useGameStore.getState().sellVehicle("racing");
    expect(useGameStore.getState().garage).toHaveLength(1);

    vi.runAllTimers();

    const state = useGameStore.getState();
    expect(state.isRacing).toBe(false);
    expect(state.activeRaceSessionId).toBeNull();
    expect(state.raceHistory).toHaveLength(1);
    expect(state.garage[0].totalRaces).toBe(1);
    expect(state.activityLog.filter((entry) => entry.category === "sell")).toHaveLength(0);
  });
});

describe("v3 save reconciliation", () => {
  it("restores derived paid content, automation, Crew Quarters, and Talent Academy without a version bump", () => {
    const migrated = migratePersistedState({
      ownerUpgradeLevels: { owner_adv_circuits: 1, owner_vehicle_mastery: 1, owner_auto_all: 1, owner_crew_legends: 1 },
      teamUpgradeLevels: { team_crew_slots: 2 },
      teamEraCount: 1,
      trackPerkLevels: { track_academy: 1 },
      crewRoster: [],
      crewSlots: 0,
      unlockedFeatures: [],
      unlockedCircuitIds: ["backyard_derby"],
      unlockedVehicleIds: ["push_mower"],
    }, PERSISTENCE_VERSION);
    expect(migrated.unlockedFeatures).toEqual(expect.arrayContaining(["advanced_circuits", "vehicle_mastery"]));
    expect(migrated.unlockedCircuitIds).toEqual(expect.arrayContaining(["continental_grand_prix", "endurance_series"]));
    expect(migrated.unlockedVehicleIds).toEqual(expect.arrayContaining(["hypercar", "prototype_x"]));
    expect(migrated.autoScavengeUnlocked).toBe(true);
    expect(migrated.autoRaceUnlocked).toBe(true);
    expect(migrated.crewSlots).toBe(4);
    expect(migrated.crewRoster).toHaveLength(4);
    expect(migrated.crewRoster?.every((member) => member.level === 3)).toBe(true);
  });

  it("does not auto-grant paid Owner content or emit the obsolete Fleet milestone", () => {
    const ids = FEATURE_UNLOCK_DEFINITIONS.map((definition) => definition.id);
    expect(ids).not.toContain("advanced_circuits");
    expect(ids).not.toContain("vehicle_mastery");
    expect(ids).not.toContain("fleet_garage");
  });
});
