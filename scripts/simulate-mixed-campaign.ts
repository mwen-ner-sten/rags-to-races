/**
 * Pacing probe: wall-clock days to the first Scrap Reset for a real player.
 *
 * Mixed play: 4 sessions a day (08:00, 12:30, 18:00, 22:00), each up to 15 min
 * of greedy decisions through the real store, with the app's offline catch-up
 * between sessions. Pure idle: one 5-minute session a day.
 *
 * Run with: npm run sim:mixed            (both profiles)
 *           npm run sim:mixed -- idle    (one profile: mixed | idle)
 *           npm run sim:mixed -- mixed <seed>
 */
import {
  MIXED_PLAY_DEFAULTS,
  PURE_IDLE_DEFAULTS,
  runMixedCampaign,
  type DayReport,
  type MixedCampaignOptions,
  type MixedCampaignResult,
} from "../src/testing/mixedCampaign";

const profileArg = process.argv[2] ?? "both";
const seedArg = process.argv[3];

function printDay(day: DayReport): void {
  const reached = day.venue ? `${day.venue}:${day.event}` : "-";
  console.log(
    `  day ${String(day.day).padStart(2)} | cash ${String(day.cash).padStart(7)} | rep ${String(day.rep).padStart(5)} / ${String(day.lifetimeRep).padStart(5)} lifetime`
    + ` | reached ${reached.padEnd(26)} | projects ${day.projectsDone} done ${day.projectsRunning} running`
    + ` | races ${day.races} wins ${day.wins} rivals ${day.rivals} | fatigue ${day.fatigue} | LP ${day.lpProjection} | garage ${day.garage.join(",")}`,
  );
}

function run(label: string, options: MixedCampaignOptions): MixedCampaignResult {
  const started = Date.now();
  const result = runMixedCampaign(options);
  console.log(`\n${label} (seed ${options.seed}, ${options.sessionHours.length} session(s)/day x ${options.sessionMinutes} min)`);
  for (const day of result.days) printDay(day);
  console.log(result.reachedReset
    ? `  first Scrap Reset after ${result.wallDays} wall days (${result.wallHours} h), ${result.sessions} sessions, ${result.handsOnMinutes} hands-on min, ${result.manualRaces} manual races, ${result.manualScavenges} manual scavenges, LP ${result.lpProjection}`
    : `  no Scrap Reset within ${options.maxDays} days: progress ${JSON.stringify(result.finalProgress)}`);
  console.log(`  (${((Date.now() - started) / 1000).toFixed(1)} s to simulate)`);
  return result;
}

const results: Record<string, MixedCampaignResult> = {};
if (profileArg === "mixed" || profileArg === "both") {
  results.mixed = run("Mixed play", { ...MIXED_PLAY_DEFAULTS, seed: seedArg ?? MIXED_PLAY_DEFAULTS.seed });
}
if (profileArg === "idle" || profileArg === "both") {
  results.idle = run("Pure idle", { ...PURE_IDLE_DEFAULTS, seed: seedArg ?? PURE_IDLE_DEFAULTS.seed });
}
console.log(`\nWALL_DAYS ${JSON.stringify(Object.fromEntries(Object.entries(results).map(([key, value]) => [key, value.wallDays])))}`);
