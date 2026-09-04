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
import { calculateFatigue } from "@/state/store";
import { CURRENCY_DEFINITIONS } from "@/data/currencies";
import { LOOSE_INVENTORY_LIMIT } from "@/config/gameplayLimits";
import { computeTickRepDecay, computeTickSpeedMs, getRaceTicksNeeded, autoRaceWouldFire } from "./tick";
import { canScavengeSelectedLocation } from "./eligibility";
import { expectedScavenge } from "./scavengeExpectation";
import { expectedRace, type RaceExpectation } from "./raceExpectation";
import { calculateScrapResetAward, deriveHighestCircuitTier, getLegacyEffectValue } from "./prestige";
import { getGearBonuses } from "./gear";
import { getSkillBonuses } from "./skills";
import { getPermanentRuntimeBonuses, multiplyReward } from "./permanentBonuses";
import { getGameEffectValue } from "@/data/gameEffects";
import { OWNER_UPGRADE_DEFINITIONS } from "@/data/ownerUpgrades";
import { TEAM_UPGRADE_DEFINITIONS } from "@/data/teamUpgrades";
import { getMomentumEffectValue } from "@/data/momentumBonuses";
import { getCircuitById } from "@/data/circuits";
import { getMaterialById, type MaterialType } from "@/data/materials";

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
}

/** Horizon for the Legacy projection secant: one hour of expected ticks. */
const LEGACY_PROJECTION_HORIZON_S = 3_600;

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

/** Fatigue after the next race, mirroring applyTickResult's settlement. */
function fatigueAfterNextRace(state: GameState, circuitTier: number): number {
  const gear = getGearBonuses(state.equippedLootGear, state.lootGearInventory, state.equippedStationEquipment, state.stationEquipmentInventory);
  const offset = getLegacyEffectValue(state.legacyUpgradeLevels, "leg_fatigue_offset") + getSkillBonuses(state.racerSkills, circuitTier).enduranceFatigueOffset;
  const raw = calculateFatigue(state.lifetimeRaces + 1, offset);
  const reduction = gear.fatigue_rate_reduction
    + getGameEffectValue(OWNER_UPGRADE_DEFINITIONS, state.ownerUpgradeLevels, "fatigue_rate_reduction")
    + getMomentumEffectValue(state.activeMomentumTiers, "fatigue_reduction")
    + getPermanentRuntimeBonuses(state).fatigueReduction;
  const cap = Math.max(0, 99 - getGameEffectValue(TEAM_UPGRADE_DEFINITIONS, state.teamUpgradeLevels, "fatigue_cap_reduction"));
  return Math.min(cap, Math.floor(raw * Math.max(0, 1 - reduction)));
}

function legacyAward(state: GameState, runStats: { lifetimeScrapBucks: number; lifetimeRaces: number; fatigue: number }): number {
  return calculateScrapResetAward({
    currentPrestigeCount: state.prestigeCount,
    runStats: {
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
  const repDecayPerSecond = computeTickRepDecay(state) / flow.tickSeconds;

  const scrapBucks = withSources(base(state, "scrap_bucks", state.scrapBucks, "Scrap Bucks", "var(--accent, #c83e0c)"), [
    { label: "Auto-sold junk", perSecond: (scavenge?.autoSellScrapPerScavenge ?? 0) * flow.scavengesPerSecond },
    { label: "Race prize money", perSecond: (race?.scrapPerRace ?? 0) * flow.racesPerSecond },
    { label: "Race entry fees", perSecond: -(race?.entryFee ?? 0) * flow.racesPerSecond },
    { label: "Fleet programs", perSecond: fleet.scrapPerSecond },
  ]);

  const rep = withSources(base(state, "rep", state.repPoints, "Rep Points", "var(--accent-secondary, #ff0090)"), [
    { label: "Race Rep", perSecond: (race?.repPerRace ?? 0) * flow.racesPerSecond },
    { label: "Decay toward legacy floor", perSecond: -repDecayPerSecond },
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
  const fatigueDelta = race ? fatigueAfterNextRace(state, circuitTier) - (state.fatigue ?? 0) : 0;
  const fatigue = withSources({
    id: "fatigue",
    label: "Fatigue",
    amount: state.fatigue ?? 0,
    perSecond: 0,
    cap: 99,
    visible: (state.lifetimeRaces ?? 0) > 0 || (state.fatigue ?? 0) > 0,
    color: "var(--danger, #d64545)",
  }, [
    { label: "Auto-race wear", perSecond: fatigueDelta * flow.racesPerSecond },
  ]);

  const lpNow = legacyAward(state, {
    lifetimeScrapBucks: state.lifetimeScrapBucks,
    lifetimeRaces: state.lifetimeRaces,
    fatigue: state.fatigue ?? 0,
  });
  const grossScrapPerSecond = (scavenge?.autoSellScrapPerScavenge ?? 0) * flow.scavengesPerSecond
    + (race?.scrapPerRace ?? 0) * flow.racesPerSecond + fleet.scrapPerSecond;
  const lpLater = legacyAward(state, {
    lifetimeScrapBucks: state.lifetimeScrapBucks + grossScrapPerSecond * LEGACY_PROJECTION_HORIZON_S,
    lifetimeRaces: state.lifetimeRaces + flow.racesPerSecond * LEGACY_PROJECTION_HORIZON_S,
    fatigue: Math.min(99, Math.max(0, (state.fatigue ?? 0) + fatigueDelta * flow.racesPerSecond * LEGACY_PROJECTION_HORIZON_S)),
  });
  const legacyProjection = withSources({
    id: "legacy_projection",
    label: "Legacy Points (projected)",
    amount: lpNow,
    perSecond: 0,
    visible: state.garage.length > 0,
    color: "#a78bfa",
  }, [
    { label: "Scrap Reset award growth", perSecond: (lpLater - lpNow) / LEGACY_PROJECTION_HORIZON_S },
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

  return [scrapBucks, rep, parts, forgeTokens, fatigue, legacyProjection, ...materials, ...prestigeCurrencies];
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
