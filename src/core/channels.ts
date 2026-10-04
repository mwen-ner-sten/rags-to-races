/**
 * Bonus channels: one system, one lever.
 *
 * Every numeric bonus in the game targets a named channel, and every channel
 * declares the sources allowed to feed it. A unit test enforces the cohesion
 * rule: no channel has more than 3 sources, and no source touches more than 2
 * channels. Car performance is NOT a channel: it comes from the car itself.
 */
import { codexLevel } from "./content/places";
import { DISCIPLINES } from "./content/events";
import { HARDSHIP_BY_ID, masteryValue } from "./content/modifiers";
import { TOOL_BY_ID } from "./content/tools";
import { VEHICLE_BY_ID } from "./content/vehicles";
import { perkRank, teamUpgrade } from "./rules";
import type { GameState } from "./types";

export type ChannelId =
  | "carry"
  | "haul_speed"
  | "find_quality"
  | "bench_speed"
  | "benches"
  | "storage"
  | "sell_value"
  | "build_speed"
  | "practice"
  | "race_payout"
  | "automation"
  | "crew_cap"
  | "unlock_speed"
  | "away_efficiency"
  | "legacy_gain"
  | "wear"
  | "rebuild_speed"
  | "perk_slots";

export interface ChannelContext {
  placeId?: string;
}

export interface SourceDef {
  id: string;
  label: string;
  channels: ChannelId[];
  value: (state: GameState, channel: ChannelId, ctx: ChannelContext) => number;
}

export interface ChannelDef {
  id: ChannelId;
  label: string;
  /** "add": base + Σ; "pct": 1 + Σ (a multiplier); "reduce": 1 − Σ, floored at 0.2. */
  kind: "add" | "pct" | "reduce";
  base: number;
  sources: string[];
}

const hardshipMastery = (state: GameState, id: string): number =>
  masteryValue(HARDSHIP_BY_ID[id].mastery.cap, state.meta.hardshipMastery[id] ?? 0);

const disciplineMastery = (state: GameState, id: "dirt" | "drag"): number => {
  const def = DISCIPLINES[id].mastery;
  return Math.min(def.cap, def.perLevel * (state.meta.disciplineMastery[id] ?? 0));
};

