import { getModSlots } from "./gearEnhance";
/**
 * Timed workshop projects (Phase 2, lever 3).
 *
 * Buying a workshop line or enhancing a part past pristine starts a project
 * instead of completing instantly. Projects advance by the wall-clock length
 * of every tick (computeTick) so live play and offline replay agree, and a
 * project completes on the tick that passes its end. The store owns the
 * `projects` array; this module owns the math.
 */
import type { GameState } from "@/state/store";
import type { MaterialType } from "@/data/materials";
import { CONDITIONS, type PartCondition } from "@/data/parts";
import { PROJECTS, projectDurationSeconds } from "@/config/progression";
import { getUpgradeById, getWorkshopUpgradeProjectTier } from "@/data/upgrades";
import { getSkillBonuses } from "./skills";

export type ProjectKind = "upgrade" | "enhance" | "gear";

export interface Project {
  id: string;
  kind: ProjectKind;
  /** Player-facing name shown in the queue. */
  label: string;
  /** Workshop line this project raises (kind "upgrade"). */
  upgradeId?: string;
  targetLevel?: number;
  /** Loose part this project enhances (kind "enhance"). */
  partId?: string;
  gearId?: string;
  targetCondition?: PartCondition;
  /** Wall-clock start, informational (ordering, tooltips). */
  startedAt: number;
  durationMs: number;
  /** Tick time already credited; completes when it reaches durationMs. */
  elapsedMs: number;
  /** What was paid up front, so a cancel can refund a share of it. */
  paid: { scrap: number; rep: number; materials: Partial<Record<MaterialType, number>> };
}

/** Enhancements to this condition index or above run as projects. */
export const ENHANCEMENT_PROJECT_MIN_INDEX = CONDITIONS.indexOf("polished");

type SlotState = Pick<GameState, "workshopLevels" | "crewRoster"> & Partial<Pick<GameState, "campaign">>;

/**
 * One slot at start; the Pit Crew line adds one, and a mechanic on the crew
 * roster adds one.
 */
export function getProjectSlots(state: SlotState): number {
  const pitCrew = (state.workshopLevels?.pit_crew ?? 0) >= 1 ? 1 : 0;
  const mechanic = (state.crewRoster ?? []).some((member) => member.role === "mechanic") ? 1 : 0;
  return PROJECTS.BASE_SLOTS + pitCrew + mechanic + (state.campaign?.knowledge.owner ? 1 : 0);
}

export function getRunningProjects(state: Pick<GameState, "projects">): Project[] {
  return state.projects ?? [];
}

export function hasFreeProjectSlot(state: SlotState & Pick<GameState, "projects">): boolean {
  return getRunningProjects(state).length < getProjectSlots(state);
}

/** Duration for a project of `tier`, shortened by the mechanics skill rating. */
export function getProjectDurationMs(state: Pick<GameState, "racerSkills">, tier: number): number {
  const mechanics = getSkillBonuses(state.racerSkills, Math.max(1, tier)).mechanicsCostReduction;
  return Math.max(0, Math.floor(projectDurationSeconds(tier) * (1 - mechanics) * 1_000));
}

/** Project tier for enhancing to `targetIndex`: polished 1, legendary 2, mythic 3. */
export function enhancementProjectTier(targetIndex: number): number {
  return Math.max(0, targetIndex - ENHANCEMENT_PROJECT_MIN_INDEX + 1);
}

export function projectRemainingMs(project: Project): number {
  return Math.max(0, project.durationMs - project.elapsedMs);
}

/** 0–1 completion. A zero-duration project is complete. */
export function projectProgress(project: Project): number {
  if (project.durationMs <= 0) return 1;
  return Math.max(0, Math.min(1, project.elapsedMs / project.durationMs));
}

export function findUpgradeProject(state: Pick<GameState, "projects">, upgradeId: string): Project | undefined {
  return getRunningProjects(state).find((project) => project.kind === "upgrade" && project.upgradeId === upgradeId);
}

export function findEnhanceProject(state: Pick<GameState, "projects">, partId: string): Project | undefined {
  return getRunningProjects(state).find((project) => project.kind === "enhance" && project.partId === partId);
}

export interface ProjectAdvance {
  running: Project[];
  completed: Project[];
}

/** Credit `dtMs` of tick time to every project; split off the ones that finished. */
export function advanceProjects(projects: readonly Project[], dtMs: number): ProjectAdvance {
  const step = Number.isFinite(dtMs) ? Math.max(0, dtMs) : 0;
  const running: Project[] = [];
  const completed: Project[] = [];
  for (const project of projects) {
    const advanced = { ...project, elapsedMs: Math.min(project.durationMs, project.elapsedMs + step) };
    if (advanced.elapsedMs >= advanced.durationMs) completed.push(advanced);
    else running.push(advanced);
  }
  return { running, completed };
}

