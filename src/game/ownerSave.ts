import { z } from "zod";
import { PART_BY_ID } from "@/core/content/parts";
import { OWNER_CHARTERS, OWNER_HISTORY_LIMIT, SPONSOR_IDS, ownerCharterBlocker, ownerClassBlocker, ownerRecords, tourCalendar, tourRoundToken, tourScore } from "@/core/ownership";
import type { GameState, JobSpec } from "@/core/types";

const id = z.string().min(1);
const count = z.number().int().nonnegative();
const charter = z.enum(OWNER_CHARTERS);
const finish = z.object({
  raceId: id,
  vehicleUid: id,
  carName: z.string(),
  position: count.positive(),
  dnf: z.boolean(),
  finance: z.object({ entry: count, prize: count }).optional(),
  setup: z.object({
    engine: id.refine((part) => PART_BY_ID[part]?.category === "engine").optional(),
    tires: id.refine((part) => PART_BY_ID[part]?.category === "wheel").optional(),
    tune: z.enum(["balanced", "power", "reliable"]),
    call: z.enum(["push", "nurse"]),
  }).optional(),
});

const tour = z.object({
  id,
  charter,
  discipline: z.enum(["dirt", "drag", "rally"]),
  rounds: z.array(finish.nullable()).max(5),
  status: z.enum(["active", "champion", "finished", "retired"]),
  sponsor: z.enum(SPONSOR_IDS).optional(),
  itinerary: z.enum(["reverse", "endurance"]).optional(),
}).refine((value) => {
  const complete = value.rounds.length === tourCalendar(value).length;
  if (value.status === "active" || value.status === "retired") return !complete;
  return complete && tourScore(value).champion === (value.status === "champion");
}, "Tour status does not agree with its results");

export const ownerSchema = z.object({
  tour,
  history: z.array(tour).max(OWNER_HISTORY_LIMIT),
  titles: count,
  charterTitles: z.object({ privateer: count, club: count, works: count, county_to_state: count.default(0) }),
  records: z.object({
    dirt: z.partialRecord(charter, z.object({ points: count.max(48), titles: count })),
    rally: z.partialRecord(charter, z.object({ points: count.max(48), titles: count })).default({}),
    drag: z.partialRecord(charter, z.object({ points: count.max(48), titles: count })),
  }).optional(),
}).refine((value) => {
  if (value.history.some((past) => past.status === "active")) return false;
  if (value.titles !== Object.values(value.charterTitles).reduce((total, titles) => total + titles, 0)) return false;
  const tours = [value.tour, ...value.history];
  if (new Set(tours.map((season) => season.id)).size !== tours.length) return false;
  const raceIds = tours.flatMap((season) => season.rounds.flatMap((finish) => finish ? [finish.raceId] : []));
  if (new Set(raceIds).size !== raceIds.length) return false;
  const records = ownerRecords(value);
  return OWNER_CHARTERS.every((charterId) =>
    tours.filter((result) => result.charter === charterId && result.status === "champion").length <= value.charterTitles[charterId]
    && (records.dirt[charterId]?.titles ?? 0) + (records.drag[charterId]?.titles ?? 0) + (records.rally[charterId]?.titles ?? 0) <= value.charterTitles[charterId],
  );
}, "Invalid championship history");

export function ownerReferencesValid(game: GameState): boolean {
  const entries = [...game.run.queue, ...game.run.jobs.map((job) => job.spec)].filter(
    (spec): spec is Extract<JobSpec, { kind: "race" }> => spec.kind === "race" && spec.tourRound !== undefined,
  );
  const tour = game.owner?.tour;
  if (game.owner && !game.era) return false;
  if (game.owner && [game.owner.tour, ...game.owner.history].some((past) => ownerCharterBlocker(game, past.charter))) return false;
  if (tour?.status !== "active") return entries.length === 0;
  if (tour.discipline !== game.era?.discipline || entries.length > 1) return false;
  const entry = entries[0];
  if (!entry) return true;
  const stop = tourCalendar(tour)[tour.rounds.length];
  const car = game.run.vehicles.find((vehicle) => vehicle.uid === entry.vehicleUid);
  return !!car && !ownerClassBlocker(tour, car)
    && entry.tourRound === tourRoundToken(tour) && entry.venueId === stop.venueId && entry.event === stop.event;
}