export const SOURCES: readonly SourceDef[] = [
  { id: "vehicle:carrier", label: "Vehicles you own", channels: ["carry"], value: (s) => Math.max(0, ...s.run.vehicles.map((v) => VEHICLE_BY_ID[v.vehicleId]?.carry ?? 0)) - (s.run.vehicles.some((v) => (VEHICLE_BY_ID[v.vehicleId]?.carry ?? 0) > 0) ? 2 : 0) },
  { id: "vehicle:habit_slots", label: "Vehicles built this Season", channels: ["automation"], value: (s) => new Set(s.run.vehicles.filter((v) => VEHICLE_BY_ID[v.vehicleId]?.habitSlot).map((v) => v.vehicleId)).size },
  { id: "perk:tow_hitch", label: "Tow Hitch", channels: ["carry"], value: (s) => 2 * perkRank(s, "tow_hitch") },
  { id: "team:tow_rig", label: "Tow Rig", channels: ["carry"], value: (s) => 5 * teamUpgrade(s, "tow_rig") },
  { id: "tuneup:haul", label: "Tune-up: Haul", channels: ["haul_speed"], value: (s) => 0.1 * (s.config.tuneUp.haul ?? 0) },
  {
    id: "codex:place",
    label: "Codex: place knowledge",
    channels: ["haul_speed", "find_quality"],
    value: (s, channel, ctx) => {
      if (!ctx.placeId) return 0;
      const level = codexLevel(s.meta.codex.places[ctx.placeId] ?? 0);
      return channel === "haul_speed" ? 0.05 * level : 0.25 * level;
    },
  },
  { id: "perk:junkyard_eyes", label: "Junkyard Eyes", channels: ["find_quality"], value: (s) => (perkRank(s, "junkyard_eyes") > 0 ? 0.5 : 0) },
  { id: "mastery:one_yard", label: "Mastery: One Yard", channels: ["find_quality"], value: (s) => hardshipMastery(s, "one_yard") },
  { id: "tools:bench_gear", label: "Shop tools", channels: ["bench_speed"], value: (s) => Object.entries(s.run.tools).reduce((sum, [id, n]) => sum + (TOOL_BY_ID[id]?.benchSpeed ?? 0) * n, 0) },
  { id: "tuneup:wrench", label: "Tune-up: Wrench", channels: ["bench_speed"], value: (s) => 0.1 * (s.config.tuneUp.wrench ?? 0) },
  { id: "mastery:hand_tools", label: "Mastery: Hand Tools Only", channels: ["bench_speed"], value: (s) => hardshipMastery(s, "hand_tools") },
  { id: "tools:second_bench", label: "Second Bench (tool)", channels: ["benches"], value: (s) => s.run.tools.second_bench ?? 0 },
  { id: "perk:second_bench", label: "Second Bench (perk)", channels: ["benches"], value: (s) => perkRank(s, "second_bench") },
  { id: "team:second_bay", label: "Second Bay", channels: ["benches"], value: (s) => teamUpgrade(s, "second_bay") },
  { id: "tools:shelving", label: "Shelving", channels: ["storage"], value: (s) => 6 * (s.run.tools.shelving ?? 0) },
  { id: "team:parts_room", label: "Parts Room", channels: ["storage"], value: (s) => 12 * teamUpgrade(s, "parts_room") },
  { id: "knowhow:haggling", label: "Haggling", channels: ["sell_value"], value: (s) => (s.run.learned.includes("tech:haggling") ? 0.15 : 0) },
  { id: "tuneup:build", label: "Tune-up: Build", channels: ["build_speed"], value: (s) => 0.1 * (s.config.tuneUp.build ?? 0) },
  { id: "tuneup:race", label: "Tune-up: Race prep", channels: ["practice"], value: (s) => 0.1 * (s.config.tuneUp.race ?? 0) },
  { id: "team:sponsor_board", label: "Sponsor Board", channels: ["race_payout"], value: (s) => 0.15 * teamUpgrade(s, "sponsor_board") },
  { id: "mastery:solo", label: "Mastery: Solo", channels: ["automation"], value: (s) => ((s.meta.hardshipMastery.solo ?? 0) > 0 ? 1 : 0) },
  { id: "team:crew_quarters", label: "Crew Quarters", channels: ["crew_cap"], value: (s) => teamUpgrade(s, "crew_quarters") },
  { id: "perk:old_notebook", label: "Old Notebook", channels: ["unlock_speed"], value: (s) => (perkRank(s, "old_notebook") > 0 ? 0.6 : 0) },
  { id: "perk:night_owl", label: "Night Owl", channels: ["away_efficiency"], value: (s) => 0.25 * perkRank(s, "night_owl") },
  { id: "mastery:short_season", label: "Mastery: Short Season", channels: ["away_efficiency"], value: (s) => hardshipMastery(s, "short_season") },
  { id: "mastery:rookie_plates", label: "Mastery: Rookie Plates", channels: ["legacy_gain", "perk_slots"], value: (s, channel) => {
    const done = s.meta.hardshipMastery.rookie_plates ?? 0;
    if (channel === "perk_slots") return done > 0 ? 1 : 0;
    return done > 1 ? masteryValue(0.5, done - 1) : 0;
  } },
  { id: "mastery:rust_everything", label: "Mastery: Rust Everything", channels: ["wear"], value: (s) => hardshipMastery(s, "rust_everything") },
  { id: "mastery:dirt", label: "Mastery: Dirt Oval", channels: ["wear"], value: (s) => disciplineMastery(s, "dirt") },
  { id: "mastery:drag", label: "Mastery: Drag", channels: ["rebuild_speed"], value: (s) => disciplineMastery(s, "drag") },
  { id: "scrap:milestones", label: "Deep runs this era", channels: ["perk_slots"], value: (s) => ["regional", "state"].filter((v) => s.scrap.milestonesThisEra.includes(v)).length + (s.scrap.daresThisEra >= 5 ? 1 : 0) },
  { id: "team:legacy_ledger", label: "Legacy Ledger", channels: ["perk_slots"], value: (s) => teamUpgrade(s, "legacy_ledger") },
];

