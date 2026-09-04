import { afterEach, describe, expect, it } from "vitest";
import type { ScavengedPart } from "@/engine/scavenge";
import { FATIGUE, PROJECTS } from "@/config/progression";
import { computeTick } from "@/engine/tick";
import { createCrewAtLevel } from "@/engine/crew";
import { createInitialState, getWorkshopUpgradePurchaseCost, useGameStore } from "../store";
import { migratePersistedState, PERSISTENCE_VERSION } from "../persistence";

afterEach(() => useGameStore.setState(createInitialState()));

function settleTick(): void {
  const state = useGameStore.getState();
  const result = computeTick(state);
  state.applyTickResult(result.partsFound, result.scrapsEarned, result.repEarned, undefined, undefined, result.newRaceTickProgress, undefined, undefined, {
    partsScavenged: 0,
    partsAutoSold: 0,
    scavengesCompleted: 0,
    racesCompleted: 0,
    winsCompleted: 0,
    finalWinStreak: 0,
    bestWinStreak: 0,
    recentRaceOutcomes: [],
    winningCircuitIds: [],
    defeatedRivalIds: [],
    circuitWinStreaks: {},
    raceSalvageFound: 0,
    forgeTokensFound: 0,
    entryFeesPaid: 0,
    challengesEvaluated: false,
    completedChallengeIds: [],
    challengeForgeTokens: 0,
    challengeMaterials: {},
    ticksProcessed: 1,
    repDecayed: result.repDecayed,
    finalFatigue: result.fatigueAfterTick,
    finalProjects: result.projects,
    completedProjects: result.completedProjects,
  });
}

describe("purchaseUpgrade starts a project", () => {
  it("pays now, raises the level only when the project completes", () => {
    useGameStore.setState({ scrapBucks: 1_000, autoScavengeUnlocked: false, autoRaceUnlocked: false });
    const cost = getWorkshopUpgradePurchaseCost(useGameStore.getState(), "keen_eye")!;
    useGameStore.getState().purchaseUpgrade("keen_eye");
    const started = useGameStore.getState();
    expect(started.scrapBucks).toBe(1_000 - cost);
    expect(started.workshopLevels.keen_eye ?? 0).toBe(0);
    expect(started.projects).toHaveLength(1);
    expect(started.projects[0]).toMatchObject({ kind: "upgrade", upgradeId: "keen_eye", targetLevel: 1, durationMs: 300_000, elapsedMs: 0 });

    // The same line cannot be queued twice, and the single slot is taken.
    useGameStore.getState().purchaseUpgrade("keen_eye");
    useGameStore.getState().purchaseUpgrade("deep_pockets");
    expect(useGameStore.getState().projects).toHaveLength(1);
    expect(useGameStore.getState().scrapBucks).toBe(1_000 - cost);

    // Ten 30 s ticks pass the 5 min end.
    for (let tick = 0; tick < 10; tick++) settleTick();
    const done = useGameStore.getState();
    expect(done.projects).toEqual([]);
    expect(done.workshopLevels.keen_eye).toBe(1);
    expect(done.unlockEvents.some((event) => event.startsWith("Project complete: Keen Eye"))).toBe(true);
  });

  it("charges Rep once with the first level and refunds half on cancel", () => {
    useGameStore.setState({ scrapBucks: 1_000, repPoints: 100, lifetimeRep: 100 });
    useGameStore.getState().purchaseUpgrade("toolkit");
    const started = useGameStore.getState();
    expect(started.projects).toHaveLength(1);
    expect(started.repPoints).toBe(80);
    expect(started.scrapBucks).toBe(775);
    useGameStore.getState().cancelProject(started.projects[0].id);
    const cancelled = useGameStore.getState();
    expect(cancelled.projects).toEqual([]);
    expect(cancelled.scrapBucks).toBe(775 + Math.floor(225 * PROJECTS.CANCEL_REFUND_SHARE));
    expect(cancelled.repPoints).toBe(80 + Math.floor(20 * PROJECTS.CANCEL_REFUND_SHARE));
    expect(cancelled.workshopLevels.toolkit ?? 0).toBe(0);
  });

  it("gains slots from Pit Crew and a mechanic", () => {
    const mechanic = createCrewAtLevel("m", "Dave", "mechanic", 1);
    useGameStore.setState({ scrapBucks: 100_000, workshopLevels: { pit_crew: 1 }, crewRoster: [mechanic] });
    useGameStore.getState().purchaseUpgrade("keen_eye");
    useGameStore.getState().purchaseUpgrade("deep_pockets");
    useGameStore.getState().purchaseUpgrade("bargain_builder");
    useGameStore.getState().purchaseUpgrade("tuned_suspension");
    expect(useGameStore.getState().projects).toHaveLength(3);
  });
});

