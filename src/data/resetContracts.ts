export type ResetLayer = "scrap" | "team" | "owner" | "track";
export type ResetDisposition = "reset" | "preserve" | "conditional";

/**
 * `preserve` means the prior progression in the field carries through the
 * reset (currencies and lifetime counters may also receive the reset award).
 * A field that is merely re-seeded from a perk is not considered preserved.
 */
const CROSS_LAYER_HISTORY = [
  "tutorialStep",
  "tutorialCompleted",
  "tutorialDismissed",
  "tutorialMinimized",
  "tutorialSkippedSteps",
  "tutorialLastAdvanceTime",
  "dismissedContextualCoachIds",
  "equippedGear",
  "ownedGearIds",
  "completedChallenges",
  "activityLog",
  "_logIdCounter",
  "lifetimeTotalDecomposed",
  "lifetimeTotalEnhanced",
  "lifetimeTotalTradeUps",
  "lifetimeTotalRaceSalvage",
  "highestConditionReached",
  "earnedAchievements",
  "defeatedRivalIds",
  "discoveredBlueprintIds",
  "lifetimeLPAllTime",
  "lifetimeScrapResets",
  "lifetimeRacesAllTime",
  "lifetimeWinsAllTime",
  "lifetimeScrapBucksAllTime",
  "lifetimePartsScavengedAllTime",
  "lifetimeVehiclesBuiltAllTime",
  "bestWinStreakAllTime",
  "highestVehicleTierBuilt",
  "totalForgeTokensEarned",
  "uniqueVehicleTypesBuilt",
  "ownedTrackConfig",
] as const;

const TRACK_LAYER = [
  "trackPrestigeTokens",
  "lifetimeTrackTokens",
  "trackPerkLevels",
  "trackEraCount",
] as const;

const OWNER_LAYER = [
  "ownerPoints",
  "lifetimeOwnerPoints",
  "ownerUpgradeLevels",
  "ownerEraCount",
] as const;

const TEAM_LAYER = [
  "teamPoints",
  "lifetimeTeamPoints",
  "teamUpgradeLevels",
  "teamEraCount",
] as const;

export const RESET_PRESERVE_FIELDS: Record<ResetLayer, ReadonlySet<string>> = {
  scrap: new Set([
    ...CROSS_LAYER_HISTORY,
    ...TRACK_LAYER,
    ...OWNER_LAYER,
    ...TEAM_LAYER,
    "prestigeCount",
    "prestigeBonus",
    "legacyPoints",
    "lifetimeLegacyPoints",
    "legacyUpgradeLevels",
    "currentEra",
    "autoScavengeUnlocked",
    "autoRaceUnlocked",
    "stationEquipmentInventory",
    "equippedStationEquipment",
    "reforgeShards",
    "lootGearInventory",
    "equippedLootGear",
    "gearModInventory",
    "unlockedTalentNodes",
    "unlockedPlaystyleNodes",
    "forgeTokens",
    "lifetimeLPThisTeamEra",
    "teamOperatingPhilosophy",
    "lifetimeTPThisOwnerEra",
    "lifetimeOPThisTrackEra",
    "hostedEvents",
    "racerAttributes",
    "crewRoster",
    "crewSlots",
    "unlockedFeatures",
  ]),
  team: new Set([
    ...CROSS_LAYER_HISTORY,
    ...TRACK_LAYER,
    ...OWNER_LAYER,
    ...TEAM_LAYER,
    "autoScavengeUnlocked",
    "autoRaceUnlocked",
    "lifetimeTPThisOwnerEra",
    "lifetimeOPThisTrackEra",
    "hostedEvents",
    "unlockedFeatures",
  ]),
  owner: new Set([
    ...CROSS_LAYER_HISTORY,
    ...TRACK_LAYER,
    ...OWNER_LAYER,
    "lifetimeOPThisTrackEra",
    "hostedEvents",
    "unlockedFeatures",
  ]),
  track: new Set([
    ...CROSS_LAYER_HISTORY,
    ...TRACK_LAYER,
  ]),
};

/** Fields with an explicit mixed or perk-dependent retention contract. */
export const RESET_CONDITIONAL_FIELDS: Record<ResetLayer, ReadonlySet<string>> = {
  scrap: new Set([
    // Blueprint Memory and prestige milestones can seed a subset, but the
    // current run's Workshop map is not retained wholesale.
    "workshopLevels",
    // Lifetime challenge entries survive while run entries are cleared.
    "challengeProgress",
  ]),
  team: new Set([
    // Eternal Workshop is required to retain this field.
    "workshopLevels",
    // Team Reset reselects a philosophy and conditionally retains its matching lead.
    "teamOperatingPhilosophy",
    "crewRoster",
  ]),
  owner: new Set([
    "workshopLevels",
  ]),
  track: new Set([
    "workshopLevels",
    // Track Reset removes Owner-derived feature flags while retaining other
    // released feature unlocks.
    "unlockedFeatures",
  ]),
};

export function buildResetRetentionMatrix(
  fields: readonly string[],
): Record<ResetLayer, Record<string, ResetDisposition>> {
  return Object.fromEntries(
    (Object.keys(RESET_PRESERVE_FIELDS) as ResetLayer[]).map((layer) => [
      layer,
      Object.fromEntries(
        fields.map((field) => [
          field,
          RESET_CONDITIONAL_FIELDS[layer].has(field)
            ? "conditional"
            : RESET_PRESERVE_FIELDS[layer].has(field)
              ? "preserve"
              : "reset",
        ]),
      ),
    ]),
  ) as Record<ResetLayer, Record<string, ResetDisposition>>;
}
