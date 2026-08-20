import { CIRCUIT_DEFINITIONS } from "@/data/circuits";
import { CONDITIONS } from "@/data/parts";
import { getLocationById } from "@/data/locations";
import { CAMPAIGN_PACING_TARGETS_HOURS, type CampaignLayer } from "@/data/campaignPacing";
import { getVehicleById } from "@/data/vehicles";
import { RESPONSIBILITY_RESET_REQUIREMENTS, SCRAP_RESET_REQUIREMENTS, canOwnerReset, canScrapReset, canTeamReset, canTrackReset } from "@/config/progression";
import { createInitialState, getVehicleBuildCost, getVehicleRepairCost, useGameStore, type GameState } from "@/state/store";
import { SeededRandomSource, withRandomSource } from "@/utils/random";
import { applyDevSimulation, runSeededTicks } from "./devAcceleration";

export type OracleStopAfter = CampaignLayer;
export type OracleStatus = "reached_stop_after" | "stalled" | "iteration_limit";

type CurrencyName = "scrapBucks" | "legacyPoints" | "teamPoints" | "ownerPoints" | "trackPrestigeTokens";
type ResetLayer = CampaignLayer;

export interface OracleLimits {
  totalIterations: number;
  scavengesPerVehicle: number;
  cashScavenges: number;
  racesPerScrapEra: number;
}

export interface OracleMilestone {
  id: string;
  modeledHours: number;
  activeHours: number;
  idleHours: number;
  iteration: number;
  details?: Record<string, unknown>;
}

export interface ConnectedCampaignLedger {
  seed: string;
  stopAfter: OracleStopAfter;
  status: OracleStatus;
  initialAccounting: ReturnType<typeof accountingSnapshot>;
  finalAccounting: ReturnType<typeof accountingSnapshot>;
  accountingViolations: string[];
  elapsed: { modeledHours: number; activeHours: number; idleHours: number };
  actions: { manual: Record<string, number>; automatic: Record<string, number> };
  races: { total: number; wins: number; losses: number; dnfs: number };
  maintenance: { repairs: number; stalls: Array<Record<string, unknown>>; autoRaceStops: Array<Record<string, unknown>> };
  currencies: Record<CurrencyName, { earned: number; spent: number }>;
  resets: Record<ResetLayer, { count: number; awards: number[] }>;
  milestones: OracleMilestone[];
  targetComparison: Partial<Record<CampaignLayer, { modeledHours: number; target: { min: number; max: number }; withinTarget: boolean }>>;
  diagnostics: { iterations: number; reason: string | null; nextGate: ReturnType<typeof nextGateDiagnostic>; state: ReturnType<typeof diagnosticSnapshot> };
}

const DEFAULT_LIMITS: OracleLimits = {
  totalIterations: 20_000,
  scavengesPerVehicle: 240,
  cashScavenges: 160,
  racesPerScrapEra: 450,
};

const VEHICLE_ORDER = ["push_mower", "riding_mower", "go_kart", "street_racer"] as const;
const AUTOMATION_OBSERVATION_TICKS = 120;

function accountingSnapshot(state = useGameStore.getState()) {
  return {
    legacyPoints: state.legacyPoints,
    lifetimeLegacyPoints: state.lifetimeLegacyPoints,
    legacyPointsThisTeamEra: state.lifetimeLPThisTeamEra,
    teamPoints: state.teamPoints,
    lifetimeTeamPoints: state.lifetimeTeamPoints,
    teamPointsThisOwnerEra: state.lifetimeTPThisOwnerEra,
    ownerPoints: state.ownerPoints,
    lifetimeOwnerPoints: state.lifetimeOwnerPoints,
    ownerPointsThisTrackEra: state.lifetimeOPThisTrackEra,
    scrapResets: state.lifetimeScrapResets,
    teamResets: state.teamEraCount,
    ownerResets: state.ownerEraCount,
    trackResets: state.trackEraCount,
  };
}