describe("enhancePart", () => {
  const part: ScavengedPart = { id: "p1", definitionId: "engine_small", condition: "pristine", foundAt: "t", type: "part" };

  it("runs polished-and-above enhancements as projects in the same queue", () => {
    useGameStore.setState({
      workshopLevels: { tuning_bench: 1 },
      inventory: [part],
      materials: { metalScrap: 999, rubberCompound: 999, heatCore: 999, circuitFragment: 999, carbonDust: 999, greaseSludge: 999 },
      autoScavengeUnlocked: false,
      autoRaceUnlocked: false,
    });
    useGameStore.getState().enhancePart("p1");
    const started = useGameStore.getState();
    expect(started.inventory[0].condition).toBe("pristine");
    expect(started.projects).toHaveLength(1);
    expect(started.projects[0]).toMatchObject({ kind: "enhance", partId: "p1", targetCondition: "polished" });
    expect(started.materials.metalScrap).toBeLessThan(999);
    // The slot is taken: a workshop line has to wait.
    useGameStore.setState({ scrapBucks: 1_000 });
    useGameStore.getState().purchaseUpgrade("keen_eye");
    expect(useGameStore.getState().projects).toHaveLength(1);

    const ticks = Math.ceil(started.projects[0].durationMs / 30_000);
    for (let tick = 0; tick < ticks; tick++) settleTick();
    const done = useGameStore.getState();
    expect(done.projects).toEqual([]);
    expect(done.inventory[0].condition).toBe("polished");
    expect(done.lifetimeTotalEnhanced).toBe(1);
    expect(done.highestConditionReached).toBe(5);
  });

  it("keeps lower enhancements instant", () => {
    useGameStore.setState({
      workshopLevels: { tuning_bench: 1 },
      inventory: [{ ...part, condition: "good" }],
      materials: { metalScrap: 999, rubberCompound: 999, heatCore: 999, circuitFragment: 999, carbonDust: 999, greaseSludge: 999 },
    });
    useGameStore.getState().enhancePart("p1");
    expect(useGameStore.getState().inventory[0].condition).toBe("pristine");
    expect(useGameStore.getState().projects).toEqual([]);
  });
});

describe("fatigue in the store", () => {
  it("resets on Scrap Reset along with the project queue", () => {
    useGameStore.setState({ scrapBucks: 1_000 });
    useGameStore.getState().purchaseUpgrade("keen_eye");
    expect(useGameStore.getState().projects).toHaveLength(1);
    useGameStore.setState({
      eventWins: { national_circuit: { sprint: 1, heat: 1, feature: 1 } },
      defeatedRivalIds: ["rival_greasy_pete", "rival_redline_rosa"],
      lifetimeRep: 10_000,
      lifetimeScrapBucks: 100_000,
      fatigue: 55,
    });
    useGameStore.getState().prestige();
    expect(useGameStore.getState().prestigeCount).toBe(1);
    expect(useGameStore.getState().fatigue).toBe(0);
    expect(useGameStore.getState().projects).toEqual([]);
  });

  it("clamps the auto-race ceiling", () => {
    useGameStore.getState().setAutoRaceMaxFatigue(150);
    expect(useGameStore.getState().autoRaceMaxFatigue).toBe(FATIGUE.MAX);
    useGameStore.getState().setAutoRaceMaxFatigue(-5);
    expect(useGameStore.getState().autoRaceMaxFatigue).toBe(0);
  });
});

describe("persistence v6", () => {
  it("gives pre-v6 saves the fatigue ceiling and an empty queue, keeping their fatigue", () => {
    const migrated = migratePersistedState({ scrapBucks: 5, fatigue: 42 }, 5);
    expect(migrated.autoRaceMaxFatigue).toBe(FATIGUE.AUTO_RACE_MAX_DEFAULT);
    expect(migrated.projects).toEqual([]);
    expect(migrated.fatigue).toBe(42);
  });

  it("round-trips a running project", () => {
    const project = {
      id: "project_1",
      kind: "upgrade" as const,
      label: "Keen Eye Lv.1",
      upgradeId: "keen_eye",
      targetLevel: 1,
      startedAt: 1,
      durationMs: 300_000,
      elapsedMs: 30_000,
      paid: { scrap: 75, rep: 0, materials: {} },
    };
    const migrated = migratePersistedState({ projects: [project], autoRaceMaxFatigue: 55 }, PERSISTENCE_VERSION);
    expect(migrated.projects).toEqual([project]);
    expect(migrated.autoRaceMaxFatigue).toBe(55);
    expect(() => migratePersistedState({ projects: [{ ...project, elapsedMs: -1 }] }, PERSISTENCE_VERSION)).toThrow(/Invalid persisted game state/);
  });
});
