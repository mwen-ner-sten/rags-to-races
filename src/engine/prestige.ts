import {
  LEGACY_UPGRADES_BY_ID,
} from "@/data/legacyUpgrades";
import { getMomentumEffectValue } from "@/data/momentumBonuses";
import { LOCATION_DEFINITIONS } from "@/data/locations";
import { CIRCUIT_DEFINITIONS } from "@/data/circuits";
import { random } from "@/utils/random";
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

/**
 * Legacy fallback: compute bonuses from raw prestige count (for saves that
 * haven't bought any legacy upgrades yet). Returns same shape as old system.
 */
export function calculatePrestigeBonusLegacy(prestigeCount: number): PrestigeBonus {
  const p = prestigeCount;
  return {
    scrapMultiplier: 1 + p * 0.25,
    luckBonus: Math.min(0.3, p * 0.03),
    repMultiplier: 1 + p * 0.15,
  };
}

// ── Legacy Points (LP) calculation ──────────────────────────────────────────

export interface RunStats {
  lifetimeScrapBucks: number;
  lifetimeRaces: number;
  fatigue: number;
  repPoints: number;
  highestCircuitTier: number;
  workshopUpgradesBought: number;
}

export function calculateLegacyPoints(stats: RunStats): number {
  // Scrap component: sqrt gives diminishing returns
  const scrapComponent = Math.sqrt(stats.lifetimeScrapBucks / 100);

  // Race depth component: log2 gives heavy diminishing returns
  const raceComponent = Math.log2(1 + stats.lifetimeRaces / 10);

  // Tier bonus: reaching higher circuits multiplies LP
  const tierMultiplier = 1 + stats.highestCircuitTier * 0.5;

  // Fatigue floor: need ~50 races (fatigue ~30) for full LP efficiency
  const fatigueFloor = Math.max(0.3, Math.min(1, stats.fatigue / 30));

  // Workshop investment bonus
  const workshopBonus = 1 + stats.workshopUpgradesBought * 0.05;

  const raw =
    (scrapComponent + raceComponent * 3) *
    tierMultiplier *
    fatigueFloor *
    workshopBonus;

  return Math.max(1, Math.floor(raw));
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
  const momentumAdjustedLp = applyMomentumLpBonus(baseLp, input.activeMomentumTierIds);
  const milestones = getPrestigeMilestoneBonuses(input.currentPrestigeCount + 1);
  const permanent = getPermanentRuntimeBonuses(input);
  const additiveBonus =
    getGameEffectValue(TEAM_UPGRADE_DEFINITIONS, input.teamUpgradeLevels, "lp_multiplier")
    + permanent.lpMultiplier
    + milestones.lpMultiplier
    + (input.runStats.fatigue > 50 ? milestones.deepRunLpMult : 0);
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
  legacyPointsEarned: number;
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

export function doPrestige(
  currentPrestigeCount: number,
  runStats: RunStats,
  legacyUpgradeLevels: Record<string, number>,
  activeMomentumTierIds: string[],
  currentWorkshopLevels: Record<string, number>,
): PrestigeResult {
  const newCount = currentPrestigeCount + 1;

  // Calculate LP earned
  const baseLp = calculateLegacyPoints(runStats);
  const lp = applyMomentumLpBonus(baseLp, activeMomentumTierIds);

  // Compute bonuses from legacy upgrades
  const bonuses = calculatePrestigeBonus(legacyUpgradeLevels);

  // Blueprint Memory: keep N random workshop upgrades at level 1
  const keepCount = Math.floor(
    getLegacyEffectValue(legacyUpgradeLevels, "leg_keep_workshop"),
  );
  const keptWorkshop = pickRandomWorkshopToKeep(
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
    legacyPointsEarned: lp,
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

/** Pick N random workshop upgrades to keep at level 1 */
function pickRandomWorkshopToKeep(
  workshopLevels: Record<string, number>,
  keepCount: number,
): Record<string, number> {
  if (keepCount <= 0) return {};
  const owned = Object.entries(workshopLevels).filter(([, lvl]) => lvl > 0);
  if (owned.length === 0) return {};

  // Shuffle and pick up to keepCount
  const shuffled = [...owned].sort(() => random() - 0.5);
  const kept: Record<string, number> = {};
  for (let i = 0; i < Math.min(keepCount, shuffled.length); i++) {
    kept[shuffled[i][0]] = 1;
  }
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
