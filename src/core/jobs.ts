import { channel } from "./channels";
import { DISCIPLINES, getVenue } from "./content/events";
import { REPAIR_COST, REPAIR_MINUTES, REPAIR_TECHNIQUE, STRIP_YIELD, getPart } from "./content/parts";
import { PLACE_BY_ID, getPlace } from "./content/places";
import { CREW_BY_ID, crewLevel } from "./content/team";
import { getVehicle } from "./content/vehicles";
import { reservedPartUids, vehicleBusy } from "./garage";
import { countRepetition, syncHabitSlots, templateBase } from "./habits";
import { completeHaul } from "./haul";
import { STORY, addJournal } from "./journal";
import { getKnowhow } from "./content/knowhow";
import { isLearned, learn, refreshKnowhow, studyMs } from "./knowhowEngine";
import { raceDurationMs, resolveRace } from "./race";
import { refreshReveals } from "./reveal";
import { nextUid } from "./rng";
import { hasPerk, resolveFlags } from "./rules";
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

function hasMaterials(state: GameState, cost: Partial<Record<MaterialId, number>>, mult = 1): boolean {
  return Object.entries(cost).every(([m, n]) => state.run.materials[m as MaterialId] >= (n ?? 0) * mult);
}

function payMaterials(state: GameState, cost: Partial<Record<MaterialId, number>>, mult = 1): void {
  for (const [m, n] of Object.entries(cost)) state.run.materials[m as MaterialId] -= (n ?? 0) * mult;
}

/** Why a job can't start right now (null = it can). Does not check lane availability. */
export function jobBlocker(state: GameState, spec: JobSpec): string | null {
  switch (spec.kind) {
    case "haul": {
      const place = PLACE_BY_ID[spec.placeId];
      if (!place) return "Unknown place";
      if (!state.run.placesOpen.includes(spec.placeId)) return "That place isn't open to you yet";
      const req = place.requires?.(state);
      if (req) return req;
      if (state.run.cash < place.fee) return `Needs ${place.fee} Scrap Bucks`;
      if (spec.focus && !isLearned(state, "tech:scouting")) return "Learn Scouting to look for something specific";
      return null;
    }
    case "clean": {
      const part = findPart(state, spec.partUid);
      if (!part) return "Pick a part";
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
      if (!hasMaterials(state, REPAIR_COST[def.category])) return "Not enough materials";
      return null;
    }
    case "restore": {
      const part = findPart(state, spec.partUid);
      if (!part) return "Pick a part";
      if (!isLearned(state, "tech:tuning")) return "Needs Tuning";
      if (part.condition !== 3) return "Only Good parts can be restored";
      const def = getPart(part.partId);
      if (def.category === "junk") return "Junk can only be stripped or sold";
      if (!hasMaterials(state, REPAIR_COST[def.category], 2)) return "Not enough materials";
      return null;
    }
    case "strip":
      return findPart(state, spec.partUid) ? null : "Pick a part";
    case "study": {
      const def = getKnowhow(spec.knowhowId);
      if (def.kind === "place") return "Places are opened with Rep";
      if (isLearned(state, spec.knowhowId)) return "Already learned";
      if (state.run.jobs.some((j) => j.spec.kind === "study" && j.spec.knowhowId === spec.knowhowId)) return "You're already studying that";
      if (!state.run.available.includes(spec.knowhowId)) return def.hint;
      return null;
    }
    case "assemble": {
      const def = getVehicle(spec.vehicleId);
      if (def.blueprint && !isLearned(state, def.blueprint)) return "You haven't drawn up these plans";
      for (const slot of def.slots) {
        const uid = spec.partUids[slot.slot];
        const part = findPart(state, uid);
        if (!part) {
          if (slot.required) return `Missing ${slot.slot}`;
          continue;
        }
        if (!slot.accepts.includes(part.partId)) return `${getPart(part.partId).name} doesn't fit the ${slot.slot} slot`;
        if (slot.minCondition !== undefined && part.condition < slot.minCondition) return `The ${slot.slot} must be at least Good`;
        if (part.condition === 0) return `${getPart(part.partId).name} is scrap; clean or replace it`;
      }
      if (state.run.cash < def.cash) return `Needs ${def.cash} Scrap Bucks`;
      if (!hasMaterials(state, def.materials)) return "Not enough materials";
      return null;
    }
    case "race": {
      const vehicle = state.run.vehicles.find((v) => v.uid === spec.vehicleUid);
      if (!vehicle) return "Pick a vehicle";
      if (vehicleBusy(state, vehicle.uid)) return "That vehicle is already racing";
      if (!state.run.venuesOpen.includes(spec.venueId)) return "That venue isn't open to you yet";
      const venue = getVenue(spec.venueId);
      const tier = getVehicle(vehicle.vehicleId).tier;
      if (tier < venue.tiers[0] || tier > venue.tiers[1]) return `Tier ${venue.tiers[0]}–${venue.tiers[1]} vehicles only`;
      if (!(state.run.ladder[spec.venueId] ?? []).includes(spec.event)) return "Podium the previous event first";
      const missing = getVehicle(vehicle.vehicleId).slots.find((sl) => sl.required && !vehicle.parts[sl.slot]);
      if (missing) return `The ${missing.slot} is out on the bench`;
      if (Object.values(vehicle.parts).some((p) => p && p.condition === 0)) return "A part is scrap. Fix it before racing";
      if (spec.call2) {
        const driver = state.era?.crew.some((c) => c.assignment.type === "driver");
        const calls = DISCIPLINES[resolveFlags(state).discipline].secondCall;
        if (!driver) return "Only a driver can make that call";
        if (spec.call2 !== calls.a.id && spec.call2 !== calls.b.id) return "That call isn't part of this discipline";
      }
      const wait = nextEventInMs(state, spec.venueId, spec.event);
      if (wait > 0) return `Next ${spec.event} in ${formatWait(wait)}`;
      if (state.run.cash < venue.events[spec.event].entry) return `Entry is ${venue.events[spec.event].entry} Scrap Bucks`;
      return null;
    }
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
      const part = findPart(state, spec.partUid);
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
    case "repair": {
      const part = findPart(state, spec.partUid);
      if (part) paid.materials = scaled(REPAIR_COST[getPart(part.partId).category], 1);
      break;
    }
    case "restore": {
      const part = findPart(state, spec.partUid);
      if (part) paid.materials = scaled(REPAIR_COST[getPart(part.partId).category], 2);
      break;
    }
    case "assemble": {
      const def = getVehicle(spec.vehicleId);
      paid.cash = def.cash;
      paid.materials = scaled(def.materials, 1);
      break;
    }
    case "race": {
      paid.cash = getVenue(spec.venueId).events[spec.event].entry;
      const key = `${spec.venueId}:${spec.event}`;
      paid.lastEntered = { key, prev: state.run.lastEntered[key] };
      state.run.lastEntered[key] = state.run.seasonMs;
      break;
    }
    default:
      break;
  }
  state.run.cash -= paid.cash;
  payMaterials(state, paid.materials);
  return paid;
}

