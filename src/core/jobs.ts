import { advancePromoter } from "./promoter";
import { advanceMotorPool } from "./motorPool";
import { clubHostingCost, clubSpecMatches } from "./club";
import { worksSpecMatches } from "./manufacturer";
import { countySpecMatches } from "./countyRivals";
import { channel } from "./channels";
import { countyPlaceBlocker } from "./counties";
import { customerLeads, recordService } from "./serviceShop";
import { cardFor, tripmeterAvailable, usesRallyClassCard } from "./timecards";
import { DISCIPLINES, getVenue, venueName } from "./content/events";
import { REPAIR_MINUTES, REPAIR_TECHNIQUE, getPart } from "./content/parts";
import { PLACE_BY_ID, getPlace } from "./content/places";
import { CREW_BY_ID, crewLevel } from "./content/team";
import { getVehicle } from "./content/vehicles";
import { benchCost, conditionAfter, fillFromDriveway, nowhereToStow, reservedPartUids, stripYield, vehicleBusy } from "./garage";
import { countRepetition, syncHabitSlots, templateBase } from "./habits";
import { completeHaul } from "./haul";
import { pushFeed } from "./feed";
import { evaluateAchievements } from "./achievements";
import { refund, spend } from "./stats";
import { STORY, addJournal, tell } from "./journal";
import { CONDITION_NAMES } from "./content/parts";
import { getKnowhow } from "./content/knowhow";
import { isLearned, learn, refreshKnowhow, studyMs } from "./knowhowEngine";
import { raceDurationMs, resolveRace, rollRace, settleRace } from "./race";
import { nextRaceNightSpec } from "./raceNight";
import { refreshReveals } from "./reveal";
import { nextUid } from "./rng";
import { hasPerk, resolveFlags } from "./rules";
import { assignedRacingCrewIds, creditCrew, crewBusyRacing, crewEfficiency, crewTravelBlocker, racingCrewIds, teamOrganization } from "./crew";
import { applyCrewHandover, crewCanApprentice } from "./crewLegacy";
import { queueTourPlan } from "./ownership";
import type { ActiveJob, Condition, CrewMember, EventKind, GameState, JobSpec, LaneId, MaterialId, PartInstance } from "./types";

const MIN = 60_000;
const HOUR = 60 * MIN;
export const MAX_JOB_MS = 8 * HOUR;
export const QUEUE_LIMIT = 3;
const HABIT_SPEED = 0.6;
const BENCH_KINDS = new Set<JobSpec["kind"]>(["clean", "repair", "restore", "strip"]);
const HANDS_KINDS = new Set<JobSpec["kind"]>(["haul", "study", "assemble", "race"]);

export function isBenchKind(spec: JobSpec): boolean {
  return BENCH_KINDS.has(spec.kind);
}

function findPart(state: GameState, uid: string | undefined): PartInstance | undefined {
  return uid ? state.run.inventory.find((p) => p.uid === uid) : undefined;
}

/** A part in the garage or waiting on the driveway (only Strip works on the driveway). */
function findAnyPart(state: GameState, uid: string | undefined): PartInstance | undefined {
  return findPart(state, uid) ?? (uid ? state.run.driveway.find((p) => p.uid === uid) : undefined);
}

function hasMaterials(state: GameState, cost: Partial<Record<MaterialId, number>>, mult = 1): boolean {
  return Object.entries(cost).every(([m, n]) => state.run.materials[m as MaterialId] >= (n ?? 0) * mult);
}

function payMaterials(state: GameState, cost: Partial<Record<MaterialId, number>>, mult = 1): void {
  for (const [m, n] of Object.entries(cost)) state.run.materials[m as MaterialId] -= (n ?? 0) * mult;
}

/**
 * Why a job can't start right now (null = it can). Does not check lane availability.
 * `signUp` checks a race as a sign-up for the next run, so an event that isn't running yet is fine.
 */
