import {
  LEGACY_UPGRADES_BY_ID,
} from "@/data/legacyUpgrades";
import { getMomentumEffectValue } from "@/data/momentumBonuses";
import { LOCATION_DEFINITIONS } from "@/data/locations";
import { CIRCUIT_DEFINITIONS } from "@/data/circuits";
import { getGameEffectValue } from "@/data/gameEffects";
import { TEAM_UPGRADE_DEFINITIONS } from "@/data/teamUpgrades";
import { TRACK_PERK_DEFINITIONS } from "@/data/trackPerks";
import { getPrestigeMilestoneBonuses } from "@/data/prestigeMilestones";
import { getPermanentRuntimeBonuses, type PermanentBonusState } from "./permanentBonuses";

// ── Backward-compatible bonus interface (populated from legacy upgrades) ─────

export interface PrestigeBonus {
  scrapMultiplier: number;
  luckBonus: number;
  repMultiplier: number;
}

/** Compute bonuses from legacy upgrade levels (replaces old flat-per-prestige) */
export function calculatePrestigeBonus(
  legacyUpgradeLevels: Record<string, number>,
): PrestigeBonus {
  return {
    scrapMultiplier: 1 + getLegacyEffectValue(legacyUpgradeLevels, "leg_scrap_mult"),
    luckBonus: getLegacyEffectValue(legacyUpgradeLevels, "leg_luck"),
    repMultiplier: 1 + getLegacyEffectValue(legacyUpgradeLevels, "leg_rep_mult"),
  };
}

// ── Legacy Points (LP) calculation ──────────────────────────────────────────

export interface RunStats {
  earnedScrap?: number;
  featureWins?: Record<string, Partial<Record<string, number>>>;
  rivalCount?: number;
  lifetimeScrapBucks: number;
  lifetimeRaces: number;
  /** Retained for older callers; waiting and fatigue never increase reset rewards. */
  fatigue: number;
  highestCircuitTier: number;
  workshopUpgradesBought: number;
}

export function calculateLegacyPoints(stats: RunStats): number {
  const earned = Math.max(0, stats.earnedScrap ?? stats.lifetimeScrapBucks);
  const highest = CIRCUIT_DEFINITIONS.reduce((tier, circuit) =>
    (stats.featureWins?.[circuit.id]?.feature ?? 0) > 0 ? Math.max(tier, circuit.tier) : tier, -1);
  // One depth reward, never compounded milestones. Earnings grow logarithmically
  // so farming money indefinitely cannot replace reaching a new Feature.
  const depth = [10, 20, 35, 60, 110, 165, 240][highest] ?? 0;
  const earnings = 8 * Math.log2(1 + earned / 1000);
  return Math.max(1, Math.floor((20 + depth + earnings) * (1 + Math.min(10, stats.rivalCount ?? 0) * 0.1)));
}

/** Apply momentum LP multipliers to base LP */
export function applyMomentumLpBonus(
  baseLp: number,
  activeMomentumTierIds: string[],
): number {
  const lpMult = getMomentumEffectValue(activeMomentumTierIds, "lp_multiplier");
  return Math.floor(baseLp * (1 + lpMult));
}

export interface ScrapResetAwardInput extends PermanentBonusState {
  currentPrestigeCount: number;
  runStats: RunStats;
  activeMomentumTierIds: string[];
  teamUpgradeLevels: Record<string, number>;
  trackPerkLevels: Record<string, number>;
}

export interface ScrapResetAward {
  baseLp: number;
  momentumAdjustedLp: number;
  additiveBonus: number;
  trackCascadeBonus: number;
  totalLp: number;
}

/** Single source of truth shared by the reset confirmation and actual award. */
export function calculateScrapResetAward(input: ScrapResetAwardInput): ScrapResetAward {
  const baseLp = calculateLegacyPoints(input.runStats);
  const momentumAdjustedLp = baseLp; // Fatigue and race-count momentum never increase a reset award.
  const milestones = getPrestigeMilestoneBonuses(input.currentPrestigeCount + 1);
  const permanent = getPermanentRuntimeBonuses(input);
  const additiveBonus =
    getGameEffectValue(TEAM_UPGRADE_DEFINITIONS, input.teamUpgradeLevels, "lp_multiplier")
    + permanent.lpMultiplier
    + milestones.lpMultiplier
    + ((input.runStats.featureWins?.world_championship?.feature ?? 0) > 0 ? milestones.deepRunLpMult : 0);
  const beforeCascade = Math.floor(momentumAdjustedLp * (1 + additiveBonus));
  const trackCascadeBonus = getGameEffectValue(TRACK_PERK_DEFINITIONS, input.trackPerkLevels, "lower_currency_mult");
  return {
    baseLp,
    momentumAdjustedLp,
    additiveBonus,
    trackCascadeBonus,
    totalLp: Math.floor(beforeCascade * (1 + trackCascadeBonus)),
  };
}

// ── Prestige result ─────────────────────────────────────────────────────────

export interface PrestigeResult {
  prestigeCount: number;
  bonuses: PrestigeBonus;
  /** Workshop upgrades to keep (id -> level 1) from Blueprint Memory */
  keptWorkshopUpgrades: Record<string, number>;
  /** Starting scrap from Seed Money */
  startingScrap: number;
  /** Starting unlocked location IDs from Old Haunts */
  startingLocationIds: string[];
  /** Starting unlocked circuit IDs from Old Haunts */
  startingCircuitIds: string[];
}

/**
 * Starting conditions for the next run. Legacy Points are NOT computed here:
 * `calculateScrapResetAward` is the one LP formula, shared by the confirmation
 * screen and the reset itself.
 */
