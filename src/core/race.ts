import { channel } from "./channels";
import { DISCIPLINES, OPPONENT_SPREAD, PRIZE_SHARE, RIVAL_BY_ID, getVenue, venueName } from "./content/events";
import { getPart } from "./content/parts";
import { CREW_BY_ID, crewLevel } from "./content/team";
import { getVehicle } from "./content/vehicles";
import { vehicleStats } from "./garage";
import { STORY, addJournal, logSeason } from "./journal";
import { nextUid, rand, randNormal } from "./rng";
import { hasPerk, resolveFlags } from "./rules";
import { LAPS, buildBeats } from "./raceBeats";
import type { Condition, DisciplineId, EventKind, GameState, JobSpec, RaceResult, RaceRoll, Vehicle } from "./types";

type RaceSpec = Extract<JobSpec, { kind: "race" }>;

const NOISE = 0.06;

export function rawScore(vehicle: Vehicle, discipline: DisciplineId): number {
  const s = vehicleStats(vehicle);
  const w = DISCIPLINES[discipline].weights;
  return Math.max(1, s.power * w.power + s.handling * w.handling + s.reliability * w.reliability - s.weight * w.weight);
}

interface Crewside {
  driverPerf: number;
  dnfMult: number;
  pushDnfMult: number;
  nurseScoreMult: number;
  secondCall: boolean;
}

function crewside(state: GameState): Crewside {
  const out: Crewside = { driverPerf: 0, dnfMult: 1, pushDnfMult: 1, nurseScoreMult: 1, secondCall: false };
  if (!state.era || resolveFlags(state).crewDisabled) return out;
  for (const member of state.era.crew) {
    const def = CREW_BY_ID[member.id];
    if (!def) continue;
    const levelBonus = 1 + 0.1 * (crewLevel(member.jobsDone) - 1);
    if (member.assignment.type === "driver" && def.driverPerf) {
      out.driverPerf += def.driverPerf * levelBonus;
      out.pushDnfMult *= def.pushDnfMult ?? 1;
      out.nurseScoreMult *= def.nurseScoreMult ?? 1;
      out.secondCall = true;
    }
    if (member.assignment.type === "spotter" && def.dnfMult) out.dnfMult *= Math.max(0.3, def.dnfMult / levelBonus);
  }
  return out;
}

export function practiceBonus(state: GameState, venueId: string): number {
  return Math.min(0.1, 0.01 * (state.run.practice[venueId] ?? 0));
}

/** The player's expected score in an event before noise (used by previews and the Dyno). */
export function effectiveScore(state: GameState, vehicle: Vehicle, venueId: string, call: RaceSpec["call"], call2?: RaceSpec["call2"]): number {
  const flags = resolveFlags(state);
  const venue = getVenue(venueId);
  const crew = crewside(state);
  let score = rawScore(vehicle, flags.discipline) * (1 + practiceBonus(state, venueId)) * (1 + crew.driverPerf);
  if (hasPerk(state, "underdog") && getVehicle(vehicle.vehicleId).tier < venue.tiers[1]) score *= 1.12;
  score *= call === "push" ? 1.06 : 0.97 * crew.nurseScoreMult;
  if (call2 === "pit") score *= 0.97;
  if (call2 === "launch_hard") score *= 1.05;
  if (call2 === "launch_soft") score *= 0.98;
  return score;
}

export function opponentScores(state: GameState, venueId: string, event: EventKind): number[] {
  const flags = resolveFlags(state);
  const field = getVenue(venueId).events[event].field * DISCIPLINES[flags.discipline].fieldScale;
  return OPPONENT_SPREAD.map((spread, i) => field * spread * (i === 0 && event === "feature" && hasPerk(state, "grudge_match") ? 1.05 : 1));
}

