/**
 * Run modifiers: perks (equipped per Season), dares (one optional objective
 * per Season) and hardships (opt-in rule changes, Team era). Their numeric
 * effects flow through channels (see ../channels.ts); their rule effects are
 * read as flags (see ../rules.ts). No modifier feeds a global multiplier.
 */

export interface PerkDef {
  id: string;
  name: string;
  kind: "Head start" | "Capacity" | "Automation" | "Rule bend" | "Information" | "Away" | "Parallel" | "Conversion" | "Risk" | "Conditional" | "Milestone" | "Unlock" | "Unlock speed";
  text: string;
  maxRank: number;
  /** LP cost per rank (index = rank − 1). */
  cost: number[];
  /** How the perk becomes buyable. */
  unlock: { type: "lp" } | { type: "dare"; dareId: string } | { type: "milestone"; venueId: string };
}

export const PERKS: readonly PerkDef[] = [
  { id: "barn_find", name: "Barn Find", kind: "Head start", text: "Start the Season with a rusted Riding Mower and its plans.", maxRank: 1, cost: [14], unlock: { type: "lp" } },
  { id: "tow_hitch", name: "Tow Hitch", kind: "Capacity", text: "Carry 2 more parts per trip, per rank.", maxRank: 3, cost: [6, 16, 36], unlock: { type: "lp" } },
  { id: "kid_brother", name: "Kid Brother", kind: "Automation", text: "Your most-used Habit from last Season is known from minute one.", maxRank: 1, cost: [10], unlock: { type: "lp" } },
  { id: "shade_tree", name: "Shade Tree Mechanic", kind: "Rule bend", text: "Repairs work straight from Rusted. No cleaning first.", maxRank: 1, cost: [12], unlock: { type: "lp" } },
  { id: "junkyard_eyes", name: "Junkyard Eyes", kind: "Information", text: "You never haul Scrap-condition parts; they come home Rusted.", maxRank: 1, cost: [10], unlock: { type: "lp" } },
  { id: "night_owl", name: "Night Owl", kind: "Away", text: "Bench jobs run 25% faster while you're away, per rank.", maxRank: 2, cost: [8, 24], unlock: { type: "lp" } },
  { id: "old_notebook", name: "Old Notebook", kind: "Unlock speed", text: "Familiar know-how studies in 10% of the time instead of 25%.", maxRank: 1, cost: [16], unlock: { type: "lp" } },
  { id: "second_bench", name: "Second Bench", kind: "Parallel", text: "Start with a second bench.", maxRank: 1, cost: [30], unlock: { type: "milestone", venueId: "regional" } },
  { id: "scavengers_map", name: "Scavenger's Map", kind: "Unlock", text: "The Long Haul is open from the start, no Beater needed.", maxRank: 1, cost: [40], unlock: { type: "milestone", venueId: "state" } },
  { id: "swap_meet", name: "Swap Meet Regular", kind: "Conversion", text: "Trade 3 parts for 1 part you've seen before, in Worn condition.", maxRank: 1, cost: [12], unlock: { type: "dare", dareId: "packrat" } },
  { id: "grudge_match", name: "Grudge Match", kind: "Risk", text: "Rivals race 5% harder. Beating a rival in a Feature pays double.", maxRank: 1, cost: [12], unlock: { type: "dare", dareId: "settle_it" } },
  { id: "underdog", name: "Underdog", kind: "Conditional", text: "A vehicle below a venue's top tier gets +12% performance there.", maxRank: 1, cost: [12], unlock: { type: "dare", dareId: "mower_madness" } },
  { id: "early_bird", name: "Early Bird", kind: "Milestone", text: "The first race win of each Season pays triple.", maxRank: 1, cost: [10], unlock: { type: "dare", dareId: "quick_season" } },
];

export const PERK_BY_ID: Record<string, PerkDef> = Object.fromEntries(PERKS.map((p) => [p.id, p]));

export interface DareDef {
  id: string;
  name: string;
  text: string;
  unlocksPerk: string;
}

export const DARES: readonly DareDef[] = [
  { id: "packrat", name: "Packrat Season", text: "Win the County Fair Feature without selling a single part.", unlocksPerk: "swap_meet" },
  { id: "settle_it", name: "Settle It", text: "Win the County Fair Feature without losing a race at the Fair.", unlocksPerk: "grudge_match" },
  { id: "mower_madness", name: "Mower Madness", text: "Win the Dirt Track Feature in a Riding Mower.", unlocksPerk: "underdog" },
  { id: "quick_season", name: "Quick Season", text: "Win the County Fair Feature within 48 hours of Season time.", unlocksPerk: "early_bird" },
];

export const DARE_BY_ID: Record<string, DareDef> = Object.fromEntries(DARES.map((d) => [d.id, d]));

export interface HardshipDef {
  id: string;
  name: string;
  rule: string;
  reward: string;
  /** Mastery channel and its cap; value = cap × (1 − 0.8^completions). */
  mastery: { channel: string; cap: number };
  conflicts: string[];
}

export const HARDSHIPS: readonly HardshipDef[] = [
  { id: "hand_tools", name: "Hand Tools Only", rule: "No Habits and no crew automation.", reward: "Bench speed, up to +30%", mastery: { channel: "bench_speed", cap: 0.3 }, conflicts: [] },
  { id: "one_yard", name: "One Yard", rule: "Besides the curb, you may open only one place to haul from.", reward: "Find quality, up to +1 condition step", mastery: { channel: "find_quality", cap: 1 }, conflicts: [] },
  { id: "rookie_plates", name: "Rookie Plates", rule: "No perks this Season.", reward: "+1 perk slot once, then Legacy gain up to +50%", mastery: { channel: "legacy_gain", cap: 0.5 }, conflicts: [] },
  { id: "rust_everything", name: "Rust Everything", rule: "Every part you find is one condition step worse.", reward: "Part wear, up to −30%", mastery: { channel: "wear", cap: 0.3 }, conflicts: [] },
  { id: "solo", name: "Solo", rule: "No crew this Season.", reward: "+1 Habit slot (once)", mastery: { channel: "automation", cap: 1 }, conflicts: [] },
  { id: "short_season", name: "Short Season", rule: "Win the County Fair Feature within 48 hours of Season time.", reward: "Away efficiency, up to +30%", mastery: { channel: "away_efficiency", cap: 0.3 }, conflicts: [] },
];

export const HARDSHIP_BY_ID: Record<string, HardshipDef> = Object.fromEntries(HARDSHIPS.map((h) => [h.id, h]));

export function masteryValue(cap: number, completions: number): number {
  return cap * (1 - Math.pow(0.8, completions));
}
