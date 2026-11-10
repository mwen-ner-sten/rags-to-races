import { z } from "zod";
import { KNOWHOW_BY_ID } from "@/core/content/knowhow";
import { PART_BY_ID } from "@/core/content/parts";
import { PLACE_BY_ID } from "@/core/content/places";
import { DARE_BY_ID, HARDSHIP_BY_ID, PERK_BY_ID } from "@/core/content/modifiers";
import { CREW_BY_ID, TEAM_UPGRADE_BY_ID } from "@/core/content/team";
import { TOOL_BY_ID } from "@/core/content/tools";
import { VEHICLE_BY_ID } from "@/core/content/vehicles";
import { DISCIPLINES, RIVAL_BY_ID, VENUE_BY_ID } from "@/core/content/events";
import { upgradeSave } from "@/core/state";
import type { GameState, JobSpec } from "@/core/types";

const number = z.number().finite();
const amount = number.nonnegative();
const count = amount.int();
const id = z.string().min(1);
const known = (table: Record<string, unknown>) => id.refine((value) => Object.hasOwn(table, value), "Unknown content id");
const condition = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);
const event = z.enum(["sprint", "heat", "feature"]);
const call = z.enum(["push", "nurse"]);
const category = z.enum(["engine", "wheel", "frame", "fuel", "electronics", "drivetrain", "exhaust", "body", "junk"]);
const materials = z.object({ metal: amount, rubber: amount, wiring: amount });
const partialMaterials = materials.partial();
const tuneUp = z.object({ haul: count, wrench: count, build: count, race: count });
const part = z.object({ uid: id, partId: known(PART_BY_ID), condition, origin: z.string() });
const history = z.object({ races: count, wins: count, dnfs: count, bestFinish: count.positive().nullable() });
const vehicle = z.object({
  uid: id, vehicleId: known(VEHICLE_BY_ID), name: z.string(), parts: z.record(id, part),
  tune: z.enum(["balanced", "power", "reliable"]), history, builtAtSeasonMs: amount,
});