export function dnfChance(state: GameState, vehicle: Vehicle, venueId: string, event: EventKind, call: RaceSpec["call"], call2?: RaceSpec["call2"]): number {
  const flags = resolveFlags(state);
  const stats = vehicleStats(vehicle);
  const crew = crewside(state);
  const base = getVenue(venueId).events[event].dnfBase;
  const relFactor = Math.min(2.5, Math.max(0.3, 60 / (stats.reliability + 20)));
  const callFactor = call === "push" ? 1.8 * crew.pushDnfMult : 0.7;
  const call2Factor = call2 === "launch_hard" ? 1.4 : call2 === "launch_soft" ? 0.7 : 1;
  const worn = Object.values(vehicle.parts).filter((p) => p && p.condition <= 1).length;
  return Math.min(0.9, base * relFactor * callFactor * call2Factor * DISCIPLINES[flags.discipline].dnfMult * crew.dnfMult + 0.015 * worn);
}

/** Probability of winning (no DNF, beating the whole field), estimated in closed form for previews. */
export function winChance(state: GameState, vehicle: Vehicle, venueId: string, event: EventKind, call: RaceSpec["call"], call2?: RaceSpec["call2"]): number {
  const me = effectiveScore(state, vehicle, venueId, call, call2);
  const opps = opponentScores(state, venueId, event);
  // P(me·(1+N) > opp·(1+N')) for independent normals; product over opponents (approximation).
  let p = 1;
  for (const opp of opps) {
    const diff = me - opp;
    const sd = NOISE * Math.sqrt(me * me + opp * opp);
    p *= normalCdf(diff / sd);
  }
  return p * (1 - dnfChance(state, vehicle, venueId, event, call, call2));
}

function normalCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

export function weakestSlot(vehicle: Vehicle): string | null {
  let worst: { slot: string; key: number } | null = null;
  for (const [slot, part] of Object.entries(vehicle.parts)) {
    if (!part) continue;
    const key = part.condition * 10 + getPart(part.partId).tier;
    if (!worst || key < worst.key) worst = { slot, key };
  }
  return worst?.slot ?? null;
}

/** Rolls a race's outcome at the green flag (it's revealed live and paid out at the flag). */
export function rollRace(state: GameState, spec: RaceSpec): RaceRoll | null {
  const vehicle = state.run.vehicles.find((v) => v.uid === spec.vehicleUid);
  if (!vehicle) return null;
  const flags = resolveFlags(state);
  const discipline = DISCIPLINES[flags.discipline];
  const event = getVenue(spec.venueId).events[spec.event];

  const dnfP = dnfChance(state, vehicle, spec.venueId, spec.event, spec.call, spec.call2);
  const dnf = rand(state) < dnfP;
  const me = effectiveScore(state, vehicle, spec.venueId, spec.call, spec.call2) * (1 + NOISE * randNormal(state));
  const opps = opponentScores(state, spec.venueId, spec.event).map((o) => o * (1 + NOISE * randNormal(state)));
  const fieldSize = opps.length + 1;
  const position = dnf ? fieldSize : 1 + opps.filter((o) => o > me).length;
  const ahead = opps.filter((o) => o > me);
  const reference = ahead.length > 0 ? Math.min(...ahead) : Math.max(...opps);
  const margin = (me - reference) / Math.max(1, event.field);

  const weak = weakestSlot(vehicle);
  const wearMult = (spec.call === "push" ? 1.6 : 0.6) * discipline.wearMult * channel(state, "wear") * (spec.call2 === "pit" ? 0.5 : spec.call2 === "stay" ? 1.3 : 1);
  const wearSteps: Record<string, number> = {};
  for (const slot of Object.keys(vehicle.parts)) {
    let steps = rand(state) < 0.08 * wearMult ? 1 : 0;
    if (dnf && slot === weak) steps += 1;
    if (dnf && slot === "engine") steps += discipline.engineBlowSteps;
    if (steps > 0) wearSteps[slot] = steps;
  }

  const startPos = 2 + Math.floor(rand(state) * (fieldSize - 1));
  const rivalBeaten = spec.event === "feature" && !dnf && me > opps[0];
  const laps = flags.discipline === "drag" ? 1 : LAPS[spec.event];
  const durationMs = event.durationMs * discipline.durationMult;
  const rivalId = spec.event === "feature" ? getVenue(spec.venueId).rival : undefined;
  const beats = buildBeats(state, { startPos, position, fieldSize, dnf, weakSlot: weak, durationMs, laps, rivalId, rivalBeaten });
  return { position, fieldSize, dnf, margin, rivalBeaten, weakestSlot: weak, wearSteps, laps, durationMs, beats };
}