export function jobBlocker(state: GameState, spec: JobSpec, signUp = false): string | null {
  switch (spec.kind) {
    case "haul": {
      const place = PLACE_BY_ID[spec.placeId];
      if (!place) return "Unknown place";
      const county = countyPlaceBlocker(state, spec.placeId);
      if (county) return county;
      if (!state.run.placesOpen.includes(spec.placeId)) return "That place isn't open to you yet";
      const req = place.requires?.(state);
      if (req) return req;
      if (state.run.cash < place.fee) return `Needs ${place.fee} Scrap Bucks`;
      if (spec.focus && spec.focus !== customerLeads(state) && !isLearned(state, "tech:scouting")) return "Learn Scouting to look for something specific";
      return null;
    }
    case "clean": {
      const part = findPart(state, spec.partUid);
      if (!part) return "Pick a part";
      if (getPart(part.partId).category === "junk") return "Junk can only be stripped or sold";
      if (part.condition > 1) return "Only Scrap or Rusted parts need cleaning";
      return null;
    }
    case "repair": {
      const part = findPart(state, spec.partUid);
      if (!part) return "Pick a part";
      const def = getPart(part.partId);
      const tech = REPAIR_TECHNIQUE[def.category];
      if (!tech) return "Junk can only be stripped or sold";
      if (!isLearned(state, tech)) return `Needs ${getKnowhow(tech).name}`;
      const okFrom = hasPerk(state, "shade_tree") ? part.condition === 1 || part.condition === 2 : part.condition === 2;
      if (!okFrom) return hasPerk(state, "shade_tree") ? "Only Rusted or Worn parts" : "Only Worn parts can be repaired";
      if (!hasMaterials(state, benchCost(part, "repair"))) return "Not enough materials";
      return null;
    }
    case "restore": {
      const part = findPart(state, spec.partUid);
      if (!part) return "Pick a part";
      if (!isLearned(state, "tech:tuning")) return "Needs Tuning";
      if (part.condition !== 3) return "Only Good parts can be restored";
      const def = getPart(part.partId);
      if (def.category === "junk") return "Junk can only be stripped or sold";
      if (!hasMaterials(state, benchCost(part, "restore"))) return "Not enough materials";
      return null;
    }
    case "strip": {
      const part = findAnyPart(state, spec.partUid);
      if (!part) return "Pick a part";
      return null;
    }
    case "study": {
      const def = getKnowhow(spec.knowhowId);
      if (def.kind === "place") return "Places are opened with Rep";
      if (isLearned(state, spec.knowhowId)) return "Already learned";
      if (state.run.jobs.some((j) => j.spec.kind === "study" && j.spec.knowhowId === spec.knowhowId)) return "You're already studying that";
      if (state.run.pausedJobs?.some((j) => j.spec.kind === "study" && j.spec.knowhowId === spec.knowhowId)) return "Resume the paused study";
      if (!state.run.available.includes(spec.knowhowId)) return def.hint;
      return null;
    }
    case "assemble": {
      const def = getVehicle(spec.vehicleId);
      if (def.blueprint && !isLearned(state, def.blueprint)) return "You haven't drawn up these plans";
      const offered = Object.entries(spec.partUids);
      if (new Set(offered.map(([, uid]) => uid)).size !== offered.length) return "Choose a different physical part for each slot";
      if (offered.some(([key]) => !def.slots.some(({ slot }) => slot === key))) return "Choose parts for slots on this build";
      for (const slot of def.slots) {
        const uid = spec.partUids[slot.slot];
        const part = findPart(state, uid);
        if (!part) {
          if (slot.required || uid !== undefined) return `Missing ${slot.label ?? slot.slot}`;
          continue;
        }
        if (!slot.accepts.includes(part.partId)) return `${getPart(part.partId).name} doesn't fit the ${slot.slot} slot`;
        if (slot.minCondition !== undefined && part.condition < slot.minCondition) return `The ${slot.slot} must be at least ${CONDITION_NAMES[slot.minCondition]}`;
        if (part.condition === 0) return `${getPart(part.partId).name} is scrap; clean or replace it`;
      }
      if (state.run.cash < def.cash) return `Needs ${def.cash} Scrap Bucks`;
      if (!hasMaterials(state, def.materials)) return "Not enough materials";
      return null;
    }
    case "race": {
      const vehicle = state.run.vehicles.find((v) => v.uid === spec.vehicleUid);
      if (!vehicle) return "Pick a vehicle";
      if (spec.regularity && !usesRallyClassCard(spec)) return "Enter regularity through a standard Rally event.";
      if (spec.clubRound && !clubSpecMatches(state, spec, vehicle)) return "That club sign-up is no longer current";
      if (spec.worksRound && !worksSpecMatches(state, spec, vehicle)) return "That works sign-up needs the signed engine and three family parts";
      if (spec.countyMatch && !countySpecMatches(state, spec)) return "That county sign-up needs the local Push Mower build";
      if (vehicleBusy(state, vehicle.uid) && !signUp) return "That vehicle is already racing";
      if (!state.run.venuesOpen.includes(spec.venueId)) return "That venue isn't open to you yet";
      const venue = getVenue(spec.venueId);
      const tier = getVehicle(vehicle.vehicleId).tier;
      if (tier < venue.tiers[0] || tier > venue.tiers[1]) return `Tier ${venue.tiers[0]}–${venue.tiers[1]} vehicles only`;
      if (!(state.run.ladder[spec.venueId] ?? []).includes(spec.event) && !(signUp && rungPending(state, spec.venueId, spec.event, spec.vehicleUid))) return "Podium the previous event first";
      const missing = getVehicle(vehicle.vehicleId).slots.find((sl) => sl.required && !vehicle.parts[sl.slot]);
      if (missing) return `The ${missing.slot} is out on the bench`;
      if (Object.values(vehicle.parts).some((p) => p && p.condition === 0)) return "A part is scrap. Fix it before racing";
      if (spec.holdMarks && (!spec.regularity || !tripmeterAvailable(vehicle))) return "Use a Roadbook Special with Worn or better electronics in a regularity entry.";
      if (spec.useLastPace && !spec.regularity) return "Choose a regularity entry to use a declared pace.";
      if (spec.regularity && (state.era?.discipline !== "rally" || !cardFor(state, spec.venueId, spec.event, vehicle.vehicleId))) {
        return "Set a class time on this standard Rally course before entering regularity.";
      }
      if (spec.call2) {
        if (spec.ownerDrive) return "This round’s contract calls for an unassisted owner-driver.";
        const available = signUp ? assignedRacingCrewIds(state) : racingCrewIds(state);
        const driver = state.era?.crew.some((c) => c.assignment.type === "driver" && available.includes(c.id));
        const calls = DISCIPLINES[resolveFlags(state).discipline].secondCall;
        if (!driver) return !signUp && state.era?.crew.some((c) => c.assignment.type === "driver" && crewBusyRacing(state, c.id))
          ? "The driver is on track. This race will wait for them."
          : "Only a driver can make that call";
        if (spec.call2 !== calls.a.id && spec.call2 !== calls.b.id) return "That call isn't part of this discipline";
      }
      const wait = nextEventInMs(state, spec.venueId, spec.event);
      if (wait > 0 && !signUp) return `Next ${spec.event} in ${formatWait(wait)}`;
      const entry = venue.events[spec.event].entry + clubHostingCost(state, spec);
      if (spec.tourReserve !== undefined && state.run.cash - entry < spec.tourReserve) {
        return `The ${entry} Scrap Bucks entry would leave less than your ${spec.tourReserve} Scrap Bucks reserve.`;
      }
      if (state.run.cash < entry) return `Entry is ${entry} Scrap Bucks`;
      return null;
    }
  }
}

