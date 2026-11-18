import { ownerReferencesValid, ownerSchema } from "./ownerSave";
import { promoterSchema } from "./promoterSave";
import { heritageReferencesValid } from "@/core/heritage";
import { rallyReferencesValid } from "@/core/timecards";
import { clubCharterSchema, clubCourseSchema, clubReferencesValid, clubRoundSchema, clubSchema } from "./clubSave";
import { manufacturerReferencesValid, manufacturerSchema, worksFamilySchema } from "./manufacturerSave";
import { motorPoolReferencesValid, motorPoolSchema } from "./motorPoolSave";
import { countyContactsSchema, countyContactsValid, countyMeetingSchema, countyRivalSchema } from "./countyRivalSave";
import { homeCountySchema, partProvenanceSchema } from "./provenanceSave";
import { z } from "zod";
import { PIN_IDS } from "@/core/careerPin";
import { CUSTOMER_IDS, TRANSFER_TOOLS, serviceReferencesValid } from "@/core/serviceShop";
import { KNOWHOW_BY_ID } from "@/core/content/knowhow";
import { PART_BY_ID } from "@/core/content/parts";
import { PLACE_BY_ID } from "@/core/content/places";
import { DARE_BY_ID, HARDSHIP_BY_ID, PERK_BY_ID, SEASON_CHALLENGE_IDS, isSeasonChallenge, seasonObjectiveConflict } from "@/core/content/modifiers";
import { CREW_BY_ID, TEAM_ORGANIZATION_IDS, TEAM_UPGRADE_BY_ID } from "@/core/content/team";
import { APPRENTICE_JOBS, WORKSHOP_ROUTINES } from "@/core/crewLegacy";
import { TOOL_BY_ID } from "@/core/content/tools";
import { VEHICLE_BY_ID } from "@/core/content/vehicles";
import { DISCIPLINES, RIVAL_BY_ID, VENUE_BY_ID } from "@/core/content/events";
import { upgradeSave } from "@/core/state";
import { perkSlots } from "@/core/layers";
import { countyChoiceBlocker, countyPlaceBlocker } from "@/core/counties";
import { BATON_PART, batonUnlocked, freightEligible, otherCounty } from "@/core/countyBaton";
import { RACE_NIGHT_STARTS } from "@/core/raceNight";
import { isCarryableSalvage, salvageCarryUnlocked } from "@/core/salvageCarry";
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
const client = z.enum(CUSTOMER_IDS);
const shopLegacy = z.discriminatedUnion("type", [z.object({ type: z.literal("tool"), tool: z.enum(TRANSFER_TOOLS) }), z.object({ type: z.literal("client"), client })]);
const invoice = z.object({ client, partUid: id, partId: known(PART_BY_ID), condition, origin: z.string() });
const depotReceipts = z.array(z.enum(["ramp","pump"])).max(2).refine((r) => new Set(r).size === r.length);
const invoices = z.array(invoice).max(CUSTOMER_IDS.length);
const runConfig = z.object({ shopLegacy: shopLegacy.optional(), perks: z.array(known(PERK_BY_ID)), tuneUp, dare: z.union([known(DARE_BY_ID), z.enum(SEASON_CHALLENGE_IDS)]).nullable(), hardships: z.array(known(HARDSHIP_BY_ID)), salvageSlot: z.literal(true).optional(), donor: z.object({ partId: known(PART_BY_ID), condition, origin: z.string(), provenance: partProvenanceSchema.optional() }).optional(), club: clubCharterSchema.optional(), clubCourse: clubCourseSchema.optional(), clubLoan: clubCourseSchema.optional(), clubVisitor: countyRivalSchema.optional(), worksPlan: worksFamilySchema.optional(), homeCounty: homeCountySchema.optional(), countyFreight: z.literal(true).optional() });
const neighborCounty = z.enum(["river", "quarry"]);
const batonProof = z.object({ uid: id, at: amount });
const countyBaton = z.discriminatedUnion("leg", [
  z.object({ leg: z.literal("qualify"), from: neighborCounty, qualified: batonProof.optional() }),
  z.object({ leg: z.literal("deliver"), from: neighborCounty, qualified: batonProof, completedAt: amount.optional() }),
]);
const part = z.object({ uid: id, partId: known(PART_BY_ID), condition, origin: z.string(), protected: z.boolean().optional(), referral: client.optional(), inherited: z.literal(true).optional(), provenance: partProvenanceSchema.optional() });
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
  z.object({ kind: z.literal("race"), vehicleUid: id, venueId: known(VENUE_BY_ID), event, call, tourRound: id.optional(), tourReserve: count.optional(), ownerDrive: z.literal(true).optional(), regularity: z.literal(true).optional(), useLastPace: z.literal(true).optional(), clubRound: clubRoundSchema.optional(), worksRound: id.optional(), countyMatch: countyRivalSchema.optional(), call2: z.enum(["pit", "stay", "launch_hard", "launch_soft", "cut", "recce"]).optional() }).passthrough(),
]);
const beat = z.object({ at: amount, text: z.string(), position: count.positive(), kind: z.enum(["start", "pass", "passed", "hold", "wear", "rival", "last_lap", "dnf", "finish", "caution", "round"]).optional() });
const raceFields = {
  rallyClock: z.object({ regularity: z.object({ matched: count.max(4), required: count.min(2).max(4), passed: z.boolean() }).optional(), splitsMs: z.array(count.positive()).max(4), previousMs: count.positive().optional(), referenceSplitsMs: z.array(count.positive()).min(2).max(4).optional(), referenceSeason: count.positive().optional(), previousCar: z.string().optional() }).optional(),
  course: clubCourseSchema.optional(),
  position: count.positive(), fieldSize: count.positive(), dnf: z.boolean(), margin: number,
  weakestSlot: id.nullable(), weakestPart: part.optional(), beats: z.array(beat),
  rivalOut: z.boolean().optional(), caution: z.boolean().optional(), rounds: count.positive().optional(),
};
const roll = z.object({ ...raceFields, heritageEntry: id.optional(), rivalBeaten: z.boolean(), rivalFaced: z.boolean().optional(), advanced: z.boolean().optional(), cleanBuild: z.boolean().optional(), crewIds: z.array(known(CREW_BY_ID)).optional(), wearSteps: z.record(id, count), laps: count.positive(), durationMs: amount.positive() });
const result = z.object({
  countyMeeting: countyMeetingSchema.optional(),
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
  service: z.object({
    workshop: z.partialRecord(z.enum(WORKSHOP_ROUTINES), count).optional(),
    venues: z.partialRecord(z.enum(["dirt", "drag", "rally"]), z.record(known(VENUE_BY_ID), count)).optional(),
  }).optional(),
  assignment: z.discriminatedUnion("type", [
    z.object({ type: z.literal("queue") }), z.object({ type: z.literal("rest") }),
    z.object({ type: z.literal("driver") }), z.object({ type: z.literal("spotter") }),
    z.object({ type: z.literal("habit"), template }),
  ]),
});
const handover = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("apprenticeship"), mentorId: known(CREW_BY_ID), routine: z.enum(WORKSHOP_ROUTINES),
    completed: count.max(APPRENTICE_JOBS), apprenticeId: known(CREW_BY_ID).optional(),
  }),
  z.object({
    type: z.literal("track_notes"), mentorId: known(CREW_BY_ID),
    venueId: known(VENUE_BY_ID).refine((venue) => venue !== "backyard"), discipline: z.enum(["dirt", "drag", "rally"]),
  }),
]);
const meta = z.object({
  careerPin: z.enum(PIN_IDS).optional(),
  serviceReferences: z.object({ equipment: z.object({ tool: z.enum(TRANSFER_TOOLS), season: count.positive(), invoice }).optional(), referral: z.object({ season: count.positive(), invoice }).optional() }).optional(),
  heritageRegister: z.array(z.object({ kind: z.enum(["exhibit","special"]), model: known(VEHICLE_BY_ID), originalName: z.string(), carName: z.string(), season: count.positive(), completions: count.positive() })).max(2 * Object.keys(VEHICLE_BY_ID).length).optional(),
  rallyLicences: z.record(known(VENUE_BY_ID), count.positive()).optional(),
  rallyCards: z.array(z.object({ venueId: known(VENUE_BY_ID), event, vehicleId: known(VEHICLE_BY_ID), course: clubCourseSchema.optional(),
    lastRun: z.object({ carName: z.string(), season: count.positive(), splitsMs: z.array(count.positive()).min(2).max(4) }).optional(),
    carName: z.string(), season: count.positive(), splitsMs: z.array(count.positive()).min(2).max(4) })
    .refine((card) => (!card.lastRun || card.lastRun.splitsMs.length === card.splitsMs.length) && card.splitsMs.length === ({ sprint: 2, heat: 3, feature: 4 }[card.event]))).max(225).optional(),
  seasonLog: z.array(z.object({
    season: count.positive(), endedBy: z.enum(["scrap", "team", "shop"]), serviceInvoices: invoices.optional(), depotReceipts: depotReceipts.optional(), teamName: z.string().nullable(),
    organization: z.enum(TEAM_ORGANIZATION_IDS).optional(),
    discipline: z.enum(["dirt", "drag", "rally"]), durationMs: amount, builds: count, hauls: count,
    featureWins: z.record(known(VENUE_BY_ID), amount),
    setup: runConfig,
    regularityFeatures: z.record(known(VENUE_BY_ID), amount).optional(),
  })).max(100).optional(),
  codex: z.object({ parts: z.record(known(PART_BY_ID), count), places: z.record(known(PLACE_BY_ID), count) }),
  knowhow: z.record(known(KNOWHOW_BY_ID), count), habitMemory: z.record(template, count), lastTopHabit: template.nullable(),
  records: z.record(known(VENUE_BY_ID), amount),
  hallOfFame: z.array(z.object({
    season: count.positive(), vehicleId: known(VEHICLE_BY_ID), name: z.string(), history,
    parts: z.array(z.object({ slot: id, partId: known(PART_BY_ID), condition, origin: z.string(), provenance: partProvenanceSchema.optional() })),
    retirement: z.object({ kind: z.enum(["dismantle", "exchange", "exhibit"]), vehicleUid: id, seasonMs: amount }).optional(),
  })),
  rivals: z.record(known(RIVAL_BY_ID), z.object({ wins: count, losses: count })),
  perks: z.record(known(PERK_BY_ID), count), perksUnlocked: z.array(known(PERK_BY_ID)),
  drivewayRule: z.enum(["strip_sell", "sell", "strip", "leave"]).optional(), tipsSeen: z.array(id), guideOff: z.boolean().optional(),
  daresCompleted: z.array(known(DARE_BY_ID)), disciplineMastery: z.record(known(DISCIPLINES), count),
  challengeRecords: z.partialRecord(z.enum(SEASON_CHALLENGE_IDS), z.object({ completions: count.positive(), bestSeasonMs: amount, bestVehicleName: z.string() })),
  countyFreight: z.partialRecord(neighborCounty, count.positive()).optional(),
  hardshipMastery: z.record(known(HARDSHIP_BY_ID), count), teamStateWon: z.boolean().optional(), stateWonEver: z.boolean(),
  journalSeen: z.array(id), journal: z.array(z.object({ id, season: count.positive(), seasonMs: amount, text: z.string() })),
  seasonsPlayed: count, totalTeamResets: count, milestonesEver: z.array(known(VENUE_BY_ID)),
});
const run = z.object({
  depotReceipts: depotReceipts.optional(),
  serviceBook: z.object({ invoices, ticket: z.object({ client, partUid: id, worked: z.boolean() }).optional() }).optional(),
  heritageSetups: z.array(known(VEHICLE_BY_ID)).optional(),
  heritageProject: z.object({ uid: id, kind: z.enum(["exhibit","special"]), oldSeason: count.positive(), originalName: z.string(), model: known(VEHICLE_BY_ID),
    parts: z.array(z.object({ slot: id, partId: known(PART_BY_ID) })), completed: z.string().optional() }).optional(),
  regularityFeatures: z.record(known(VENUE_BY_ID), amount).optional(),
  seasonMs: amount, cash: amount, rep: amount, materials,
  inventory: z.array(part), driveway: z.array(part), vehicles: z.array(vehicle),
  placesOpen: z.array(known(PLACE_BY_ID)), venuesOpen: z.array(known(VENUE_BY_ID)), ladder: z.record(known(VENUE_BY_ID), z.array(event)),
  tools: z.record(known(TOOL_BY_ID), count), learned: z.array(known(KNOWHOW_BY_ID)), available: z.array(known(KNOWHOW_BY_ID)),
  reps: z.record(template, count), habitsKnown: z.array(template), habitSlots: z.array(template.nullable()),
  jobs: z.array(job), queue: z.array(jobSpec), idleLanes: z.array(id), practice: z.record(known(VENUE_BY_ID), amount),
  lastEntered: z.record(id, amount), featureWins: z.record(known(VENUE_BY_ID), amount), races: z.array(result),
  challenge: z.object({ relay: z.array(z.object({ vehicleUid: id, frameUid: id })).optional(), handMeDownEngines: z.array(id).optional(), completedAt: amount.optional() }),
  countyBaton: countyBaton.optional(),
  raceNight: z.object({ vehicleUid: id, venueId: known(VENUE_BY_ID), call, startsLeft: count.min(1).max(RACE_NIGHT_STARTS), stopOnFeature: z.boolean() }).optional(),
  stats: z.object({ partsSold: count, hauls: count, racesLost: z.record(known(VENUE_BY_ID), count), firstStartDone: z.boolean(), drivewayOverflows: count.optional(), dnfs: count.optional(), counterBuys: count.optional() }),
  revealed: z.array(id), candidates: z.array(known(CREW_BY_ID)), shellsBought: count,
  saleSat: z.record(known(PART_BY_ID), z.object({ n: amount, at: amount })), purseSat: z.record(id, z.object({ n: amount, at: amount })).optional(), notices: z.array(z.string()), pushOnlyRaces: z.boolean(),
  feed: z.array(z.object({
    id, at: amount, text: z.string(), key: id.optional(), count: count.optional(), tally: z.record(id, number).optional(),
    kind: z.enum(["haul", "driveway", "bench", "habit", "place", "knowhow", "build", "race", "story"]),
  })),
});
const gameSchema = z.object({
  motorPool: motorPoolSchema(vehicle, part).optional(),
  owner: ownerSchema.optional(), promoter: promoterSchema.optional(), club: clubSchema.optional(), manufacturer: manufacturerSchema.optional(), countyRivals: countyContactsSchema.optional(),
  version: z.literal(1), seed: z.string(), rng: count, uid: count, meta, run,
  scrap: z.object({ lp: amount, lifetimeLp: amount, resets: count, tuneUpPoints: count, milestonesThisEra: z.array(known(VENUE_BY_ID)), daresThisEra: count }),
  team: z.object({ tp: amount, lifetimeTp: amount, resets: count, upgrades: z.record(known(TEAM_UPGRADE_BY_ID), count) }),
  era: z.object({
    organization: z.enum(TEAM_ORGANIZATION_IDS).optional(),
    handover: handover.optional(),
    discipline: z.enum(["dirt", "drag", "rally"]), teamName: z.string(), colors: z.tuple([z.string().regex(/^#(?:[\da-f]{3}|[\da-f]{6})$/i), z.string().regex(/^#(?:[\da-f]{3}|[\da-f]{6})$/i)]), crew: z.array(crew), milestones: z.array(known(VENUE_BY_ID)), hardshipsCompleted: count, legends: z.array(known(CREW_BY_ID)), seasonIndex: count,
  }).nullable(),
  config: runConfig,
});
// Only fields actually absent from older rewrite saves are optional. Missing core data is corruption.
const compatibleSchema = gameSchema.extend({
  meta: meta.extend({ tipsSeen: meta.shape.tipsSeen.optional(), challengeRecords: meta.shape.challengeRecords.optional() }),
  run: run.extend({ driveway: run.shape.driveway.optional(), feed: run.shape.feed.optional(), challenge: run.shape.challenge.optional() }),
});

function referencesValid(game: GameState): boolean {
  if (!motorPoolReferencesValid(game)) return false;
  if (countyChoiceBlocker(game, game.config.homeCounty) || game.run.placesOpen.some((placeId) => countyPlaceBlocker(game, placeId))) return false;
  const baton = game.run.countyBaton;
  if (baton && (!batonUnlocked(game) || game.config.dare)) return false;
  if (baton?.leg === "qualify" && (game.config.homeCounty !== baton.from || (baton.qualified && baton.qualified.at > game.run.seasonMs))) return false;
  if (baton?.leg === "deliver" && (game.config.homeCounty !== otherCounty(baton.from) || !game.config.salvageSlot
    || game.config.donor?.partId !== BATON_PART[baton.from] || game.config.donor.provenance?.county !== baton.from
    || game.config.donor.provenance.season !== game.meta.seasonsPlayed
    || (baton.completedAt !== undefined && (baton.completedAt > game.run.seasonMs || !game.meta.countyFreight?.[otherCounty(baton.from)])))) return false;
  if (!serviceReferencesValid(game) || !rallyReferencesValid(game) || !heritageReferencesValid(game)) return false;
  const night = game.run.raceNight;
  if (night && (game.era || game.run.featureWins.county_fair !== undefined || !game.run.venuesOpen.includes(night.venueId)
    || !game.run.vehicles.some((car) => car.uid === night.vehicleUid)
    || game.run.queue.some((job) => job.kind === "race" && job.vehicleUid === night.vehicleUid))) return false;
  const handover = game.era?.handover;
  if (handover?.type === "track_notes" && handover.discipline !== game.era?.discipline) return false;
  if (handover?.type === "apprenticeship" && (
    Boolean(handover.completed) !== Boolean(handover.apprenticeId)
      || handover.apprenticeId === handover.mentorId
      || (handover.completed > 0 && handover.completed < APPRENTICE_JOBS
        && !game.era?.crew.some((member) => member.id === handover.apprenticeId))
  )) return false;
  const seasons = game.meta.seasonLog ?? [];
  if (seasons.some((entry, i) => entry.season > game.meta.seasonsPlayed ||
    (i > 0 && entry.season <= seasons[i - 1].season))) return false;
  const { relay, completedAt } = game.run.challenge;
  const objective = game.config.dare;
  if (relay && objective !== "homebuilt_relay") return false;
  if (game.run.challenge.handMeDownEngines && objective !== "hand_me_down") return false;
  if (isSeasonChallenge(objective)) {
    if (seasonObjectiveConflict(game.config.hardships, objective, game.era?.discipline ?? "dirt")) return false;
    if (completedAt !== undefined) {
      const record = game.meta.challengeRecords[objective];
      if (!record || record.bestSeasonMs > completedAt || completedAt > game.run.seasonMs) return false;
    }
  } else if (completedAt !== undefined) return false;
  if (!ownerReferencesValid(game) || (game.promoter && !(game.owner && game.owner.titles > 0))) return false;
  if (!clubReferencesValid(game)) return false;
  if (!manufacturerReferencesValid(game)) return false;
  if (!countyContactsValid(game)) return false;
  const inventory = new Map(game.run.inventory.map((part) => [part.uid, part]));
  const free = new Set([...game.run.inventory, ...game.run.driveway].map((part) => part.uid));
  const retired = game.meta.hallOfFame.flatMap((entry) => entry.retirement ? [entry.retirement.vehicleUid] : []);
  if (new Set(retired).size !== retired.length || game.run.vehicles.some((car) => retired.includes(car.uid))) return false;
  const parts = [...game.run.inventory, ...game.run.driveway, ...game.run.vehicles.flatMap((vehicle) => Object.values(vehicle.parts).filter((part) => part !== undefined))];
  if (parts.some((part) => part.provenance && part.provenance.season > game.meta.seasonsPlayed + 1)) return false;
  const inherited = parts.filter((piece) => piece.inherited);
  if (inherited.length > (game.config.salvageSlot || game.config.countyFreight ? 1 : 0) || inherited.some((piece) => !isCarryableSalvage(piece))) return false;
  if (baton?.leg === "deliver" && (inherited.some((part) => part.uid !== baton.qualified.uid || part.partId !== BATON_PART[baton.from]
    || part.provenance?.county !== baton.from || part.provenance.season !== game.meta.seasonsPlayed)
    || parts.some((part) => part.uid === baton.qualified.uid && !part.inherited))) return false;
  if (game.config.salvageSlot && (!salvageCarryUnlocked(game) || game.config.hardships.includes("rookie_plates") || game.config.perks.length > perkSlots(game))) return false;
  if (game.config.countyFreight && (game.config.salvageSlot || game.config.hardships.includes("rookie_plates")
    || !freightEligible(game, game.config.homeCounty ?? "home", game.config.donor))) return false;
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
    meta: { ...parsed.data.meta, tipsSeen: parsed.data.meta.tipsSeen ?? [...parsed.data.run.revealed], challengeRecords: parsed.data.meta.challengeRecords ?? {} },
    run: { ...parsed.data.run, driveway: parsed.data.run.driveway ?? [], feed: parsed.data.run.feed ?? [], challenge: parsed.data.run.challenge ?? {} },
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
