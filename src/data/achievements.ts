export type AchievementCategory = "racing" | "building" | "scavenging" | "prestige" | "wealth" | "mastery";

export type AchievementReward =
  | { type: "bonus"; bonusId: string; description: string }
  | { type: "title"; title: string }
  | { type: "none" };

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  statKey: keyof AchievementStats;
  target: number;
  reward: AchievementReward;
  flavorText: string;
  hidden?: boolean;
}

/** Stats used to check achievement progress. Built from GameState. */
export interface AchievementStats {
  lifetimeRacesAllTime: number;
  lifetimeWinsAllTime: number;
  lifetimeScrapBucksAllTime: number;
  lifetimePartsScavengedAllTime: number;
  lifetimeVehiclesBuiltAllTime: number;
  bestWinStreakAllTime: number;
  highestVehicleTierBuilt: number;
  totalForgeTokensEarned: number;
  uniqueVehicleTypesBuiltCount: number;
  lifetimeScrapResets: number;
  lifetimeLPAllTime: number;
  teamEraCount: number;
  ownerEraCount: number;
  lifetimeTotalDecomposed: number;
  highestConditionReached: number;
}

// ── Racing ──────────────────────────────────────────────────────────────────────

const achFirstWin: AchievementDefinition = {
  id: "ach_first_win",
  name: "First Blood",
  description: "Win your first race.",
  category: "racing",
  statKey: "lifetimeWinsAllTime",
  target: 1,
  reward: { type: "title", title: "Rookie Racer" },
  flavorText: "Everyone starts somewhere.",
};

const achWins100: AchievementDefinition = {
  id: "ach_wins_100",
  name: "Century Racer",
  description: "Win 100 races.",
  category: "racing",
  statKey: "lifetimeWinsAllTime",
  target: 100,
  reward: { type: "bonus", bonusId: "ach_race_scrap_15", description: "+15% Scrap Bucks from races" },
  flavorText: "A hundred checkered flags. They stop counting after this.",
};

const achWins500: AchievementDefinition = {
  id: "ach_wins_500",
  name: "Iron Horse",
  description: "Win 500 races.",
  category: "racing",
  statKey: "lifetimeWinsAllTime",
  target: 500,
  reward: { type: "bonus", bonusId: "ach_race_perf_10", description: "+10% race performance" },
  flavorText: "The car knows the way.",
};

const achRaces1000: AchievementDefinition = {
  id: "ach_races_1000",
  name: "Lifer",
  description: "Complete 1,000 races.",
  category: "racing",
  statKey: "lifetimeRacesAllTime",
  target: 1000,
  reward: { type: "bonus", bonusId: "ach_fatigue_reduction_10", description: "-10% fatigue gain" },
  flavorText: "You don't retire. You just keep racing.",
};

const achStreak20: AchievementDefinition = {
  id: "ach_streak_20",
  name: "Unbreakable",
  description: "Achieve a 20-race win streak.",
  category: "racing",
  statKey: "bestWinStreakAllTime",
  target: 20,
  reward: { type: "bonus", bonusId: "ach_dnf_reduction_5", description: "-5% DNF chance" },
  flavorText: "They stopped betting against you.",
};

// ── Building ────────────────────────────────────────────────────────────────────

const achVehicles10: AchievementDefinition = {
  id: "ach_vehicles_10",
  name: "Gearhead",
  description: "Build 10 vehicles.",
  category: "building",
  statKey: "lifetimeVehiclesBuiltAllTime",
  target: 10,
  reward: { type: "title", title: "Gearhead" },
  flavorText: "Ten machines. Each one a little less terrible.",
};

const achVehicles50: AchievementDefinition = {
  id: "ach_vehicles_50",
  name: "Fleet Commander",
  description: "Build 50 vehicles.",
  category: "building",
  statKey: "lifetimeVehiclesBuiltAllTime",
  target: 50,
  reward: { type: "bonus", bonusId: "ach_starting_scrap_500", description: "+500 starting Scrap Bucks" },
  flavorText: "You could stock a dealership. A weird one.",
};

const achAllTypes: AchievementDefinition = {
  id: "ach_all_types",
  name: "All-Terrain",
  description: "Build every vehicle type at least once.",
  category: "building",
  statKey: "uniqueVehicleTypesBuiltCount",
  target: 10,
  reward: { type: "bonus", bonusId: "ach_build_cost_25", description: "-25% build costs" },
  flavorText: "Push mower to prototype. You've built them all.",
};

