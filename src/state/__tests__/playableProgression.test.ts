import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialState, useGameStore, type GameState } from "../store";
import { getPersistedGameState, migratePersistedState, PERSISTENCE_VERSION } from "../persistence";
import { readyCampaign } from "@/testing/campaignReady";
import { createGameplayFixture } from "@/testing/gameplayFixtures";
import { getGearBonuses } from "@/engine/gear";
import { GEAR_SLOTS, type LootGearItem } from "@/data/lootGear";
import { getFatigueGainMultiplier } from "@/engine/fatigue";
import { computeOfflineTickBudget, simulateOfflineTicks, computeTick, autoRaceWouldFire } from "@/engine/tick";
import { getResourceRate } from "@/engine/rates";
import { advancePrograms } from "@/engine/programs";
import { specialtyPerformance } from "@/engine/campaign";
import { CIRCUIT_DEFINITIONS } from "@/data/circuits";
import { evaluateRacePlan, recommendedRacePlan } from "@/data/raceStrategy";
import { SeededRandomSource, withRandomSource } from "@/utils/random";

const item: LootGearItem = { id: "kit", name: "Workshop gloves", slot: "hands", rarity: "common", effects: [], enhancementLevel: 2, modSlots: 0, mods: [], source: "test", setId: "junkyard_dog" };
afterEach(() => { vi.useRealTimers(); useGameStore.setState(createInitialState()); });