function diagnosticSnapshot(state = useGameStore.getState()) {
  return {
    scrapBucks: state.scrapBucks,
    lifetimeScrapBucks: state.lifetimeScrapBucks,
    reputation: state.repPoints,
    vehicles: state.garage.map((vehicle) => ({ id: vehicle.definitionId, condition: vehicle.condition })),
    unlockedVehicles: state.unlockedVehicleIds,
    unlockedLocations: state.unlockedLocationIds,
    unlockedCircuits: state.unlockedCircuitIds,
    isRacing: state.isRacing,
    autoScavengeUnlocked: state.autoScavengeUnlocked,
    autoRaceUnlocked: state.autoRaceUnlocked,
    ...accountingSnapshot(state),
  };
}

function accountingViolations(state: GameState): string[] {
  const violations: string[] = [];
  if (state.legacyPoints > state.lifetimeLegacyPoints) violations.push("current LP exceeds lifetime LP");
  if (state.lifetimeLPThisTeamEra > state.lifetimeLPAllTime) violations.push("Team-era LP exceeds all-time LP");
  if (state.teamPoints > state.lifetimeTeamPoints) violations.push("current TP exceeds lifetime TP");
  if (state.lifetimeTPThisOwnerEra > state.lifetimeTeamPoints) violations.push("Owner-era TP exceeds lifetime TP");
  if (state.ownerPoints > state.lifetimeOwnerPoints) violations.push("current OP exceeds lifetime OP");
  if (state.lifetimeOPThisTrackEra > state.lifetimeOwnerPoints) violations.push("Track-era OP exceeds lifetime OP");
  if (state.lifetimeTPThisOwnerEra > 0 && state.teamEraCount === 0) violations.push("Owner-era TP exists without a Team era");
  if (state.lifetimeOPThisTrackEra > 0 && state.ownerEraCount === 0) violations.push("Track-era OP exists without an Owner era");
  return violations;
}

function nextGateDiagnostic(state: GameState, stopAfter: OracleStopAfter) {
  const remaining = (required: Record<string, number>, current: Record<string, number>) =>
    Object.fromEntries(Object.entries(required).map(([name, value]) => [name, Math.max(0, value - (current[name] ?? 0))]));
  if (state.lifetimeScrapResets === 0) {
    const required = { ...SCRAP_RESET_REQUIREMENTS };
    const current = { vehiclesBuilt: state.garage.length, reputation: state.repPoints, lifetimeScrapBucks: state.lifetimeScrapBucks };
    return { layer: "scrap" as const, current, required, remaining: remaining(required, current) };
  }
  if (stopAfter !== "scrap" && state.teamEraCount === 0) {
    const required = { ...RESPONSIBILITY_RESET_REQUIREMENTS.team };
    const current = { lifetimeLegacyPoints: state.lifetimeLPAllTime };
    return { layer: "team" as const, current, required, remaining: remaining(required, current) };
  }
  if ((stopAfter === "owner" || stopAfter === "track") && state.ownerEraCount === 0) {
    const required = { ...RESPONSIBILITY_RESET_REQUIREMENTS.owner };
    const current = { lifetimeTeamPoints: state.lifetimeTeamPoints, teamEras: state.teamEraCount };
    return { layer: "owner" as const, current, required, remaining: remaining(required, current) };
  }
  const required = { ...RESPONSIBILITY_RESET_REQUIREMENTS.track };
  const current = { lifetimeOwnerPoints: state.lifetimeOwnerPoints, ownerEras: state.ownerEraCount };
  return { layer: "track" as const, current, required, remaining: remaining(required, current) };
}

function bestLocationId(state: GameState): string {
  const location = state.unlockedLocationIds
    .map((id) => getLocationById(id))
    .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))
    .sort((left, right) => right.tier - left.tier)[0];
  if (!location) throw new Error("No unlocked scavenging location");
  return location.id;
}

