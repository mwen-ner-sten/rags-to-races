/**
 * Resource rates — the single place the UI learns "how fast is this changing".
 *
 * Every resource the player can see gets an amount, a per-second rate, and an
 * optional cap. Rates are derived from the same tick math the game runs on
 * (computeTick, the race odds, the scavenge distribution, the Rep decay
 * formula), never estimated separately in a component.
 *
 * Contract shared between the engine and the resource rail. The engine owns
 * computeResourceRates; the UI only reads the returned array.
 */
import type { GameState } from "@/state/store";
import { CURRENCY_DEFINITIONS } from "@/data/currencies";
import { LOOSE_INVENTORY_LIMIT } from "@/config/gameplayLimits";
import { computeTickSpeedMs, getRaceTicksNeeded, autoRaceWouldFire } from "./tick";
import { canScavengeSelectedLocation } from "./eligibility";
import { expectedScavenge } from "./scavengeExpectation";
import { expectedRace, type RaceExpectation } from "./raceExpectation";
import { calculateScrapResetAward, deriveHighestCircuitTier } from "./prestige";
import { getFatigueCap, getFatigueGainPerRace, getFatigueRecoveryPerHour } from "./fatigue";
import { getProjectSlots, getRunningProjects, projectProgress, projectRemainingMs } from "./projects";
import { getPermanentRuntimeBonuses, multiplyReward } from "./permanentBonuses";
import { getCircuitById } from "@/data/circuits";
import { getMaterialById, type MaterialType } from "@/data/materials";

/** One running project as the rail's tooltip shows it. */
export interface ProjectRateEntry {
  id: string;
  label: string;
  remainingMs: number;
  /** 0–1 completion. */
  progress: number;
}

/** Non-rate details a resource row can carry; every field is optional. */
export interface ResourceRateMeta {
  projects?: ProjectRateEntry[];
}

export interface ResourceRate {
  /** Matches CurrencyDefinition.id, or a derived resource id such as "parts". */
  id: string;
  label: string;
  /** Prefix shown before the amount, e.g. "$". */
  prefix?: string;
  amount: number;
  /** Net change per second at the current state; negative means draining. */
  perSecond: number;
  /** Hard cap if the resource has one (e.g. loose-part storage). */
  cap?: number;
  /** Human-readable breakdown of what makes up the rate. */
  sources?: { label: string; perSecond: number }[];
  /** Whether the player should see this resource yet. */
  visible: boolean;
  /** CSS color token for the value. */
  color: string;
  /** Extra structured detail (e.g. per-project timers) for the UI to format. */
  meta?: ResourceRateMeta;
}

const MS_PER_HOUR = 3_600_000;

/** Horizon for the Legacy projection secant: one hour of expected ticks. */

interface Cadence {
  tickSeconds: number;
  scavengesPerSecond: number;
  racesPerSecond: number;
}

function cadence(state: GameState): Cadence {
  const tickSeconds = computeTickSpeedMs(state) / 1_000;
  const ticksPerSecond = 1 / tickSeconds;
  return {
    tickSeconds,
    scavengesPerSecond: state.autoScavengeUnlocked && canScavengeSelectedLocation(state) ? ticksPerSecond : 0,
    racesPerSecond: autoRaceWouldFire(state) ? ticksPerSecond / getRaceTicksNeeded(state) : 0,
  };
}

function currency(id: string) {
  return CURRENCY_DEFINITIONS.find((definition) => definition.id === id);
}

function base(state: GameState, id: string, amount: number, fallbackLabel: string, color: string): ResourceRate {
  const definition = currency(id);
  return {
    id,
    label: definition?.name ?? fallbackLabel,
    prefix: definition?.prefix,
    amount,
    perSecond: 0,
    visible: definition?.gate ? definition.gate(state) : true,
    color: definition?.color ?? color,
    sources: [],
  };
}

function withSources(rate: ResourceRate, sources: { label: string; perSecond: number }[]): ResourceRate {
  const kept = sources.filter((source) => source.perSecond !== 0);
  return { ...rate, sources: kept, perSecond: kept.reduce((sum, source) => sum + source.perSecond, 0) };
}