const PREVIOUS_RUNG: Record<EventKind, EventKind | null> = { sprint: null, heat: "sprint", feature: "heat" };

/**
 * True when this event is the next rung up from the ladder's top and a race for that rung is
 * already queued or running, so you can sign up for the whole night ahead. The sign-up only runs
 * if that race podiums; otherwise it's dropped (see `dropOrphanSignUps`).
 */
export function rungPending(state: GameState, venueId: string, event: EventKind, vehicleUid: string): boolean {
  const prev = PREVIOUS_RUNG[event];
  if (!prev) return false;
  const ladder = state.run.ladder[venueId] ?? [];
  if (ladder.includes(event)) return false;
  if (!ladder.includes(prev) && !rungPending(state, venueId, prev, vehicleUid)) return false;
  const same = (spec: JobSpec) => spec.kind === "race" && spec.venueId === venueId && spec.event === prev && spec.vehicleUid === vehicleUid;
  return state.run.queue.some(same) || state.run.jobs.some((j) => same(j.spec));
}

/** Drops queued races waiting on a rung that can no longer open (the race before it missed the podium or was cancelled). */
export function dropOrphanSignUps(state: GameState): void {
  const orphans = state.run.queue.filter((q) => q.kind === "race" && !(state.run.ladder[q.venueId] ?? []).includes(q.event) && !rungPending(state, q.venueId, q.event, q.vehicleUid));
  if (orphans.length === 0) return;
  state.run.queue = state.run.queue.filter((q) => !orphans.includes(q));
  for (const q of orphans) {
    if (q.kind !== "race") continue;
    const venue = venueName(q.venueId, resolveFlags(state).discipline);
    state.run.notices.push(`Your ${q.event} sign-up at ${venue} was dropped: the race before it didn't podium or was cancelled. No entry fee was charged.`);
  }
}

/** Ms until the next running of an event (0 = open now). */
export function nextEventInMs(state: GameState, venueId: string, event: EventKind): number {
  const last = state.run.lastEntered[`${venueId}:${event}`];
  if (last === undefined) return 0;
  return Math.max(0, last + getVenue(venueId).events[event].everyMs - state.run.seasonMs);
}

function formatWait(ms: number): string {
  const minutes = Math.ceil(ms / MIN);
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
}

function tierFactor(part: PartInstance): number {
  return getPart(part.partId).tier;
}

/** Base duration (ms) of a job before lane speed (habit, crew, away). */
export function baseDuration(state: GameState, spec: JobSpec): number {
  let ms: number;
  switch (spec.kind) {
    case "haul":
      ms = getPlace(spec.placeId).tripMs / channel(state, "haul_speed", { placeId: spec.placeId });
      break;
    case "clean": {
      const part = findPart(state, spec.partUid);
      const scrapMult = part?.condition === 0 ? 2 : 1;
      ms = (60_000 * scrapMult * (1 + (part ? tierFactor(part) : 0))) / channel(state, "bench_speed");
      break;
    }
    case "repair": {
      const part = findPart(state, spec.partUid);
      const def = part ? getPart(part.partId) : null;
      const minutes = def ? REPAIR_MINUTES[def.category] * (1 + 0.5 * def.tier) : 10;
      const rebuild = def?.category === "engine" ? channel(state, "rebuild_speed") : 1;
      ms = (minutes * MIN) / (channel(state, "bench_speed") * rebuild);
      break;
    }
    case "restore": {
      const part = findPart(state, spec.partUid);
      ms = (2 * HOUR * (1 + (part ? tierFactor(part) : 0))) / channel(state, "bench_speed");
      break;
    }
    case "strip": {
      const part = findAnyPart(state, spec.partUid);
      ms = (30_000 * (1 + (part ? tierFactor(part) : 0))) / channel(state, "bench_speed");
      break;
    }
    case "study":
      ms = studyMs(state, spec.knowhowId);
      break;
    case "assemble":
      ms = getVehicle(spec.vehicleId).assembleMs / channel(state, "build_speed");
      break;
    case "race":
      ms = raceDurationMs(state, spec);
      break;
  }
  return Math.min(MAX_JOB_MS, Math.max(1000, ms));
}