/** Removes a running job and refunds what starting it cost. */
export function dropJob(state: GameState, jobId: string): void {
  const job = state.run.jobs.find((j) => j.id === jobId);
  if (!job) return;
  state.run.jobs = state.run.jobs.filter((j) => j.id !== jobId);
  const paid = job.paid;
  if (!paid) return;
  state.run.cash += paid.cash;
  for (const [m, n] of Object.entries(paid.materials)) state.run.materials[m as MaterialId] += n ?? 0;
  if (paid.lastEntered) {
    if (paid.lastEntered.prev === undefined) delete state.run.lastEntered[paid.lastEntered.key];
    else state.run.lastEntered[paid.lastEntered.key] = paid.lastEntered.prev;
  }
}

function startJob(state: GameState, lane: LaneId, spec: JobSpec, looping: boolean, template?: string): ActiveJob {
  const duration = baseDuration(state, spec);
  const paid = payForStart(state, spec);
  const job: ActiveJob = { id: nextUid(state, "j"), lane, spec, duration, remaining: duration, looping, template, paid };
  state.run.jobs.push(job);
  return job;
}

function benchesInUse(state: GameState): number {
  return state.run.jobs.filter((j) => isBenchKind(j.spec)).length;
}

function benchCapacity(state: GameState): number {
  return Math.floor(channel(state, "benches"));
}

function laneBusy(state: GameState, lane: LaneId): boolean {
  return state.run.jobs.some((j) => j.lane === lane);
}

