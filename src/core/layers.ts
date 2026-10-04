/**
 * Reset layers as data. A layer declares its gate, what it awards, which
 * scopes it clears, and which choices the player makes. performReset() is
 * the only reset function; adding a layer is adding an entry here.
 */
import { channel } from "./channels";
import { CREW, BASE_CREW_CAP, crewLevel } from "./content/team";
import { DARE_BY_ID, HARDSHIP_BY_ID, PERK_BY_ID } from "./content/modifiers";
import { VENUES, getVenue } from "./content/events";
import { getVehicle } from "./content/vehicles";
import { syncHabitSlots, templateBase } from "./habits";
import { afterChange, dispatch } from "./jobs";
import { STORY, addJournal } from "./journal";
import { learn } from "./knowhowEngine";
import { nextUid } from "./rng";
import { initialConfig, initialRun, initialScrap } from "./state";
import type { DisciplineId, EraState, GameState, PartInstance, RunConfig, Scope, SkillId } from "./types";

export type LayerId = "scrap" | "team";

export interface ScrapChoices {
  /** Perk ranks to buy with Legacy Points before equipping (repeat an id to buy several ranks). */
  buy?: string[];
  perks: string[];
  tuneUp: Record<SkillId, number>;
  dare: string | null;
  hardships: string[];
}

export interface TeamChoices extends ScrapChoices {
  discipline: DisciplineId;
  teamName: string;
  colors: [string, string];
  keepCrewId?: string | null;
}

export interface GateStatus {
  ok: boolean;
  reason: string | null;
}

export interface LayerDef<C> {
  id: LayerId;
  name: string;
  clears: Scope[];
  gate: (state: GameState) => GateStatus;
  /** Points this reset would award right now. */
  award: (state: GameState) => number;
  validate: (state: GameState, choices: C) => string | null;
  /** Runs after scopes are cleared: grant the award, apply choices. */
  apply: (state: GameState, award: number, choices: C, before: GameState) => void;
}

const SKILLS: SkillId[] = ["haul", "wrench", "build", "race"];

/** LP for the Season so far: Feature milestones plus record bonuses. */
export function scrapAward(state: GameState): number {
  let total = 0;
  for (const venue of VENUES) {
    const at = state.run.featureWins[venue.id];
    if (at === undefined) continue;
    let lp = venue.lp;
    const best = state.meta.records[venue.id];
    if (best !== undefined && at < best) lp *= 1.25;
    total += lp;
  }
  return Math.round(total * channel(state, "legacy_gain"));
}

export function teamAward(state: GameState): number {
  if (!state.era) return 10 + Math.floor((state.scrap.lifetimeLp + scrapAward(state)) / 20);
  const milestones = new Set([...state.era.milestones, ...Object.keys(state.run.featureWins)]);
  let tp = 0;
  for (const venueId of milestones) tp += getVenue(venueId).tp;
  const legends = new Set([...state.era.legends, ...state.era.crew.filter((c) => crewLevel(c.jobsDone) >= 5).map((c) => c.id)]);
  return tp + 5 * state.era.hardshipsCompleted + 10 * legends.size;
}

export function perkSlots(state: GameState): number {
  return Math.floor(channel(state, "perk_slots"));
}

/** Perk slots the next Season will have after a Scrap Reset (counts this Season's deep wins). */
export function nextSeasonPerkSlots(state: GameState): number {
  const fresh = ["regional", "state"].filter((v) => state.run.featureWins[v] !== undefined && !state.scrap.milestonesThisEra.includes(v)).length;
  return perkSlots(state) + fresh;
}

/** Tune-up points available after a Scrap Reset. */
export function nextSeasonTuneUpPoints(state: GameState): number {
  return state.scrap.tuneUpPoints + firstEverMilestones(state).length + (state.scrap.resets === 0 && !state.era ? 5 : 0);
}

export function hardshipCap(state: GameState): number {
  const done = Object.values(state.meta.hardshipMastery).reduce((a, b) => a + b, 0);
  return Math.min(4, 2 + Math.floor(done / 3));
}