export function doPrestige(
  currentPrestigeCount: number,
  legacyUpgradeLevels: Record<string, number>,
  currentWorkshopLevels: Record<string, number>,
): PrestigeResult {
  const newCount = currentPrestigeCount + 1;

  // Compute bonuses from legacy upgrades
  const bonuses = calculatePrestigeBonus(legacyUpgradeLevels);

  // Blueprint Memory: keep N random workshop upgrades at level 1
  const keepCount = Math.floor(
    getLegacyEffectValue(legacyUpgradeLevels, "leg_keep_workshop"),
  );
  const keptWorkshop = pickWorkshopToKeep(
    currentWorkshopLevels,
    keepCount,
  );

  // Seed Money: starting scrap
  const startingScrap = Math.floor(
    getLegacyEffectValue(legacyUpgradeLevels, "leg_starting_scrap"),
  );

  // Old Haunts: starting locations/circuits by tier
  const startingLocTier = Math.floor(
    getLegacyEffectValue(legacyUpgradeLevels, "leg_starting_location"),
  );
  const startingLocationIds = getLocationsByMaxTier(startingLocTier);
  const startingCircuitIds = getCircuitsByMaxTier(startingLocTier);

  return {
    prestigeCount: newCount,
    bonuses,
    keptWorkshopUpgrades: keptWorkshop,
    startingScrap,
    startingLocationIds,
    startingCircuitIds,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Get total effect value for a legacy upgrade given current levels */
export function getLegacyEffectValue(
  levels: Record<string, number>,
  upgradeId: string,
): number {
  const level = levels[upgradeId] ?? 0;
  if (level === 0) return 0;
  const def = LEGACY_UPGRADES_BY_ID[upgradeId];
  if (!def) return 0;
  return def.effect.valuePerLevel * level;
}

/** Derive highest circuit tier from unlocked circuit IDs */
export function deriveHighestCircuitTier(unlockedCircuitIds: string[]): number {
  let max = 0;
  for (const id of unlockedCircuitIds) {
    const circuit = CIRCUIT_DEFINITIONS.find((c) => c.id === id);
    if (circuit && circuit.tier > max) max = circuit.tier;
  }
  return max;
}

/**
 * Blueprint Memory keeps the player's N most-invested workshop upgrades at
 * level 1. Deterministic, so the choice of what to invest in is the choice
 * of what survives the reset.
 */
export function pickWorkshopToKeep(
  workshopLevels: Record<string, number>,
  keepCount: number,
): Record<string, number> {
  if (keepCount <= 0) return {};
  const owned = Object.entries(workshopLevels)
    .filter(([, lvl]) => lvl > 0)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  const kept: Record<string, number> = {};
  for (const [id] of owned.slice(0, keepCount)) kept[id] = 1;
  return kept;
}

/** Get all location IDs up to a given tier */
function getLocationsByMaxTier(maxTier: number): string[] {
  return LOCATION_DEFINITIONS.filter((l) => l.tier <= maxTier).map((l) => l.id);
}

/** Get all circuit IDs up to a given tier */
function getCircuitsByMaxTier(maxTier: number): string[] {
  return CIRCUIT_DEFINITIONS.filter((c) => c.tier <= maxTier).map((c) => c.id);
}

// ── Team Reset ──────────────────────────────────────────────────────────────

export interface TeamResetStats {
  lifetimeLPThisTeamEra: number;
  teamEraCount: number;
  /** Current balance remains part of reset eligibility, but spending it no longer lowers the award. */
  unspentLP: number;
}

export function calculateTeamPoints(stats: TeamResetStats): number {
  const base = Math.floor(Math.sqrt(stats.lifetimeLPThisTeamEra / 10));
  const eraBonus = 1 + 0.1 * Math.max(0, stats.teamEraCount - 1);
  const eraEarningsBonus = Math.floor(stats.lifetimeLPThisTeamEra / 25);
  return Math.max(1, Math.floor(base * eraBonus) + eraEarningsBonus);
}

// ── Owner Reset ─────────────────────────────────────────────────────────────

export interface OwnerResetStats {
  lifetimeTPThisOwnerEra: number;
  ownerEraCount: number;
  /** Current balance remains part of reset eligibility, but spending it no longer lowers the award. */
  unspentTP: number;
}

export function calculateOwnerPoints(stats: OwnerResetStats): number {
  const base = Math.floor(Math.sqrt(stats.lifetimeTPThisOwnerEra / 5));
  const eraBonus = 1 + 0.1 * Math.max(0, stats.ownerEraCount - 1);
  const eraEarningsBonus = Math.floor(stats.lifetimeTPThisOwnerEra / 15);
  return Math.max(1, Math.floor(base * eraBonus) + eraEarningsBonus);
}

// ── Track Reset ─────────────────────────────────────────────────────────────

export interface TrackResetStats {
  lifetimeOPThisTrackEra: number;
  trackEraCount: number;
  /** Current balance remains part of reset eligibility, but spending it no longer lowers the award. */
  unspentOP: number;
}

export function calculateTrackTokens(stats: TrackResetStats): number {
  const base = Math.floor(Math.sqrt(stats.lifetimeOPThisTrackEra / 3));
  const eraBonus = 1 + 0.1 * Math.max(0, stats.trackEraCount - 1);
  const eraEarningsBonus = Math.floor(stats.lifetimeOPThisTrackEra / 10);
  return Math.max(1, Math.floor(base * eraBonus) + eraEarningsBonus);
}
