import { z } from "zod";
import { partProvenanceSchema } from "./provenanceSave";
import { PART_BY_ID } from "@/core/content/parts";
import { VEHICLE_BY_ID } from "@/core/content/vehicles";
import { PROMOTER_CHARTERS, PROMOTER_ROUTES, PROMOTER_VISITORS, STEWARDSHIP, promoterSchedule, promoterTargets, type PromoterCharter, type PromoterRoute, type PromoterVisitor, type Stewardship } from "@/core/promoter";

const count = z.number().int().nonnegative();
const time = z.number().nonnegative();
const id = z.string().min(1);
const call = z.enum(["push", "nurse"]);
const condition = z.literal([0, 1, 2, 3, 4]);
const charter = z.enum(Object.keys(PROMOTER_CHARTERS) as PromoterCharter[]);
const visitor = z.enum(Object.keys(PROMOTER_VISITORS) as PromoterVisitor[]);
const stewardship = z.enum(Object.keys(STEWARDSHIP) as Stewardship[]);
const route = z.enum(Object.keys(PROMOTER_ROUTES) as PromoterRoute[]);
const winner = z.union([visitor, z.literal("guest")]);

const guest = z.object({
  uid: id,
  vehicleId: id.refine((value) => Object.hasOwn(VEHICLE_BY_ID, value)),
  name: z.string(),
  tune: z.enum(["balanced", "power", "reliable"]),
  parts: z.record(id, z.object({
    uid: id,
    partId: id.refine((value) => Object.hasOwn(PART_BY_ID, value)),
    condition,
    origin: z.string(),
    provenance: partProvenanceSchema.optional(),
  })),
  history: z.object({ races: count, wins: count, dnfs: count, bestFinish: count.positive().nullable() }),
  builtAtSeasonMs: time,
});

const result = z.object({
  call,
  position: count.positive(),
  fieldSize: count.positive(),
  dnf: z.boolean(),
  weakestSlot: id.nullable(),
  wear: z.array(z.object({ slot: id, from: condition, to: condition })),
  visitors: z.array(z.object({ id: visitor, position: count.positive(), dnf: z.boolean() })).length(5),
  winningGap: z.number().nonnegative().nullable(),
  aidedVisitor: visitor.optional(),
});

function validGuest(vehicle: z.infer<typeof guest>): boolean {
  const slots = VEHICLE_BY_ID[vehicle.vehicleId].slots;
  if (slots.some(({ slot, required }) => required && !Object.hasOwn(vehicle.parts, slot))) return false;
  const parts = Object.entries(vehicle.parts);
  return new Set(parts.map(([, part]) => part.uid)).size === parts.length
    && parts.every(([slot, { partId }]) => slots.some((def) => def.slot === slot && def.accepts.includes(partId)));
}

