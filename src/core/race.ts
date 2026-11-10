import { channel } from "./channels";
import { BRACKET_SPREAD, CALL2, DISCIPLINES, OPPONENT_SPREAD, PRIZE_SHARE, RIVAL_BY_ID, getVenue, venueName, type DisciplineDef, type VenueDemand } from "./content/events";
import { CONDITION_STAT, getPart } from "./content/parts";
import { CREW_BY_ID, crewLevel } from "./content/team";
import { getVehicle } from "./content/vehicles";
import { vehicleStats } from "./garage";
import { pushFeed } from "./feed";
import { STORY, addJournal, logSeason, tell } from "./journal";
import { nextUid, rand, randNormal } from "./rng";
import { hasPerk, resolveFlags } from "./rules";
import { LAPS, buildBeats, carName } from "./raceBeats";
import { creditCrew, crewEfficiency, racingCrewIds } from "./crew";
import { refreshPerkUnlocks } from "./perks";
import type { Condition, DisciplineId, EventKind, GameState, JobSpec, RaceBeat, RaceResult, RaceRoll, Vehicle } from "./types";

type RaceSpec = Extract<JobSpec, { kind: "race" }>;

const NOISE = 0.06;
const NEUTRAL: VenueDemand = { power: 1, handling: 1, reliability: 1 };

/** A car's score before the driver, the call and luck. On an oval the venue decides how much each stat counts. */
export function rawScore(vehicle: Vehicle, discipline: DisciplineId, venueId?: string): number {
  const s = vehicleStats(vehicle);
  const def = DISCIPLINES[discipline];
  const w = def.weights;
  const d = venueId && def.format === "oval" ? getVenue(venueId).demand : NEUTRAL;
  return Math.max(1, s.power * w.power * d.power + s.handling * w.handling * d.handling + s.reliability * w.reliability * d.reliability + s.traction * w.traction - s.weight * w.weight);
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
    const efficiency = crewEfficiency(member);
    if (member.assignment.type === "driver" && def.driverPerf) {
      out.driverPerf += def.driverPerf * levelBonus * efficiency;
      out.pushDnfMult *= def.pushDnfMult ?? 1;
      out.nurseScoreMult *= def.nurseScoreMult ?? 1;
      out.secondCall = true;
    }
    if (member.assignment.type === "spotter" && def.dnfMult) out.dnfMult *= 1 - (1 - Math.max(0.3, def.dnfMult / levelBonus)) * efficiency;
  }
  return out;
}

export function practiceBonus(state: GameState, venueId: string): number {
  return Math.min(0.1, 0.01 * (state.run.practice[venueId] ?? 0));
}

/** The player's score from the car, practice, the driver and the Push/Nurse call (no second call, no luck). */
function baseScore(state: GameState, vehicle: Vehicle, venueId: string, call: RaceSpec["call"]): number {
  const flags = resolveFlags(state);
  const venue = getVenue(venueId);
  const crew = crewside(state);
  let score = rawScore(vehicle, flags.discipline, venueId) * (1 + practiceBonus(state, venueId)) * (1 + crew.driverPerf);
  if (hasPerk(state, "underdog") && getVehicle(vehicle.vehicleId).tier < venue.tiers[1]) score *= 1.12;
  score *= call === "push" ? 1.06 : 0.97 * crew.nurseScoreMult;
  return score;
}

/** Chance the yellow flag comes out in this event (Team-era ovals only). */
export function cautionChance(state: GameState, event: EventKind): number {
  const flags = resolveFlags(state);
  const def = DISCIPLINES[flags.discipline];
  return flags.teamEra && def.format === "oval" ? def.cautionChance[event] : 0;
}

/** What the driver's second call is worth on average (it only pays off when its moment comes). */
function call2Expected(state: GameState, event: EventKind, call2: RaceSpec["call2"]): number {
  if (call2 === "pit" || call2 === "stay") return 1 + cautionChance(state, event) * (CALL2[call2].score - 1);
  if (call2 === "launch_hard") return (1 - CALL2.launch_hard.spinChance) * CALL2.launch_hard.hook + CALL2.launch_hard.spinChance * CALL2.launch_hard.spin;
  if (call2 === "launch_soft") return CALL2.launch_soft.score;
  return 1;
}