describe("playable progression contracts", () => {
  it("fleet crew roles change the job outcome and cannot specialize while reserved", () => {
    const base = { ...createInitialState(), campaign: readyCampaign(), teamEraCount: 1 } as GameState;
    const outcomes = (["mechanic", "scout", "driver", "trader"] as const).map((role) => {
      const state = { ...base, crewRoster: [{ id: "crew", name: "Crew", role, level: 5, xp: 0, specialization: null }],
        fleetAssignments: [{ id: "job", vehicleId: "car", crewId: "crew", circuitId: "national_circuit", plan: base.currentRacePlan,
          status: "running" as const, remainingTicks: 1, accumulatedWear: 0, rewards: { scrap: 0, materials: 0 } }] };
      useGameStore.setState(state);
      useGameStore.getState().specializeCrewMember("crew", "tuner");
      expect(useGameStore.getState().crewRoster[0].specialization).toBeNull();
      return advancePrograms(state, 1).fleetAssignments![0];
    });
    expect(outcomes[0].accumulatedWear).toBe(3);
    expect(outcomes[1].rewards.materials).toBeGreaterThan(outcomes[0].rewards.materials);
    expect(outcomes[2].rewards.scrap).toBeGreaterThan(outcomes[0].rewards.scrap);
    expect(outcomes[3].rewards.scrap).toBeGreaterThan(outcomes[2].rewards.scrap);
  });
  it("passive opening supplies a build within fifteen minutes across ten fixed seeds", () => {
    vi.useFakeTimers();
    for (let seed = 0; seed < 10; seed++) {
      useGameStore.setState({ ...createInitialState(), lastActiveTimestamp: 1000 });
      const start = useGameStore.getState();
      const result = withRandomSource(new SeededRandomSource(`opening-${seed}`), () => simulateOfflineTicks(start, 30));
      start.settleOffline(result,1000,901000);
      const s = useGameStore.getState();
      const engine = s.inventory.find((p) => p.definitionId === "engine_small")!;
      const wheel = s.inventory.find((p) => p.definitionId === "wheel_busted")!;
      expect(engine).toBeDefined(); expect(wheel).toBeDefined();
      for (const part of s.inventory) if (part.id !== engine.id && part.id !== wheel.id) s.sellPart(part.id);
      s.setPendingVehicle("push_mower"); s.setPendingPart("engine",engine); s.setPendingPart("wheel",wheel);
      useGameStore.getState().buildSelectedVehicle();
      expect(useGameStore.getState().garage, `seed ${seed}`).toHaveLength(1);
      const built = useGameStore.getState();
      built.setActiveVehicle(built.garage[0].id);
      withRandomSource(new SeededRandomSource(`opening-race-${seed}`), () => built.enterRace());
      vi.runAllTimers();
      expect(useGameStore.getState().raceHistory).toHaveLength(1);
      const circuit = CIRCUIT_DEFINITIONS.find(c => c.id === built.selectedCircuitId)!;
      const previous = evaluateRacePlan(circuit.profile, built.currentRacePlan);
      built.setRacePlan(recommendedRacePlan(circuit.profile));
      const improved = evaluateRacePlan(circuit.profile, useGameStore.getState().currentRacePlan);
      expect(improved.performanceMultiplier).toBeGreaterThan(previous.performanceMultiplier);
      expect(improved.dnfDelta).toBeLessThanOrEqual(previous.dnfDelta);
    }
  });

  it("protects the selected cash reserve in both simulation and the readiness forecast", () => {
    const state = { ...createInitialState(), ...createGameplayFixture("first_race_ready").payload.state, autoRaceReserveScrap: 1000, raceTickProgress: 999 } as GameState;
    expect(autoRaceWouldFire(state)).toBe(false);
    expect(computeTick(state).raceOutcome).toBeNull();
  });

  it("shows earned LP per elapsed hour rather than rewarding waiting", () => {
    const state = { ...createInitialState(), lastActiveTimestamp: 3601000, campaign: { ...readyCampaign(), runStartedAt: 1000 } } as GameState;
    const rate = getResourceRate(state,"legacy_projection")!;
    expect(rate.perSecond * 3600).toBe(rate.amount);
    const later = getResourceRate({ ...state, lastActiveTimestamp: 7201000 },"legacy_projection")!;
    expect(later.amount).toBe(rate.amount);
    expect(later.perSecond).toBe(rate.perSecond / 2);
  });
  for (const layer of ["team", "owner", "track"] as const) it(`${layer} retains kit and knowledge while rebuilding the economy`, () => {
    useGameStore.setState({ ...createInitialState(), campaign: { ...readyCampaign(), lifetimeTeamResets: 5, lifetimeOwnerResets: 3 }, lifetimeTeamPoints: 80, lifetimeOwnerPoints: 40, legacyUpgradeLevels: { leg_scrap_mult: 5 }, teamUpgradeLevels: { team_lp_amp: 5, team_crew_slots: 4 },
      lootGearInventory: [item], equippedLootGear: { ...createInitialState().equippedLootGear, hands: item.id }, scrapBucks: 1000 });
    useGameStore.getState()[`${layer}Reset`]();
    const s = useGameStore.getState();
    expect(s.lootGearInventory).toEqual([item]);
    expect(s.equippedLootGear.hands).toBe(item.id);
    expect(s.workshopLevels.toolkit).toBeGreaterThanOrEqual(1);
    expect(s.unlockedCircuitIds).toContain("dirt_track");
    expect(s.garage).toEqual([]);
    expect(s.lifetimeTeamPoints).toBeGreaterThanOrEqual(80); expect(s.lifetimeOwnerPoints).toBeGreaterThanOrEqual(40);
    expect(s.campaign.lifetimeTeamResets).toBe(5 + (layer === "team" ? 1 : 0));
    expect(s.campaign.lifetimeOwnerResets).toBe(3 + (layer === "owner" ? 1 : 0));
    if (layer === "team") expect(s.legacyUpgradeLevels.leg_scrap_mult).toBe(2);
    if (layer === "owner") { expect(s.teamUpgradeLevels.team_lp_amp).toBe(2); expect(s.crewSlots).toBeGreaterThanOrEqual(3); expect(s.legacyUpgradeLevels).toEqual({}); }
    if (layer === "track") { expect(s.teamUpgradeLevels).toEqual({}); expect(s.ownerUpgradeLevels).toEqual({}); }
  });

  it("reserves enhanced gear, finishes it offline, and salvages its material only once", () => {
    useGameStore.setState({ ...createInitialState(), lootGearInventory: [item], scrapBucks: 10000, autoScavengeUnlocked: false, autoRaceUnlocked: false, lastActiveTimestamp: 100 });
    useGameStore.getState().enhanceLootGear(item.id);
    expect(useGameStore.getState().projects[0]).toMatchObject({ kind: "gear", targetLevel: 3 });
    const paid = useGameStore.getState().scrapBucks;
    useGameStore.getState().enhanceLootGear(item.id);
    useGameStore.getState().salvageLootGear(item.id);
    expect(useGameStore.getState().scrapBucks).toBe(paid);
    const s = useGameStore.getState();
    const result = simulateOfflineTicks(s, 30);
    expect(s.settleOffline(result, 100, 900100)).toBe(true);
    expect(useGameStore.getState().lootGearInventory[0].enhancementLevel).toBe(3);
    expect(useGameStore.getState().settleOffline(result, 100, 900100)).toBe(false);
    useGameStore.getState().salvageLootGear(item.id);
    expect(useGameStore.getState().materials.metalScrap).toBe(4);
    const before = useGameStore.getState().scrapBucks;
    useGameStore.getState().salvageLootGear(item.id);
    expect(useGameStore.getState().scrapBucks).toBe(before);
  });

  it("sets use unique equipped pieces, recover fatigue and never remove its cost entirely", () => {
    const gear = GEAR_SLOTS.map((slot) => ({ ...item, id: slot, slot, setId: "iron_lungs" as const, effects: [{ type: "fatigue_rate_reduction", value: 1 }] }));
    const equipped = Object.fromEntries(GEAR_SLOTS.map((s) => [s,s])) as GameState["equippedLootGear"];
    const state = { ...createInitialState(), lootGearInventory: gear, equippedLootGear: equipped } as GameState;
    expect(getGearBonuses(equipped, gear).fatigue_recovery_pct).toBe(0.2);
    expect(getFatigueGainMultiplier(state)).toBe(0.2);
  });

  it("specialties have a benefit and a tradeoff and sponsor claims pay once", () => {
    for (const specialty of ["grassroots", "technical", "endurance"] as const) {
      const effects = CIRCUIT_DEFINITIONS.map((c) => specialtyPerformance(specialty,c));
      expect(effects.some((n) => n > 0)).toBe(true); expect(effects.some((n) => n < 0)).toBe(true);
    }
    useGameStore.setState({ ...createInitialState(), campaign: { ...readyCampaign(), sponsorWins: { grassroots: 3, technical: 0, endurance: 0 } } });
    useGameStore.getState().chooseSpecialty("grassroots");
    useGameStore.getState().chooseSpecialty("technical");
    expect(useGameStore.getState().campaign.specialty).toBe("grassroots");
    useGameStore.getState().claimSponsor("grassroots"); useGameStore.getState().claimSponsor("grassroots");
    expect(useGameStore.getState().ownerPoints).toBe(5);
  });

  it("migrates existing promotions without manufacturing rewards or erasing equipment", () => {
    const old = { ...getPersistedGameState({ ...createInitialState(), ownerEraCount: 1, lootGearInventory: [item], legacyPoints: 17 } as GameState), campaign: undefined };
    const migrated = migratePersistedState(old, 6);
    expect(migrated.campaign?.knowledge).toEqual({ team: true, owner: true });
    expect(migrated.legacyPoints).toBe(17); expect(migrated.lootGearInventory).toEqual([item]);
    expect(migrated.campaign?.sponsorClaims).toEqual([]); expect(PERSISTENCE_VERSION).toBe(7);
  });

  it("credits 48 hours even at the fastest tick speed and caps longer absences", () => {
    const state = { ...createInitialState(), ...createGameplayFixture("maxed").payload.state } as GameState;
    const budget = computeOfflineTickBudget(state, 48 * 3600000);
    expect(budget.ticks * budget.tickMs).toBe(48 * 3600000);
    expect(computeOfflineTickBudget(state, 72 * 3600000)).toEqual(budget);
  });

  it("an interrupted calculation changes no save; replay then reload cannot duplicate settlement", () => {
    useGameStore.setState({ ...createInitialState(), lastActiveTimestamp: 1000 });
    const s = useGameStore.getState();
    const r = withRandomSource(new SeededRandomSource("interruption"), () => simulateOfflineTicks(s, 20));
    expect(useGameStore.getState()).toBe(s);
    s.settleOffline(r, 1000, 601000);
    const saved = getPersistedGameState(useGameStore.getState());
    useGameStore.setState({ ...createInitialState(), ...migratePersistedState(saved, PERSISTENCE_VERSION) });
    expect(useGameStore.getState().settleOffline(r,1000,601000)).toBe(false);
    expect(useGameStore.getState().scrapBucks).toBe(saved.scrapBucks);
    expect(useGameStore.getState().lastOfflineSettlement).toMatchObject({ from: 1000, to: 601000, ticks: 20 });
  });
});
