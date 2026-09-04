import { describe, it, expect } from "vitest";
import { createInitialState, type GameState } from "@/state/store";
import type { BuiltVehicle } from "@/engine/build";
import { autoRaceWouldFire, computeTick, computeTickSpeedMs, getIdleRates, simulateOfflineTicks } from "../tick";
import { getResourceRate } from "../rates";
import { createUpgradeProject } from "../projects";
import { SeededRandomSource, withRandomSource } from "@/utils/random";

const vehicle: BuiltVehicle = {
  id: "rhythm-vehicle",
  definitionId: "push_mower",
  parts: {
    engine: { part: { id: "e", definitionId: "engine_small", condition: "good", foundAt: "test", type: "part" }, addons: [] },
    wheel: { part: { id: "w", definitionId: "wheel_busted", condition: "good", foundAt: "test", type: "part" }, addons: [] },
  },
  stats: { speed: 10, handling: 5, reliability: 10, weight: 20, performance: 12 },
  builtAt: 0,
  condition: 100,
  totalRaces: 0,
};

function racing(overrides: Partial<GameState> = {}): GameState {
  return {
    ...createInitialState(),
    autoScavengeUnlocked: false,
    garage: [vehicle],
    activeVehicleId: vehicle.id,
    selectedCircuitId: "backyard_derby",
    unlockedCircuitIds: ["backyard_derby"],
    scrapBucks: 10_000,
    lifetimeRaces: 5,
    raceTickProgress: 2, // fires on the next tick
    ...overrides,
  } as GameState;
}

describe("fatigue in the tick", () => {
  it("rests every tick and rises when a race fires", () => {
    const rested = computeTick(racing({ autoRaceUnlocked: false, fatigue: 30 }));
    expect(rested.raceOutcome).toBeNull();
    expect(rested.fatigueAfterTick).toBeCloseTo(30 - 12 * (computeTickSpeedMs(racing()) / 3_600_000), 3);

    const raced = withRandomSource(new SeededRandomSource("rhythm"), () => computeTick(racing({ fatigue: 30 })));
    expect(raced.raceOutcome).not.toBeNull();
    expect(raced.fatigueAfterTick).toBeCloseTo(30 - 0.1 + 4, 3);
  });

  it("auto-race rests above the ceiling and the rail shows fatigue draining", () => {
    const tired = racing({ fatigue: 80 });
    expect(autoRaceWouldFire(tired)).toBe(false);
    expect(getIdleRates(tired).racesPerHour).toBe(0);
    expect(computeTick(tired).raceOutcome).toBeNull();
    const rate = getResourceRate(tired, "fatigue")!;
    expect(rate.perSecond).toBeLessThan(0);
    expect(rate.sources?.some((source) => source.label.startsWith("Rest"))).toBe(true);

    const fresh = racing({ fatigue: 10 });
    expect(autoRaceWouldFire(fresh)).toBe(true);
    expect(getResourceRate(fresh, "fatigue")!.sources?.some((source) => source.label === "Auto-race wear" && source.perSecond > 0)).toBe(true);

    const raised = racing({ fatigue: 80, autoRaceMaxFatigue: 99 });
    expect(autoRaceWouldFire(raised)).toBe(true);
  });

  it("offline replay evolves fatigue tick by tick exactly like live ticks", () => {
    const start = racing({ fatigue: 20, autoRaceUnlocked: false });
    const offline = simulateOfflineTicks(start, 120);
    // 120 ticks x 30 s = 1 h of rest at 12/h.
    expect(offline.finalFatigue).toBeCloseTo(8, 3);
    let live = start;
    for (let tick = 0; tick < 120; tick++) live = { ...live, fatigue: computeTick(live).fatigueAfterTick };
    expect(live.fatigue).toBeCloseTo(offline.finalFatigue, 6);
  });
});

describe("projects in the tick", () => {
  it("advance by the tick length and complete on the tick that passes the end", () => {
    const project = createUpgradeProject(createInitialState() as GameState, "keen_eye", 1, { scrap: 75, rep: 0, materials: {} }, 0)!;
    const state = racing({ autoRaceUnlocked: false, projects: [{ ...project, elapsedMs: project.durationMs - 45_000 }] });
    const first = computeTick(state);
    expect(first.completedProjects).toEqual([]);
    expect(first.projects[0].elapsedMs).toBe(project.durationMs - 15_000);
    const second = computeTick({ ...state, projects: first.projects });
    expect(second.projects).toEqual([]);
    expect(second.completedProjects).toHaveLength(1);
    expect(second.completedProjects[0].upgradeId).toBe("keen_eye");
  });

  it("complete offline and raise the workshop level for the rest of the replay", () => {
    const project = createUpgradeProject(createInitialState() as GameState, "keen_eye", 1, { scrap: 75, rep: 0, materials: {} }, 0)!;
    const state = racing({ autoRaceUnlocked: false, projects: [project] });
    const offline = simulateOfflineTicks(state, 20); // 10 min > 5 min project
    expect(offline.finalProjects).toEqual([]);
    expect(offline.completedProjects).toHaveLength(1);
    const short = simulateOfflineTicks(state, 5);
    expect(short.finalProjects).toHaveLength(1);
    expect(short.finalProjects[0].elapsedMs).toBe(150_000);
    expect(short.completedProjects).toEqual([]);
  });

  it("show up in the rail as a capped resource with per-project timers", () => {
    const project = createUpgradeProject(createInitialState() as GameState, "keen_eye", 1, { scrap: 75, rep: 0, materials: {} }, 0)!;
    const hidden = getResourceRate(createInitialState() as GameState, "projects")!;
    expect(hidden.visible).toBe(false);
    const rate = getResourceRate(racing({ projects: [project] }), "projects")!;
    expect(rate.visible).toBe(true);
    expect(rate.amount).toBe(1);
    expect(rate.cap).toBe(1);
    expect(rate.meta?.projects?.[0]).toMatchObject({ id: project.id, remainingMs: 300_000, progress: 0 });
  });
});