type Paid = NonNullable<ActiveJob["paid"]>;

function scaled(cost: Partial<Record<MaterialId, number>>, mult: number): Partial<Record<MaterialId, number>> {
  return Object.fromEntries(Object.entries(cost).map(([m, n]) => [m, (n ?? 0) * mult]));
}

/** Pays costs and reserves resources as a job starts; returns what was paid. */
function payForStart(state: GameState, spec: JobSpec): Paid {
  const paid: Paid = { cash: 0, materials: {} };
  switch (spec.kind) {
    case "haul":
      paid.cash = getPlace(spec.placeId).fee;
      break;
    case "repair":
    case "restore": {
      const part = findPart(state, spec.partUid);
      if (part) paid.materials = benchCost(part, spec.kind);
      break;
    }
    case "assemble": {
      const def = getVehicle(spec.vehicleId);
      paid.cash = def.cash;
      paid.materials = scaled(def.materials, 1);
      break;
    }
    case "race": {
      paid.cash = getVenue(spec.venueId).events[spec.event].entry + clubHostingCost(state, spec);
      const key = `${spec.venueId}:${spec.event}`;
      paid.lastEntered = { key, prev: state.run.lastEntered[key] };
      state.run.lastEntered[key] = state.run.seasonMs;
      break;
    }
    default:
      break;
  }
  spend(state, paid.cash);
  payMaterials(state, paid.materials);
  return paid;
}

/** Removes a running job and refunds what starting it cost. */
export function dropJob(state: GameState, jobId: string): void {
  const job = state.run.jobs.find((j) => j.id === jobId);
  if (!job) return;
  state.run.jobs = state.run.jobs.filter((j) => j.id !== jobId);
  refundJob(state, job);
}

function refundJob(state: GameState, job: Pick<ActiveJob, "paid">): void {
  const paid = job.paid;
  if (!paid) return;
  refund(state, paid.cash);
  for (const [m, n] of Object.entries(paid.materials)) state.run.materials[m as MaterialId] += n ?? 0;
  if (paid.lastEntered) {
    if (paid.lastEntered.prev === undefined) delete state.run.lastEntered[paid.lastEntered.key];
    else state.run.lastEntered[paid.lastEntered.key] = paid.lastEntered.prev;
  }
}

export function pauseJob(state: GameState, jobId: string): string | null {
  const index = state.run.jobs.findIndex((job) => job.id === jobId);
  const job = state.run.jobs[index];
  if (!job || job.looping || job.spec.kind === "race") return "Pick a running manual job to pause";
  const { id, spec, duration, remaining, paid } = job;
  state.run.jobs.splice(index, 1);
  (state.run.pausedJobs ??= []).push({ id, spec, duration, remaining, paid, looping: false });
  return null;
}

export function resumeJob(state: GameState, jobId: string): string | null {
  const paused = state.run.pausedJobs;
  const index = paused?.findIndex((job) => job.id === jobId) ?? -1;
  if (!paused || index < 0) return "Pick a paused job to resume";
  const job = paused[index];
  if (state.run.raceNight && HANDS_KINDS.has(job.spec.kind)) return "Race Night has reserved your hands";
  const lane = queueLane(state, job.spec);
  if (!lane) return "Pause a job or wait for a free slot to resume";
  paused.splice(index, 1);
  state.run.jobs.push({ ...job, lane });
  return null;
}

function startJob(state: GameState, lane: LaneId, spec: JobSpec, looping: boolean, template?: string): ActiveJob {
  const duration = baseDuration(state, spec);
  const paid = payForStart(state, spec);
  const job: ActiveJob = { id: nextUid(state, "j"), lane, spec, duration, remaining: duration, looping, template, paid };
  if (spec.kind === "race") {
    job.race = rollRace(state, spec) ?? undefined;
    if (job.race && lane.startsWith("crew:")) job.race.crewIds = [...new Set([...(job.race.crewIds ?? []), lane.slice(5)])];
  }
  state.run.jobs.push(job);
  return job;
}

function benchAvailable(state: GameState, lane?: LaneId): boolean {
  const collective = teamOrganization(state) === "collective";
  const dedicated = (candidate: LaneId | undefined) =>
    collective && !!candidate?.startsWith("crew:") && CREW_BY_ID[candidate.slice(5)]?.role === "wrench";
  const reserves = dedicated(lane);
  const occupied = state.run.jobs.filter((job) =>
    isBenchKind(job.spec) && dedicated(job.lane) === reserves,
  ).length;
  return occupied < (reserves ? 1 : Math.floor(channel(state, "benches")));
}

