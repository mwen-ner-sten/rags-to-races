import { z } from "zod";
import { CLUB_CHARTERS, CLUB_HISTORY_LIMIT, clubEntryPrice, clubGate, clubScore, clubSpecMatches, type ClubCharter, type ClubFinish } from "@/core/club";
import { CLUB_COURSES, clubLoanOrigin, type ClubCourseId } from "@/core/clubTrack";
import type { GameState, JobSpec } from "@/core/types";

const id = z.string().min(1);
const positive = z.number().int().positive();
export const clubCharterSchema = z.enum(Object.keys(CLUB_CHARTERS) as ClubCharter[]);
const courses = Object.keys(CLUB_COURSES) as ClubCourseId[];
export const clubCourseSchema = z.enum(courses);
const admission = z.enum(["public", "ticketed"]);
export const clubRoundSchema = z.object({ token: id, admission });
const finish = z.object({ raceId: id, vehicle: z.string(), admission, position: positive, fieldSize: positive, dnf: z.boolean(), call: z.enum(["push", "nurse"]).optional() });
const season = z.object({ season: positive, charter: clubCharterSchema, rounds: z.array(finish).max(4), course: clubCourseSchema.optional() });

export const clubSchema = z.object({
  active: season.nullable(),
  history: z.array(season.extend({ status: z.enum(["certified", "finished", "retired"]) })).max(CLUB_HISTORY_LIMIT),
  hasCertifiedClub: z.literal(true).optional(),
  trackLicenses: z.array(clubCourseSchema).max(courses.length).optional(),
});

function roundsValid(rounds: ClubFinish[], course?: ClubCourseId): boolean {
  return new Set(rounds.map(({ raceId }) => raceId)).size === rounds.length && rounds.every(({ position, fieldSize, call }) => position <= fieldSize && !!call === !!course);
}

export function clubReferencesValid(state: GameState): boolean {
  const { club } = state;
  const entries = [...state.run.queue, ...state.run.jobs.map(({ spec }) => spec)].filter(
    (spec): spec is Extract<JobSpec, { kind: "race" }> => spec.kind === "race" && spec.clubRound !== undefined,
  );
  const { clubCourse, clubLoan } = state.config;
  const loanOrigins = courses.map(clubLoanOrigin);
  const loans = [...state.run.inventory, ...state.run.driveway, ...state.run.vehicles.flatMap((vehicle) => Object.values(vehicle.parts))]
    .filter((part) => part && loanOrigins.includes(part.origin));
  if (!club) return state.config.club === undefined && !clubCourse && !clubLoan && entries.length === 0 && !loans.length && !state.run.races.some(({ course }) => course);
  const { active } = club;
  if (clubGate(state) || active?.charter !== state.config.club || entries.length > 1) return false;
  if (active && active.season !== state.meta.seasonsPlayed + 1) return false;
  if (active?.course !== clubCourse || (clubLoan && (!active || !club.trackLicenses?.includes(clubLoan)))) return false;
  if (new Set(club.trackLicenses).size !== (club.trackLicenses?.length ?? 0) || (club.trackLicenses?.length && !club.hasCertifiedClub)) return false;
  if (clubCourse && !club.hasCertifiedClub && !club.history.some(({ status }) => status === "certified")) return false;
  if (loans.length > 1 || loans.some((part) => !clubLoan || part!.origin !== clubLoanOrigin(clubLoan) || part!.partId !== CLUB_COURSES[clubLoan].loanPart || part!.inherited)) return false;
  if (!entries.every((spec) => clubSpecMatches(state, spec))) return false;
  const booking = state.run.jobs.find(({ spec }) => spec.kind === "race" && spec.clubRound);
  if (booking?.spec.kind === "race" && booking.spec.clubRound) {
    const stop = active && CLUB_CHARTERS[active.charter].stops[active.rounds.length];
    if (!stop || !booking.race || booking.race.course !== clubCourse || booking.paid?.cash !== clubEntryPrice(stop, booking.spec.clubRound.admission, clubCourse)) return false;
  }
  if (state.run.races.some((result) => result.course && (result.course !== clubCourse || !active?.rounds.some(({ raceId }) => raceId === result.id)))) return false;
  if (active && (!roundsValid(active.rounds, active.course) || !active.rounds.every((finish, index) => {
    const result = state.run.races.find(({ id }) => id === finish.raceId);
    if (!result) return true; // Older results can age out of the race history before the season ends.
    const stop = CLUB_CHARTERS[active.charter].stops[index];
    return result.venueId === stop.venueId && result.event === stop.event && result.position === finish.position && result.fieldSize === finish.fieldSize && result.dnf === finish.dnf
      && result.course === active.course && (!finish.call || finish.call === result.call);
  }))) return false;
  return club.history.every((record, index) => {
    if (record.season > state.meta.seasonsPlayed || (index > 0 && record.season >= club.history[index - 1].season) || !roundsValid(record.rounds, record.course)) return false;
    const report = clubScore(record);
    return (!report.trackCertified || (!!record.course && !!club.trackLicenses?.includes(record.course)))
      && record.status === (report.certified ? "certified" : report.complete ? "finished" : "retired");
  });
}