/** Fleet programs pay Scrap Bucks and one material when collected; spread over their duration. */
function fleetFlows(state: GameState): { scrapPerSecond: number; materials: Partial<Record<MaterialType, number>> } {
  const tickSeconds = computeTickSpeedMs(state) / 1_000;
  const permanent = getPermanentRuntimeBonuses(state);
  const materialKeys = Object.keys(state.materials ?? {}) as MaterialType[];
  let scrapPerSecond = 0;
  const materials: Partial<Record<MaterialType, number>> = {};
  for (const assignment of state.fleetAssignments ?? []) {
    if (assignment.status !== "running") continue;
    const circuit = getCircuitById(assignment.circuitId);
    if (!circuit || materialKeys.length === 0) continue;
    const durationSeconds = Math.max(3, circuit.tier + 3) * tickSeconds;
    scrapPerSecond += multiplyReward(Math.floor(circuit.rewardBase * 0.6), permanent.allScrapIncomeMult) / durationSeconds;
    const material = materialKeys[circuit.tier % materialKeys.length];
    const amount = Math.max(1, multiplyReward(Math.max(1, Math.floor(circuit.tier * 0.6)), permanent.materialYieldMult));
    materials[material] = (materials[material] ?? 0) + amount / durationSeconds;
  }
  return { scrapPerSecond, materials };
}

/**
 * Fatigue flows, mirroring engine/fatigue: races add, rest drains. The drain
 * shows whenever there is fatigue to recover, so the rail reads "draining
 * while resting" the moment auto-race stops for the fatigue ceiling.
 */
function fatigueFlows(state: GameState, circuitTier: number, racesPerSecond: number): { gainPerSecond: number; recoveryPerSecond: number } {
  const fatigue = state.fatigue ?? 0;
  return {
    gainPerSecond: getFatigueGainPerRace(state, circuitTier) * racesPerSecond,
    recoveryPerSecond: fatigue > 0 ? getFatigueRecoveryPerHour(state, circuitTier) / MS_PER_HOUR * 1_000 : 0,
  };
}

/** Running projects as a capped resource: amount = running, cap = slots. */
function projectsRate(state: GameState): ResourceRate {
  const running = getRunningProjects(state);
  const bought = Object.values(state.workshopLevels ?? {}).some((level) => level > 0);
  return {
    id: "projects",
    label: "Projects",
    amount: running.length,
    perSecond: 0,
    cap: getProjectSlots(state),
    sources: [],
    visible: running.length > 0 || bought,
    color: "var(--info, #3b82f6)",
    meta: {
      projects: running.map((project) => ({
        id: project.id,
        label: project.label,
        remainingMs: projectRemainingMs(project),
        progress: projectProgress(project),
      })),
    },
  };
}

function legacyAward(state: GameState, runStats: Omit<import("./prestige").RunStats, "highestCircuitTier" | "workshopUpgradesBought">): number {
  return calculateScrapResetAward({
    currentPrestigeCount: state.prestigeCount,
    runStats: {
      earnedScrap: state.campaign?.runEarnedScrap ?? 0,
      featureWins: state.eventWins, rivalCount: state.campaign?.runRivalIds.length ?? 0,
      ...runStats,
      highestCircuitTier: deriveHighestCircuitTier(state.unlockedCircuitIds),
      workshopUpgradesBought: Object.values(state.workshopLevels ?? {}).reduce((sum, level) => sum + level, 0),
    },
    activeMomentumTierIds: state.activeMomentumTiers,
    teamUpgradeLevels: state.teamUpgradeLevels,
    trackPerkLevels: state.trackPerkLevels,
    earnedAchievements: state.earnedAchievements,
    unlockedPlaystyleNodes: state.unlockedPlaystyleNodes,
    crewRoster: state.crewRoster,
  }).totalLp;
}