/** Simulates perk purchases; returns the resulting ranks or an error. */
export function planPurchases(state: GameState, buy: string[], lpAvailable: number): { ranks: Record<string, number>; lpLeft: number } | string {
  const ranks = { ...state.meta.perks };
  let lp = lpAvailable;
  for (const id of buy) {
    const perk = PERK_BY_ID[id];
    if (!perk) return `Unknown perk ${id}`;
    if (perk.unlock.type !== "lp" && !state.meta.perksUnlocked.includes(id)) return `${perk.name} isn't on the shelf yet`;
    const rank = ranks[id] ?? 0;
    if (rank >= perk.maxRank) return `${perk.name} is already at max rank`;
    const cost = perk.cost[rank];
    if (lp < cost) return `Not enough Legacy Points for ${perk.name}`;
    lp -= cost;
    ranks[id] = rank + 1;
  }
  return { ranks, lpLeft: lp };
}

function validateScrapChoices(state: GameState, choices: ScrapChoices, slots: number, tuneUpPoints: number, teamEra: boolean, lpAvailable: number): string | null {
  const plan = planPurchases(state, choices.buy ?? [], lpAvailable);
  if (typeof plan === "string") return plan;
  const unique = new Set(choices.perks);
  if (unique.size !== choices.perks.length) return "A perk is equipped twice";
  if (choices.perks.length > slots) return `Only ${slots} perk slot${slots === 1 ? "" : "s"}`;
  for (const id of choices.perks) {
    if (!PERK_BY_ID[id]) return `Unknown perk ${id}`;
    if ((plan.ranks[id] ?? 0) < 1) return `You don't own ${PERK_BY_ID[id].name}`;
  }
  for (const k of SKILLS) {
    const v = choices.tuneUp[k] ?? 0;
    if (!Number.isInteger(v) || v < 0) return "Tune-up points are whole numbers";
  }
  const spent = SKILLS.reduce((sum, k) => sum + (choices.tuneUp[k] ?? 0), 0);
  if (spent > tuneUpPoints) return `Only ${tuneUpPoints} tune-up points`;
  if (choices.dare) {
    if (!DARE_BY_ID[choices.dare]) return "Unknown dare";
    if (state.meta.daresCompleted.includes(choices.dare)) return "You've already done that dare";
  }
  if (choices.hardships.length > 0 && !teamEra) return "Hardships open up once you found a team";
  if (choices.hardships.length > hardshipCap(state)) return `Up to ${hardshipCap(state)} hardships`;
  for (const id of choices.hardships) if (!HARDSHIP_BY_ID[id]) return `Unknown hardship ${id}`;
  return null;
}

function toConfig(choices: ScrapChoices): RunConfig {
  return {
    perks: [...choices.perks],
    tuneUp: { haul: choices.tuneUp.haul ?? 0, wrench: choices.tuneUp.wrench ?? 0, build: choices.tuneUp.build ?? 0, race: choices.tuneUp.race ?? 0 },
    dare: choices.dare,
    hardships: [...choices.hardships],
  };
}

export const SCRAP_LAYER: LayerDef<ScrapChoices> = {
  id: "scrap",
  name: "Scrap Reset",
  clears: ["run", "config"],
  gate: (s) => (s.run.featureWins.county_fair !== undefined ? { ok: true, reason: null } : { ok: false, reason: "Win the County Fair Feature" }),
  award: scrapAward,
  validate: (s, c) => validateScrapChoices(s, c, nextSeasonPerkSlots(s), nextSeasonTuneUpPoints(s), s.era !== null, s.scrap.lp + scrapAward(s)),
  apply: (s, award, choices) => {
    s.scrap.lp += award;
    s.scrap.lifetimeLp += award;
    s.scrap.resets += 1;
    buyPerks(s, choices.buy ?? []);
    s.config = toConfig(choices);
  },
};