function laneBusy(state: GameState, lane: LaneId): boolean {
  return state.run.jobs.some((j) => j.lane === lane);
}

function activeCrew(state: GameState): CrewMember[] {
  const flags = resolveFlags(state);
  if (!state.era || flags.crewDisabled || flags.habitsDisabled) return [];
  return state.era.crew;
}

/** Picks a concrete target for a habit/crew bench job, or null when there's nothing to do. */
export function resolveTemplate(state: GameState, template: string): JobSpec | null {
  const reserved = reservedPartUids(state);
  const free = state.run.inventory.filter((p) => !reserved.has(p.uid));
  const base = templateBase(template);
  if (base.startsWith("haul:")) {
    const [, placeId, focus] = template.split(":");
    const spec: JobSpec = { kind: "haul", placeId, focus: (focus as never) || undefined };
    // A haul Habit waits rather than hauling straight into the driveway rule.
    if (nowhereToStow(state)) return null;
    return jobBlocker(state, spec) ? null : spec;
  }
  if (base === "clean") {
    const part = free.find((p) => p.condition === 1 && getPart(p.partId).category !== "junk");
    return part ? { kind: "clean", partUid: part.uid } : null;
  }
  if (base === "repair") {
    for (const part of free) {
      const spec: JobSpec = { kind: "repair", partUid: part.uid };
      if (!jobBlocker(state, spec)) return spec;
    }
    return null;
  }
  if (base === "strip") {
    const junk = free.find((p) => getPart(p.partId).category === "junk") ?? free.find((p) => p.condition === 0);
    return junk ? { kind: "strip", partUid: junk.uid } : null;
  }
  if (base === "race") {
    const [, vehicleUid, venueId, event, call] = template.split(":");
    const spec: JobSpec = { kind: "race", vehicleUid, venueId, event: event as never, call: call as never };
    return jobBlocker(state, spec) ? null : spec;
  }
  return null;
}

/** Starts whatever can start: hands, benches, crew and habit lanes. */
export function dispatch(state: GameState): void {
  const flags = resolveFlags(state);
  let progressed = true;
  while (progressed) {
    progressed = false;
    const night = state.run.raceNight;
    if (night) {
      const upcoming = nextRaceNightSpec(state, night);
      if (!upcoming) {
        delete state.run.raceNight;
      } else if (!laneBusy(state, "hands")) {
        const blocker = jobBlocker(state, upcoming, true);
        if (blocker) {
          delete state.run.raceNight;
          pushFeed(state, "race", `Race Night ended. ${blocker}.`);
        } else if (nextEventInMs(state, upcoming.venueId, upcoming.event) === 0 && !jobBlocker(state, upcoming)) {
          startJob(state, "hands", upcoming, false);
          night.startsLeft -= 1;
          if (night.startsLeft === 0) delete state.run.raceNight;
        }
      }
    }
    state.run.queue = state.run.queue.filter((q) => !(q.kind === "study" && isLearned(state, q.knowhowId)));
    // Queue → hands and benches.
    for (let i = 0; i < state.run.queue.length; i++) {
      const spec = state.run.queue[i];
      if (state.run.raceNight && HANDS_KINDS.has(spec.kind)) continue;
      const blocker = jobBlocker(state, spec);
      if (blocker) continue;
      const lane = queueLane(state, spec);
      if (!lane) continue;
      state.run.queue.splice(i, 1);
      startJob(state, lane, spec, false);
      progressed = true;
      break;
    }
    if (progressed) continue;

    // Habit lanes (Era 1).
    if (!flags.habitsDisabled) {
      state.run.habitSlots.forEach((template, index) => {
        const lane = `habit:${index}`;
        if (!template || laneBusy(state, lane)) return;
        if (!state.run.habitsKnown.includes(templateBase(template))) return;
        const spec = resolveTemplate(state, template);
        if (!spec || (state.run.raceNight && spec.kind === "race")) return;
        if (isBenchKind(spec) && !benchAvailable(state)) return;
        startJob(state, lane, spec, true, template);
        progressed = true;
      });
    }

    // Crew habits.
    for (const member of activeCrew(state)) {
      const lane = `crew:${member.id}`;
      if (member.assignment.type !== "habit" || laneBusy(state, lane) || flags.habitsDisabled) continue;
      const template = member.assignment.template;
      if (!state.run.habitsKnown.includes(templateBase(template))) continue;
      const spec = resolveTemplate(state, template);
      if (!spec || !crewAccepts(state, member, spec)) continue;
      startJob(state, lane, spec, true, template);
      progressed = true;
    }
  }
}