export interface ProjectCompletionState {
  lootGearInventory?: GameState["lootGearInventory"];
  workshopLevels: Record<string, number>;
  inventory: GameState["inventory"];
  lifetimeTotalEnhanced: number;
  highestConditionReached: number;
}

/**
 * Apply finished projects to the fields they change. Pure: returns new
 * objects. A part that left the inventory before its enhancement finished is
 * simply not enhanced.
 */
export function applyCompletedProjects<T extends ProjectCompletionState>(state: T, completed: readonly Project[]): ProjectCompletionState {
  let lootGearInventory = state.lootGearInventory;
  let workshopLevels = state.workshopLevels;
  let inventory = state.inventory;
  let lifetimeTotalEnhanced = state.lifetimeTotalEnhanced;
  let highestConditionReached = state.highestConditionReached;
  for (const project of completed) {
    if (project.kind === "gear" && project.gearId && project.targetLevel !== undefined) {
      lootGearInventory = lootGearInventory?.map((item) => item.id === project.gearId ? { ...item, enhancementLevel: Math.max(item.enhancementLevel, project.targetLevel!), modSlots: getModSlots(Math.max(item.enhancementLevel, project.targetLevel!)) } : item);
    }
    if (project.kind === "upgrade" && project.upgradeId) {
      const definition = getUpgradeById(project.upgradeId);
      const target = Math.min(definition?.maxLevel ?? Infinity, project.targetLevel ?? (workshopLevels[project.upgradeId] ?? 0) + 1);
      workshopLevels = { ...workshopLevels, [project.upgradeId]: Math.max(workshopLevels[project.upgradeId] ?? 0, target) };
      continue;
    }
    if (project.kind === "enhance" && project.partId && project.targetCondition) {
      const targetIndex = CONDITIONS.indexOf(project.targetCondition);
      if (targetIndex < 0 || !inventory.some((part) => part.id === project.partId)) continue;
      const targetCondition = project.targetCondition;
      inventory = inventory.map((part) => part.id === project.partId ? { ...part, condition: targetCondition } : part);
      lifetimeTotalEnhanced += 1;
      highestConditionReached = Math.max(highestConditionReached, targetIndex);
    }
  }
  return { workshopLevels, inventory, lifetimeTotalEnhanced, highestConditionReached, ...(lootGearInventory ? { lootGearInventory } : {}) };
}

/** Refund for cancelling a project: a fixed share of what was paid. */
export function projectCancelRefund(project: Project): Project["paid"] {
  const share = PROJECTS.CANCEL_REFUND_SHARE;
  return {
    scrap: Math.floor(project.paid.scrap * share),
    rep: Math.floor(project.paid.rep * share),
    materials: Object.fromEntries(
      (Object.entries(project.paid.materials) as [MaterialType, number][]).map(([material, amount]) => [material, Math.floor(amount * share)]),
    ) as Partial<Record<MaterialType, number>>,
  };
}

let projectIdCounter = 0;

export function makeProjectId(): string {
  projectIdCounter += 1;
  return `project_${Date.now().toString(36)}_${projectIdCounter}`;
}

/** Build the project a workshop purchase starts. */
export function createUpgradeProject(
  state: Pick<GameState, "racerSkills">,
  upgradeId: string,
  targetLevel: number,
  paid: Project["paid"],
  startedAt: number,
): Project | null {
  const definition = getUpgradeById(upgradeId);
  if (!definition) return null;
  const tier = getWorkshopUpgradeProjectTier(definition);
  return {
    id: makeProjectId(),
    kind: "upgrade",
    label: `${definition.name} Lv.${targetLevel}`,
    upgradeId,
    targetLevel,
    startedAt,
    durationMs: getProjectDurationMs(state, tier),
    elapsedMs: 0,
    paid,
  };
}

/** Build the project a polished-or-better enhancement starts. */
export function createEnhanceProject(
  state: Pick<GameState, "racerSkills">,
  partId: string,
  partName: string,
  targetCondition: PartCondition,
  paid: Project["paid"],
  startedAt: number,
): Project {
  const targetIndex = CONDITIONS.indexOf(targetCondition);
  return {
    id: makeProjectId(),
    kind: "enhance",
    label: `${partName} → ${targetCondition}`,
    partId,
    targetCondition,
    startedAt,
    durationMs: getProjectDurationMs(state, enhancementProjectTier(targetIndex)),
    elapsedMs: 0,
    paid,
  };
}
