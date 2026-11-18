import { z } from "zod";
import { PART_BY_ID } from "@/core/content/parts";
import { VEHICLE_BY_ID } from "@/core/content/vehicles";
import { PROMOTER_CHARTERS, PROMOTER_VISITORS, STEWARDSHIP, type PromoterCharter, type PromoterVisitor, type Stewardship } from "@/core/promoter";

const count = z.number().int().nonnegative();
const time = z.number().nonnegative();
const id = z.string().min(1);
const call = z.enum(["push", "nurse"]);
const condition = z.literal([0, 1, 2, 3, 4]);
const charter = z.enum(Object.keys(PROMOTER_CHARTERS) as PromoterCharter[]);
const visitor = z.enum(Object.keys(PROMOTER_VISITORS) as PromoterVisitor[]);
const stewardship = z.enum(Object.keys(STEWARDSHIP) as Stewardship[]);

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
});

export const promoterSchema = z.object({
  clock: time,
  season: count,
  certified: z.array(charter).max(3),
  archive: z.array(z.object({ season: count.positive(), charter, stewardship, guest: z.string(), points: count, certified: z.boolean() })).max(12),
  meet: z.object({
    charter,
    stewardship,
    guest,
    passes: count,
    results: z.array(result).max(3),
    booking: z.object({ due: time, result }).nullable(),
    clerkCall: call.nullable(),
  }).nullable(),
}).refine(({ clock, season, certified, archive, meet }) => {
  if (new Set(certified).size !== certified.length) return false;
  if (certified.includes("midnight") && certified.length < 2) return false;
  if (archive.some((entry, index) => entry.season > season || (index > 0 && entry.season >= archive[index - 1].season) || entry.points > 24 || (entry.certified && !certified.includes(entry.charter)))) return false;
  if (!meet) return true;
  const def = PROMOTER_CHARTERS[meet.charter];
  if (season < 1 || (archive[0] && archive[0].season >= season) || meet.guest.vehicleId !== def.vehicleId || meet.passes > def.passes || certified.length < def.priorCharters) return false;
  if (meet.clerkCall && certified.length === 0) return false;
  if (meet.booking && (meet.booking.due <= clock || meet.results.length === def.rounds.length || Object.values(meet.guest.parts).some(({ condition }) => condition === 0)
    || meet.booking.result.wear.some(({ slot, from }) => meet.guest.parts[slot]?.condition !== from))) return false;
  const slots = VEHICLE_BY_ID[meet.guest.vehicleId].slots;
  if (slots.some(({ slot, required }) => required && !Object.hasOwn(meet.guest.parts, slot))) return false;
  if (Object.entries(meet.guest.parts).some(([slot, { partId }]) => !slots.some((def) => def.slot === slot && def.accepts.includes(partId)))) return false;
  const rounds = meet.booking ? [...meet.results, meet.booking.result] : meet.results;
  return rounds.every(({ position, dnf, fieldSize, weakestSlot, wear, visitors, winningGap }) => {
    const finishers = [{ position, dnf }, ...visitors].filter((entrant) => !entrant.dnf);
    if (fieldSize !== 6 || new Set(visitors.map(({ id }) => id)).size !== visitors.length) return false;
    if (position > fieldSize || visitors.some((entrant) => entrant.position > fieldSize)) return false;
    if ((winningGap === null) !== (finishers.length < 2)) return false;
    if (new Set(finishers.map((entrant) => entrant.position)).size !== finishers.length || finishers.some((entrant) => entrant.position > finishers.length)) return false;
    return (!weakestSlot || Object.hasOwn(meet.guest.parts, weakestSlot)) && new Set(wear.map(({ slot }) => slot)).size === wear.length
      && wear.every(({ slot, from, to }) => Object.hasOwn(meet.guest.parts, slot) && to < from);
  });
}, "Invalid circuit calendar");