export const promoterSchema = z.object({
  clock: time,
  season: count,
  certified: z.array(charter).max(3),
  archive: z.array(z.object({ season: count.positive(), charter, stewardship, guest: z.string(), points: count, certified: z.boolean(), winner: winner.optional(),
    route: route.optional(), workshopBid: z.boolean().optional(), workshopEarned: z.boolean().optional() })).max(12),
  visitorForm: z.partialRecord(visitor, count.max(3)).optional(),
  policyMastery: z.partialRecord(stewardship, z.array(charter).max(3)).optional(),
  workshopLicensed: z.boolean().optional(),
  reserveGuest: guest.optional(),
  meet: z.object({
    charter,
    stewardship,
    guest,
    passes: count,
    results: z.array(result).max(4),
    booking: z.object({ due: time, result }).nullable(),
    clerkCall: z.enum(["push", "nurse", "adaptive"]).nullable(),
    pendingAid: visitor.optional(), route: route.optional(), workshopBid: z.boolean().optional(), autoService: z.boolean().optional(),
    clerkServices: z.array(id).max(5).optional(), returning: z.boolean().optional(),
  }).nullable(),
}).refine(({ clock, season, certified, archive, meet, policyMastery, workshopLicensed, reserveGuest }) => {
  if (new Set(certified).size !== certified.length) return false;
  if (certified.includes("midnight") && certified.length < 2) return false;
  if (archive.some((entry, index) => entry.season > season || (index > 0 && entry.season >= archive[index - 1].season)
    || entry.points > 8 * promoterSchedule(entry.charter, entry.route).length || (entry.certified && !certified.includes(entry.charter))
    || (entry.workshopEarned && (!entry.workshopBid || !entry.certified || !workshopLicensed)))) return false;
  if (Object.values(policyMastery ?? {}).some((charters) => new Set(charters).size !== charters.length || charters.some((entry) => !certified.includes(entry)))) return false;
  if (reserveGuest && (!validGuest(reserveGuest) || !certified.some((id) => PROMOTER_CHARTERS[id].vehicleId === reserveGuest.vehicleId))) return false;
  if (!meet) return true;
  const def = PROMOTER_CHARTERS[meet.charter];
  const length = promoterSchedule(meet.charter, meet.route).length;
  const passes = promoterTargets(meet.charter, meet.stewardship, meet.route).passes + Number(!!meet.returning);
  if (season < 1 || (archive[0] && archive[0].season >= season) || meet.guest.vehicleId !== def.vehicleId || meet.passes > passes || certified.length < def.priorCharters) return false;
  if (meet.route === "extended" && certified.length < 2) return false;
  if (meet.route === "reverse" && !certified.includes(meet.charter)) return false;
  if ((meet.stewardship === "handicap" || meet.workshopBid) && !certified.length) return false;
  if (meet.returning && (!certified.includes(meet.charter) || reserveGuest)) return false;
  if (meet.clerkCall && certified.length === 0) return false;
  if (meet.clerkCall === "adaptive" && new Set([
    ...Object.entries(policyMastery ?? {}).filter(([, charters]) => charters.length).map(([key]) => key),
    ...archive.filter((entry) => entry.certified).map((entry) => entry.stewardship),
  ]).size < 2) return false;
  if ((meet.autoService || meet.clerkServices?.length) && !workshopLicensed) return false;
  if (meet.clerkServices?.some((slot) => !Object.hasOwn(meet.guest.parts, slot))) return false;
  if (!validGuest(meet.guest) || meet.results.length > length) return false;
  if (meet.pendingAid && (!meet.results.length || meet.results.length >= length)) return false;
  if (meet.booking && (meet.booking.due <= clock || meet.results.length >= length || Object.values(meet.guest.parts).some(({ condition }) => condition === 0)
    || meet.booking.result.aidedVisitor !== meet.pendingAid || meet.booking.result.wear.some(({ slot, from }) => meet.guest.parts[slot]?.condition !== from))) return false;
  const rounds = meet.booking ? [...meet.results, meet.booking.result] : meet.results;
  const used = (meet.clerkServices?.length ?? 0) + rounds.filter((round) => round.aidedVisitor).length + Number(!!meet.pendingAid && !meet.booking);
  if (meet.passes + used > passes) return false;
  return rounds.every(({ position, dnf, fieldSize, weakestSlot, wear, visitors, winningGap, aidedVisitor }, index) => {
    const finishers = [{ position, dnf }, ...visitors].filter((entrant) => !entrant.dnf);
    if (fieldSize !== 6 || new Set(visitors.map(({ id }) => id)).size !== visitors.length) return false;
    if (position > fieldSize || visitors.some((entrant) => entrant.position > fieldSize)) return false;
    if ((winningGap === null) !== (finishers.length < 2)) return false;
    if (aidedVisitor && index === 0) return false;
    if (new Set(finishers.map((entrant) => entrant.position)).size !== finishers.length || finishers.some((entrant) => entrant.position > finishers.length)) return false;
    return (!weakestSlot || Object.hasOwn(meet.guest.parts, weakestSlot)) && new Set(wear.map(({ slot }) => slot)).size === wear.length
      && wear.every(({ slot, from, to }) => Object.hasOwn(meet.guest.parts, slot) && to < from);
  });
}, "Invalid circuit calendar");