function validTemplate(value: string): boolean {
  if (["clean", "repair", "strip", "race"].includes(value)) return true;
  const fields = value.split(":");
  if (fields[0] === "haul") return (fields.length === 2 || fields.length === 3) && Object.hasOwn(PLACE_BY_ID, fields[1]) && (!fields[2] || category.safeParse(fields[2]).success);
  return fields[0] === "race" && fields.length === 5 && !!fields[1] && Object.hasOwn(VENUE_BY_ID, fields[2]) && event.safeParse(fields[3]).success && call.safeParse(fields[4]).success;
}
const template = id.refine(validTemplate, "Invalid Habit setup");
// Preserve additional job metadata, including race-night sign-ups from the pacing branch.
const jobSpec = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("haul"), placeId: known(PLACE_BY_ID), focus: category.optional() }).passthrough(),
  ...(["clean", "repair", "restore", "strip"] as const).map((kind) => z.object({ kind: z.literal(kind), partUid: id.optional() }).passthrough()),
  z.object({ kind: z.literal("study"), knowhowId: known(KNOWHOW_BY_ID) }).passthrough(),
  z.object({ kind: z.literal("assemble"), vehicleId: known(VEHICLE_BY_ID), partUids: z.record(id, id), name: z.string() }).passthrough(),
  z.object({ kind: z.literal("race"), vehicleUid: id, venueId: known(VENUE_BY_ID), event, call, call2: z.enum(["pit", "stay", "launch_hard", "launch_soft"]).optional() }).passthrough(),
]);
const beat = z.object({ at: amount, text: z.string(), position: count.positive(), kind: z.enum(["start", "pass", "passed", "hold", "wear", "rival", "last_lap", "dnf", "finish", "caution", "round"]).optional() });
const raceFields = {
  position: count.positive(), fieldSize: count.positive(), dnf: z.boolean(), margin: number,
  weakestSlot: id.nullable(), weakestPart: part.optional(), beats: z.array(beat),
  rivalOut: z.boolean().optional(), caution: z.boolean().optional(), rounds: count.positive().optional(),
};
const roll = z.object({ ...raceFields, rivalBeaten: z.boolean(), advanced: z.boolean().optional(), cleanBuild: z.boolean().optional(), crewIds: z.array(known(CREW_BY_ID)).optional(), wearSteps: z.record(id, count), laps: count.positive(), durationMs: amount.positive() });
const result = z.object({
  ...raceFields, id, seasonMs: amount, vehicleUid: id, venueId: known(VENUE_BY_ID), event, call,
  prize: amount, rep: amount, rival: z.object({ id: known(RIVAL_BY_ID), beaten: z.boolean() }).optional(),
  laps: count.positive().optional(), durationMs: amount.positive().optional(),
  wear: z.array(z.object({ slot: id, from: condition, to: condition })),
});
const job = z.object({
  id, lane: id, spec: jobSpec, duration: amount.positive(), remaining: amount, looping: z.boolean(), template: template.optional(), race: roll.optional(),
  paid: z.object({
    cash: amount, materials: partialMaterials,
    lastEntered: z.object({ key: id, prev: amount.optional() }).transform((value) => ({ key: value.key, prev: value.prev })).optional(),
  }).optional(),
});
const crew = z.object({
  id: known(CREW_BY_ID), morale: amount.max(100), workedInWindowMs: amount, windowStartMs: amount, jobsDone: count,
  assignment: z.discriminatedUnion("type", [
    z.object({ type: z.literal("queue") }), z.object({ type: z.literal("rest") }),
    z.object({ type: z.literal("driver") }), z.object({ type: z.literal("spotter") }),
    z.object({ type: z.literal("habit"), template }),
  ]),
});
const meta = z.object({
  codex: z.object({ parts: z.record(known(PART_BY_ID), count), places: z.record(known(PLACE_BY_ID), count) }),
  knowhow: z.record(known(KNOWHOW_BY_ID), count), habitMemory: z.record(template, count), lastTopHabit: template.nullable(),
  records: z.record(known(VENUE_BY_ID), amount),
  hallOfFame: z.array(z.object({ season: count.positive(), vehicleId: known(VEHICLE_BY_ID), name: z.string(), history, parts: z.array(z.object({ slot: id, partId: known(PART_BY_ID), condition, origin: z.string() })) })),
  rivals: z.record(known(RIVAL_BY_ID), z.object({ wins: count, losses: count })),
  perks: z.record(known(PERK_BY_ID), count), perksUnlocked: z.array(known(PERK_BY_ID)),
  drivewayRule: z.enum(["strip_sell", "sell", "strip", "leave"]).optional(), tipsSeen: z.array(id), guideOff: z.boolean().optional(),
  daresCompleted: z.array(known(DARE_BY_ID)), disciplineMastery: z.record(known(DISCIPLINES), count),
  hardshipMastery: z.record(known(HARDSHIP_BY_ID), count), stateWonEver: z.boolean(),
  journalSeen: z.array(id), journal: z.array(z.object({ id, season: count.positive(), seasonMs: amount, text: z.string() })),
  seasonsPlayed: count, totalTeamResets: count, milestonesEver: z.array(known(VENUE_BY_ID)),
});
const run = z.object({
  seasonMs: amount, cash: amount, rep: amount, materials,
  inventory: z.array(part), driveway: z.array(part), vehicles: z.array(vehicle),
  placesOpen: z.array(known(PLACE_BY_ID)), venuesOpen: z.array(known(VENUE_BY_ID)), ladder: z.record(known(VENUE_BY_ID), z.array(event)),
  tools: z.record(known(TOOL_BY_ID), count), learned: z.array(known(KNOWHOW_BY_ID)), available: z.array(known(KNOWHOW_BY_ID)),
  reps: z.record(template, count), habitsKnown: z.array(template), habitSlots: z.array(template.nullable()),
  jobs: z.array(job), queue: z.array(jobSpec), idleLanes: z.array(id), practice: z.record(known(VENUE_BY_ID), amount),
  lastEntered: z.record(id, amount), featureWins: z.record(known(VENUE_BY_ID), amount), races: z.array(result),
  stats: z.object({ partsSold: count, hauls: count, racesLost: z.record(known(VENUE_BY_ID), count), firstStartDone: z.boolean(), drivewayOverflows: count.optional(), dnfs: count.optional(), counterBuys: count.optional() }),
  revealed: z.array(id), candidates: z.array(known(CREW_BY_ID)), shellsBought: count,
  saleSat: z.record(known(PART_BY_ID), z.object({ n: amount, at: amount })), purseSat: z.record(id, z.object({ n: amount, at: amount })).optional(), notices: z.array(z.string()), pushOnlyRaces: z.boolean(),
  feed: z.array(z.object({
    id, at: amount, text: z.string(), key: id.optional(), count: count.optional(), tally: z.record(id, number).optional(),
    kind: z.enum(["haul", "driveway", "bench", "habit", "place", "knowhow", "build", "race", "story"]),
  })),
});
const gameSchema = z.object({
  version: z.literal(1), seed: z.string(), rng: count, uid: count, meta, run,
  scrap: z.object({ lp: amount, lifetimeLp: amount, resets: count, tuneUpPoints: count, milestonesThisEra: z.array(known(VENUE_BY_ID)), daresThisEra: count }),
  team: z.object({ tp: amount, lifetimeTp: amount, resets: count, upgrades: z.record(known(TEAM_UPGRADE_BY_ID), count) }),
  era: z.object({ discipline: z.enum(["dirt", "drag"]), teamName: z.string(), colors: z.tuple([z.string().regex(/^#(?:[\da-f]{3}|[\da-f]{6})$/i), z.string().regex(/^#(?:[\da-f]{3}|[\da-f]{6})$/i)]), crew: z.array(crew), milestones: z.array(known(VENUE_BY_ID)), hardshipsCompleted: count, legends: z.array(known(CREW_BY_ID)), seasonIndex: count }).nullable(),
  config: z.object({ perks: z.array(known(PERK_BY_ID)), tuneUp, dare: known(DARE_BY_ID).nullable(), hardships: z.array(known(HARDSHIP_BY_ID)) }),
});
// Only fields actually absent from older rewrite saves are optional. Missing core data is corruption.
const compatibleSchema = gameSchema.extend({ meta: meta.extend({ tipsSeen: meta.shape.tipsSeen.optional() }), run: run.extend({ driveway: run.shape.driveway.optional(), feed: run.shape.feed.optional() }) });

function referencesValid(game: GameState): boolean {
  const inventory = new Map(game.run.inventory.map((part) => [part.uid, part]));
  const free = new Set([...game.run.inventory, ...game.run.driveway].map((part) => part.uid));
  const parts = [...game.run.inventory, ...game.run.driveway, ...game.run.vehicles.flatMap((vehicle) => Object.values(vehicle.parts).filter((part) => part !== undefined))];
  if (new Set(parts.map((part) => part.uid)).size !== parts.length || new Set(game.run.vehicles.map((vehicle) => vehicle.uid)).size !== game.run.vehicles.length) return false;
  for (const vehicle of game.run.vehicles) {
    const slots = VEHICLE_BY_ID[vehicle.vehicleId].slots;
    if (Object.entries(vehicle.parts).some(([slot, part]) => !part || !slots.some((def) => def.slot === slot && def.accepts.includes(part.partId)))) return false;
  }
  const specValid = (spec: JobSpec) => {
    if (spec.kind === "clean" || spec.kind === "repair" || spec.kind === "restore" || spec.kind === "strip") return !!spec.partUid && (spec.kind === "strip" ? free.has(spec.partUid) : inventory.has(spec.partUid));
    if (spec.kind === "race") return game.run.vehicles.some((vehicle) => vehicle.uid === spec.vehicleUid);
    if (spec.kind === "assemble") {
      const slots = VEHICLE_BY_ID[spec.vehicleId].slots;
      const offered = Object.values(spec.partUids);
      return new Set(offered).size === offered.length && Object.entries(spec.partUids).every(([slot, uid]) => {
        const part = inventory.get(uid);
        return part && slots.some((def) => def.slot === slot && def.accepts.includes(part.partId));
      })
        && slots.every((slot) => !slot.required || !!spec.partUids[slot.slot]);
    }
    return true;
  };
  if (!game.run.queue.every(specValid) || !game.run.jobs.every((job) => specValid(job.spec) && /^(hands|bench:(\d+|overflow)|habit:\d+|crew:[\w-]+)$/.test(job.lane)
    && (!job.lane.startsWith("crew:") || game.era?.crew.some((member) => member.id === job.lane.slice(5)))
    && (!job.race?.crewIds || job.race.crewIds.every((id) => game.era?.crew.some((member) => member.id === id)))
    && (!job.race || job.race.position <= job.race.fieldSize))) return false;
  if (game.run.races.some((race) => race.position > race.fieldSize || race.beats.some((beat) => beat.position > race.fieldSize))) return false;
  if (Object.entries(game.meta.perks).some(([id, rank]) => rank > PERK_BY_ID[id].maxRank)
    || Object.entries(game.run.tools).some(([id, rank]) => rank > TOOL_BY_ID[id].max)
    || Object.entries(game.team.upgrades).some(([id, rank]) => rank > TEAM_UPGRADE_BY_ID[id].cost.length)) return false;
  if (game.config.perks.some((id) => !(game.meta.perks[id] > 0)) || new Set(game.config.perks).size !== game.config.perks.length) return false;
  if (game.era && (new Set(game.era.crew.map((member) => member.id)).size !== game.era.crew.length
    || game.era.crew.some((member) => (member.assignment.type === "driver" && !CREW_BY_ID[member.id].driverPerf)
      || (member.assignment.type === "spotter" && !CREW_BY_ID[member.id].dnfMult)))) return false;
  return true;
}

export function isGameState(value: unknown): value is GameState {
  const parsed = gameSchema.safeParse(value);
  return parsed.success && referencesValid(parsed.data);
}

/** Validate first, migrate known older fields, then repair missed earned unlocks. */
export function decodeGameState(value: unknown): GameState | null {
  const parsed = compatibleSchema.safeParse(value);
  if (!parsed.success) return null;
  const game: GameState = {
    ...parsed.data,
    meta: { ...parsed.data.meta, tipsSeen: parsed.data.meta.tipsSeen ?? [...parsed.data.run.revealed] },
    run: { ...parsed.data.run, driveway: parsed.data.run.driveway ?? [], feed: parsed.data.run.feed ?? [] },
  };
  return referencesValid(game) ? upgradeSave(game) : null;
}

export function decodeSave(raw: string): { savedAt: number; game: GameState } | null {
  try {
    const file = z.object({ savedAt: amount.optional(), game: z.unknown() }).safeParse(JSON.parse(raw));
    if (!file.success) return null;
    const game = decodeGameState(file.data.game);
    return game ? { game, savedAt: file.data.savedAt ?? Date.now() } : null;
  } catch {
    return null;
  }
}