function queueLane(state: GameState, spec: JobSpec): LaneId | null {
  if (HANDS_KINDS.has(spec.kind) && !laneBusy(state, "hands")) return "hands";
  const available = activeCrew(state).filter((c) => c.assignment.type === "queue" && !laneBusy(state, `crew:${c.id}`) && crewAccepts(state, c, spec));
  if (!isBenchKind(spec)) return available[0] ? `crew:${available[0].id}` : null;
  // Send a bench job to an eligible specialist before using an ordinary bench.
  const specialist = available.find((c) => crewCanApprentice(state, c.id, spec.kind)) ?? available.find((c) =>
    (CREW_BY_ID[c.id]?.speed[spec.kind] ?? 1) > 1 || (teamOrganization(state) === "collective" && CREW_BY_ID[c.id]?.role === "wrench"),
  );
  if (specialist) return `crew:${specialist.id}`;
  return benchAvailable(state) ? firstFreeBenchLane(state) : null;
}

function firstFreeBenchLane(state: GameState): LaneId {
  for (let i = 0; i < 16; i++) {
    const lane = `bench:${i}`;
    if (!laneBusy(state, lane)) return lane;
  }
  return "bench:overflow";
}

function crewAccepts(state: GameState, member: CrewMember, spec: JobSpec): boolean {
  const def = CREW_BY_ID[member.id];
  if (!def) return false;
  if (spec.kind === "race" && spec.ownerDrive) return false;
  if (crewTravelBlocker(state, spec.kind)) return false;
  if (def.refuses.includes(spec.kind)) return false;
  if (spec.kind === "haul" && def.refusesPlace === spec.placeId) return false;
  if (isBenchKind(spec) && !benchAvailable(state, `crew:${member.id}`)) return false;
  return true;
}

/** Progress per ms of real/game time for a job right now. */
export function jobRate(state: GameState, job: ActiveJob, away: boolean): number {
  let rate = 1;
  if (job.lane.startsWith("habit:")) rate *= HABIT_SPEED;
  if (job.lane.startsWith("crew:")) {
    const id = job.lane.slice(5);
    const def = CREW_BY_ID[id];
    const member = state.era?.crew.find((c) => c.id === id);
    if (def && member) {
      rate *= def.speed[job.spec.kind] ?? 1;
      if (def.longTrip && job.spec.kind === "haul") rate *= job.duration >= def.longTrip.thresholdMs ? def.longTrip.longMult : def.longTrip.shortMult;
      rate *= crewEfficiency(member);
      if (!def.noExperience) rate *= 1 + 0.05 * (crewLevel(member.jobsDone) - 1);
    }
  }
  if (away && isBenchKind(job.spec)) rate *= channel(state, "away_efficiency");
  return rate;
}

/** Applies a finished job's effects. */
function completeJob(state: GameState, job: ActiveJob): void {
  const spec = job.spec;
  const crewId = job.lane.startsWith("crew:") ? job.lane.slice(5) : undefined;
  const raceCrew = spec.kind === "race" ? (job.race?.crewIds ?? racingCrewIds(state)) : [];
  switch (spec.kind) {
    case "haul": {
      const finds = completeHaul(state, spec, crewId);
      const place = getPlace(spec.placeId).name;
      const found = finds.map((p) => `${getPart(p.partId).name} (${CONDITION_NAMES[p.condition]})`).join(", ");
      const who = laneName(state, job.lane);
      pushFeed(state, "haul", `${who ? `${who}: ` : ""}${place} trip brought home ${found}.`, job.looping ? {
        key: `haul:${spec.placeId}:${job.lane}`,
        tally: { parts: finds.length },
        merged: (t, count) => `${who ? `${who}: ` : ""}${count} trips to ${place}, ${t.parts} parts. Latest: ${found}.`,
      } : {});
      break;
    }
    case "clean":
    case "repair":
    case "restore": {
      const part = findPart(state, spec.partUid);
      const next = part ? conditionAfter(spec.kind, part.condition) : null;
      if (part && next !== null) {
        part.condition = next;
        recordService(state, part);
        countBench(state, spec.kind);
        if (spec.kind === "clean") addJournal(state, "first_clean", STORY.first_clean);
        if (spec.kind === "restore") tell(state, "first_restore");
        benchFeed(state, job, `${getPart(part.partId).name} is now ${CONDITION_NAMES[next]}.`);
      }
      break;
    }
    case "strip": {
      const part = findAnyPart(state, spec.partUid);
      if (part) {
        state.run.inventory = state.run.inventory.filter((p) => p.uid !== part.uid);
        state.run.driveway = state.run.driveway.filter((p) => p.uid !== part.uid);
        const got = stripYield(part);
        countBench(state, "strip");
        for (const [m, n] of Object.entries(got)) state.run.materials[m as MaterialId] += n ?? 0;
        benchFeed(state, job, `Stripped ${getPart(part.partId).name} for ${Object.entries(got).map(([m, n]) => `${n} ${m}`).join(", ")}.`);
      }
      break;
    }
    case "study":
      learn(state, spec.knowhowId);
      break;
    case "assemble":
      completeAssembly(state, spec);
      break;
    case "race":
      if (job.race) settleRace(state, spec, job.race, job.paid?.cash);
      else resolveRace(state, spec);
      break;
  }
  if (job.duration >= MAX_JOB_MS) tell(state, "first_long_job");
  countRepetition(state, spec);
  if (crewId && !raceCrew.includes(crewId)) creditCrew(state, [crewId], spec);
}