const achTier8: AchievementDefinition = {
  id: "ach_tier_8",
  name: "Apex Builder",
  description: "Build a Tier 8 vehicle.",
  category: "building",
  statKey: "highestVehicleTierBuilt",
  target: 8,
  reward: { type: "bonus", bonusId: "ach_part_quality_10", description: "+10% part quality on scavenge" },
  flavorText: "Only the finest scrap.",
};

const achArtifact: AchievementDefinition = {
  id: "ach_artifact",
  name: "Artifact Smith",
  description: "Enhance a part to Artifact condition.",
  category: "building",
  statKey: "highestConditionReached",
  target: 8,
  reward: { type: "title", title: "Legendary Smith" },
  flavorText: "You turned trash into a god-tier part. Respect.",
};

// ── Scavenging ──────────────────────────────────────────────────────────────────

const achScav500: AchievementDefinition = {
  id: "ach_scav_500",
  name: "Dumpster Diver",
  description: "Scavenge 500 parts.",
  category: "scavenging",
  statKey: "lifetimePartsScavengedAllTime",
  target: 500,
  reward: { type: "title", title: "Trash Panda" },
  flavorText: "One person's trash is your entire career.",
};

const achScav2000: AchievementDefinition = {
  id: "ach_scav_2000",
  name: "Junk Collector",
  description: "Scavenge 2,000 parts.",
  category: "scavenging",
  statKey: "lifetimePartsScavengedAllTime",
  target: 2000,
  reward: { type: "bonus", bonusId: "ach_scav_yield_20", description: "+20% scavenge yield" },
  flavorText: "The junkyard knows your face.",
};

const achDecompose500: AchievementDefinition = {
  id: "ach_decompose_500",
  name: "Recycler",
  description: "Decompose 500 parts.",
  category: "scavenging",
  statKey: "lifetimeTotalDecomposed",
  target: 500,
  reward: { type: "bonus", bonusId: "ach_material_yield_15", description: "+15% material yield" },
  flavorText: "Everything breaks down. You just do it faster.",
};

// ── Prestige ────────────────────────────────────────────────────────────────────

const achPrestige1: AchievementDefinition = {
  id: "ach_prestige_1",
  name: "Born Again",
  description: "Prestige for the first time.",
  category: "prestige",
  statKey: "lifetimeScrapResets",
  target: 1,
  reward: { type: "title", title: "Reborn" },
  flavorText: "Back to nothing. But smarter this time.",
};

const achPrestige10: AchievementDefinition = {
  id: "ach_prestige_10",
  name: "Prestige Veteran",
  description: "Prestige 10 times.",
  category: "prestige",
  statKey: "lifetimeScrapResets",
  target: 10,
  reward: { type: "bonus", bonusId: "ach_lp_15", description: "+15% LP earned" },
  flavorText: "Ten lives. Each one shorter and richer.",
};

const achPrestige25: AchievementDefinition = {
  id: "ach_prestige_25",
  name: "Eternal",
  description: "Prestige 25 times.",
  category: "prestige",
  statKey: "lifetimeScrapResets",
  target: 25,
  reward: { type: "bonus", bonusId: "ach_lp_25", description: "+25% LP earned" },
  flavorText: "The cycle is not a prison. It's a ladder.",
};

const achTeamEra: AchievementDefinition = {
  id: "ach_team_era",
  name: "Team Player",
  description: "Enter the Team era.",
  category: "prestige",
  statKey: "teamEraCount",
  target: 1,
  reward: { type: "title", title: "Team Captain" },
  flavorText: "You built something bigger than yourself.",
};

const achOwnerEra: AchievementDefinition = {
  id: "ach_owner_era",
  name: "Owner's Box",
  description: "Enter the Owner era.",
  category: "prestige",
  statKey: "ownerEraCount",
  target: 1,
  reward: { type: "title", title: "Racing Mogul" },
  flavorText: "You don't race anymore. You own the race.",
};

// ── Wealth ──────────────────────────────────────────────────────────────────────

const achScrap1M: AchievementDefinition = {
  id: "ach_scrap_1m",
  name: "Scrap Tycoon",
  description: "Earn $1,000,000 lifetime Scrap Bucks.",
  category: "wealth",
  statKey: "lifetimeScrapBucksAllTime",
  target: 1_000_000,
  reward: { type: "bonus", bonusId: "ach_scrap_all_20", description: "+20% Scrap Bucks from all sources" },
  flavorText: "A million bucks made from literal garbage.",
};

