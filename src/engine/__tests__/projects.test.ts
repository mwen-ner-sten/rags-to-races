import { describe, it, expect } from "vitest";
import { createInitialState, type GameState } from "@/state/store";
import { PROJECTS, projectDurationSeconds } from "@/config/progression";
import { getUpgradeById, getWorkshopUpgradeProjectTier, projectTierForRepCost, UPGRADE_DEFINITIONS } from "@/data/upgrades";
import {
  advanceProjects,
  applyCompletedProjects,
  createEnhanceProject,
  createUpgradeProject,
  enhancementProjectTier,
  getProjectDurationMs,
  getProjectSlots,
  projectCancelRefund,
  projectProgress,
  projectRemainingMs,
  type Project,
} from "../projects";
import { createCrewAtLevel } from "../crew";

function state(overrides: Partial<GameState> = {}): GameState {
  return { ...createInitialState(), ...overrides } as GameState;
}

const paid = { scrap: 100, rep: 20, materials: {} };

describe("project durations", () => {
  it("scale 300 s x 1.9^tier so tier 6 is ~8 h", () => {
    expect(projectDurationSeconds(0)).toBe(300);
    expect(projectDurationSeconds(1)).toBeCloseTo(570);
    expect(projectDurationSeconds(6) / 3_600).toBeGreaterThan(3.5);
    expect(projectDurationSeconds(6) / 3_600).toBeLessThan(4.5);
  });

  it("derives the tier from the line's Rep band, inheriting from prerequisites", () => {
    expect(projectTierForRepCost(0)).toBe(0);
    expect(projectTierForRepCost(20)).toBe(1);
    expect(projectTierForRepCost(75)).toBe(2);
    expect(projectTierForRepCost(250)).toBe(3);
    expect(projectTierForRepCost(375)).toBe(4);
    expect(projectTierForRepCost(2_500)).toBe(5);
    expect(projectTierForRepCost(7_500)).toBe(6);
    expect(getWorkshopUpgradeProjectTier(getUpgradeById("keen_eye")!)).toBe(0);
    expect(getWorkshopUpgradeProjectTier(getUpgradeById("toolkit")!)).toBe(1);
    expect(getWorkshopUpgradeProjectTier(getUpgradeById("artifact_forge")!)).toBe(6);
    // Gentle Swap charges no Rep but needs the Toolkit, so it shares its band.
    expect(getWorkshopUpgradeProjectTier(getUpgradeById("gentle_swap")!)).toBe(1);
    for (const definition of UPGRADE_DEFINITIONS) {
      const tier = getWorkshopUpgradeProjectTier(definition);
      expect(tier).toBeGreaterThanOrEqual(0);
      expect(tier).toBeLessThanOrEqual(6);
    }
  });

  it("is shortened by the mechanics skill", () => {
    const novice = getProjectDurationMs(state(), 2);
    const skilled = getProjectDurationMs(state({ racerSkills: { ...createInitialState().racerSkills, mechanics: { xp: 0, level: 50 } } }), 2);
    expect(novice).toBe(Math.floor(projectDurationSeconds(2) * 1_000));
    expect(skilled).toBeLessThan(novice);
    expect(skilled).toBeGreaterThan(novice * 0.5);
  });

  it("uses enhancement tiers polished 1, legendary 2, mythic 3", () => {
    expect(enhancementProjectTier(5)).toBe(1);
    expect(enhancementProjectTier(6)).toBe(2);
    expect(enhancementProjectTier(7)).toBe(3);
  });
});

describe("project slots", () => {
  it("starts at one; Pit Crew and a mechanic each add one", () => {
    expect(getProjectSlots(state())).toBe(PROJECTS.BASE_SLOTS);
    expect(getProjectSlots(state({ workshopLevels: { pit_crew: 2 } }))).toBe(PROJECTS.BASE_SLOTS + 1);
    const mechanic = createCrewAtLevel("m", "Dave", "mechanic", 1);
    expect(getProjectSlots(state({ workshopLevels: { pit_crew: 1 }, crewRoster: [mechanic] }))).toBe(PROJECTS.BASE_SLOTS + 2);
  });
});

describe("project lifecycle", () => {
  it("advances by tick time and completes on the tick that passes the end", () => {
    const project = createUpgradeProject(state(), "keen_eye", 1, paid, 0)!;
    expect(project.durationMs).toBe(300_000);
    const half = advanceProjects([project], 150_000);
    expect(half.completed).toEqual([]);
    expect(projectProgress(half.running[0])).toBeCloseTo(0.5);
    expect(projectRemainingMs(half.running[0])).toBe(150_000);
    const done = advanceProjects(half.running, 150_000);
    expect(done.running).toEqual([]);
    expect(done.completed).toHaveLength(1);
    // Overshooting a tick never loses the completion.
    expect(advanceProjects([project], 10_000_000).completed).toHaveLength(1);
    // The original is untouched.
    expect(project.elapsedMs).toBe(0);
  });

  it("applies completed upgrades and enhancements without double counting", () => {
    const upgrade = createUpgradeProject(state(), "keen_eye", 1, paid, 0)!;
    const enhance = createEnhanceProject(state(), "p1", "Engine", "polished", { scrap: 0, rep: 0, materials: { metalScrap: 4 } }, 0);
    const inventory: GameState["inventory"] = [
      { id: "p1", definitionId: "engine_small", condition: "pristine", foundAt: "t", type: "part" },
      { id: "p2", definitionId: "engine_small", condition: "pristine", foundAt: "t", type: "part" },
    ];
    const applied = applyCompletedProjects({ workshopLevels: {}, inventory, lifetimeTotalEnhanced: 3, highestConditionReached: 4 }, [upgrade, enhance]);
    expect(applied.workshopLevels).toEqual({ keen_eye: 1 });
    expect(applied.inventory.find((part) => part.id === "p1")?.condition).toBe("polished");
    expect(applied.inventory.find((part) => part.id === "p2")?.condition).toBe("pristine");
    expect(applied.lifetimeTotalEnhanced).toBe(4);
    expect(applied.highestConditionReached).toBe(5);
    // Applying the same upgrade completion again cannot raise the level twice.
    expect(applyCompletedProjects(applied, [upgrade]).workshopLevels).toEqual({ keen_eye: 1 });
    // A part that left the inventory is simply not enhanced.
    const gone = applyCompletedProjects({ workshopLevels: {}, inventory: [], lifetimeTotalEnhanced: 0, highestConditionReached: 0 }, [enhance]);
    expect(gone.lifetimeTotalEnhanced).toBe(0);
  });

  it("refunds half of what was paid on cancel", () => {
    const project: Project = { ...createUpgradeProject(state(), "toolkit", 1, { scrap: 225, rep: 20, materials: { metalScrap: 3 } }, 0)! };
    expect(projectCancelRefund(project)).toEqual({ scrap: 112, rep: 10, materials: { metalScrap: 1 } });
  });
});
