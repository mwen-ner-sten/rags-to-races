/**
 * Mixed-play campaign simulation (Phase 2 pacing instrument).
 *
 * Models a real player's wall clock: a day is a fixed list of check-in
 * sessions; each session is a bounded stretch of greedy decisions made with
 * the real store actions (sell surplus, spend Rep, build, start a project,
 * pin the best contestable event, race until the auto-race fatigue ceiling,
 * manual-scavenge between races at the manual cooldown). Between sessions
 * the save goes through the same offline catch-up path the app runs on
 * resume (computeOfflineTickBudget + simulateOfflineTicks), so projects
 * finish, fatigue recovers, Rep decays and auto-race keeps racing while
 * rested, all under the offline catch-up cap.
 *
 * Everything routes through computeTick and the store, so the numbers this
 * prints move only when the game's own constants move.
 */
import { CONDITIONS, getPartById } from "@/data/parts";
import { CIRCUIT_DEFINITIONS, EVENT_LADDER, type CircuitDefinition, type EventId } from "@/data/circuits";
import { getLocationById, LOCATION_DEFINITIONS } from "@/data/locations";
import { getVehicleById, VEHICLE_DEFINITIONS, type VehicleDefinition } from "@/data/vehicles";
import { getUpgradeById } from "@/data/upgrades";
import { getWorkshopLineRepCost } from "@/engine/progressionUnlocks";
import { canScrapReset, getScrapResetProgress, SCRAP_RESET_REQUIREMENTS } from "@/config/progression";
import { computeOfflineTickBudget, computeTick, computeTickSpeedMs, getManualScavengeCooldownMs, simulateOfflineTicks } from "@/engine/tick";
import { AUTO_EVENT_MIN_WIN_CHANCE, chooseAutoEvent, expectedRaceOn, getActiveEventCircuit } from "@/engine/raceExpectation";
import { isEventOpen, nextEventToOpen, resolveEventCircuit, type EventCircuit } from "@/engine/eventLadder";
import { calculateScrapResetAward, deriveHighestCircuitTier } from "@/engine/prestige";
import { hasFreeProjectSlot } from "@/engine/projects";
import { calculateStats, compositePerformance } from "@/engine/build";
import { RIVAL_DEFINITIONS } from "@/data/rivals";
import { canEnterSelectedRace } from "@/engine/eligibility";
import { createInitialState, getVehicleBuildCost, getVehicleRepairCost, getWorkshopUpgradePurchaseCost, useGameStore, type GameState } from "@/state/store";
import { SeededRandomSource, withRandomSource } from "@/utils/random";

export const MS_PER_HOUR = 3_600_000;
export const MS_PER_DAY = 24 * MS_PER_HOUR;

/** Seconds a player spends reading a race debrief before the next entry. */
const RACE_REVIEW_MS = 5_000;
/** Glance at what a manual scavenge turned up, on top of the cooldown. */
const SCAVENGE_REVIEW_MS = 2_000;
/** Menu time for one purchase, build or repair. */
const DECISION_MS = 3_000;
/** How often within a session the player re-plans (sell, spend, build, pin). */
const REPLAN_EVERY_MS = 120_000;
/** Cash kept back from projects so the next entry fee and repair are covered. */
const CASH_RESERVE_FEES = 4;
/** Repair the active car below this condition when the bill is affordable. */
const REPAIR_BELOW_CONDITION = 50;
/** Rep valued in Scrap Bucks when scoring where to race. */
const REP_SCRAP_VALUE = 2;
/** A rival-hunting Feature is pinned once its win chance reaches this. */
const RIVAL_FEATURE_MIN_WIN_CHANCE = 0.25;
/**
 * The reset's own Feature is pinned at any odds once it is open: by then the
 * entry fee is pocket change and every entry is a ticket the card needs.
 */
const GOAL_FEATURE_MIN_WIN_CHANCE = 0;
/** Part swaps on a built car happen only for a clear composite gain. */
const SWAP_MIN_GAIN = 1.02;

/**
 * Workshop lines the greedy player starts, in order, whenever a slot is free
 * and cash allows. Auto-Repair leads: without it an unattended car wears
 * below the auto-race condition floor after ~10 races and idles until the
 * next visit.
 */
export const MIXED_PLAY_PROJECT_PRIORITY = [
  "auto_repair",
  "toolkit",
  "budget_repairs",
  "reinforced_chassis",
  "tuned_suspension",
  "keen_eye",
  "thorough_search",
  "bargain_builder",
  "tick_accelerator",
  "pit_crew",
] as const;