const achScrap10M: AchievementDefinition = {
  id: "ach_scrap_10m",
  name: "Mogul",
  description: "Earn $10,000,000 lifetime Scrap Bucks.",
  category: "wealth",
  statKey: "lifetimeScrapBucksAllTime",
  target: 10_000_000,
  reward: { type: "bonus", bonusId: "ach_sell_value_50", description: "+50% sell values" },
  flavorText: "You've forgotten what 'broke' feels like.",
};

const achLp100: AchievementDefinition = {
  id: "ach_lp_100",
  name: "Legacy Builder",
  description: "Earn 100 lifetime LP.",
  category: "wealth",
  statKey: "lifetimeLPAllTime",
  target: 100,
  reward: { type: "bonus", bonusId: "ach_starting_scrap_300", description: "+300 starting Scrap Bucks" },
  flavorText: "Your legacy grows with every reset.",
};

const achLp500: AchievementDefinition = {
  id: "ach_lp_500",
  name: "Legacy Architect",
  description: "Earn 500 lifetime LP.",
  category: "wealth",
  statKey: "lifetimeLPAllTime",
  target: 500,
  reward: { type: "bonus", bonusId: "ach_lp_mult_10", description: "+10% LP earned" },
  flavorText: "Five hundred points of permanent power.",
};

const achTokens10: AchievementDefinition = {
  id: "ach_tokens_10",
  name: "Token Collector",
  description: "Earn 10 forge tokens.",
  category: "wealth",
  statKey: "totalForgeTokensEarned",
  target: 10,
  reward: { type: "title", title: "Forgemaster" },
  flavorText: "The forge remembers your name.",
};

// ── Mastery (hidden) ────────────────────────────────────────────────────────────

const achStreak50: AchievementDefinition = {
  id: "ach_streak_50",
  name: "Untouchable",
  description: "Achieve a 50-race win streak.",
  category: "mastery",
  statKey: "bestWinStreakAllTime",
  target: 50,
  reward: { type: "bonus", bonusId: "ach_all_mult_10", description: "+10% all multipliers" },
  flavorText: "Fifty. In. A. Row.",
  hidden: true,
};

const achPrestige50: AchievementDefinition = {
  id: "ach_prestige_50",
  name: "Transcendent",
  description: "Prestige 50 times.",
  category: "mastery",
  statKey: "lifetimeScrapResets",
  target: 50,
  reward: { type: "bonus", bonusId: "ach_all_mult_5", description: "+5% all multipliers" },
  flavorText: "You've prestige'd more than most people play.",
  hidden: true,
};

const achScav10000: AchievementDefinition = {
  id: "ach_scav_10000",
  name: "Hoarder Supreme",
  description: "Scavenge 10,000 parts.",
  category: "mastery",
  statKey: "lifetimePartsScavengedAllTime",
  target: 10_000,
  reward: { type: "bonus", bonusId: "ach_scav_luck_15", description: "+15% scavenge luck" },
  flavorText: "The junkyard is empty. You took it all.",
  hidden: true,
};

const achWins2000: AchievementDefinition = {
  id: "ach_wins_2000",
  name: "Immortal Racer",
  description: "Win 2,000 races.",
  category: "mastery",
  statKey: "lifetimeWinsAllTime",
  target: 2000,
  reward: { type: "bonus", bonusId: "ach_race_perf_15", description: "+15% race performance" },
  flavorText: "Two thousand wins. The record books gave up.",
  hidden: true,
};

// ── Exports ─────────────────────────────────────────────────────────────────────

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // Racing
  achFirstWin,
  achWins100,
  achWins500,
  achRaces1000,
  achStreak20,
  // Building
  achVehicles10,
  achVehicles50,
  achAllTypes,
  achTier8,
  achArtifact,
  // Scavenging
  achScav500,
  achScav2000,
  achDecompose500,
  // Prestige
  achPrestige1,
  achPrestige10,
  achPrestige25,
  achTeamEra,
  achOwnerEra,
  // Wealth
  achScrap1M,
  achScrap10M,
  achLp100,
  achLp500,
  achTokens10,
  // Mastery
  achStreak50,
  achPrestige50,
  achScav10000,
  achWins2000,
];

export const ACHIEVEMENTS_BY_ID: Record<string, AchievementDefinition> = Object.fromEntries(
  ACHIEVEMENT_DEFINITIONS.map((a) => [a.id, a]),
);

export const ACHIEVEMENT_CATEGORIES: { id: AchievementCategory; label: string }[] = [
  { id: "racing", label: "Racing" },
  { id: "building", label: "Building" },
  { id: "scavenging", label: "Scavenging" },
  { id: "prestige", label: "Prestige" },
  { id: "wealth", label: "Wealth" },
  { id: "mastery", label: "Mastery" },
];
