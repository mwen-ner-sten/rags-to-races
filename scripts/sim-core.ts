/**
 * Pacing simulator for the rebuilt core.
 *   npx tsx scripts/sim-core.ts [schedule=mixed] [days=30] [policy=sprint] [seeds=3]
 */
import { createGame } from "../src/core";
import { Bot, SCHEDULES, type RunPolicy } from "../src/core/sim/bot";

const [scheduleName = "mixed", daysArg = "30", policyArg = "sprint", seedsArg = "3"] = process.argv.slice(2);
const schedule = SCHEDULES[scheduleName];
const days = Number(daysArg);
const DAY = 24 * 3_600_000;

for (let i = 0; i < Number(seedsArg); i++) {
  const bot = new Bot(createGame(`sim-${i}`), policyArg as RunPolicy);
  bot.run(schedule, days * DAY);
  const fmt = (ms: number) => `${(ms / DAY).toFixed(2)}d`;
  console.log(`\n=== seed sim-${i} · ${schedule.name} · ${policyArg} ===`);
  const entries = Object.entries(bot.log).sort((a, b) => a[1] - b[1]);
  for (const [key, ms] of entries) if (key.startsWith("s1:") || key.includes("feature:county_fair") || key.includes("feature:state")) console.log(`  ${key.padEnd(34)} ${fmt(ms)}`);
  for (const season of bot.seasonLog) console.log(`  season ${season.season}: ${fmt(season.ms)} · ${season.lp} LP · ${season.venues.join(",")}`);
  const s = bot.state;
  console.log(`  now: season ${s.meta.seasonsPlayed + 1}, ${fmt(s.run.seasonMs)} in · cash ${s.run.cash} · rep ${s.run.rep} · venues ${s.run.venuesOpen.join(",")} · vehicles ${s.run.vehicles.map((v) => v.vehicleId).join(",")}`);
  console.log(`  learned: ${s.run.learned.join(", ")}`);
  console.log(`  habits: ${s.run.habitsKnown.join(", ")} · slots ${JSON.stringify(s.run.habitSlots)}`);
  console.log(`  era: ${s.era ? `${s.era.teamName} ${s.era.discipline} crew=${s.era.crew.map((c) => c.id).join(",")}` : "none"} · TP ${s.team.tp} · LP ${s.scrap.lp}`);
}