export interface MixedCampaignOptions {
  seed: string;
  /** Session start times as hours of the day, ascending (e.g. [8, 12.5, 18, 22]). */
  sessionHours: readonly number[];
  sessionMinutes: number;
  /** Give up after this many wall days. */
  maxDays: number;
  /** Re-plans allowed per session; fewer makes the run cheaper (test mode). */
  maxDecisionsPerSession?: number;
}

export interface DayReport {
  day: number;
  cash: number;
  rep: number;
  lifetimeRep: number;
  /** Highest venue with a win this run and the best event won there. */
  venue: string | null;
  event: EventId | null;
  garage: string[];
  projectsDone: number;
  projectsRunning: number;
  races: number;
  wins: number;
  rivals: number;
  fatigue: number;
  lpProjection: number;
}

export interface MixedCampaignResult {
  seed: string;
  reachedReset: boolean;
  /** Wall-clock days from the first session to the reset (null when not reached). */
  wallDays: number | null;
  wallHours: number | null;
  days: DayReport[];
  sessions: number;
  handsOnMinutes: number;
  manualScavenges: number;
  manualRaces: number;
  finalProgress: ReturnType<typeof getScrapResetProgress>;
  lpProjection: number;
}

export const MIXED_PLAY_DEFAULTS: MixedCampaignOptions = {
  seed: "mixed-campaign",
  sessionHours: [8, 12.5, 18, 22],
  sessionMinutes: 15,
  maxDays: 14,
};

export const PURE_IDLE_DEFAULTS: MixedCampaignOptions = {
  seed: "idle-campaign",
  sessionHours: [9],
  sessionMinutes: 5,
  maxDays: 21,
};

type Store = ReturnType<typeof useGameStore.getState>;

function state(): Store {
  return useGameStore.getState();
}

function withActiveVehicle(base: GameState, vehicleId: string): GameState {
  return base.activeVehicleId === vehicleId ? base : { ...base, activeVehicleId: vehicleId };
}

// ── Settlement ──────────────────────────────────────────────────────────────

