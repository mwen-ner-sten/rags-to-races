export interface FeatureUnlockCondition {
  id: string;
  name: string;
  description: string;
  conditions: {
    lifetimeScrapResets?: number;
    lifetimeLPAllTime?: number;
    lifetimeTeamPoints?: number;
    teamEraCount?: number;
    ownerEraCount?: number;
    trackEraCount?: number;
    reachedCircuitTier?: number;
    reachedCircuitTierCount?: number;
  };
}

export interface FeatureUnlockStats {
  lifetimeScrapResets: number;
  lifetimeLPAllTime: number;
  lifetimeTeamPoints: number;
  teamEraCount: number;
  ownerEraCount: number;
  trackEraCount: number;
  reachedCircuitTier: number;
  reachedCircuitTierCount: number;
}

/** Check whether a feature unlock condition is satisfied by the given stats */
export function checkFeatureUnlock(
  condition: FeatureUnlockCondition,
  stats: FeatureUnlockStats,
): boolean {
  const c = condition.conditions;

  if (c.lifetimeScrapResets !== undefined && stats.lifetimeScrapResets < c.lifetimeScrapResets) {
    return false;
  }
  if (c.lifetimeLPAllTime !== undefined && stats.lifetimeLPAllTime < c.lifetimeLPAllTime) {
    return false;
  }
  if (c.lifetimeTeamPoints !== undefined && stats.lifetimeTeamPoints < c.lifetimeTeamPoints) {
    return false;
  }
  if (c.teamEraCount !== undefined && stats.teamEraCount < c.teamEraCount) {
    return false;
  }
  if (c.ownerEraCount !== undefined && stats.ownerEraCount < c.ownerEraCount) {
    return false;
  }
  if (c.trackEraCount !== undefined && stats.trackEraCount < c.trackEraCount) {
    return false;
  }
  if (c.reachedCircuitTier !== undefined && stats.reachedCircuitTier < c.reachedCircuitTier) {
    return false;
  }
  if (c.reachedCircuitTierCount !== undefined && stats.reachedCircuitTierCount < c.reachedCircuitTierCount) {
    return false;
  }

  return true;
}

// ── Feature Unlock Definitions ─────────────────────────────────────────────

const RACER_ATTRIBUTES: FeatureUnlockCondition = {
  id: "racer_attributes",
  name: "Racer Attributes",
  description: "Unlocks the racer attribute system for point allocation.",
  conditions: { lifetimeScrapResets: 5 },
};

const EXPANDED_TALENTS: FeatureUnlockCondition = {
  id: "expanded_talents",
  name: "Expanded Talents",
  description: "Unlocks additional talent tree nodes.",
  conditions: { lifetimeLPAllTime: 100 },
};

const CREW_SYSTEM: FeatureUnlockCondition = {
  id: "crew_system",
  name: "Crew System",
  description: "Unlocks the crew recruitment and management system.",
  conditions: { teamEraCount: 1 },
};

const NEW_WORKSHOP_CATS: FeatureUnlockCondition = {
  id: "new_workshop_cats",
  name: "Advanced Workshop",
  description: "Unlocks new workshop upgrade categories.",
  conditions: { teamEraCount: 1 },
};

const ADVANCED_CIRCUITS: FeatureUnlockCondition = {
  id: "advanced_circuits",
  name: "Advanced Circuits",
  description: "Unlocks high-tier circuit variants.",
  conditions: { ownerEraCount: 1 },
};

const FLEET_GARAGE: FeatureUnlockCondition = {
  id: "fleet_garage",
  name: "Fleet Garage",
  description: "Unlocks the ability to own and manage multiple vehicles.",
  conditions: { teamEraCount: 3 },
};

const VEHICLE_MASTERY: FeatureUnlockCondition = {
  id: "vehicle_mastery",
  name: "Vehicle Mastery",
  description: "Unlocks the highest-tier vehicles.",
  conditions: { ownerEraCount: 1 },
};

const TRACK_CUSTOMIZATION: FeatureUnlockCondition = {
  id: "track_customization",
  name: "Track Customization",
  description: "Unlocks the ability to customize and own tracks.",
  conditions: { trackEraCount: 1 },
};

// ── Export ──────────────────────────────────────────────────────────────────

export const FEATURE_UNLOCK_DEFINITIONS: FeatureUnlockCondition[] = [
  RACER_ATTRIBUTES,
  EXPANDED_TALENTS,
  CREW_SYSTEM,
  NEW_WORKSHOP_CATS,
  ADVANCED_CIRCUITS,
  FLEET_GARAGE,
  VEHICLE_MASTERY,
  TRACK_CUSTOMIZATION,
];

export const FEATURE_UNLOCKS_BY_ID = Object.fromEntries(
  FEATURE_UNLOCK_DEFINITIONS.map((f) => [f.id, f]),
) as Record<string, FeatureUnlockCondition>;
