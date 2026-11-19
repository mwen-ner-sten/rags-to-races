import { z } from "zod";
import { COUNTY_RIVAL_IDS, countySpecMatches, localRival, type CountyProof } from "@/core/countyRivals";
import type { GameState, JobSpec } from "@/core/types";

const id = z.string().min(1);
const count = z.number().int().positive();
export const countyRivalSchema = z.enum(COUNTY_RIVAL_IDS);
export const countyMeetingSchema = z.object({ rival: countyRivalSchema, beaten: z.boolean(), rivalOut: z.boolean() });
const proof = z.object({ raceId: id, season: count, car: z.string(), position: count, beaten: z.boolean(), dnf: z.boolean(), rivalOut: z.boolean() });
export const countyContactsSchema = z.partialRecord(countyRivalSchema, z.object({ attempts: count, latest: proof, earned: proof.optional() }));

function won(proof: CountyProof): boolean { return proof.beaten && !proof.dnf && !proof.rivalOut; }

export function countyContactsValid(game: GameState): boolean {
  const meets = [...game.run.jobs.map(({ spec }) => spec), ...game.run.queue].filter((spec): spec is Extract<JobSpec, { kind: "race" }> => spec.kind === "race" && spec.countyMatch !== undefined);
  if (meets.length > 1 || meets.some((spec) => !countySpecMatches(game, spec, false))) return false;
  for (const job of game.run.jobs) {
    if (job.spec.kind === "race" && job.spec.countyMatch && (!job.race || !countySpecMatches(game, job.spec))) return false;
  }
  if (game.run.races.some((result) => result.countyMeeting && (result.venueId !== "backyard" || result.event !== "sprint" || result.countyMeeting.rival !== localRival(game) || (result.dnf && result.countyMeeting.beaten)))) return false;
  return COUNTY_RIVAL_IDS.every((id) => {
    const contact = game.countyRivals?.[id];
    if (!contact) return !game.run.races.some(({ countyMeeting }) => countyMeeting?.rival === id);
    const { latest, earned } = contact;
    if (latest.season > game.meta.seasonsPlayed + 1 || won(latest) !== !!earned || (latest.dnf && latest.beaten)) return false;
    if (earned && (latest.raceId !== earned.raceId || latest.season !== earned.season || latest.car !== earned.car || latest.position !== earned.position || !won(earned))) return false;
    const result = game.run.races.find(({ id: raceId }) => raceId === latest.raceId);
    return !result || (result.countyMeeting?.rival === id && result.countyMeeting.beaten === latest.beaten && result.countyMeeting.rivalOut === latest.rivalOut
      && result.position === latest.position && result.dnf === latest.dnf);
  });
}