/** The player's expected score in an event before luck (used by previews and the Dyno). */
export function effectiveScore(state: GameState, vehicle: Vehicle, venueId: string, call: RaceSpec["call"], call2?: RaceSpec["call2"], event: EventKind = "heat"): number {
  return baseScore(state, vehicle, venueId, call) * call2Expected(state, event, call2);
}

export interface Opponent {
  score: number;
  /** Multiplier on race-to-race variation. */
  variation: number;
  /** Chance this car doesn't finish. */
  out: number;
  rival: boolean;
}

/**
 * Who you're up against. On an oval that's the whole field, strongest first (the rival leads a
 * Feature). In a drag bracket it's the car in the other lane each round, the rival last.
 */
export function opponents(state: GameState, venueId: string, event: EventKind, call: RaceSpec["call"] = "push"): Opponent[] {
  const flags = resolveFlags(state);
  const discipline = DISCIPLINES[flags.discipline];
  const venue = getVenue(venueId);
  const field = venue.events[event].field * discipline.fieldScale;
  const rival = event === "feature" ? RIVAL_BY_ID[venue.rival] : undefined;
  const rivalPace = rival ? rival.pace * (call === "nurse" ? rival.vsNurse ?? 1 : 1) * (hasPerk(state, "grudge_match") ? 1.05 : 1) : 1;
  if (discipline.format === "bracket") {
    const spread = BRACKET_SPREAD[event];
    return spread.map((s, i) => {
      const last = i === spread.length - 1;
      if (rival && last) return { score: field * rivalPace * (s / 1.12), variation: rival.variation, out: rival.breakdown, rival: true };
      return { score: field * s, variation: 1, out: 0, rival: false };
    });
  }
  return OPPONENT_SPREAD.map((s, i) => {
    if (rival && i === 0) return { score: field * rivalPace, variation: rival.variation, out: rival.breakdown, rival: true };
    if (rival?.wingman && i === 1) return { score: field * rival.wingman, variation: rival.variation, out: 0, rival: false };
    return { score: field * s, variation: 1, out: 0, rival: false };
  });
}

/** Expected opponent scores (kept for previews). */
export function opponentScores(state: GameState, venueId: string, event: EventKind): number[] {
  return opponents(state, venueId, event).map((o) => o.score);
}

export function dnfChance(state: GameState, vehicle: Vehicle, venueId: string, event: EventKind, call: RaceSpec["call"], call2?: RaceSpec["call2"]): number {
  const flags = resolveFlags(state);
  const stats = vehicleStats(vehicle);
  const crew = crewside(state);
  const base = getVenue(venueId).events[event].dnfBase;
  const relFactor = Math.min(2.5, Math.max(0.3, 60 / (stats.reliability + 20)));
  const callFactor = call === "push" ? 1.8 * crew.pushDnfMult : 0.7;
  const call2Factor = call2 === "launch_hard" ? CALL2.launch_hard.dnf : call2 === "launch_soft" ? CALL2.launch_soft.dnf : 1;
  const worn = Object.values(vehicle.parts).filter((p) => p && p.condition <= 1).length;
  return Math.min(0.9, base * relFactor * callFactor * call2Factor * DISCIPLINES[flags.discipline].dnfMult * crew.dnfMult + 0.015 * worn);
}

