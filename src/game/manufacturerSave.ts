import { z } from "zod";
import { WORKS_FAMILIES, WORKS_FAMILY_IDS, WORKS_HISTORY_LIMIT, WORKS_MAX_ATTEMPTS, trialEntry, worksOutcome, worksReport, worksSpecMatches, type WorksDeal } from "@/core/manufacturer";
import type { GameState, JobSpec } from "@/core/types";

const id = z.string().min(1);
const nonnegative = z.number().int().nonnegative();
const positive = nonnegative.positive();
export const worksFamilySchema = z.enum(WORKS_FAMILY_IDS);
const attempt = z.object({ raceId: id, step: nonnegative.max(1), spent: nonnegative, position: positive, dnf: z.boolean(), wear: nonnegative, passed: z.boolean() });
const deal = z.object({ id, season: positive, family: worksFamilySchema, vehicleUid: id, engineUid: id, article: z.string(), attempts: z.array(attempt).max(WORKS_MAX_ATTEMPTS) });

export const manufacturerSchema = z.object({
  invites: z.array(worksFamilySchema).max(WORKS_FAMILY_IDS.length),
  drawings: z.array(worksFamilySchema).max(WORKS_FAMILY_IDS.length),
  active: deal.nullable(),
  history: z.array(deal.extend({ status: z.enum(["homologated", "failed", "retired"]) })).max(WORKS_HISTORY_LIMIT),
  usedDrawingSeason: positive.optional(),
});

function validAttempts(entry: WorksDeal): boolean {
  const family = WORKS_FAMILIES[entry.family];
  const raceIds = new Set(entry.attempts.map(({ raceId }) => raceId));
  if (raceIds.size !== entry.attempts.length) return false;
  let step = 0;
  let spent = 0;
  for (const attempt of entry.attempts) {
    const test = family.tests[step];
    if (!test || attempt.step !== step || attempt.spent !== trialEntry(test) || attempt.passed !== worksOutcome(test, attempt)) return false;
    spent += attempt.spent;
    if (spent > family.budget) return false;
    if (attempt.passed) step += 1;
  }
  return true;
}

export function manufacturerReferencesValid(state: GameState): boolean {
  const { manufacturer: works } = state;
  const entries = [...state.run.queue, ...state.run.jobs.map(({ spec }) => spec)].filter(
    (spec): spec is Extract<JobSpec, { kind: "race" }> => spec.kind === "race" && spec.worksRound !== undefined,
  );
  const sources = WORKS_FAMILY_IDS.map((id) => `${WORKS_FAMILIES[id].name} drawing`);
  const products = [...state.run.inventory, ...state.run.driveway, ...state.run.vehicles.flatMap(({ parts }) => Object.values(parts))]
    .filter((part) => part && sources.includes(part.origin));
  const plan = state.config.worksPlan;
  if (!works) return !plan && !entries.length && !products.length;
  if (!works.invites.length || new Set(works.invites).size !== works.invites.length || new Set(works.drawings).size !== works.drawings.length
    || works.drawings.some((id) => !works.invites.includes(id))) return false;
  if (plan && !works.drawings.includes(plan)) return false;
  const season = state.meta.seasonsPlayed + 1;
  if (works.usedDrawingSeason && (works.usedDrawingSeason > season || (works.usedDrawingSeason === season && !plan))) return false;
  if (products.length && (!plan || works.usedDrawingSeason !== season || products.length > 1 || products.some((part) => part!.inherited
    || part!.partId !== WORKS_FAMILIES[plan].drawing.output || part!.origin !== `${WORKS_FAMILIES[plan].name} drawing`))) return false;
  if (entries.length > 1 || entries.some((spec) => !worksSpecMatches(state, spec, undefined, false))) return false;
  const deals = works.active ? [works.active, ...works.history] : works.history;
  if (new Set(deals.map(({ id }) => id)).size !== deals.length || deals.some((entry) => entry.season > season || !works.invites.includes(entry.family) || !validAttempts(entry))) return false;
  const { active } = works;
  if (active) {
    const report = worksReport(active);
    if (active.season !== season || (report.homologated && !works.drawings.includes(active.family))) return false;
    const job = state.run.jobs.find(({ spec }) => spec.kind === "race" && spec.worksRound);
    if (job?.spec.kind === "race" && (!worksSpecMatches(state, job.spec) || !job.race || !report.next || job.paid?.cash !== trialEntry(report.next))) return false;
    if (!active.attempts.every((attempt) => {
      const result = state.run.races.find(({ id }) => id === attempt.raceId);
      if (!result) return true; // The recent race list can drop older trials.
      const test = WORKS_FAMILIES[active.family].tests[attempt.step];
      return result.vehicleUid === active.vehicleUid && result.event === test.event && result.venueId === test.venue && result.call === test.call
        && result.position === attempt.position && result.dnf === attempt.dnf && result.wear.reduce((n, wear) => n + wear.from - wear.to, 0) === attempt.wear;
    })) return false;
  }
  return works.history.every((entry, index) => {
    if (index > 0 && entry.season > works.history[index - 1].season) return false;
    const report = worksReport(entry);
    return entry.status === (report.homologated ? "homologated" : report.failed ? "failed" : "retired")
      && (!report.homologated || works.drawings.includes(entry.family));
  });
}