function tryBuild(vehicleId: string): boolean {
  const state = useGameStore.getState();
  const definition = getVehicleById(vehicleId);
  if (!definition || !state.unlockedVehicleIds.includes(vehicleId)) return false;
  const usedIds = new Set<string>();
  const selected = Object.fromEntries(definition.slots.flatMap((slot) => {
    if (!slot.required) return [];
    const part = state.inventory
      .filter((candidate) => !usedIds.has(candidate.id) && slot.acceptableParts.includes(candidate.definitionId))
      .sort((left, right) => CONDITIONS.indexOf(right.condition) - CONDITIONS.indexOf(left.condition))[0];
    if (!part) return [];
    usedIds.add(part.id);
    return [[slot.slot, part]];
  }));
  if (definition.slots.some((slot) => slot.required && !selected[slot.slot])) return false;
  for (const part of state.inventory) if (!usedIds.has(part.id)) useGameStore.getState().sellPart(part.id);
  if (useGameStore.getState().scrapBucks < getVehicleBuildCost(useGameStore.getState(), definition)) return false;
  useGameStore.getState().setPendingVehicle(vehicleId);
  for (const [slot, part] of Object.entries(selected)) useGameStore.getState().setPendingPart(slot, part);
  const before = useGameStore.getState().garage.length;
  useGameStore.getState().buildSelectedVehicle();
  return useGameStore.getState().garage.length === before + 1;
}

function settleManualRaceImmediately(enterRace: () => void): boolean {
  const originalSetTimeout = globalThis.setTimeout;
  let settlement: (() => void) | null = null;
  globalThis.setTimeout = ((handler: TimerHandler) => {
    if (typeof handler === "function") settlement = handler as () => void;
    return 0 as unknown as ReturnType<typeof setTimeout>;
  }) as unknown as typeof setTimeout;
  try {
    enterRace();
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }
  if (!settlement) return false;
  (settlement as () => void)();
  return true;
}

