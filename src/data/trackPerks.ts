export type TrackPerkCategory = "track_mods" | "empire" | "meta_power";

export interface TrackPerkDefinition {
  id: string;
  name: string;
  description: string;
  category: TrackPerkCategory;
  maxLevel: number;
  baseCost: number;     // PT cost for level 1
  costScaling: number;
  effect: { type: string; valuePerLevel: number };
}

/** Calculate PT cost for a given perk at a given level (1-indexed) */
export function trackPerkCost(def: TrackPerkDefinition, level: number): number {
  return Math.ceil(def.baseCost * Math.pow(def.costScaling, level - 1));
}

// ── Track Modifications ────────────────────────────────────────────────────

const CUSTOM_CIRCUITS: TrackPerkDefinition = {
  id: "track_custom_circuits",
  name: "Custom Circuits",
  description: "Design circuits with custom difficulty/reward.",
  category: "track_mods",
  maxLevel: 1,
  baseCost: 10,
  costScaling: 1,
  effect: { type: "custom_circuits", valuePerLevel: 1 },
};

const NIGHT_RACING: TrackPerkDefinition = {
  id: "track_night_racing",
  name: "Night Racing",
  description: "Alternate circuit variants with unique challenges.",
  category: "track_mods",
  maxLevel: 1,
  baseCost: 8,
  costScaling: 1,
  effect: { type: "night_variants", valuePerLevel: 1 },
};

const ENDURANCE_MODE: TrackPerkDefinition = {
  id: "track_endurance",
  name: "Endurance Mode",
  description: "Ultra-long races with massive payouts.",
  category: "track_mods",
  maxLevel: 1,
  baseCost: 12,
  costScaling: 1,
  effect: { type: "endurance_races", valuePerLevel: 1 },
};

// ── Empire ─────────────────────────────────────────────────────────────────

const MULTI_TRACK: TrackPerkDefinition = {
  id: "track_multi",
  name: "Multi-Track",
  description: "Own multiple tracks for passive income.",
  category: "empire",
  maxLevel: 3,
  baseCost: 8,
  costScaling: 2.5,
  effect: { type: "extra_track", valuePerLevel: 1 },
};

const SPONSOR_NETWORK: TrackPerkDefinition = {
  id: "track_sponsors",
  name: "Sponsor Network",
  description: "Passive scrap generation from sponsors.",
  category: "empire",
  maxLevel: 5,
  baseCost: 5,
  costScaling: 1.8,
  effect: { type: "passive_scrap", valuePerLevel: 1 },
};

const TALENT_ACADEMY: TrackPerkDefinition = {
  id: "track_academy",
  name: "Talent Academy",
  description: "Crew auto-recruit at milestones.",
  category: "empire",
  maxLevel: 1,
  baseCost: 10,
  costScaling: 1,
  effect: { type: "crew_auto_recruit", valuePerLevel: 1 },
};

// ── Meta Power ─────────────────────────────────────────────────────────────

const PRESTIGE_CASCADE: TrackPerkDefinition = {
  id: "track_cascade",
  name: "Prestige Cascade",
  description: "All lower-layer currencies +100%.",
  category: "meta_power",
  maxLevel: 1,
  baseCost: 20,
  costScaling: 1,
  effect: { type: "lower_currency_mult", valuePerLevel: 1.0 },
};

const ETERNAL_WORKSHOP: TrackPerkDefinition = {
  id: "track_eternal",
  name: "Eternal Workshop",
  description: "Some workshop upgrades persist through all resets.",
  category: "meta_power",
  maxLevel: 1,
  baseCost: 25,
  costScaling: 1,
  effect: { type: "eternal_workshop", valuePerLevel: 1 },
};

const TIME_DILATION: TrackPerkDefinition = {
  id: "track_time_dilate",
  name: "Time Dilation",
  description: "Base tick speed permanently improved -5s per level.",
  category: "meta_power",
  maxLevel: 3,
  baseCost: 10,
  costScaling: 2.0,
  effect: { type: "tick_speed_reduction", valuePerLevel: 5 },
};

// ── Export ──────────────────────────────────────────────────────────────────

export const TRACK_PERK_DEFINITIONS: TrackPerkDefinition[] = [
  CUSTOM_CIRCUITS,
  NIGHT_RACING,
  ENDURANCE_MODE,
  MULTI_TRACK,
  SPONSOR_NETWORK,
  TALENT_ACADEMY,
  PRESTIGE_CASCADE,
  ETERNAL_WORKSHOP,
  TIME_DILATION,
];

export const TRACK_PERKS_BY_ID = Object.fromEntries(
  TRACK_PERK_DEFINITIONS.map((u) => [u.id, u]),
) as Record<string, TrackPerkDefinition>;

export const TRACK_PERK_CATEGORIES: TrackPerkCategory[] = [
  "track_mods",
  "empire",
  "meta_power",
];

export const TRACK_PERK_CATEGORY_LABELS: Record<TrackPerkCategory, string> = {
  track_mods: "Track Modifications",
  empire: "Empire",
  meta_power: "Meta Power",
};