/** Rolls and settles in one go (used when a race has no pre-rolled outcome). */
export function resolveRace(state: GameState, spec: RaceSpec): RaceResult | null {
  const roll = rollRace(state, spec);
  return roll ? settleRace(state, spec, roll) : null;
}

/** Pays out a race at the flag: wear, prize, Rep, ladder and history. Mutates state. */
export function settleRace(state: GameState, spec: RaceSpec, roll: RaceRoll): RaceResult | null {
  const vehicle = state.run.vehicles.find((v) => v.uid === spec.vehicleUid);
  if (!vehicle) return null;
  const venue = getVenue(spec.venueId);
  const event = venue.events[spec.event];
  const { position, fieldSize, dnf, rivalBeaten } = roll;

  const wear: RaceResult["wear"] = [];
  for (const [slot, steps] of Object.entries(roll.wearSteps)) {
    const part = vehicle.parts[slot];
    if (!part || part.condition === 0) continue;
    const from = part.condition;
    part.condition = Math.max(0, part.condition - steps) as Condition;
    wear.push({ slot, from, to: part.condition });
  }

  // Money and Rep.
  const isFirstWin = position === 1 && !state.run.races.some((r) => r.position === 1 && !r.dnf);
  let prize = dnf ? 0 : event.prize * (PRIZE_SHARE[position - 1] ?? 0) * channel(state, "race_payout");
  if (isFirstWin && hasPerk(state, "early_bird")) prize *= 3;
  if (rivalBeaten && hasPerk(state, "grudge_match")) prize *= 2;
  prize = Math.round(prize);
  const repShare = [1, 0.5, 0.25][position - 1] ?? 0;
  const rep = dnf ? 0 : Math.ceil(event.rep * repShare);
  state.run.cash += prize;
  state.run.rep += rep;

  const result: RaceResult = {
    id: nextUid(state, "r"),
    seasonMs: state.run.seasonMs,
    vehicleUid: vehicle.uid,
    venueId: spec.venueId,
    event: spec.event,
    call: spec.call,
    position,
    fieldSize,
    dnf,
    prize,
    rep,
    rival: spec.event === "feature" ? { id: venue.rival, beaten: rivalBeaten } : undefined,
    margin: roll.margin,
    weakestSlot: roll.weakestSlot,
    beats: roll.beats,
    laps: roll.laps,
    durationMs: roll.durationMs,
    wear,
  };
  state.run.races.push(result);
  if (state.run.races.length > 60) state.run.races.splice(0, state.run.races.length - 60);

  vehicle.history.races += 1;
  if (position === 1 && !dnf) vehicle.history.wins += 1;
  if (dnf) vehicle.history.dnfs += 1;
  if (!dnf) vehicle.history.bestFinish = vehicle.history.bestFinish === null ? position : Math.min(vehicle.history.bestFinish, position);

  state.run.practice[spec.venueId] = (state.run.practice[spec.venueId] ?? 0) + channel(state, "practice");
  if (position > 1 || dnf) state.run.stats.racesLost[spec.venueId] = (state.run.stats.racesLost[spec.venueId] ?? 0) + 1;

  if (result.rival) {
    const record = state.meta.rivals[result.rival.id] ?? { wins: 0, losses: 0 };
    if (result.rival.beaten) record.wins += 1;
    else record.losses += 1;
    state.meta.rivals[result.rival.id] = record;
  }

  addJournal(state, "first_race", STORY.first_race);
  if (position === 1 && !dnf) addJournal(state, "first_win", STORY.first_win);

  // Ladder: a podium opens the next event at this venue.
  const ladder = state.run.ladder[spec.venueId] ?? ["sprint"];
  if (!dnf && position <= 3) {
    if (spec.event === "sprint" && !ladder.includes("heat")) ladder.push("heat");
    if (spec.event === "heat" && !ladder.includes("feature")) ladder.push("feature");
  }
  state.run.ladder[spec.venueId] = ladder;

  if (spec.event === "feature" && position === 1 && !dnf) onFeatureWin(state, spec.venueId, vehicle);
  return result;
}