/** Probability of winning (finishing, and beating everyone you have to), estimated in closed form for previews. */
export function winChance(state: GameState, vehicle: Vehicle, venueId: string, event: EventKind, call: RaceSpec["call"], call2?: RaceSpec["call2"]): number {
  const me = effectiveScore(state, vehicle, venueId, call, call2, event);
  // P(me·(1+N) > opp·(1+N')) for independent normals; product over opponents (approximation).
  let p = 1;
  for (const opp of opponents(state, venueId, event, call)) {
    const sd = NOISE * Math.sqrt(me * me + opp.score * opp.score * opp.variation * opp.variation);
    p *= opp.out + (1 - opp.out) * normalCdf((me - opp.score) / sd);
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

interface WearInput {
  mult: number;
  wheelMult: number;
  dnf: boolean;
  weak: string | null;
  engineBlowSteps: number;
}

function rollWear(state: GameState, vehicle: Vehicle, input: WearInput): Record<string, number> {
  const wearSteps: Record<string, number> = {};
  for (const slot of Object.keys(vehicle.parts)) {
    const chance = 0.08 * input.mult * (slot === "wheel" ? input.wheelMult : 1);
    let steps = rand(state) < chance ? 1 : 0;
    if (input.dnf && slot === input.weak) steps += 1;
    if (input.dnf && slot === "engine") steps += input.engineBlowSteps;
    if (steps > 0) wearSteps[slot] = steps;
  }
  return wearSteps;
}

interface RollContext {
  state: GameState;
  spec: RaceSpec;
  vehicle: Vehicle;
  discipline: DisciplineDef;
  teamEra: boolean;
  dnf: boolean;
  weak: string | null;
  durationMs: number;
  field: number;
  base: number;
}

/** A field of six over laps. */
function rollOval(ctx: RollContext): RaceRoll {
  const { state, spec, vehicle, discipline, dnf, weak, durationMs } = ctx;
  const pCaution = cautionChance(state, spec.event);
  const caution = pCaution > 0 && rand(state) < pCaution;
  const laps = LAPS[spec.event];
  let score = ctx.base;
  let wear = 1;
  let wheelWear = ctx.teamEra ? discipline.wheelWearMult : 1;
  let cautionText: string | undefined;
  if (caution) {
    cautionText = "Yellow flag. The field bunches up.";
    if (spec.call2 === "pit") {
      score *= CALL2.pit.score;
      wear *= CALL2.pit.wear;
      wheelWear *= CALL2.pit.wheelWear;
      cautionText = "Yellow flag. You duck in for fresh tyres and restart mid-pack.";
    } else if (spec.call2 === "stay") {
      score *= CALL2.stay.score;
      wheelWear *= CALL2.stay.wheelWear;
      cautionText = "Yellow flag. Half the field pits. You stay out and inherit track position.";
    }
  }
  const me = score * (1 + NOISE * randNormal(state));
  const field = opponents(state, spec.venueId, spec.event, spec.call).map((o) => ({
    ...o,
    gone: o.out > 0 && rand(state) < o.out,
    ran: o.score * (1 + NOISE * o.variation * randNormal(state)),
  }));
  const running = field.filter((o) => !o.gone);
  const fieldSize = field.length + 1;
  const ahead = running.filter((o) => o.ran > me).map((o) => o.ran);
  const position = dnf ? fieldSize : 1 + ahead.length;
  const reference = ahead.length > 0 ? Math.min(...ahead) : Math.max(...running.map((o) => o.ran), 1);
  const margin = (me - reference) / Math.max(1, ctx.field);
  const rival = field.find((o) => o.rival);
  const rivalOut = Boolean(rival?.gone);
  const rivalBeaten = spec.event === "feature" && !dnf && Boolean(rival) && (rivalOut || me > (rival?.ran ?? 0));

  const wearSteps = rollWear(state, vehicle, {
    mult: (spec.call === "push" ? 1.6 : 0.6) * discipline.wearMult * channel(state, "wear") * wear,
    wheelMult: wheelWear,
    dnf,
    weak,
    engineBlowSteps: discipline.engineBlowSteps,
  });
  const startPos = 2 + Math.floor(rand(state) * (fieldSize - 1));
  const rivalId = spec.event === "feature" ? getVenue(spec.venueId).rival : undefined;
  const cautionLap = caution ? Math.max(2, Math.round(laps * (0.4 + 0.3 * rand(state)))) : undefined;
  const beats = buildBeats(state, { startPos, position, fieldSize, dnf, weakSlot: weak, durationMs, laps, rivalId, rivalBeaten, rivalOut, caution: cautionLap !== undefined && cautionText ? { lap: cautionLap, text: cautionText } : undefined });
  return {
    position, fieldSize, dnf, margin, rivalBeaten, rivalOut, caution, weakestSlot: weak, wearSteps, laps, durationMs, beats,
    advanced: !dnf && position <= 3,
  };
}

/** Drag: head-to-head elimination rounds. Lose one and you're out. */
function rollBracket(ctx: RollContext): RaceRoll {
  const { state, spec, vehicle, discipline, dnf, weak, durationMs } = ctx;
  const lanes = opponents(state, spec.venueId, spec.event, spec.call);
  const rounds = lanes.length;
  const fieldSize = 2 ** rounds;
  const roundMs = durationMs / rounds;
  const dnfRound = dnf ? 1 + Math.floor(rand(state) * rounds) : 0;
  const beats: RaceBeat[] = [];
  let won = 0;
  let margin = 0;
  let blew = false;
  let rivalOut = false;
  for (let r = 1; r <= rounds; r++) {
    const lane = lanes[r - 1];
    const t0 = (r - 1) * roundMs;
    const who = lane.rival ? RIVAL_BY_ID[getVenue(spec.venueId).rival]?.name ?? "your rival" : carName(state);
    const stage = rounds === 1 ? "One pass" : r === rounds ? "The final" : `Round ${r} of ${rounds}`;
    let launch = 1;
    let spun = false;
    if (spec.call2 === "launch_hard") {
      spun = rand(state) < CALL2.launch_hard.spinChance;
      launch = spun ? CALL2.launch_hard.spin : CALL2.launch_hard.hook;
    } else if (spec.call2 === "launch_soft") {
      launch = CALL2.launch_soft.score;
    }
    const me = ctx.base * launch * (1 + NOISE * randNormal(state));
    const them = lane.score * (1 + NOISE * lane.variation * randNormal(state));
    const theyBroke = lane.out > 0 && rand(state) < lane.out;
    const off = spun ? "The tyres go up in smoke off the line." : spec.call2 === "launch_hard" ? "You leave hard and it hooks." : "You leave clean.";
    beats.push({ at: t0, text: `${stage}, against ${who}. ${off}`, position: spun ? 2 : 1, kind: "round" });
    if (dnfRound === r) {
      blew = true;
      beats.push({ at: t0 + roundMs * 0.5, text: "A bang and a cloud at half-track. You coast to the wall. DNF.", position: 2, kind: "dnf" });
      break;
    }
    const win = theyBroke || me > them;
    margin = (me - them) / Math.max(1, ctx.field);
    if (theyBroke && lane.rival) rivalOut = true;
    if (!win) {
      beats.push({ at: t0 + roundMs * 0.8, text: `${who} took it by a ${Math.abs(margin) < 0.03 ? "bumper" : "car length"}. You're out.`, position: 2, kind: "finish" });
      break;
    }
    won = r;
    const how = theyBroke ? `${who} breaks at the hit. You idle down for the win light.` : `Win light! You beat ${who} by a ${Math.abs(margin) < 0.03 ? "bumper" : "car length"}.`;
    beats.push({ at: t0 + roundMs * 0.8, text: r === rounds ? `${how} That's the event.` : how, position: 1, kind: r === rounds ? "finish" : "pass" });
  }
  const position = won === rounds ? 1 : 2 ** (rounds - won - 1) + 1;
  const wearSteps = rollWear(state, vehicle, {
    mult: (spec.call === "push" ? 1.6 : 0.6) * discipline.wearMult * channel(state, "wear") * (0.5 + 0.5 * Math.max(1, won + (blew ? 1 : 0)) / rounds),
    wheelMult: ctx.teamEra ? discipline.wheelWearMult : 1,
    dnf: blew,
    weak,
    engineBlowSteps: discipline.engineBlowSteps,
  });
  return {
    position, fieldSize, dnf: blew, margin, rivalBeaten: spec.event === "feature" && won === rounds, rivalOut, weakestSlot: weak, wearSteps, laps: 1, rounds, durationMs, beats,
    advanced: !blew && won >= Math.max(1, rounds - 1),
  };
}

/** Rolls a race's outcome at the green flag (it's revealed live and paid out at the flag). */
export function rollRace(state: GameState, spec: RaceSpec): RaceRoll | null {
  const vehicle = state.run.vehicles.find((v) => v.uid === spec.vehicleUid);
  if (!vehicle) return null;
  const flags = resolveFlags(state);
  const discipline = DISCIPLINES[flags.discipline];
  const event = getVenue(spec.venueId).events[spec.event];
  const dnf = rand(state) < dnfChance(state, vehicle, spec.venueId, spec.event, spec.call, spec.call2);
  const weak = weakestSlot(vehicle);
  const ctx: RollContext = {
    state, spec, vehicle, discipline, teamEra: flags.teamEra, dnf, weak,
    durationMs: event.durationMs * discipline.durationMult,
    field: event.field * discipline.fieldScale,
    base: baseScore(state, vehicle, spec.venueId, spec.call),
  };
  const roll = discipline.format === "bracket" ? rollBracket(ctx) : rollOval(ctx);
  return {
    ...roll,
    weakestPart: weak && vehicle.parts[weak] ? { ...vehicle.parts[weak] } : undefined,
    cleanBuild: Object.values(vehicle.parts).every((p) => !p || p.condition >= 3),
    crewIds: racingCrewIds(state),
  };
}

/** Rolls and settles in one go (used when a race has no pre-rolled outcome). */
export function resolveRace(state: GameState, spec: RaceSpec): RaceResult | null {
  const roll = rollRace(state, spec);
  return roll ? settleRace(state, spec, roll) : null;
}

/** Wins at one event that pay in full before the promoter starts trimming the purse. */
const PURSE_FREE_WINS = 4;
const PURSE_FLOOR = 0.3;

function purseWins(state: GameState, venueId: string, event: EventKind): number {
  const entry = state.run.purseSat?.[`${venueId}:${event}`];
  if (!entry) return 0;
  // One win is forgotten for every two runnings of the event.
  return Math.max(0, entry.n - (state.run.seasonMs - entry.at) / (2 * getVenue(venueId).events[event].everyMs));
}

/**
 * The promoter can't keep paying one driver: after a few wins in a row at the same event its
 * purse shrinks, and recovers when you race elsewhere for a while. Rep is never affected.
 */
export function purseFactor(state: GameState, venueId: string, event: EventKind): number {
  const over = Math.max(0, purseWins(state, venueId, event) - PURSE_FREE_WINS);
  return Math.max(PURSE_FLOOR, 1 / (1 + 0.2 * over));
}

/** Share of the purse for a finishing position. A one-round drag pass pays the winner only. */
function purseShare(roll: RaceRoll): number {
  if (roll.dnf) return 0;
  if (roll.rounds === 1 && roll.position > 1) return 0;
  return PRIZE_SHARE[roll.position - 1] ?? 0;
}

/** Pays out a race at the flag: wear, prize, Rep, ladder and history. Mutates state. */
export function settleRace(state: GameState, spec: RaceSpec, roll: RaceRoll): RaceResult | null {
  const vehicle = state.run.vehicles.find((v) => v.uid === spec.vehicleUid);
  if (!vehicle) return null;
  const venue = getVenue(spec.venueId);
  const event = venue.events[spec.event];
  const { position, fieldSize, dnf, rivalBeaten } = roll;
  const won = position === 1 && !dnf;

  const wear: RaceResult["wear"] = [];
  for (const [slot, steps] of Object.entries(roll.wearSteps)) {
    const part = vehicle.parts[slot];
    if (!part || part.condition === 0) continue;
    const from = part.condition;
    part.condition = Math.max(0, part.condition - steps) as Condition;
    wear.push({ slot, from, to: part.condition });
  }

  // Money and Rep.
  const share = purseShare(roll);
  const isFirstWin = won && !state.run.races.some((r) => r.position === 1 && !r.dnf);
  let prize = event.prize * share * channel(state, "race_payout") * purseFactor(state, spec.venueId, spec.event);
  if (won) {
    const key = `${spec.venueId}:${spec.event}`;
    state.run.purseSat = { ...(state.run.purseSat ?? {}), [key]: { n: purseWins(state, spec.venueId, spec.event) + 1, at: state.run.seasonMs } };
  }
  if (isFirstWin && hasPerk(state, "early_bird")) prize *= 3;
  if (rivalBeaten && hasPerk(state, "grudge_match")) prize *= 2;
  prize = Math.round(prize);
  let rep = share > 0 ? Math.ceil(event.rep * share) : 0;
  if (won && spec.event === "feature" && hasPerk(state, "local_hero")) rep *= 2;
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
    rivalOut: roll.rivalOut,
    caution: roll.caution,
    rounds: roll.rounds,
    margin: roll.margin,
    weakestSlot: roll.weakestSlot,
    weakestPart: roll.weakestPart,
    beats: roll.beats,
    laps: roll.laps,
    durationMs: roll.durationMs,
    wear,
  };
  state.run.races.push(result);
  if (state.run.races.length > 60) state.run.races.splice(0, state.run.races.length - 60);

  vehicle.history.races += 1;
  if (won) vehicle.history.wins += 1;
  if (dnf) vehicle.history.dnfs += 1;
  if (!dnf) vehicle.history.bestFinish = vehicle.history.bestFinish === null ? position : Math.min(vehicle.history.bestFinish, position);

  state.run.practice[spec.venueId] = (state.run.practice[spec.venueId] ?? 0) + channel(state, "practice");
  creditCrew(state, roll.crewIds ?? racingCrewIds(state));
  if (!won) state.run.stats.racesLost[spec.venueId] = (state.run.stats.racesLost[spec.venueId] ?? 0) + 1;
  if (dnf) state.run.stats.dnfs = (state.run.stats.dnfs ?? 0) + 1;

  if (result.rival) {
    const record = state.meta.rivals[result.rival.id] ?? { wins: 0, losses: 0 };
    if (result.rival.beaten) record.wins += 1;
    else record.losses += 1;
    state.meta.rivals[result.rival.id] = record;
    tell(state, `${result.rival.beaten ? "beat" : "lost"}_${result.rival.id}`);
  }
  if (dnf) tell(state, "first_dnf");
  if (dnf && wear.some((w) => w.slot === "engine" && w.from - w.to >= 2)) tell(state, "first_blown_engine");
  if (roll.caution) tell(state, "first_caution");

  addJournal(state, "first_race", STORY.first_race);
  if (won) addJournal(state, "first_win", STORY.first_win);

  // Ladder: a good enough finish opens the next event at this venue.
  const ladder = state.run.ladder[spec.venueId] ?? ["sprint"];
  if (roll.advanced ?? (!dnf && position <= 3)) {
    const opened = spec.event === "sprint" && !ladder.includes("heat") ? "heat" : spec.event === "heat" && !ladder.includes("feature") ? "feature" : null;
    if (opened) {
      ladder.push(opened);
      pushFeed(state, "race", `A strong run at ${venueName(spec.venueId, resolveFlags(state).discipline)} opens the ${opened === "heat" ? "Heat" : "Feature"}.`);
    }
  }
  state.run.ladder[spec.venueId] = ladder;

  if (spec.event === "feature" && won) onFeatureWin(state, spec, vehicle, roll);
  return result;
}

function onFeatureWin(state: GameState, spec: RaceSpec, vehicle: Vehicle, roll: RaceRoll): void {
  const venueId = spec.venueId;
  const first = state.run.featureWins[venueId] === undefined;
  if (!first) return;
  state.run.featureWins[venueId] = state.run.seasonMs;
  const flags = resolveFlags(state);
  logSeason(state, `feature:${venueId}`, `Won the ${venueName(venueId, flags.discipline)} Feature${RIVAL_BY_ID[getVenue(venueId).rival] ? `, ahead of ${RIVAL_BY_ID[getVenue(venueId).rival].name}` : ""}.`);
  // Open venues that this Feature unlocks.
  for (const next of ["county_fair", "regional", "state"]) {
    const def = getVenue(next);
    if (def.opens.type === "feature" && def.opens.venueId === venueId && !state.run.venuesOpen.includes(next)) {
      if (def.opens.invitation && state.meta.records[venueId] === undefined) {
        pushFeed(state, "race", `The ${venueName(next, flags.discipline)} invites last Season's ${venueName(venueId, flags.discipline)} winners. Win here again next Season and you're in.`);
        continue;
      }
      state.run.venuesOpen.push(next);
      state.run.ladder[next] = ["sprint"];
      if (next === "county_fair") addJournal(state, "fair_invite", STORY.fair_invite);
      else pushFeed(state, "race", `The ${venueName(next, flags.discipline)} is open to you.`);
    }
  }
  const dare = state.config.dare;
  if (venueId === "county_fair") {
    addJournal(state, "fair_win", STORY.fair_win);
    checkFairObjectives(state, spec, vehicle, roll);
  }
  if (venueId === "dirt" && dare === "mower_madness" && vehicle.vehicleId === "riding_mower") completeDare(state, "mower_madness");
  if (venueId === "regional") tell(state, "regional_win");
  if (venueId === "state") {
    state.meta.stateWonEver = true;
    addJournal(state, "state_win", STORY.state_win);
    deepenHardships(state);
  }
  refreshPerkUnlocks(state);
}

function checkFairObjectives(state: GameState, spec: RaceSpec, vehicle: Vehicle, roll: RaceRoll): void {
  const dare = state.config.dare;
  const stats = state.run.stats;
  if (dare === "packrat" && stats.partsSold === 0) completeDare(state, "packrat");
  if (dare === "settle_it" && (stats.racesLost.county_fair ?? 0) === 0) completeDare(state, "settle_it");
  if (dare === "quick_season" && state.run.seasonMs <= 48 * 3_600_000) completeDare(state, "quick_season");
  if (dare === "penny_pincher" && (stats.counterBuys ?? 0) === 0) completeDare(state, "penny_pincher");
  if (dare === "hot_lap" && spec.call === "push" && roll.cleanBuild) completeDare(state, "hot_lap");
  if (dare === "clean_sweep" && (stats.dnfs ?? 0) === 0) completeDare(state, "clean_sweep");
  if (dare === "kart_to_fair" && vehicle.vehicleId === "go_kart") completeDare(state, "kart_to_fair");
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

/** Carrying a hardship all the way to a State win counts as completing it a second time. */
function deepenHardships(state: GameState): void {
  if (!state.era) return;
  for (const id of state.config.hardships) {
    const key = `hardship_state:${id}`;
    if (!state.run.revealed.includes(`hardship:${id}`) || state.run.revealed.includes(key)) continue;
    state.run.revealed.push(key);
    state.meta.hardshipMastery[id] = (state.meta.hardshipMastery[id] ?? 0) + 1;
    state.era.hardshipsCompleted += 1;
    logSeason(state, key, `You carried a hardship all the way to State. It counts double.`);
  }
}

function completeDare(state: GameState, dareId: string): void {
  if (state.meta.daresCompleted.includes(dareId)) return;
  state.meta.daresCompleted.push(dareId);
  state.scrap.daresThisEra += 1;
  refreshPerkUnlocks(state);
  logSeason(state, `dare:${dareId}`, `Dare completed. A new perk is on the shelf.`);
}

export function raceDurationMs(state: GameState, spec: RaceSpec): number {
  const flags = resolveFlags(state);
  return getVenue(spec.venueId).events[spec.event].durationMs * DISCIPLINES[flags.discipline].durationMult;
}

/** What one part is worth to a car's score at a venue (pass the slot so tyres count for traction in Drag). */
export function partScoreAt(part: { partId: string; condition: Condition }, discipline: DisciplineId, venueId: string | undefined, slot: string): number {
  const def = getPart(part.partId);
  const m = CONDITION_STAT[part.condition];
  const rules = DISCIPLINES[discipline];
  const w = rules.weights;
  const d = venueId && rules.format === "oval" ? getVenue(venueId).demand : NEUTRAL;
  const traction = slot === "wheel" ? def.handling * m * w.traction : 0;
  return def.power * m * w.power * d.power + def.handling * m * w.handling * d.handling + def.reliability * m * w.reliability * d.reliability + traction - def.weight * w.weight;
}

/** Why a venue that isn't open yet stays closed, in the player's words (null when it's open). */
export function venueLockReason(state: GameState, venueId: string): string | null {
  if (state.run.venuesOpen.includes(venueId)) return null;
  const venue = getVenue(venueId);
  const discipline = resolveFlags(state).discipline;
  if (venue.opens.type === "feature") {
    const from = venueName(venue.opens.venueId, discipline);
    if (venue.opens.invitation && state.meta.records[venue.opens.venueId] === undefined) {
      return state.run.featureWins[venue.opens.venueId] !== undefined
        ? `Invitation only. You won the ${from} this Season, so win it again next Season and you're in.`
        : `Invitation only: win the ${from} Feature in one Season, then again in a later one.`;
    }
    return `Win the ${from} Feature.`;
  }
  if (venue.opens.type === "knowhow") return "Sign up with Rep.";
  return null;
}
