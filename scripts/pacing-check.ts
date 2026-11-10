/**
 * Pacing goals for Era 1, checked against the sim bot. Exits non-zero when a goal fails.
 *   npx tsx scripts/pacing-check.ts [seeds=6]
 *
 * Goals (docs/design/era-1-and-team.md §5.6):
 * - Daily (1×5 min): Season 1 finishes within 21 days on every seed, and stays slow (median ≥ 12 days).
 * - Mixed (4×15 min): Season 1 median between 6.5 and 9 days; no seed outside 5.5–10.
 * - Active (6×30 min): Season 1 median ≥ 3.5 days, so heavy play doesn't trivialise it.
 * - Push (mixed): a team is founded within 45 days on at least half the seeds.
 * - Economy: Season 1 averages ≤ 400 hauls a day on every schedule (no runaway away loops).
 */
import { createGame } from "../src/core";
import { Bot, SCHEDULES, type RunPolicy } from "../src/core/sim/bot";

const DAY = 24 * 3_600_000;
const seeds = Number(process.argv[2] ?? "6");

interface Season1 {
  days: number | null;
  haulsPerDay: number;
  cash: number;
}

function season1(schedule: string, policy: RunPolicy, seed: number, maxDays: number): Season1 {
  const bot = new Bot(createGame(`pace-${seed}`), policy);
  const done = () => bot.seasonLog.length > 0;
  for (let d = 1; d <= maxDays && !done(); d++) bot.run(SCHEDULES[schedule], d * DAY);
  const first = bot.seasonLog[0];
  if (!first) {
    const days = bot.state.run.seasonMs / DAY;
    return { days: null, haulsPerDay: bot.state.run.stats.hauls / days, cash: bot.state.run.cash };
  }
  return { days: first.ms / DAY, haulsPerDay: first.hauls / (first.ms / DAY), cash: first.cash };
}

function teamDay(seed: number): number | null {
  const bot = new Bot(createGame(`pace-${seed}`), "push");
  bot.run(SCHEDULES.mixed, 45 * DAY, 20);
  const ms = bot.log.team_founded;
  return ms === undefined ? null : ms / DAY;
}

const median = (xs: number[]) => {
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
};
const fmt = (d: number | null) => (d === null ? "  —  " : d.toFixed(1).padStart(5));

const results: { goal: string; pass: boolean; detail: string }[] = [];
const runs: Record<string, Season1[]> = {};
for (const [schedule, maxDays] of [["daily", 30], ["mixed", 20], ["active", 15]] as const) {
  runs[schedule] = Array.from({ length: seeds }, (_, i) => season1(schedule, "sprint", i, maxDays));
  const r = runs[schedule];
  console.log(`${schedule.padEnd(7)} days ${r.map((x) => fmt(x.days)).join(" ")} · hauls/day ${r.map((x) => Math.round(x.haulsPerDay)).join(",")} · cash ${r.map((x) => x.cash).join(",")}`);
}

const days = (s: string) => runs[s].map((x) => x.days ?? Infinity);
const daily = days("daily");
results.push({ goal: "daily ≤ 21d every seed", pass: daily.every((d) => d <= 21), detail: `max ${fmt(Math.max(...daily))}` });
results.push({ goal: "daily median ≥ 12d", pass: median(daily) >= 12, detail: `median ${fmt(median(daily))}` });
const mixed = days("mixed");
results.push({ goal: "mixed median 6.5–9d", pass: median(mixed) >= 6.5 && median(mixed) <= 9, detail: `median ${fmt(median(mixed))}` });
results.push({ goal: "mixed every seed 5.5–10d", pass: mixed.every((d) => d >= 5.5 && d <= 10), detail: `range ${fmt(Math.min(...mixed))}–${fmt(Math.max(...mixed))}` });
const active = days("active");
results.push({ goal: "active median ≥ 3.5d", pass: median(active) >= 3.5, detail: `median ${fmt(median(active))}` });
const hauls = Object.values(runs).flat().map((x) => x.haulsPerDay);
results.push({ goal: "≤ 400 hauls/day", pass: hauls.every((h) => h <= 400), detail: `max ${Math.round(Math.max(...hauls))}` });
const teams = Array.from({ length: Math.min(seeds, 4) }, (_, i) => teamDay(i));
results.push({ goal: "push team ≤ 45d on half", pass: teams.filter((t) => t !== null).length * 2 >= teams.length, detail: `days ${teams.map(fmt).join(" ")}` });

console.log("");
for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.goal.padEnd(28)} ${r.detail}`);
process.exit(results.every((r) => r.pass) ? 0 : 1);