function onFeatureWin(state: GameState, venueId: string, vehicle: Vehicle): void {
  const first = state.run.featureWins[venueId] === undefined;
  if (!first) return;
  state.run.featureWins[venueId] = state.run.seasonMs;
  const flags = resolveFlags(state);
  logSeason(state, `feature:${venueId}`, `Won the ${venueName(venueId, flags.discipline)} Feature${RIVAL_BY_ID[getVenue(venueId).rival] ? `, ahead of ${RIVAL_BY_ID[getVenue(venueId).rival].name}` : ""}.`);
  // Open venues that this Feature unlocks.
  for (const next of ["county_fair", "regional", "state"]) {
    const def = getVenue(next);
    if (def.opens.type === "feature" && def.opens.venueId === venueId && !state.run.venuesOpen.includes(next)) {
      state.run.venuesOpen.push(next);
      state.run.ladder[next] = ["sprint"];
      if (next === "county_fair") addJournal(state, "fair_invite", STORY.fair_invite);
    }
  }
  if (venueId === "county_fair") {
    addJournal(state, "fair_win", STORY.fair_win);
    checkFairObjectives(state);
  }
  if (venueId === "dirt" && state.config.dare === "mower_madness" && vehicle.vehicleId === "riding_mower") completeDare(state, "mower_madness");
  if (venueId === "state") {
    state.meta.stateWonEver = true;
    addJournal(state, "state_win", STORY.state_win);
  }
}

function checkFairObjectives(state: GameState): void {
  const dare = state.config.dare;
  if (dare === "packrat" && state.run.stats.partsSold === 0) completeDare(state, "packrat");
  if (dare === "settle_it" && (state.run.stats.racesLost.county_fair ?? 0) === 0) completeDare(state, "settle_it");
  if (dare === "quick_season" && state.run.seasonMs <= 48 * 3_600_000) completeDare(state, "quick_season");
  if (!state.era) return;
  for (const id of state.config.hardships) {
    if (id === "short_season" && state.run.seasonMs > 48 * 3_600_000) continue;
    const key = `hardship:${id}`;
    if (state.run.revealed.includes(key)) continue;
    state.run.revealed.push(key);
    state.meta.hardshipMastery[id] = (state.meta.hardshipMastery[id] ?? 0) + 1;
    state.era.hardshipsCompleted += 1;
    logSeason(state, key, `Hardship completed. It'll make you better at this.`);
  }
}

function completeDare(state: GameState, dareId: string): void {
  if (state.meta.daresCompleted.includes(dareId)) return;
  state.meta.daresCompleted.push(dareId);
  state.scrap.daresThisEra += 1;
  const perk = { packrat: "swap_meet", settle_it: "grudge_match", mower_madness: "underdog", quick_season: "early_bird" }[dareId];
  if (perk && !state.meta.perksUnlocked.includes(perk)) state.meta.perksUnlocked.push(perk);
  logSeason(state, `dare:${dareId}`, `Dare completed. A new perk is on the shelf.`);
}

export function raceDurationMs(state: GameState, spec: RaceSpec): number {
  const flags = resolveFlags(state);
  return getVenue(spec.venueId).events[spec.event].durationMs * DISCIPLINES[flags.discipline].durationMult;
}