export const SOURCE_BY_ID: Record<string, SourceDef> = Object.fromEntries(SOURCES.map((s) => [s.id, s]));

export const CHANNELS: readonly ChannelDef[] = [
  { id: "carry", label: "Carry (parts per trip)", kind: "add", base: 2, sources: ["vehicle:carrier", "perk:tow_hitch", "team:tow_rig"] },
  { id: "haul_speed", label: "Trip speed", kind: "pct", base: 0, sources: ["tuneup:haul", "codex:place"] },
  { id: "find_quality", label: "Find quality (condition steps)", kind: "add", base: 0, sources: ["codex:place", "perk:junkyard_eyes", "mastery:one_yard"] },
  { id: "bench_speed", label: "Bench speed", kind: "pct", base: 0, sources: ["tools:bench_gear", "tuneup:wrench", "mastery:hand_tools"] },
  { id: "benches", label: "Benches", kind: "add", base: 1, sources: ["tools:second_bench", "perk:second_bench", "team:second_bay"] },
  { id: "storage", label: "Garage space", kind: "add", base: 12, sources: ["tools:shelving", "team:parts_room"] },
  { id: "sell_value", label: "Sell value", kind: "pct", base: 0, sources: ["knowhow:haggling"] },
  { id: "build_speed", label: "Assembly speed", kind: "pct", base: 0, sources: ["tuneup:build"] },
  { id: "practice", label: "Practice gain", kind: "pct", base: 0, sources: ["tuneup:race"] },
  { id: "race_payout", label: "Race prizes", kind: "pct", base: 0, sources: ["team:sponsor_board"] },
  { id: "automation", label: "Habit slots", kind: "add", base: 1, sources: ["vehicle:habit_slots", "mastery:solo"] },
  { id: "crew_cap", label: "Crew capacity", kind: "add", base: 2, sources: ["team:crew_quarters"] },
  { id: "unlock_speed", label: "Familiar study time saved", kind: "add", base: 0, sources: ["perk:old_notebook"] },
  { id: "away_efficiency", label: "Away bench speed", kind: "pct", base: 0, sources: ["perk:night_owl", "mastery:short_season"] },
  { id: "legacy_gain", label: "Legacy gain", kind: "pct", base: 0, sources: ["mastery:rookie_plates"] },
  { id: "wear", label: "Part wear", kind: "reduce", base: 0, sources: ["mastery:rust_everything", "mastery:dirt"] },
  { id: "rebuild_speed", label: "Engine repair speed", kind: "pct", base: 0, sources: ["mastery:drag"] },
  { id: "perk_slots", label: "Perk slots", kind: "add", base: 2, sources: ["scrap:milestones", "team:legacy_ledger", "mastery:rookie_plates"] },
];

export const CHANNEL_BY_ID: Record<ChannelId, ChannelDef> = Object.fromEntries(CHANNELS.map((c) => [c.id, c])) as Record<ChannelId, ChannelDef>;

export interface ChannelBreakdown {
  value: number;
  parts: { source: string; label: string; amount: number }[];
}

export function channelBreakdown(state: GameState, channel: ChannelId, ctx: ChannelContext = {}): ChannelBreakdown {
  const def = CHANNEL_BY_ID[channel];
  const parts = def.sources.map((id) => {
    const source = SOURCE_BY_ID[id];
    return { source: id, label: source.label, amount: source.value(state, channel, ctx) };
  });
  const sum = parts.reduce((total, p) => total + p.amount, 0);
  const value = def.kind === "add" ? def.base + sum : def.kind === "pct" ? 1 + def.base + sum : Math.max(0.2, 1 - def.base - sum);
  return { value, parts };
}

export function channel(state: GameState, id: ChannelId, ctx: ChannelContext = {}): number {
  return channelBreakdown(state, id, ctx).value;
}
