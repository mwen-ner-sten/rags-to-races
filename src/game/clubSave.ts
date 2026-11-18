import { z } from "zod";
import { CLUB_CHARTERS, CLUB_HISTORY_LIMIT, clubEntryPrice, clubGate, clubScore, clubSpecMatches, type ClubCharter, type ClubFinish } from "@/core/club";
import type { GameState, JobSpec } from "@/core/types";

const id = z.string().min(1);
const positive = z.number().int().positive();
export const clubCharterSchema = z.enum(Object.keys(CLUB_CHARTERS) as ClubCharter[]);
const admission = z.enum(["public", "ticketed"]);
export const clubRoundSchema = z.object({ token: id, admission });
const finish = z.object({ raceId: id, vehicle: z.string(), admission, position: positive, fieldSize: positive, dnf: z.boolean() });
const season = z.object({ season: positive, charter: clubCharterSchema, rounds: z.array(finish).max(4) });

export const clubSchema = z.object({
  active: season.nullable(),
  history: z.array(season.extend({ status: z.enum(["certified", "finished", "retired"]) })).max(CLUB_HISTORY_LIMIT),
});

function roundsValid(rounds: ClubFinish[]): boolean {
  return new Set(rounds.map(({ raceId }) => raceId)).size === rounds.length && rounds.every(({ position, fieldSize }) => position <= fieldSize);
}

export function clubReferencesValid(state: GameState): boolean {
  const { club } = state;
  const entries = [...state.run.queue, ...state.run.jobs.map(({ spec }) => spec)].filter(
    (spec): spec is Extract<JobSpec, { kind: "race" }> => spec.kind === "race" && spec.clubRound !== undefined,
  );
  if (!club) return state.config.club === undefined && entries.length === 0;
  const { active } = club;
  if (clubGate(state) || active?.charter !== state.config.club || entries.length > 1) return false;
  if (active && active.season !== state.meta.seasonsPlayed + 1) return false;
  if (!entries.every((spec) => clubSpecMatches(state, spec))) return false;
  const booking = state.run.jobs.find(({ spec }) => spec.kind === "race" && spec.clubRound);
  if (booking?.spec.kind === "race" && booking.spec.clubRound) {
    const stop = active && CLUB_CHARTERS[active.charter].stops[active.rounds.length];
    if (!stop || !booking.race || booking.paid?.cash !== clubEntryPrice(stop, booking.spec.clubRound.admission)) return false;
  }
  if (active && (!roundsValid(active.rounds) || !active.rounds.every((finish, index) => {
    const result = state.run.races.find(({ id }) => id === finish.raceId);
    if (!result) return true; // Older results can age out of the race history before the season ends.
    const stop = CLUB_CHARTERS[active.charter].stops[index];
    return result.venueId === stop.venueId && result.event === stop.event && result.position === finish.position && result.fieldSize === finish.fieldSize && result.dnf === finish.dnf;
  }))) return false;
  return club.history.every((record, index) => {
    if (record.season > state.meta.seasonsPlayed || (index > 0 && record.season >= club.history[index - 1].season) || !roundsValid(record.rounds)) return false;
    const report = clubScore(record);
    return record.status === (report.certified ? "certified" : report.complete ? "finished" : "retired");
  });
}