export function runConnectedCampaignOracle(options: {
  seed: string;
  stopAfter?: OracleStopAfter;
  limits?: Partial<OracleLimits>;
}): ConnectedCampaignLedger {
  const stopAfter = options.stopAfter ?? "track";
  const limits = { ...DEFAULT_LIMITS, ...options.limits };
  useGameStore.setState(createInitialState());
  const initialAccounting = accountingSnapshot();
  const milestones: OracleMilestone[] = [];
  const actions = { manual: {} as Record<string, number>, automatic: {} as Record<string, number> };
  const races = { total: 0, wins: 0, losses: 0, dnfs: 0 };
  const maintenance = { repairs: 0, stalls: [] as Array<Record<string, unknown>>, autoRaceStops: [] as Array<Record<string, unknown>> };
  const currencies = Object.fromEntries(["scrapBucks", "legacyPoints", "teamPoints", "ownerPoints", "trackPrestigeTokens"].map((name) => [name, { earned: 0, spent: 0 }])) as ConnectedCampaignLedger["currencies"];
  const resets: ConnectedCampaignLedger["resets"] = {
    scrap: { count: 0, awards: [] }, team: { count: 0, awards: [] }, owner: { count: 0, awards: [] }, track: { count: 0, awards: [] },
  };
  const targetComparison: ConnectedCampaignLedger["targetComparison"] = {};
  let activeMs = 0;
  let idleMs = 0;
  let iterations = 0;
  let automaticTicks = 0;
  let status: OracleStatus = "iteration_limit";
  let reason: string | null = null;

  const reachedStopAfter = () => resets[stopAfter].count >= 1;

  const modeledHours = () => (activeMs + idleMs) / 3_600_000;
  const count = (kind: "manual" | "automatic", action: string, amount = 1) => {
    actions[kind][action] = (actions[kind][action] ?? 0) + amount;
  };
  const milestone = (id: string, details?: Record<string, unknown>) => {
    if (milestones.some((entry) => entry.id === id)) return;
    milestones.push({ id, modeledHours: modeledHours(), activeHours: activeMs / 3_600_000, idleHours: idleMs / 3_600_000, iteration: iterations, details });
  };
  const recordCurrencyDelta = (before: GameState, after: GameState, names: CurrencyName[]) => {
    const lifetimeField: Partial<Record<CurrencyName, keyof GameState>> = {
      scrapBucks: "lifetimeScrapBucks",
      legacyPoints: "lifetimeLPAllTime",
      teamPoints: "lifetimeTeamPoints",
      ownerPoints: "lifetimeOwnerPoints",
    };
    for (const name of names) {
      const balanceDelta = after[name] - before[name];
      const lifetimeName = lifetimeField[name];
      const lifetimeDelta = lifetimeName
        ? Number(after[lifetimeName]) - Number(before[lifetimeName])
        : balanceDelta;
      const earned = lifetimeDelta >= 0 ? lifetimeDelta : Math.max(0, balanceDelta);
      const spent = Math.max(0, earned - balanceDelta);
      currencies[name].earned += earned;
      currencies[name].spent += spent;
    }
  };
  const scavenge = () => {
    const before = useGameStore.getState();
    before.setSelectedLocation(bestLocationId(before));
    before.manualScavenge();
    const after = useGameStore.getState();
    count("manual", "scavenge");
    activeMs += 6_000;
    recordCurrencyDelta(before, after, ["scrapBucks"]);
    if (!before.autoScavengeUnlocked && after.autoScavengeUnlocked) milestone("auto_scavenge_unlocked");
  };
  const sellJunk = () => {
    const before = useGameStore.getState();
    before.sellAllJunk();
    const after = useGameStore.getState();
    count("manual", "sell_all_junk");
    activeMs += 2_000;
    recordCurrencyDelta(before, after, ["scrapBucks"]);
  };

  const runAutomaticTick = () => {
    const before = useGameStore.getState();
    const result = runSeededTicks(before, 1, `${options.seed}:automatic:${automaticTicks}`);
    applyDevSimulation(before, result);
    const after = useGameStore.getState();
    automaticTicks += result.ticksProcessed;
    count("automatic", "ticks", result.ticksProcessed);
    count("automatic", "scavenges", result.scavengesCompleted);
    count("automatic", "races", result.racesCompleted);
    idleMs += result.tickSpeedMs * result.ticksProcessed;
    recordCurrencyDelta(before, after, ["scrapBucks"]);
    if (result.scavengesCompleted > 0) milestone("first_automatic_scavenge");
    if (result.racesCompleted > 0) milestone("first_automatic_race");
    for (const outcome of result.recentRaceOutcomes) {
      races.total += 1;
      races.wins += outcome.result === "win" ? 1 : 0;
      races.losses += outcome.result === "loss" ? 1 : 0;
      races.dnfs += outcome.result === "dnf" ? 1 : 0;
    }
    return result;
  };

  const observeAutomaticRacing = () => {
    for (let tick = 0; tick < AUTOMATION_OBSERVATION_TICKS; tick += 1) {
      const before = useGameStore.getState();
      const activeBefore = before.garage.find((vehicle) => vehicle.id === before.activeVehicleId);
      const result = runAutomaticTick();
      const after = useGameStore.getState();
      const activeAfter = after.garage.find((vehicle) => vehicle.id === after.activeVehicleId);
      if ((activeBefore?.condition ?? 0) > 0 && (activeAfter?.condition ?? 0) <= 0) {
        maintenance.autoRaceStops.push({
          reason: "condition_zero",
          modeledHours: modeledHours(),
          vehicleId: activeAfter?.definitionId,
          stoppedAfterTicks: tick + 1,
          lostIdleHours: ((AUTOMATION_OBSERVATION_TICKS - tick - 1) * result.tickSpeedMs) / 3_600_000,
        });
      }
    }
  };

  const sourceVehicle = (vehicleId: string): boolean => {
    for (let attempt = 0; attempt < limits.scavengesPerVehicle; attempt += 1) {
      const beforeBuild = useGameStore.getState();
      const built = tryBuild(vehicleId);
      recordCurrencyDelta(beforeBuild, useGameStore.getState(), ["scrapBucks"]);
      if (built) {
        count("manual", "build_vehicle");
        activeMs += 15_000;
        if (!milestones.some((entry) => entry.id === "first_vehicle")) milestone("first_vehicle", { vehicleId });
        return true;
      }
      const state = useGameStore.getState();
      if (state.autoScavengeUnlocked && state.lifetimeScrapResets > 0 && state.garage.length === 0) runAutomaticTick();
      else scavenge();
    }
    return false;
  };

  const runRace = (): boolean => {
    let upgradeState = useGameStore.getState();
    if ((upgradeState.workshopLevels.budget_repairs ?? 0) < 2 && upgradeState.scrapBucks >= 250) {
      const before = upgradeState;
      before.purchaseUpgrade("budget_repairs");
      upgradeState = useGameStore.getState();
      if ((upgradeState.workshopLevels.budget_repairs ?? 0) > (before.workshopLevels.budget_repairs ?? 0)) {
        count("manual", "purchase_workshop_upgrade");
        activeMs += 5_000;
        recordCurrencyDelta(before, upgradeState, ["scrapBucks"]);
      }
    }
    if ((upgradeState.workshopLevels.reinforced_chassis ?? 0) < 2 && upgradeState.scrapBucks >= 400) {
      const before = upgradeState;
      before.purchaseUpgrade("reinforced_chassis");
      upgradeState = useGameStore.getState();
      if ((upgradeState.workshopLevels.reinforced_chassis ?? 0) > (before.workshopLevels.reinforced_chassis ?? 0)) {
        count("manual", "purchase_workshop_upgrade");
        activeMs += 5_000;
        recordCurrencyDelta(before, upgradeState, ["scrapBucks"]);
      }
    }
    const state = useGameStore.getState();
    const candidate = CIRCUIT_DEFINITIONS
      .filter((circuit) => state.unlockedCircuitIds.includes(circuit.id))
      .flatMap((circuit) => state.garage.flatMap((vehicle) => {
        const definition = getVehicleById(vehicle.definitionId);
        return definition && definition.tier >= circuit.minVehicleTier && definition.tier <= circuit.maxVehicleTier
          ? [{ circuit, vehicle, definition }]
          : [];
      }))
      .sort((left, right) => right.circuit.tier - left.circuit.tier || right.definition.tier - left.definition.tier)[0];
    if (!candidate) {
      maintenance.stalls.push({ reason: "no_eligible_race", modeledHours: modeledHours(), state: diagnosticSnapshot() });
      return false;
    }
    state.setActiveVehicle(candidate.vehicle.id);
    state.setSelectedCircuit(candidate.circuit.id);
    const selected = useGameStore.getState().garage.find((vehicle) => vehicle.id === candidate.vehicle.id)!;
    const repairCost = (selected.condition ?? 100) < 35 ? getVehicleRepairCost(useGameStore.getState(), selected) : 0;
    const cashNeeded = repairCost + candidate.circuit.entryFee;
    for (let attempt = 0; attempt < limits.cashScavenges && useGameStore.getState().scrapBucks < cashNeeded; attempt += 1) {
      scavenge();
      sellJunk();
    }
    const repairState = useGameStore.getState();
    const repairVehicle = repairState.garage.find((vehicle) => vehicle.id === candidate.vehicle.id)!;
    if ((repairVehicle.condition ?? 100) < 35) {
      const before = useGameStore.getState();
      before.repairVehicle(repairVehicle.id);
      const after = useGameStore.getState();
      if ((after.garage.find((vehicle) => vehicle.id === repairVehicle.id)?.condition ?? 0) > (repairVehicle.condition ?? 0)) {
        maintenance.repairs += 1;
        count("manual", "repair_vehicle");
        activeMs += 8_000;
        recordCurrencyDelta(before, after, ["scrapBucks"]);
      }
    }
    const before = useGameStore.getState();
    if (before.scrapBucks < candidate.circuit.entryFee) {
      maintenance.stalls.push({ reason: "insufficient_race_cash", modeledHours: modeledHours(), needed: candidate.circuit.entryFee, state: diagnosticSnapshot() });
      return false;
    }
    const lifetimeRacesBefore = before.lifetimeRacesAllTime;
    const settled = settleManualRaceImmediately(() => useGameStore.getState().enterRace());
    const after = useGameStore.getState();
    if (!settled || after.lifetimeRacesAllTime <= lifetimeRacesBefore) {
      maintenance.stalls.push({ reason: "race_action_rejected", modeledHours: modeledHours(), state: diagnosticSnapshot() });
      return false;
    }
    const outcome = after.raceHistory[0];
    races.total += 1;
    races.wins += outcome.result === "win" ? 1 : 0;
    races.losses += outcome.result === "loss" ? 1 : 0;
    races.dnfs += outcome.result === "dnf" ? 1 : 0;
    count("manual", "race");
    activeMs += candidate.circuit.raceDuration + 12_000;
    recordCurrencyDelta(before, after, ["scrapBucks"]);
    if (races.total === 1) milestone("first_race", { circuitId: candidate.circuit.id, result: outcome.result });
    return true;
  };

  const finishScrapEra = (): boolean => {
    for (const vehicleId of VEHICLE_ORDER) {
      if (useGameStore.getState().garage.some((vehicle) => vehicle.definitionId === vehicleId)) continue;
      if (!useGameStore.getState().unlockedVehicleIds.includes(vehicleId)) continue;
      if (!sourceVehicle(vehicleId)) {
        maintenance.stalls.push({ reason: "vehicle_source_limit", modeledHours: modeledHours(), vehicleId, limit: limits.scavengesPerVehicle, state: diagnosticSnapshot() });
        return false;
      }
      if (useGameStore.getState().garage.length >= 3) break;
    }
    if (useGameStore.getState().garage[0] && !useGameStore.getState().activeVehicleId) useGameStore.getState().setActiveVehicle(useGameStore.getState().garage[0].id);
    if (useGameStore.getState().lifetimeScrapResets > 0 && useGameStore.getState().autoRaceUnlocked) observeAutomaticRacing();
    for (let race = 0; race < limits.racesPerScrapEra; race += 1) {
      const current = useGameStore.getState();
      if (current.garage.length < 3) {
        const builtTypes = new Set(current.garage.map((vehicle) => vehicle.definitionId));
        for (const vehicleId of VEHICLE_ORDER) {
          if (builtTypes.has(vehicleId) || !current.unlockedVehicleIds.includes(vehicleId)) continue;
          const requiredLocationTier = vehicleId === "push_mower" || vehicleId === "riding_mower" ? 1 : vehicleId === "go_kart" ? 2 : 3;
          if (!current.unlockedLocationIds.some((id) => (getLocationById(id)?.tier ?? -1) >= requiredLocationTier)) continue;
          if (!sourceVehicle(vehicleId)) {
            maintenance.stalls.push({ reason: "vehicle_source_limit", modeledHours: modeledHours(), vehicleId, limit: limits.scavengesPerVehicle, state: diagnosticSnapshot() });
            return false;
          }
          builtTypes.add(vehicleId);
          if (useGameStore.getState().garage.length >= 3) break;
        }
      }
      const state = useGameStore.getState();
      if (canScrapReset({ vehiclesBuilt: state.garage.length, reputation: state.repPoints, lifetimeScrapBucks: state.lifetimeScrapBucks })) {
        milestone("scrap_eligible", { reputation: state.repPoints, lifetimeScrapBucks: state.lifetimeScrapBucks, vehicles: state.garage.length });
        const before = state;
        const awardBefore = state.legacyPoints;
        state.prestige();
        const after = useGameStore.getState();
        const award = after.legacyPoints - awardBefore;
        resets.scrap.count += 1;
        resets.scrap.awards.push(award);
        recordCurrencyDelta(before, after, ["scrapBucks", "legacyPoints"]);
        if (!before.autoRaceUnlocked && after.autoRaceUnlocked) milestone("auto_race_unlocked");
        count("manual", "scrap_reset");
        activeMs += 30_000;
        if (resets.scrap.count === 1) milestone("first_scrap_reset", { award });
        targetComparison.scrap ??= { modeledHours: modeledHours(), target: CAMPAIGN_PACING_TARGETS_HOURS.scrap, withinTarget: modeledHours() >= CAMPAIGN_PACING_TARGETS_HOURS.scrap.min && modeledHours() <= CAMPAIGN_PACING_TARGETS_HOURS.scrap.max };
        return after.lifetimeScrapResets > before.lifetimeScrapResets;
      }
      if (!runRace()) return false;
    }
    maintenance.stalls.push({ reason: "scrap_race_limit", modeledHours: modeledHours(), limit: limits.racesPerScrapEra, state: diagnosticSnapshot() });
    return false;
  };

  withRandomSource(new SeededRandomSource(options.seed), () => {
    while (iterations < limits.totalIterations) {
      iterations += 1;
      const state = useGameStore.getState();
      const beforeViolationCount = accountingViolations(state).length;
      if (beforeViolationCount > 0) {
        status = "stalled";
        reason = "accounting_violation";
        break;
      }
      if (reachedStopAfter()) { status = "reached_stop_after"; break; }

      if (canTrackReset({ lifetimeOwnerPoints: state.lifetimeOwnerPoints, ownerEras: state.ownerEraCount, lifetimeOPThisTrackEra: state.lifetimeOPThisTrackEra, unspentOwnerPoints: state.ownerPoints })) {
        milestone("track_eligible");
        const before = state.trackPrestigeTokens;
        state.trackReset();
        const after = useGameStore.getState();
        const award = after.trackPrestigeTokens - before;
        resets.track.count += 1; resets.track.awards.push(award); recordCurrencyDelta(state, after, ["scrapBucks", "legacyPoints", "teamPoints", "ownerPoints", "trackPrestigeTokens"]);
        count("manual", "track_reset"); activeMs += 30_000; milestone("first_track_reset", { award });
        targetComparison.track = { modeledHours: modeledHours(), target: CAMPAIGN_PACING_TARGETS_HOURS.track, withinTarget: modeledHours() >= CAMPAIGN_PACING_TARGETS_HOURS.track.min && modeledHours() <= CAMPAIGN_PACING_TARGETS_HOURS.track.max };
        continue;
      }
      if (canOwnerReset({ lifetimeTeamPoints: state.lifetimeTeamPoints, teamEras: state.teamEraCount, lifetimeTPThisOwnerEra: state.lifetimeTPThisOwnerEra, unspentTeamPoints: state.teamPoints })) {
        milestone("owner_eligible");
        const before = state.ownerPoints;
        state.ownerReset();
        const after = useGameStore.getState();
        const award = after.ownerPoints - before;
        resets.owner.count += 1; resets.owner.awards.push(award); recordCurrencyDelta(state, after, ["scrapBucks", "legacyPoints", "teamPoints", "ownerPoints"]);
        count("manual", "owner_reset"); activeMs += 30_000; milestone("first_owner_reset", { award });
        targetComparison.owner ??= { modeledHours: modeledHours(), target: CAMPAIGN_PACING_TARGETS_HOURS.owner, withinTarget: modeledHours() >= CAMPAIGN_PACING_TARGETS_HOURS.owner.min && modeledHours() <= CAMPAIGN_PACING_TARGETS_HOURS.owner.max };
        continue;
      }
      if (canTeamReset({ lifetimeLegacyPoints: state.lifetimeLPAllTime, lifetimeLPThisTeamEra: state.lifetimeLPThisTeamEra, unspentLegacyPoints: state.legacyPoints })) {
        milestone("team_eligible");
        const before = state.teamPoints;
        state.teamReset("engineering_works");
        const after = useGameStore.getState();
        const award = after.teamPoints - before;
        resets.team.count += 1; resets.team.awards.push(award); recordCurrencyDelta(state, after, ["scrapBucks", "legacyPoints", "teamPoints"]);
        count("manual", "team_reset"); activeMs += 30_000; milestone("first_team_reset", { award });
        targetComparison.team ??= { modeledHours: modeledHours(), target: CAMPAIGN_PACING_TARGETS_HOURS.team, withinTarget: modeledHours() >= CAMPAIGN_PACING_TARGETS_HOURS.team.min && modeledHours() <= CAMPAIGN_PACING_TARGETS_HOURS.team.max };
        continue;
      }
      if (!finishScrapEra()) {
        status = "stalled";
        reason = maintenance.stalls.at(-1)?.reason as string ?? "scrap_era_stalled";
        break;
      }
    }
  });

  if (status === "iteration_limit" && reachedStopAfter()) status = "reached_stop_after";
  else if (iterations >= limits.totalIterations && status === "iteration_limit") reason = "total_iteration_limit";
  const finalState = useGameStore.getState();
  return {
    seed: options.seed,
    stopAfter,
    status,
    initialAccounting,
    finalAccounting: accountingSnapshot(finalState),
    accountingViolations: accountingViolations(finalState),
    elapsed: { modeledHours: modeledHours(), activeHours: activeMs / 3_600_000, idleHours: idleMs / 3_600_000 },
    actions,
    races,
    maintenance,
    currencies,
    resets,
    milestones,
    targetComparison,
    diagnostics: { iterations, reason, nextGate: nextGateDiagnostic(finalState, stopAfter), state: diagnosticSnapshot(finalState) },
  };
}