/** Counts one finished bench job (clean, repair, restore or strip) in the lifetime stats. */
function countBench(state: GameState, kind: "clean" | "repair" | "restore" | "strip"): void {
  const s = state.meta.stats;
  s.benchJobs += 1;
  if (kind === "clean") s.partsCleaned += 1;
  else if (kind === "repair") s.partsRepaired += 1;
  else if (kind === "restore") s.partsRestored += 1;
  else s.partsStripped += 1;
}

const BENCH_VERB: Record<string, string> = { clean: "cleaning", repair: "repair", restore: "restore", strip: "strip" };

/** Who is doing a looping job, for the feed ("Habit", a crew member's name), or "" for your own hands and benches. */
function laneName(state: GameState, lane: LaneId): string {
  if (lane.startsWith("habit:")) return "Habit";
  if (lane.startsWith("crew:")) return CREW_BY_ID[lane.slice(5)]?.name ?? "Crew";
  return "";
}

function benchFeed(state: GameState, job: ActiveJob, text: string): void {
  const who = laneName(state, job.lane);
  pushFeed(state, "bench", `${who ? `${who}: ` : ""}${text}`, job.looping ? {
    key: `bench:${job.spec.kind}:${job.lane}`,
    merged: (_t, count) => `${who}: ${count} ${BENCH_VERB[job.spec.kind] ?? job.spec.kind} jobs done. Latest: ${text}`,
  } : {});
}

function completeAssembly(state: GameState, spec: Extract<JobSpec, { kind: "assemble" }>): void {
  const def = getVehicle(spec.vehicleId);
  const parts: Record<string, PartInstance> = {};
  for (const slot of def.slots) {
    const part = findPart(state, spec.partUids[slot.slot]);
    if (part) parts[slot.slot] = part;
  }
  const used = new Set(Object.values(parts).map((p) => p.uid));
  state.run.inventory = state.run.inventory.filter((p) => !used.has(p.uid));
  state.meta.stats.vehiclesBuilt += 1;
  state.meta.stats.vehiclesBuiltBy[def.id] = (state.meta.stats.vehiclesBuiltBy[def.id] ?? 0) + 1;
  state.run.vehicles.push({
    uid: nextUid(state, "v"),
    vehicleId: def.id,
    name: spec.name || def.name,
    parts,
    tune: "balanced",
    history: { races: 0, wins: 0, dnfs: 0, bestFinish: null },
    builtAtSeasonMs: state.run.seasonMs,
  });
  pushFeed(state, "build", `${spec.name || def.name} is built and ready to race.`);
  if (!state.run.stats.firstStartDone) {
    state.run.stats.firstStartDone = true;
    addJournal(state, "first_start", STORY.first_start);
  }
  tell(state, `built_${def.id}`);
  syncHabitSlots(state);
}

/** Validates and queues a job. Returns an error message or null. */
export function enqueue(state: GameState, spec: JobSpec): string | null {
  if (spec.kind === "race" && state.run.raceNight?.vehicleUid === spec.vehicleUid) return "This vehicle is reserved for Race Night";
  const blocker = jobBlocker(state, spec, true);
  if (blocker) return blocker;
  if (spec.kind === "race" && signedUp(state, spec.venueId, spec.event)) return "You're already signed up for that";
  if (spec.kind === "race" && state.run.queue.some((q) => q.kind === "race" && q.vehicleUid === spec.vehicleUid) && !rungPending(state, spec.venueId, spec.event, spec.vehicleUid)) return "That vehicle is already signed up for a race";
  if ("partUid" in spec && spec.partUid && reservedPartUids(state).has(spec.partUid)) return "That part is already being worked on";
  if (spec.kind === "assemble") {
    const reserved = reservedPartUids(state);
    if (Object.values(spec.partUids).some((uid) => reserved.has(uid))) return "A part is already being worked on";
  }
  if (spec.kind === "study" && state.run.queue.some((q) => q.kind === "study" && q.knowhowId === spec.knowhowId)) return "That study is already queued";
  state.run.queue.push(spec);
  dispatch(state);
  // A full queue only matters if the job couldn't start straight away.
  if (state.run.queue.length > QUEUE_LIMIT) {
    state.run.queue.pop();
    return `The queue holds ${QUEUE_LIMIT} jobs`;
  }
  afterChange(state);
  return null;
}

/** True when a race at this event is queued or running. */
export function signedUp(state: GameState, venueId: string, event: EventKind): boolean {
  const same = (spec: JobSpec) => spec.kind === "race" && spec.venueId === venueId && spec.event === event;
  return state.run.queue.some(same) || state.run.jobs.some((j) => same(j.spec));
}