export const TEAM_LAYER: LayerDef<TeamChoices> = {
  id: "team",
  name: "Team Reset",
  clears: ["run", "config", "scrap", "era"],
  gate: (s) => {
    if (!s.era) return s.meta.stateWonEver ? { ok: true, reason: null } : { ok: false, reason: "Win the State Invitational Feature" };
    return s.run.featureWins.county_fair !== undefined ? { ok: true, reason: null } : { ok: false, reason: "Win the County Fair Feature this Season" };
  },
  award: teamAward,
  validate: (s, c) => {
    if (c.discipline !== "dirt" && c.discipline !== "drag") return "Pick a discipline";
    if (!c.teamName.trim()) return "Name your team";
    if (c.keepCrewId && !(s.team.upgrades.old_hands ?? 0)) return "You need Old Hands to keep a crew member";
    // After a Team Reset the Scrap layer starts over: 2 base slots (+ team upgrades), 5 tune-up points.
    const slots = 2 + (s.team.upgrades.legacy_ledger ?? 0) + ((s.meta.hardshipMastery.rookie_plates ?? 0) > 0 ? 1 : 0);
    return validateScrapChoices(s, c, slots, 5, true, s.scrap.lp);
  },
  apply: (s, award, choices, before) => {
    // LP is spent before the Scrap layer clears.
    s.scrap.lp = before.scrap.lp;
    buyPerks(s, choices.buy ?? []);
    s.scrap.lp = 0;
    s.team.tp += award;
    s.team.lifetimeTp += award;
    s.team.resets += 1;
    s.meta.totalTeamResets += 1;
    s.scrap.tuneUpPoints = 5;
    const kept = choices.keepCrewId ? before.era?.crew.find((c) => c.id === choices.keepCrewId) : undefined;
    const era: EraState = {
      discipline: choices.discipline,
      teamName: choices.teamName.trim().slice(0, 40),
      colors: choices.colors,
      crew: kept ? [{ ...kept, assignment: { type: "queue" }, morale: 100, workedInWindowMs: 0, windowStartMs: 0 }] : [],
      milestones: [],
      hardshipsCompleted: 0,
      legends: [],
      seasonIndex: 0,
    };
    s.era = era;
    s.config = toConfig(choices);
    addJournal(s, "founding", STORY.founding);
  },
};

function buyPerks(state: GameState, buy: string[]): void {
  const plan = planPurchases(state, buy, state.scrap.lp);
  if (typeof plan === "string") return;
  state.meta.perks = plan.ranks;
  state.scrap.lp = plan.lpLeft;
}

export const LAYERS = { scrap: SCRAP_LAYER, team: TEAM_LAYER } as const;

function firstEverMilestones(state: GameState): string[] {
  return Object.keys(state.run.featureWins).filter((v) => !state.scrap.milestonesThisEra.includes(v));
}

/** Banks everything a Season earned into longer-lived scopes. Shared by every reset. */
function commitSeason(state: GameState): void {
  const meta = state.meta;
  for (const id of state.run.learned) meta.knowhow[id] = (meta.knowhow[id] ?? 0) + 1;
  for (const template of state.run.habitsKnown) {
    if ((state.run.reps[template] ?? 0) > 0) meta.habitMemory[template] = (meta.habitMemory[template] ?? 0) + 1;
  }
  const top = Object.entries(state.run.reps).filter(([t]) => state.run.habitsKnown.includes(t)).sort((a, b) => b[1] - a[1])[0];
  meta.lastTopHabit = top ? top[0] : meta.lastTopHabit;
  for (const vehicle of state.run.vehicles) {
    meta.hallOfFame.push({
      season: meta.seasonsPlayed + 1,
      vehicleId: vehicle.vehicleId,
      name: vehicle.name,
      history: { ...vehicle.history },
      parts: Object.entries(vehicle.parts).flatMap(([slot, p]) => (p ? [{ slot, partId: p.partId, condition: p.condition, origin: p.origin }] : [])),
    });
  }
  if (meta.hallOfFame.length > 200) meta.hallOfFame.splice(0, meta.hallOfFame.length - 200);
  const newThisEra = firstEverMilestones(state);
  for (const [venueId, at] of Object.entries(state.run.featureWins)) {
    meta.records[venueId] = Math.min(meta.records[venueId] ?? Infinity, at);
    if (!meta.milestonesEver.includes(venueId)) meta.milestonesEver.push(venueId);
  }
  state.scrap.tuneUpPoints += newThisEra.length + (state.scrap.resets === 0 && !state.era ? 5 : 0);
  state.scrap.milestonesThisEra.push(...newThisEra);
  if (state.era) {
    for (const venueId of Object.keys(state.run.featureWins)) if (!state.era.milestones.includes(venueId)) state.era.milestones.push(venueId);
    if (state.run.featureWins.county_fair !== undefined) {
      const d = state.era.discipline;
      meta.disciplineMastery[d] = (meta.disciplineMastery[d] ?? 0) + 1 + (state.run.featureWins.state !== undefined ? 1 : 0);
    }
    for (const member of state.era.crew) if (crewLevel(member.jobsDone) >= 5 && !state.era.legends.includes(member.id)) state.era.legends.push(member.id);
    state.era.seasonIndex += 1;
  }
  meta.seasonsPlayed += 1;
}