function activeCrew(state: GameState): CrewMember[] {
  if (!state.era || resolveFlags(state).crewDisabled) return [];
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
    state.run.queue = state.run.queue.filter((q) => !(q.kind === "study" && isLearned(state, q.knowhowId)));
    // Queue → hands and benches.
    for (let i = 0; i < state.run.queue.length; i++) {
      const spec = state.run.queue[i];
      const blocker = jobBlocker(state, spec);
      if (blocker) continue;
      if (isBenchKind(spec)) {
        if (benchesInUse(state) >= benchCapacity(state)) continue;
        // A crew member who is better at this than an unattended bench takes it.
        const specialist = activeCrew(state).find((c) => c.assignment.type === "queue" && !laneBusy(state, `crew:${c.id}`) && crewAccepts(state, c, spec) && (CREW_BY_ID[c.id]?.speed[spec.kind] ?? 1) > 1);
        const lane = specialist ? `crew:${specialist.id}` : firstFreeBenchLane(state);
        state.run.queue.splice(i, 1);
        startJob(state, lane, spec, false);
        progressed = true;
        break;
      }
      if (HANDS_KINDS.has(spec.kind) && !laneBusy(state, "hands")) {
        state.run.queue.splice(i, 1);
        startJob(state, "hands", spec, false);
        progressed = true;
        break;
      }
      // Crew on "queue" take hands-kind jobs too.
      const crew = activeCrew(state).find((c) => c.assignment.type === "queue" && !laneBusy(state, `crew:${c.id}`) && crewAccepts(state, c, spec));
      if (crew) {
        state.run.queue.splice(i, 1);
        startJob(state, `crew:${crew.id}`, spec, false);
        progressed = true;
        break;
      }
    }
    if (progressed) continue;

    // Habit lanes (Era 1).
    if (!flags.habitsDisabled) {
      state.run.habitSlots.forEach((template, index) => {
        const lane = `habit:${index}`;
        if (!template || laneBusy(state, lane)) return;
        if (!state.run.habitsKnown.includes(templateBase(template))) return;
        const spec = resolveTemplate(state, template);
        if (!spec) return;
        if (isBenchKind(spec) && benchesInUse(state) >= benchCapacity(state)) return;
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
      if (isBenchKind(spec) && benchesInUse(state) >= benchCapacity(state)) continue;
      startJob(state, lane, spec, true, template);
      progressed = true;
    }
  }
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
  if (def.refuses.includes(spec.kind)) return false;
  if (spec.kind === "haul" && def.refusesPlace === spec.placeId) return false;
  if (isBenchKind(spec) && benchesInUse(state) >= benchCapacity(state)) return false;
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
      rate *= 0.6 + 0.4 * (member.morale / 100);
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
  switch (spec.kind) {
    case "haul":
      completeHaul(state, spec, crewId);
      break;
    case "clean": {
      const part = findPart(state, spec.partUid);
      if (part && part.condition <= 1) {
        part.condition = (part.condition + 1) as Condition;
        addJournal(state, "first_clean", STORY.first_clean);
      }
      break;
    }
    case "repair": {
      const part = findPart(state, spec.partUid);
      if (part && part.condition <= 2) part.condition = 3;
      break;
    }
    case "restore": {
      const part = findPart(state, spec.partUid);
      if (part && part.condition === 3) part.condition = 4;
      break;
    }
    case "strip": {
      const part = findPart(state, spec.partUid);
      if (part) {
        state.run.inventory = state.run.inventory.filter((p) => p.uid !== part.uid);
        const yieldMult = part.condition === 0 ? 0.5 : 1;
        for (const [m, n] of Object.entries(STRIP_YIELD[getPart(part.partId).category])) {
          state.run.materials[m as MaterialId] += Math.max(1, Math.round((n ?? 0) * yieldMult));
        }
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
      resolveRace(state, spec);
      break;
  }
  countRepetition(state, spec);
  if (crewId && state.era) {
    const member = state.era.crew.find((c) => c.id === crewId);
    if (member) member.jobsDone += 1;
  }
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
  state.run.vehicles.push({
    uid: nextUid(state, "v"),
    vehicleId: def.id,
    name: spec.name || def.name,
    parts,
    tune: "balanced",
    history: { races: 0, wins: 0, dnfs: 0, bestFinish: null },
    builtAtSeasonMs: state.run.seasonMs,
  });
  if (!state.run.stats.firstStartDone) {
    state.run.stats.firstStartDone = true;
    addJournal(state, "first_start", STORY.first_start);
  }
  syncHabitSlots(state);
}

/** Validates and queues a job. Returns an error message or null. */
export function enqueue(state: GameState, spec: JobSpec): string | null {
  const blocker = jobBlocker(state, spec);
  if (blocker) return blocker;
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

/** Cancels a running job and refunds its start cost; parts stay where they are. */
export function cancelJob(state: GameState, jobId: string): void {
  dropJob(state, jobId);
  dispatch(state);
}

/** Ms until a scheduled race that's waiting (queued or a Race Day Habit) can start; Infinity if none. */
function nextGateMs(state: GameState): number {
  let gate = Infinity;
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
    if (state.run.seasonMs - member.windowStartMs >= MORALE_WINDOW) {
      member.windowStartMs = state.run.seasonMs;
      member.workedInWindowMs = 0;
    }
    const working = state.run.jobs.some((j) => j.lane === `crew:${member.id}`);
    const hours = dt / HOUR;
    if (working) {
      member.workedInWindowMs += dt;
      const stamina = (def?.staminaHours ?? 8) * HOUR;
      const drain = (member.workedInWindowMs > stamina ? 6 : 1) * (def?.moraleDrainMult ?? 1);
      member.morale = Math.max(0, member.morale - drain * hours);
    } else {
      member.morale = Math.min(100, member.morale + 8 * hours);
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
    } else if (gate <= dt) {
      dispatch(state);
    }
  }
}

/** Re-evaluates triggers after anything changes. */
export function afterChange(state: GameState): void {
  refreshKnowhow(state);
  syncHabitSlots(state);
  refreshReveals(state);
  if (state.run.notices.length > 20) state.run.notices.splice(0, state.run.notices.length - 20);
}

export type { Condition };