function settleLiveTick(): void {
  const s = state();
  const result = computeTick(s);
  const outcome = result.raceOutcome;
  const streak = outcome ? (outcome.result === "win" ? s.winStreak + 1 : 0) : s.winStreak;
  s.applyTickResult(result.partsFound, result.scrapsEarned, result.repEarned, result.vehicleWearAmount || undefined, result.vehicleRepairAmount || undefined, result.newRaceTickProgress, result.lootGearDrops, result.modDrops, {
    partsScavenged: result.partsScavenged,
    partsAutoSold: result.partsAutoSold,
    scavengesCompleted: result.scavengesCompleted,
    racesCompleted: outcome ? 1 : 0,
    winsCompleted: outcome?.result === "win" ? 1 : 0,
    finalWinStreak: streak,
    bestWinStreak: Math.max(s.bestWinStreak, streak),
    recentRaceOutcomes: outcome ? [outcome] : [],
    winningCircuitIds: outcome?.result === "win" ? [outcome.circuitId] : [],
    defeatedRivalIds: outcome?.result === "win" && outcome.rivalId ? [outcome.rivalId] : [],
    circuitWinStreaks: outcome?.result === "win" ? { [outcome.circuitId]: streak } : {},
    raceSalvageFound: result.raceSalvageFound,
    forgeTokensFound: result.forgeTokensFound,
    entryFeesPaid: result.entryFeesPaid,
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

/** The app's resume path: elapsed wall time → bounded catch-up, applied once. */
export function idleOffline(elapsedMs: number): number {
  const s = state();
  const { ticks } = computeOfflineTickBudget(s, elapsedMs);
  if (ticks <= 0) return 0;
  const r = simulateOfflineTicks(s, ticks);
  s.applyTickResult(
    r.partsFound,
    r.scrapsEarned,
    r.repEarned,
    r.vehicleWearTotal > 0 ? r.vehicleWearTotal : undefined,
    r.vehicleRepairTotal > 0 ? r.vehicleRepairTotal : undefined,
    r.raceTickProgress,
    r.lootGearDrops.length > 0 ? r.lootGearDrops : undefined,
    r.modDrops.length > 0 ? r.modDrops : undefined,
    {
      partsScavenged: r.partsScavenged,
      partsAutoSold: r.partsAutoSold,
      scavengesCompleted: r.scavengesCompleted,
      racesCompleted: r.racesCompleted,
      winsCompleted: r.winsCompleted,
      finalWinStreak: r.finalWinStreak,
      bestWinStreak: r.bestWinStreak,
      recentRaceOutcomes: r.recentRaceOutcomes,
      winningCircuitIds: r.winningCircuitIds,
      defeatedRivalIds: r.defeatedRivalIds,
      circuitWinStreaks: r.circuitWinStreaks,
      eventWins: r.eventWins,
      raceSalvageFound: r.raceSalvageFound,
      forgeTokensFound: r.forgeTokensFound,
      entryFeesPaid: r.entryFeesPaid,
      challengesEvaluated: r.challengesEvaluated,
      completedChallengeIds: r.completedChallengeIds,
      challengeForgeTokens: r.challengeForgeTokens,
      challengeMaterials: r.challengeMaterials,
      ticksProcessed: r.ticksProcessed,
      repDecayed: r.repDecayed,
      finalFatigue: r.finalFatigue,
      finalRepPoints: r.finalRepPoints,
      finalVehicleCondition: r.finalVehicleCondition,
      finalRacerSkills: r.finalRacerSkills,
      finalCrewRoster: r.finalCrewRoster,
      finalActiveMomentumTiers: r.finalActiveMomentumTiers,
      newAchievementIds: r.newAchievementIds,
      stationEquipmentAutoSalvaged: r.stationEquipmentAutoSalvaged,
      reforgeShardsFound: r.reforgeShardsFound,
      finalProjects: r.finalProjects,
      completedProjects: r.completedProjects,
    },
  );
  return ticks;
}

// ── Greedy decisions ────────────────────────────────────────────────────────

/**
 * Keep the best copy of every part an unlocked blueprint can use (the next
 * build, or a swap onto a built car) plus the best part per category; sell
 * everything else so the pile never hits the inventory cap and auto-sells
 * the next build's parts.
 */
function sellSurplus(): boolean {
  const s = state();
  const wanted = new Set(VEHICLE_DEFINITIONS
    .filter((vehicle) => s.unlockedVehicleIds.includes(vehicle.id))
    .flatMap((vehicle) => vehicle.slots.flatMap((slot) => slot.acceptableParts)));
  const bestByKey = new Map<string, { id: string; rank: number }>();
  for (const part of s.inventory) {
    const rank = CONDITIONS.indexOf(part.condition);
    const keys = [`category:${getPartById(part.definitionId)?.category ?? "misc"}`];
    if (wanted.has(part.definitionId)) keys.push(`part:${part.definitionId}`);
    for (const key of keys) {
      const current = bestByKey.get(key);
      if (!current || rank > current.rank) bestByKey.set(key, { id: part.id, rank });
    }
  }
  const keep = new Set([...bestByKey.values()].map((entry) => entry.id));
  let sold = false;
  for (const part of s.inventory) {
    if (keep.has(part.id)) continue;
    state().sellPart(part.id);
    sold = true;
  }
  return sold;
}

function tryBuild(definition: VehicleDefinition): boolean {
  const s = state();
  const used = new Set<string>();
  const selected: Record<string, Store["inventory"][number]> = {};
  for (const slot of definition.slots) {
    if (!slot.required) continue;
    const part = s.inventory
      .filter((p) => !used.has(p.id) && slot.acceptableParts.includes(p.definitionId))
      .sort((a, b) => CONDITIONS.indexOf(b.condition) - CONDITIONS.indexOf(a.condition))[0];
    if (!part) return false;
    used.add(part.id);
    selected[slot.slot] = part;
  }
  if (s.scrapBucks < getVehicleBuildCost(s, definition)) return false;
  s.setPendingVehicle(definition.id);
  for (const [slot, part] of Object.entries(selected)) state().setPendingPart(slot, part);
  const before = state().garage.length;
  state().buildSelectedVehicle();
  return state().garage.length === before + 1;
}

/** Build the highest-tier unlocked blueprint the pile and the wallet allow. */
function buildBestVehicle(): boolean {
  const s = state();
  const built = new Set(s.garage.map((v) => v.definitionId));
  for (const vehicle of [...VEHICLE_DEFINITIONS].sort((a, b) => b.tier - a.tier)) {
    if (built.has(vehicle.id) || !s.unlockedVehicleIds.includes(vehicle.id)) continue;
    if (tryBuild(vehicle)) return true;
  }
  return false;
}

/**
 * Swap loose parts onto the active car wherever they raise its composite
 * performance (needs the Toolkit; the returned part degrades one step).
 */
function upgradeActiveVehicle(): boolean {
  const s = state();
  if ((s.workshopLevels.toolkit ?? 0) < 1) return false;
  const vehicle = s.garage.find((v) => v.id === s.activeVehicleId);
  const definition = vehicle ? getVehicleById(vehicle.definitionId) : undefined;
  if (!vehicle || !definition) return false;
  let swapped = false;
  for (const slot of definition.slots) {
    const current = state().garage.find((v) => v.id === vehicle.id)!;
    const installed = current.parts[slot.slot];
    if (!installed) continue;
    const baseline = compositePerformance(calculateStats(definition, current.parts, current.condition ?? 100));
    let best: { partId: string; performance: number } | null = null;
    for (const candidate of state().inventory) {
      if (candidate.type !== "part" || !slot.acceptableParts.includes(candidate.definitionId)) continue;
      const trial = { ...current.parts, [slot.slot]: { part: candidate, addons: installed.addons } };
      const performance = compositePerformance(calculateStats(definition, trial, current.condition ?? 100));
      if (performance >= baseline * SWAP_MIN_GAIN && (!best || performance > best.performance)) best = { partId: candidate.id, performance };
    }
    if (!best) continue;
    const part = state().inventory.find((p) => p.id === best!.partId);
    if (!part) continue;
    state().swapPart(vehicle.id, slot.slot, part);
    swapped = true;
  }
  return swapped;
}

interface RaceChoice {
  vehicleId: string;
  circuit: CircuitDefinition;
  eventId: EventId;
  score: number;
  winChance: number;
}

function scoreEvent(judged: GameState, event: EventCircuit, vehicleId: string, circuit: CircuitDefinition): RaceChoice | null {
  const expectation = expectedRaceOn(judged, event);
  if (!expectation) return null;
  return {
    vehicleId,
    circuit,
    eventId: event.eventId,
    score: expectation.scrapPerRace - expectation.entryFee + expectation.repPerRace * REP_SCRAP_VALUE,
    winChance: expectation.winChance,
  };
}

/**
 * Progression order: a higher venue the garage can contest (win chance at or
 * above the auto-race threshold) beats a lower one, because its Rep is what
 * opens the next rung; within a venue, and among uncontestable options, the
 * better payout wins.
 */
function preferRace(candidate: RaceChoice, incumbent: RaceChoice | null): boolean {
  if (!incumbent) return true;
  const candidateContestable = candidate.winChance >= AUTO_EVENT_MIN_WIN_CHANCE;
  const incumbentContestable = incumbent.winChance >= AUTO_EVENT_MIN_WIN_CHANCE;
  if (candidateContestable !== incumbentContestable) return candidateContestable;
  if (candidateContestable && candidate.circuit.tier !== incumbent.circuit.tier) return candidate.circuit.tier > incumbent.circuit.tier;
  return candidate.score > incumbent.score;
}

/**
 * Expected payout of `vehicleId` at `circuit`: the event auto-race would
 * enter, or, when judging a venue that is still locked, the best of its
 * three events as they will be once its ladder is climbed (the prize board
 * a player reads before paying the Rep).
 */
function scoreRace(s: GameState, vehicleId: string, circuit: CircuitDefinition, assumeLadderOpen = false): RaceChoice | null {
  const definition = getVehicleById(s.garage.find((v) => v.id === vehicleId)!.definitionId);
  if (!definition || definition.tier < circuit.minVehicleTier || definition.tier > circuit.maxVehicleTier) return null;
  const judged = withActiveVehicle(s, vehicleId);
  if (!assumeLadderOpen) return scoreEvent(judged, chooseAutoEvent(judged, circuit), vehicleId, circuit);
  let best: RaceChoice | null = null;
  for (const event of EVENT_LADDER) {
    const choice = scoreEvent(judged, resolveEventCircuit(circuit, event.id), vehicleId, circuit);
    if (choice && preferRace(choice, best)) best = choice;
  }
  return best;
}

/** The (vehicle, venue, event) with the best expected payout the garage can contest. */
function bestRace(s: GameState, circuits: readonly CircuitDefinition[] = CIRCUIT_DEFINITIONS.filter((c) => s.unlockedCircuitIds.includes(c.id)), assumeLadderOpen = false): RaceChoice | null {
  let best: RaceChoice | null = null;
  for (const circuit of circuits) {
    for (const vehicle of s.garage) {
      const choice = scoreRace(s, vehicle.id, circuit, assumeLadderOpen);
      if (choice && preferRace(choice, best)) best = choice;
    }
  }
  return best;
}

/**
 * Spend Rep on the unlock that raises expected income most: a venue a garage
 * car can already contest and that beats the current best race; otherwise the
 * next blueprint above the garage; otherwise the junkyard tier that carries
 * a part the next build is missing.
 */
function spendRep(): boolean {
  const s = state();
  const current = bestRace(s);
  const lockedVenues = CIRCUIT_DEFINITIONS
    .filter((c) => !s.unlockedCircuitIds.includes(c.id) && (!c.requiredFeature || s.unlockedFeatures.includes(c.requiredFeature)))
    .filter((c) => s.canAffordRep(c.unlockRepCost));
  let venuePick: RaceChoice | null = null;
  for (const circuit of lockedVenues) {
    const choice = bestRace(s, [circuit], true);
    if (choice && preferRace(choice, current) && preferRace(choice, venuePick)) venuePick = choice;
  }
  if (venuePick) {
    s.unlockCircuit(venuePick.circuit.id);
    return true;
  }

  // The blueprint worth Rep is the cheapest tier that can enter the next
  // venue on the ladder (a Street Racer for the Regional, a Stock Car for the
  // National); intermediate blueprints are skipped.
  const garageTop = Math.max(-1, ...s.garage.map((v) => getVehicleById(v.definitionId)?.tier ?? -1));
  const nextVenue = [...CIRCUIT_DEFINITIONS]
    .sort((a, b) => a.tier - b.tier)
    .find((c) => !s.unlockedCircuitIds.includes(c.id) && !c.requiredFeature);
  const candidates = [...VEHICLE_DEFINITIONS]
    .sort((a, b) => a.tier - b.tier)
    .filter((v) => !s.unlockedVehicleIds.includes(v.id) && v.unlockRequirement.type === "reputation" && v.tier > garageTop && !v.requiredFeature);
  const blueprint = candidates.find((v) => !nextVenue || v.tier >= nextVenue.minVehicleTier) ?? candidates[0];
  if (blueprint && blueprint.unlockRequirement.type === "reputation" && s.canAffordRep(blueprint.unlockRequirement.amount)) {
    s.unlockVehicle(blueprint.id);
    return true;
  }

  const maxPartTier = Math.max(...s.unlockedLocationIds.map((id) => {
    const location = getLocationById(id);
    return location ? (location.maxPartTier ?? location.tier) : 0;
  }));
  const built = new Set(s.garage.map((v) => v.definitionId));
  const needsDeeperYard = VEHICLE_DEFINITIONS.some((vehicle) =>
    s.unlockedVehicleIds.includes(vehicle.id) && !built.has(vehicle.id)
    && vehicle.slots.some((slot) => slot.required && slot.acceptableParts.every((id) => (getPartById(id)?.minTier ?? 0) > maxPartTier)));
  const nextLocation = [...LOCATION_DEFINITIONS].sort((a, b) => a.tier - b.tier).find((l) => !s.unlockedLocationIds.includes(l.id));
  if (needsDeeperYard && nextLocation && s.canAffordRep(nextLocation.unlockCost)) {
    s.unlockLocation(nextLocation.id);
    return true;
  }
  return false;
}

function cashReserve(s: GameState): number {
  const circuit = getActiveEventCircuit(s);
  const vehicle = s.garage.find((v) => v.id === s.activeVehicleId);
  const repair = vehicle ? getVehicleRepairCost(s, vehicle) : 0;
  return (circuit?.entryFee ?? 0) * CASH_RESERVE_FEES + repair;
}

/** Start the first affordable line on the priority list while a slot is free. */
function startProject(): boolean {
  const s = state();
  if (!hasFreeProjectSlot(s)) return false;
  const reserve = cashReserve(s);
  for (const upgradeId of MIXED_PLAY_PROJECT_PRIORITY) {
    const definition = getUpgradeById(upgradeId);
    if (!definition) continue;
    const level = s.workshopLevels[upgradeId] ?? 0;
    if (level >= definition.maxLevel) continue;
    if (s.projects.some((project) => project.upgradeId === upgradeId)) continue;
    const cost = getWorkshopUpgradePurchaseCost(s, upgradeId);
    if (cost === null || s.scrapBucks - cost < reserve) continue;
    const repCost = level === 0 ? (getWorkshopLineRepCost(upgradeId) ?? 0) : 0;
    if (repCost > 0 && !s.canAffordRep(repCost)) continue;
    const before = s.projects.length;
    s.purchaseUpgrade(upgradeId);
    if (state().projects.length > before) return true;
  }
  return false;
}

/**
 * What the first Scrap Reset still needs from the event ladder: the National
 * Feature win (so the National ladder is climbed rung by rung once the venue
 * is open), and rivals (Features only). The player pins those over the
 * best-paying event, the way a player reading the reset card would.
 */
function goalRace(s: GameState): RaceChoice | null {
  const progress = getScrapResetProgress(s);
  const needsFeature = progress.featureWins < 1;
  const needsRivals = progress.rivalsDefeated < SCRAP_RESET_REQUIREMENTS.rivalsDefeated;
  if (!needsFeature && !needsRivals) return null;
  let best: { choice: RaceChoice; value: number } | null = null;
  for (const circuit of CIRCUIT_DEFINITIONS) {
    if (!s.unlockedCircuitIds.includes(circuit.id)) continue;
    const venueWins = s.eventWins?.[circuit.id];
    const isGoalVenue = circuit.id === SCRAP_RESET_REQUIREMENTS.featureCircuitId;
    const chasingGoal = needsFeature && isGoalVenue;
    // The goal venue's ladder is climbed rung by rung; a rival hunt needs the Feature open.
    const eventId: EventId | null = chasingGoal ? (nextEventToOpen(venueWins) ?? "feature") : (isEventOpen("feature", venueWins) ? "feature" : null);
    if (!eventId) continue;
    const rivalsHere = RIVAL_DEFINITIONS.filter((rival) => circuit.tier >= rival.minCircuitTier && circuit.tier <= rival.maxCircuitTier && !s.defeatedRivalIds.includes(rival.id)).length;
    if (!chasingGoal && !(needsRivals && rivalsHere > 0)) continue;
    const event = resolveEventCircuit(circuit, eventId);
    for (const vehicle of s.garage) {
      const definition = getVehicleById(vehicle.definitionId);
      if (!definition || definition.tier < circuit.minVehicleTier || definition.tier > circuit.maxVehicleTier) continue;
      const expectation = expectedRaceOn(withActiveVehicle(s, vehicle.id), event);
      const threshold = chasingGoal ? GOAL_FEATURE_MIN_WIN_CHANCE : RIVAL_FEATURE_MIN_WIN_CHANCE;
      if (!expectation || expectation.winChance < threshold) continue;
      // The National ladder outranks a rival hunt; among rival venues, more rivals and better odds win.
      const value = (chasingGoal ? 10 : rivalsHere) * expectation.winChance;
      if (!best || value > best.value) best = { choice: { vehicleId: vehicle.id, circuit, eventId, score: value, winChance: expectation.winChance }, value };
    }
  }
  return best?.choice ?? null;
}

/**
 * Aim automation at what the reset card still needs (see goalRace): active
 * vehicle, venue and pinned rung. Returns false when nothing is pending, so
 * callers fall back to the best-paying race. Shared with the engaged-play
 * harness in src/state/__tests__/campaignPacing.test.ts.
 */
export function aimAtResetGoal(): boolean {
  const s = state();
  const goal = goalRace(s);
  if (!goal) return false;
  if (s.activeVehicleId !== goal.vehicleId) s.setActiveVehicle(goal.vehicleId);
  if (state().selectedCircuitId !== goal.circuit.id) state().setSelectedCircuit(goal.circuit.id);
  state().setSelectedEvent(goal.circuit.id, goal.eventId);
  return true;
}

/**
 * Point the garage at the best race: active vehicle, venue, best junkyard.
 * A reset-chasing Feature is pinned; otherwise the pin is cleared so the
 * auto chooser keeps entering the best contestable event as Heats and
 * Features open during the hours away.
 */
function aimGarage(): void {
  const s = state();
  const goal = goalRace(s);
  const choice = goal ?? bestRace(s);
  if (choice) {
    if (s.activeVehicleId !== choice.vehicleId) s.setActiveVehicle(choice.vehicleId);
    if (s.selectedCircuitId !== choice.circuit.id) state().setSelectedCircuit(choice.circuit.id);
    state().setSelectedEvent(choice.circuit.id, goal ? goal.eventId : null);
  }
  const bestLocation = state().unlockedLocationIds
    .map((id) => getLocationById(id)!)
    .sort((a, b) => b.tier - a.tier)[0];
  if (bestLocation && state().selectedLocationId !== bestLocation.id) state().setSelectedLocation(bestLocation.id);
}

/** Bound on repeated purchases in one visit (each unlock re-evaluates the next). */
const MAX_PURCHASES_PER_PLAN = 8;

/** One re-plan: spend everything that is worth spending now; returns the menu time it cost. */
function plan(): number {
  let actions = 0;
  if (sellSurplus()) actions++;
  for (let purchases = 0; purchases < MAX_PURCHASES_PER_PLAN && spendRep(); purchases++) actions++;
  for (let builds = 0; builds < MAX_PURCHASES_PER_PLAN && buildBestVehicle(); builds++) actions++;
  for (let projects = 0; projects < MAX_PURCHASES_PER_PLAN && startProject(); projects++) actions++;
  aimGarage();
  if (upgradeActiveVehicle()) actions++;
  return Math.max(1, actions) * DECISION_MS;
}

function repairIfNeeded(): boolean {
  const s = state();
  const vehicle = s.garage.find((v) => v.id === s.activeVehicleId);
  if (!vehicle || (vehicle.condition ?? 100) >= REPAIR_BELOW_CONDITION) return false;
  const cost = getVehicleRepairCost(s, vehicle);
  const fee = getActiveEventCircuit(s)?.entryFee ?? 0;
  if (s.scrapBucks < cost + fee) return false;
  s.repairVehicle(vehicle.id);
  return true;
}

interface SessionStats {
  races: number;
  scavenges: number;
}

/**
 * Whether an unlocked blueprint is waiting on a part the pile lacks that the
 * selected junkyard can turn up. Manual scavenging then beats a manual race:
 * races only spend fatigue automation would spend anyway, while every extra
 * scavenge is a new roll at the missing part.
 */
function sourcingNeeded(s: GameState): boolean {
  const location = getLocationById(s.selectedLocationId);
  if (!location) return false;
  const maxPartTier = location.maxPartTier ?? location.tier;
  const built = new Set(s.garage.map((v) => v.definitionId));
  const held = new Set(s.inventory.map((part) => part.definitionId));
  return VEHICLE_DEFINITIONS.some((vehicle) =>
    s.unlockedVehicleIds.includes(vehicle.id) && !built.has(vehicle.id)
    && vehicle.slots.some((slot) => slot.required
      && !slot.acceptableParts.some((id) => held.has(id))
      && slot.acceptableParts.some((id) => (getPartById(id)?.minTier ?? 0) <= maxPartTier)));
}

/** Race while rested and funded; otherwise scavenge at the manual cooldown. Returns the action's length. */
function act(stats: SessionStats): number {
  if (repairIfNeeded()) return DECISION_MS;
  const s = state();
  const circuit = getActiveEventCircuit(s);
  const vehicle = s.garage.find((v) => v.id === s.activeVehicleId);
  const rested = (s.fatigue ?? 0) <= s.autoRaceMaxFatigue;
  const healthy = (vehicle?.condition ?? 0) >= s.autoRaceMinCondition;
  if (circuit && vehicle && rested && healthy && !s.isRacing && !sourcingNeeded(s) && canEnterSelectedRace(s, circuit)) {
    s.enterRace();
    stats.races++;
    return circuit.raceDuration + RACE_REVIEW_MS;
  }
  s.manualScavenge();
  stats.scavenges++;
  return getManualScavengeCooldownMs(s) + SCAVENGE_REVIEW_MS;
}

/**
 * Leaving the garage: repair the active car if the wallet allows so the hours
 * away are spent racing, not parked under the auto-race condition floor, and
 * re-aim automation at the current best race.
 */
function leaveGarage(): number {
  const s = state();
  const vehicle = s.garage.find((v) => v.id === s.activeVehicleId);
  let actions = 0;
  if (vehicle && (vehicle.condition ?? 100) < 100) {
    const fee = getActiveEventCircuit(s)?.entryFee ?? 0;
    if (s.scrapBucks >= getVehicleRepairCost(s, vehicle) + fee) {
      s.repairVehicle(vehicle.id);
      actions++;
    }
  }
  aimGarage();
  return Math.max(1, actions) * DECISION_MS;
}

function runSession(options: MixedCampaignOptions, stats: SessionStats): number {
  const budgetMs = options.sessionMinutes * 60_000;
  const maxDecisions = options.maxDecisionsPerSession ?? Number.POSITIVE_INFINITY;
  let elapsed = 0;
  let sinceTick = 0;
  let sinceReplan = Number.POSITIVE_INFINITY;
  let decisions = 0;
  while (elapsed < budgetMs) {
    if (canScrapReset(getScrapResetProgress(state()))) break;
    let step: number;
    if (sinceReplan >= REPLAN_EVERY_MS && decisions < maxDecisions) {
      step = plan();
      decisions++;
      sinceReplan = 0;
    } else {
      step = act(stats);
    }
    elapsed += step;
    sinceTick += step;
    sinceReplan += step;
    const tickMs = computeTickSpeedMs(state());
    while (sinceTick >= tickMs) {
      settleLiveTick();
      sinceTick -= tickMs;
    }
  }
  return elapsed + leaveGarage();
}

// ── Reporting ───────────────────────────────────────────────────────────────

const EVENT_ORDER: EventId[] = ["sprint", "heat", "feature"];

function highestWin(s: GameState): { venue: string | null; event: EventId | null } {
  let best: { venue: string; event: EventId; tier: number; rank: number } | null = null;
  for (const [venueId, wins] of Object.entries(s.eventWins ?? {})) {
    const tier = CIRCUIT_DEFINITIONS.find((c) => c.id === venueId)?.tier ?? -1;
    for (const event of EVENT_ORDER) {
      if ((wins[event] ?? 0) <= 0) continue;
      const rank = EVENT_ORDER.indexOf(event);
      if (!best || tier > best.tier || (tier === best.tier && rank > best.rank)) best = { venue: venueId, event, tier, rank };
    }
  }
  return { venue: best?.venue ?? null, event: best?.event ?? null };
}

export function projectLp(s: GameState): number {
  return calculateScrapResetAward({
    currentPrestigeCount: s.prestigeCount,
    runStats: {
      lifetimeScrapBucks: s.lifetimeScrapBucks,
      lifetimeRaces: s.lifetimeRaces,
      fatigue: s.fatigue,
      highestCircuitTier: deriveHighestCircuitTier(s.unlockedCircuitIds),
      workshopUpgradesBought: Object.values(s.workshopLevels).reduce((sum, level) => sum + level, 0),
    },
    activeMomentumTierIds: s.activeMomentumTiers,
    teamUpgradeLevels: s.teamUpgradeLevels,
    trackPerkLevels: s.trackPerkLevels,
    earnedAchievements: s.earnedAchievements,
    unlockedPlaystyleNodes: s.unlockedPlaystyleNodes,
    crewRoster: s.crewRoster,
  }).totalLp;
}

function dayReport(day: number): DayReport {
  const s = state();
  const { venue, event } = highestWin(s);
  return {
    day,
    cash: Math.round(s.scrapBucks),
    rep: Math.round(s.repPoints),
    lifetimeRep: Math.round(s.lifetimeRep),
    venue,
    event,
    garage: s.garage.map((v) => v.definitionId),
    projectsDone: Object.values(s.workshopLevels).reduce((sum, level) => sum + level, 0) + s.lifetimeTotalEnhanced,
    projectsRunning: s.projects.length,
    races: s.lifetimeRaces,
    wins: s.lifetimeWinsAllTime,
    rivals: s.defeatedRivalIds.length,
    fatigue: Math.round(s.fatigue),
    lpProjection: projectLp(s),
  };
}

// ── Driver ──────────────────────────────────────────────────────────────────

/** Manual races settle through setTimeout; the simulation runs them synchronously. */
function withSynchronousTimers<T>(callback: () => T): T {
  const real = globalThis.setTimeout;
  globalThis.setTimeout = ((handler: (...args: unknown[]) => void, _delay?: number, ...args: unknown[]) => {
    handler(...args);
    return 0 as unknown as ReturnType<typeof setTimeout>;
  }) as typeof setTimeout;
  try {
    return callback();
  } finally {
    globalThis.setTimeout = real;
  }
}

export function runMixedCampaign(options: MixedCampaignOptions): MixedCampaignResult {
  const hours = [...options.sessionHours].sort((a, b) => a - b);
  if (hours.length === 0) throw new Error("runMixedCampaign needs at least one session per day");
  useGameStore.setState({ ...createInitialState(), tutorialStep: -1, tutorialDismissed: true });

  const days: DayReport[] = [];
  const stats: SessionStats = { races: 0, scavenges: 0 };
  let sessions = 0;
  let handsOnMs = 0;
  let wallMs: number | null = null;
  const start = hours[0] * MS_PER_HOUR;

  withRandomSource(new SeededRandomSource(options.seed), () => withSynchronousTimers(() => {
    let clock = start;
    for (let day = 1; day <= options.maxDays && wallMs === null; day++) {
      for (let index = 0; index < hours.length; index++) {
        const sessionStart = (day - 1) * MS_PER_DAY + hours[index] * MS_PER_HOUR;
        if (sessionStart > clock) {
          idleOffline(sessionStart - clock);
          clock = sessionStart;
        }
        const sessionMs = runSession(options, stats);
        handsOnMs += sessionMs;
        sessions++;
        clock = sessionStart + sessionMs;
        if (canScrapReset(getScrapResetProgress(state()))) {
          wallMs = clock - start;
          break;
        }
      }
      days.push(dayReport(day));
    }
  }));

  const final = state();
  return {
    seed: options.seed,
    reachedReset: wallMs !== null,
    wallDays: wallMs === null ? null : Number((wallMs / MS_PER_DAY).toFixed(2)),
    wallHours: wallMs === null ? null : Number((wallMs / MS_PER_HOUR).toFixed(1)),
    days,
    sessions,
    handsOnMinutes: Number((handsOnMs / 60_000).toFixed(1)),
    manualScavenges: stats.scavenges,
    manualRaces: stats.races,
    finalProgress: getScrapResetProgress(final),
    lpProjection: projectLp(final),
  };
}
