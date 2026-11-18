/** Compare six Team reset choices from copies of the same naturally earned garage.
 * npx tsx scripts/career-forks.ts [seed-count] [output-directory] [daily|mixed|active]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createGame, must } from "../src/core";
import type { TeamChoices } from "../src/core/layers";
import { Bot, SCHEDULES } from "../src/core/sim/bot";
import type { GameState } from "../src/core/types";
import { decodeGameState } from "../src/game/save";

const DAY = 86_400_000;
const seeds = Number(process.argv[2] ?? 4);
const directory = process.argv[3] ?? "test-results/career-forks";
const schedule = SCHEDULES[process.argv[4] ?? "mixed"];
if (!schedule || !Number.isInteger(seeds) || seeds < 1) throw new Error("Choose a positive seed count and a supported schedule.");
mkdirSync(directory, { recursive: true });

function teamCheckpoint(game: GameState) {
  const bot = new Bot(game, "push");
  bot.holdAt = "team";
  bot.run(SCHEDULES.mixed, 150 * DAY);
  const reset = bot.heldReset;
  if (!reset || !("discipline" in reset.choices)) throw new Error(`Team founding unavailable for ${game.seed}`);
  return { state: bot.state, choices: reset.choices, elapsed: bot.totalMs };
}

const rows = [];
for (let i = 0; i < seeds; i++) {
  const seed = `career-fork-${i}`;
  const first = teamCheckpoint(createGame(seed));
  const team = must(first.state, { type: "reset", layer: "team", choices: first.choices });
  const experienced = teamCheckpoint(team);
  if (!decodeGameState(experienced.state)) throw new Error(`Invalid shared checkpoint: ${seed}`);
  if (i === 0) {
    const file = join(directory, "choose-your-team.txt");
    writeFileSync(file, Buffer.from(JSON.stringify({ game: experienced.state, savedAt: Date.now() })).toString("base64"));
  }
  for (const discipline of ["dirt", "drag", "rally"] as const) {
    for (const organization of ["independent", "collective"] as const) {
      const choices: TeamChoices = { ...experienced.choices, discipline, organization };
      const start = must(experienced.state, { type: "reset", layer: "team", choices });
      const bot = new Bot(start, "sprint", discipline);
      bot.holdAt = "scrap";
      bot.run(schedule, 40 * DAY);
      if (!decodeGameState(bot.state)) throw new Error(`Invalid ${discipline} ${organization} finish on ${seed}`);
      rows.push({ seed, discipline, organization, foundingDays: first.elapsed / DAY, returnDays: experienced.elapsed / DAY,
        firstBuildDay: bot.log[`s${start.meta.seasonsPlayed + 1}:build:push_mower`] / DAY || null,
        fairDay: bot.heldReset ? bot.state.run.featureWins.county_fair / DAY : null, hauls: bot.state.run.stats.hauls,
        cash: bot.state.run.cash, crew: bot.state.era?.crew.map((member) => member.id) ?? [],
        finishes: bot.state.run.races.length, errors: bot.errors });
    }
  }
  writeFileSync(join(directory, "results.json"), JSON.stringify(rows, null, 2));
  console.log(`${seed} · founded after ${(first.elapsed / DAY).toFixed(1)} days · ${rows.length} measured careers`);
}
