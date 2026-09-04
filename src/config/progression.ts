export const SCRAP_RESET_REQUIREMENTS = {
  vehiclesBuilt: 3,
  reputation: 500,
  lifetimeScrapBucks: 8_000,
} as const;

export const RESPONSIBILITY_RESET_REQUIREMENTS = {
  team: { lifetimeLegacyPoints: 200 },
  owner: { lifetimeTeamPoints: 500, teamEras: 3 },
  track: { lifetimeOwnerPoints: 1_000, ownerEras: 5 },
} as const;

export function canTeamReset(progress: {
  lifetimeLegacyPoints: number;
  lifetimeLPThisTeamEra: number;
  unspentLegacyPoints: number;
}): boolean {
  return progress.lifetimeLegacyPoints >= RESPONSIBILITY_RESET_REQUIREMENTS.team.lifetimeLegacyPoints
    && progress.lifetimeLPThisTeamEra + progress.unspentLegacyPoints > 0;
}

export function canOwnerReset(progress: {
  lifetimeTeamPoints: number;
  teamEras: number;
  lifetimeTPThisOwnerEra: number;
  unspentTeamPoints: number;
}): boolean {
  return progress.lifetimeTeamPoints >= RESPONSIBILITY_RESET_REQUIREMENTS.owner.lifetimeTeamPoints
    && progress.teamEras >= RESPONSIBILITY_RESET_REQUIREMENTS.owner.teamEras
    && progress.lifetimeTPThisOwnerEra + progress.unspentTeamPoints > 0;
}

export function canTrackReset(progress: {
  lifetimeOwnerPoints: number;
  ownerEras: number;
  lifetimeOPThisTrackEra: number;
  unspentOwnerPoints: number;
}): boolean {
  return progress.lifetimeOwnerPoints >= RESPONSIBILITY_RESET_REQUIREMENTS.track.lifetimeOwnerPoints
    && progress.ownerEras >= RESPONSIBILITY_RESET_REQUIREMENTS.track.ownerEras
    && progress.lifetimeOPThisTrackEra + progress.unspentOwnerPoints > 0;
}

/** One shared reputation ladder for every data-driven progression surface. */
export const REP_PROGRESSION = {
  locations: {
    curbside: 0,
    neighborhood_yards: 10,
    local_junkyard: 25,
    salvage_auction: 100,
    industrial_surplus: 500,
    military_scrapyard: 2_500,
  },
  circuits: {
    backyard_derby: 0,
    dirt_track: 25,
    regional_circuit: 150,
    national_circuit: 1_000,
    world_championship: 5_000,
    continental_grand_prix: 15_000,
    endurance_series: 50_000,
  },
  vehicles: {
    go_kart: 25,
    beater_car: 100,
    street_racer: 150,
    stock_car: 1_000,
    supercar: 5_000,
  },
  dealer: {
    unlock: 100,
    tier2: 750,
    tier3: 2_500,
  },
  workshop: {
    refurbishment_bench: 25,
    toolkit: 40,
    addon_bench: 40,
    auto_fitter: 50,
    auto_repair: 150,
    gear_scavenger: 500,
    trophy_hunter: 750,
    tick_accelerator: 500,
    pit_crew: 750,
    tuning_bench: 750,
    scavengers_eye: 1_000,
    parts_bin: 1_500,
    parts_trader: 5_000,
    artifact_forge: 15_000,
  },
  gear: {
    uncommon: 500,
    rare: 2_500,
    epic: 10_000,
  },
  momentum: {
    reputation: 1_500,
  },
  tutorial: {
    systemsTour: 100,
  },
} as const;

/**
 * Rep is spent, not only accumulated (charter, 2026-09-04). Opening a
 * location, circuit, vehicle blueprint or Rep-gated workshop line costs Rep.
 *
 * Costs are REP_PROGRESSION x 0.5: the threshold ladder assumed one growing
 * balance that passed every gate in turn, but spending is cumulative — a
 * player who opens the Dirt Track and the Local Junkyard has paid for both —
 * so each price is halved (rounded up to whole Rep) to keep the total Rep to
 * reach a tier roughly where the ladder put it. Tier-0 entries stay free.
 */
function halveLadder<T extends Record<string, number>>(ladder: T): { [K in keyof T]: number } {
  return Object.fromEntries(
    Object.entries(ladder).map(([key, value]) => [key, Math.ceil(value / 2)]),
  ) as { [K in keyof T]: number };
}

export const REP_UNLOCK_COSTS = {
  locations: halveLadder(REP_PROGRESSION.locations),
  circuits: halveLadder(REP_PROGRESSION.circuits),
  vehicles: halveLadder(REP_PROGRESSION.vehicles),
  workshop: halveLadder(REP_PROGRESSION.workshop),
} as const;

/**
 * Rep decays gently toward a floor that never falls below what resets have
 * earned. Each tick: repPoints -= (repPoints - floor) * (1 - 0.5^(dt / HALF_LIFE)).
 */
export const REP_DECAY = {
  /** Wall-clock half-life of the Rep above the floor. */
  HALF_LIFE_MS: 3 * 24 * 60 * 60 * 1_000,
  /** Share of lifetime Rep banked into the legacy floor at each Scrap Reset. */
  LEGACY_FLOOR_SHARE: 0.1,
} as const;

/** Rep removed by decay over `dtMs`; zero at or below the floor. */
export function repDecayAmount(repPoints: number, repFloor: number, dtMs: number): number {
  const excess = repPoints - repFloor;
  if (!(excess > 0) || !(dtMs > 0)) return 0;
  return excess * (1 - Math.pow(0.5, dtMs / REP_DECAY.HALF_LIFE_MS));
}

export interface ScrapResetProgress {
  vehiclesBuilt: number;
  reputation: number;
  lifetimeScrapBucks: number;
}

export function canScrapReset(progress: ScrapResetProgress): boolean {
  return progress.vehiclesBuilt >= SCRAP_RESET_REQUIREMENTS.vehiclesBuilt
    && progress.reputation >= SCRAP_RESET_REQUIREMENTS.reputation
    && progress.lifetimeScrapBucks >= SCRAP_RESET_REQUIREMENTS.lifetimeScrapBucks;
}

export function scrapResetRequirementText(): string {
  return `${SCRAP_RESET_REQUIREMENTS.vehiclesBuilt} vehicles built, ${SCRAP_RESET_REQUIREMENTS.reputation.toLocaleString()} Rep, $${SCRAP_RESET_REQUIREMENTS.lifetimeScrapBucks.toLocaleString()} lifetime Scrap Bucks`;
}