/** Cancels a running job and refunds its start cost; parts stay where they are. */
export function cancelJob(state: GameState, jobId: string): void {
  const paused = state.run.pausedJobs;
  const index = paused?.findIndex((job) => job.id === jobId) ?? -1;
  if (paused && index >= 0) {
    const [job] = paused.splice(index, 1);
    refundJob(state, job);
  } else {
    dropJob(state, jobId);
  }
  dispatch(state);
}

/** Ms until a scheduled race that's waiting (queued or a Race Day Habit) can start; Infinity if none. */
function nextGateMs(state: GameState): number {
  let gate = Infinity;
  const night = !laneBusy(state, "hands") ? nextRaceNightSpec(state) : null;
  if (night) {
    const wait = nextEventInMs(state, night.venueId, night.event);
    if (wait > 0) gate = wait;
  }
  const consider = (template: string | null | undefined, lane: string) => {
    if (!template || !template.startsWith("race:") || laneBusy(state, lane)) return;
    const [, , venueId, event] = template.split(":");
    if (venueId && event) {
      const wait = nextEventInMs(state, venueId, event as EventKind);
      if (wait > 0) gate = Math.min(gate, wait);
    }
  };
  if (!resolveFlags(state).habitsDisabled) {
    state.run.habitSlots.forEach((t, i) => consider(t, `habit:${i}`));
    for (const c of activeCrew(state)) if (c.assignment.type === "habit") consider(c.assignment.template, `crew:${c.id}`);
  }
  for (const q of state.run.queue) {
    if (q.kind !== "race") continue;
    const wait = nextEventInMs(state, q.venueId, q.event);
    if (wait > 0) gate = Math.min(gate, wait);
  }
  return gate;
}

const MORALE_WINDOW = 24 * HOUR;

function updateCrew(state: GameState, dt: number): void {
  if (!state.era) return;
  for (const member of state.era.crew) {
    const def = CREW_BY_ID[member.id];
    const working = state.run.jobs.some((j) => j.lane === `crew:${member.id}`) || crewBusyRacing(state, member.id);
    let left = dt;
    let at = state.run.seasonMs;
    while (left > 0) {
      if (at >= member.windowStartMs + MORALE_WINDOW) {
        member.windowStartMs += Math.floor((at - member.windowStartMs) / MORALE_WINDOW) * MORALE_WINDOW;
        member.workedInWindowMs = 0;
      }
      const chunk = Math.min(left, member.windowStartMs + MORALE_WINDOW - at);
      if (working) {
        const stamina = (def?.staminaHours ?? 8) * HOUR;
        const normal = Math.max(0, Math.min(chunk, stamina - member.workedInWindowMs));
        const drain = (normal + 6 * (chunk - normal)) / HOUR * (def?.moraleDrainMult ?? 1);
        member.morale = Math.max(0, member.morale - drain);
        member.workedInWindowMs += chunk;
      } else {
        member.morale = Math.min(100, member.morale + 8 * chunk / HOUR);
      }
      at += chunk;
      left -= chunk;
    }
  }
}

/**
 * Advances game time by `ms`. Live play, offline catch-up and the simulator
 * all go through this one function.
 */
export function advance(state: GameState, ms: number, away = false): void {
  let left = ms;
  dispatch(state);
  queueTourPlan(state);
  const hasCrew = (state.era?.crew.length ?? 0) > 0;
  let guard = 0;
  while (left > 0 && guard++ < 500_000) {
    const gate = nextGateMs(state);
    if (state.run.jobs.length === 0) {
      const dt = Math.min(left, gate);
      updateCrew(state, dt);
      state.run.seasonMs += dt;
      left -= dt;
      if (gate <= dt) dispatch(state);
      if (!Number.isFinite(gate)) break;
      continue;
    }
    let dt = Math.min(left, gate);
    for (const job of state.run.jobs) {
      const rate = jobRate(state, job, away);
      if (rate > 0) dt = Math.min(dt, job.remaining / rate);
    }
    if (hasCrew) dt = Math.min(dt, 15 * MIN);
    dt = Math.max(dt, 0);
    for (const job of state.run.jobs) job.remaining -= jobRate(state, job, away) * dt;
    updateCrew(state, dt);
    state.run.seasonMs += dt;
    left -= dt;
    const done = state.run.jobs.filter((j) => j.remaining <= 1e-6);
    if (done.length > 0) {
      state.run.jobs = state.run.jobs.filter((j) => j.remaining > 1e-6);
      for (const job of done) completeJob(state, job);
      afterChange(state);
      dispatch(state);
      queueTourPlan(state);
    } else if (gate <= dt) {
      dispatch(state);
    }
  }
  if (state.promoter) advancePromoter(state, ms - left);
  if (state.motorPool) advanceMotorPool(state, ms - left);
}

/** Re-evaluates triggers after anything changes. */
export function afterChange(state: GameState): void {
  dropOrphanSignUps(state);
  fillFromDriveway(state);
  refreshKnowhow(state);
  applyCrewHandover(state);
  syncHabitSlots(state);
  refreshReveals(state);
  if (state.run.notices.length > 20) state.run.notices.splice(0, state.run.notices.length - 20);
  state.run.feed ??= [];
  evaluateAchievements(state);
}

export type { Condition };
