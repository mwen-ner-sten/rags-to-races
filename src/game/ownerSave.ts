import { z } from "zod";
import { PART_BY_ID } from "@/core/content/parts";
import { OWNER_CHARTERS, OWNER_HISTORY_LIMIT, ROOKIE_KART_START_LIMIT, SPONSOR_IDS, ownerCharterBlocker, ownerClassBlocker, ownerDrivenRound, ownerRecords, reverseTourUnlocked, tourCalendar, tourRoundToken, tourScore } from "@/core/ownership";
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
  planned: z.literal(true).optional(),
  ownerDriven: z.literal(true).optional(),
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
  sponsorCar: z.object({ uid: id, name: z.string(), startsAtSigning: count.max(ROOKIE_KART_START_LIMIT) }).optional(),
  itinerary: z.enum(["reverse", "endurance"]).optional(),
  entryPlan: z.object({
    leadUid: id, reserveUid: id.optional(), call: z.enum(["push", "nurse"]), cashFloor: count, enabled: z.boolean(),
  }).refine((plan) => plan.leadUid !== plan.reserveUid).optional(),
}).refine((value) => {
  const complete = value.rounds.length === tourCalendar(value).length;
  if (value.status !== "active" && value.entryPlan?.enabled) return false;
  if ((value.sponsor === "rookie_kart") !== !!value.sponsorCar) return false;
  if ((value.sponsor === "rookie_kart" || value.sponsor === "owner_driver") && value.charter !== "privateer") return false;
  if (value.sponsor === "owner_driver" && value.itinerary === "endurance") return false;
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
  const races = [...game.run.queue, ...game.run.jobs.map((job) => job.spec)].filter(
    (spec): spec is Extract<JobSpec, { kind: "race" }> => spec.kind === "race",
  );
  if (races.some((spec) => (spec.tourReserve !== undefined || spec.ownerDrive) && spec.tourRound === undefined)) return false;
  const entries = races.filter((spec) => spec.tourRound !== undefined);
  const tour = game.owner?.tour;
  if (game.owner && !game.era) return false;
  if (game.owner && [game.owner.tour, ...game.owner.history].some((past) => ownerCharterBlocker(game, past.charter))) return false;
  if (tour?.status !== "active") return entries.length === 0;
  if (tour.discipline !== game.era?.discipline || entries.length > 1) return false;
  if (tour.entryPlan && !reverseTourUnlocked(game, tour.charter)) return false;
  const entry = entries[0];
  if (!entry) return true;
  if (Boolean(entry.ownerDrive) !== ownerDrivenRound(tour) || (entry.ownerDrive && entry.call2)) return false;
  const racing = game.run.jobs.find((job) => job.spec === entry);
  if (entry.ownerDrive && racing && (racing.lane !== "hands" || racing.race?.crewIds?.length !== 0)) return false;
  if (entry.tourReserve !== undefined) {
    const plan = tour.entryPlan;
    if (!plan) return false;
    if (game.run.queue.includes(entry) && (!plan.enabled || entry.tourReserve !== plan.cashFloor
      || entry.call !== plan.call || (entry.vehicleUid !== plan.leadUid && entry.vehicleUid !== plan.reserveUid))) return false;
  }
  const stop = tourCalendar(tour)[tour.rounds.length];
  const car = game.run.vehicles.find((vehicle) => vehicle.uid === entry.vehicleUid);
  return !!car && !ownerClassBlocker(tour, car)
    && entry.tourRound === tourRoundToken(tour) && entry.venueId === stop.venueId && entry.event === stop.event;
}