function computeRates(state: GameState): ResourceRate[] {
  const flow = cadence(state);
  const scavenge = flow.scavengesPerSecond > 0 ? expectedScavenge(state) : null;
  const race: RaceExpectation | null = flow.racesPerSecond > 0 ? expectedRace(state) : null;
  const fleet = fleetFlows(state);


  const scrapBucks = withSources(base(state, "scrap_bucks", state.scrapBucks, "Scrap Bucks", "var(--accent, #c83e0c)"), [
    { label: "Auto-sold junk", perSecond: (scavenge?.autoSellScrapPerScavenge ?? 0) * flow.scavengesPerSecond },
    { label: "Race prize money", perSecond: (race?.scrapPerRace ?? 0) * flow.racesPerSecond },
    { label: "Race entry fees", perSecond: -(race?.entryFee ?? 0) * flow.racesPerSecond },
    { label: "Fleet programs", perSecond: fleet.scrapPerSecond },
  ]);

  const rep = withSources(base(state, "rep", state.repPoints, "Rep Points", "var(--accent-secondary, #ff0090)"), [
    { label: "Race Rep", perSecond: (race?.repPerRace ?? 0) * flow.racesPerSecond },

  ]);

  const parts = withSources({
    id: "parts",
    label: "Parts",
    amount: state.inventory.length,
    perSecond: 0,
    cap: LOOSE_INVENTORY_LIMIT,
    visible: true,
    color: "var(--text-primary, #e8e6e3)",
  }, [
    { label: "Scavenged (kept)", perSecond: (scavenge?.keptPartsPerScavenge ?? 0) * flow.scavengesPerSecond },
    { label: "Race salvage", perSecond: (race?.salvagePerRace ?? 0) * flow.racesPerSecond },
  ]);

  const forgeTokens = withSources(base(state, "forge_tokens", state.forgeTokens, "Forge Tokens", "var(--accent-secondary, #c4872a)"), [
    { label: "Race salvage", perSecond: (race?.forgeTokensPerRace ?? 0) * flow.racesPerSecond },
  ]);

  const circuitTier = race?.circuitTier ?? (getCircuitById(state.selectedCircuitId)?.tier ?? 1);
  const fatigueFlow = fatigueFlows(state, circuitTier, flow.racesPerSecond);
  const fatigue = withSources({
    id: "fatigue",
    label: "Fatigue",
    amount: state.fatigue ?? 0,
    perSecond: 0,
    cap: getFatigueCap(state),
    visible: (state.lifetimeRaces ?? 0) > 0 || (state.fatigue ?? 0) > 0,
    color: "var(--danger, #d64545)",
  }, [
    { label: "Auto-race wear", perSecond: fatigueFlow.gainPerSecond },
    { label: "Rest (recovery)", perSecond: -fatigueFlow.recoveryPerSecond },
  ]);

  const projects = projectsRate(state);

  const lpNow = legacyAward(state, {
    lifetimeScrapBucks: state.lifetimeScrapBucks,
        earnedScrap: state.campaign?.runEarnedScrap ?? 0,
        featureWins: state.eventWins,
        rivalCount: state.campaign?.runRivalIds.length ?? 0,
    lifetimeRaces: state.lifetimeRaces,
    fatigue: state.fatigue ?? 0,
  });
  const elapsedSeconds = Math.max(1, (state.lastActiveTimestamp - state.campaign.runStartedAt) / 1000);
  const legacyProjection = withSources({
    id: "legacy_projection",
    label: "Legacy Points (reset now)",
    amount: lpNow,
    perSecond: 0,
    visible: state.garage.length > 0,
    color: "#a78bfa",
  }, [
    { label: "Earned LP per elapsed hour", perSecond: lpNow / elapsedSeconds },
  ]);

  const materials = (Object.entries(fleet.materials) as [MaterialType, number][]).map(([material, perSecond]) =>
    withSources({
      id: `material_${material}`,
      label: getMaterialById(material)?.name ?? material,
      amount: state.materials?.[material] ?? 0,
      perSecond: 0,
      visible: true,
      color: "var(--text-secondary, #b8b3ad)",
    }, [{ label: "Fleet programs", perSecond }]));

  const prestigeCurrencies = ["lp", "tp", "op", "pt"].map((id) => {
    const definition = currency(id)!;
    return { ...base(state, id, definition.getValue(state), definition.name, definition.color), sources: [] };
  });

  return [scrapBucks, rep, parts, forgeTokens, fatigue, projects, legacyProjection, ...materials, ...prestigeCurrencies];
}

/**
 * Rates are pure in the state object: Zustand replaces the object on every
 * change and reuses it between changes, so caching by identity makes calling
 * this on every render free between ticks.
 */
const cache = new WeakMap<GameState, ResourceRate[]>();

export function computeResourceRates(state: GameState): ResourceRate[] {
  const cached = cache.get(state);
  if (cached) return cached;
  const rates = computeRates(state);
  cache.set(state, rates);
  return rates;
}

/** One resource by id, from the same memoised derivation. */
export function getResourceRate(state: GameState, id: string): ResourceRate | undefined {
  return computeResourceRates(state).find((rate) => rate.id === id);
}