/** Sets up a fresh Season from the config and long-lived scopes. */
export function startSeason(state: GameState): void {
  const { run, config, meta } = state;
  if (config.perks.includes("kid_brother") && meta.lastTopHabit && !config.hardships.includes("rookie_plates") && !config.hardships.includes("hand_tools")) {
    run.habitsKnown.push(templateBase(meta.lastTopHabit));
  }
  if (config.perks.includes("barn_find") && !config.hardships.includes("rookie_plates")) {
    learn(state, "blueprint:riding_mower");
    const def = getVehicle("riding_mower");
    const parts: Record<string, PartInstance> = {
      engine: { uid: nextUid(state, "p"), partId: "engine_lawn", condition: 1, origin: "The barn" },
      wheel: { uid: nextUid(state, "p"), partId: "wheel_basic", condition: 1, origin: "The barn" },
      frame: { uid: nextUid(state, "p"), partId: "frame_mower", condition: 1, origin: "The barn" },
    };
    run.vehicles.push({ uid: nextUid(state, "v"), vehicleId: def.id, name: "Barn Find", parts, tune: "balanced", history: { races: 0, wins: 0, dnfs: 0, bestFinish: null }, builtAtSeasonMs: 0 });
  }
  if (state.era) {
    for (const member of state.era.crew) {
      member.windowStartMs = 0;
      member.workedInWindowMs = 0;
      member.morale = 100;
      if (member.assignment.type === "habit" && !run.habitsKnown.includes(templateBase(member.assignment.template))) member.assignment = { type: "queue" };
    }
  }
  if (state.era && !config.hardships.includes("solo")) {
    const hired = new Set(state.era.crew.map((c) => c.id));
    const pool = CREW.filter((c) => !hired.has(c.id));
    const start = (state.era.seasonIndex * 3 + meta.totalTeamResets) % Math.max(1, pool.length);
    run.candidates = [0, 1, 2].map((k) => pool[(start + k) % pool.length]?.id).filter((id): id is string => Boolean(id) && !hired.has(id as string));
    run.candidates = [...new Set(run.candidates)];
  }
  if (meta.seasonsPlayed > 0) addJournal(state, "new_season", STORY.new_season);
  syncHabitSlots(state);
  afterChange(state);
  dispatch(state);
}

/** The one reset function. Returns an error message, or null on success (state mutated). */
export function performReset(state: GameState, layerId: LayerId, choices: ScrapChoices | TeamChoices): string | null {
  const layer = LAYERS[layerId] as LayerDef<ScrapChoices | TeamChoices>;
  const gate = layer.gate(state);
  if (!gate.ok) return gate.reason;
  const invalid = layer.validate(state, choices);
  if (invalid) return invalid;
  const before = structuredClone(state);
  const award = layer.award(state);
  commitSeason(state);
  for (const scope of layer.clears) clearScope(state, scope);
  layer.apply(state, award, choices, before);
  startSeason(state);
  return null;
}

function clearScope(state: GameState, scope: Scope): void {
  switch (scope) {
    case "run":
      state.run = initialRun();
      break;
    case "config":
      state.config = initialConfig();
      break;
    case "scrap": {
      const lifetime = state.scrap.lifetimeLp;
      state.scrap = { ...initialScrap(), lifetimeLp: lifetime };
      break;
    }
    case "era":
      state.era = null;
      break;
  }
}

export function crewCap(state: GameState): number {
  return state.era ? Math.floor(channel(state, "crew_cap")) : 0;
}

export { BASE_CREW_CAP };
