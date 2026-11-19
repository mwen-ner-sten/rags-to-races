/** Pair the same earned pre-Team checkpoint across counties and visit lengths. Run with npx tsx scripts/county-forks.ts [seeds=3]. */
import { createGame, must } from "../src/core";
import { countyPassport, HOME_COUNTY_IDS } from "../src/core/counties";
import { Bot, SCHEDULES, type RunPolicy } from "../src/core/sim/bot";
import { decodeGameState } from "../src/game/save";

const DAY = 86_400_000;
const seeds = Number(process.argv[2] ?? 3);
if (!Number.isInteger(seeds) || seeds < 1) throw new Error("Choose a positive seed count.");

function readyCheckpoint(seed: string) {
  let state = createGame(seed);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const bot = new Bot(state);
    bot.holdAt = "scrap";
    bot.run(SCHEDULES.mixed, 45 * DAY);
    if (!bot.heldReset) throw new Error(`Fair checkpoint unavailable on ${seed}`);
    if (countyPassport(bot.state).earned) return { state: bot.state, choices: bot.heldReset.choices };
    state = must(bot.state, bot.heldReset);
  }
  throw new Error(`No earned county passport after four Seasons on ${seed}`);
}

const day = (time: number | undefined) => time === undefined ? null : Number((time / DAY).toFixed(2));
for (let i = 0; i < seeds; i += 1) {
  const seed = `pace-${i}`;
  const checkpoint = readyCheckpoint(seed);
  for (const plan of ["sprint", "push"] as RunPolicy[]) {
    for (const county of HOME_COUNTY_IDS) {
      const start = must(checkpoint.state, { type: "reset", layer: "scrap", choices: { ...checkpoint.choices, homeCounty: county, dare: null } });
      const bot = new Bot(start, plan);
      bot.holdAt = plan === "sprint" ? "scrap" : "team";
      bot.run(SCHEDULES.mixed, (plan === "sprint" ? 30 : 75) * DAY);
      if (!decodeGameState(bot.state)) throw new Error(`Save failed on ${seed} ${county} ${plan}`);
      const season = start.meta.seasonsPlayed + 1;
      const visits = Object.fromEntries(Object.entries(bot.state.meta.codex.places)
        .map(([id, count]) => [id, count - (start.meta.codex.places[id] ?? 0)] as const).filter(([, count]) => count > 0));
      const builds = [...bot.state.run.vehicles.map((car) => ({ model: car.vehicleId, parts: Object.values(car.parts) })),
        ...bot.state.meta.hallOfFame.filter((car) => car.season >= season).map((car) => ({ model: car.vehicleId, parts: car.parts }))];
      const nativeFits = builds.flatMap((build) => build.parts.filter((part) => part?.partId === "wheel_river" || part?.partId === "engine_quarry")
        .map((part) => `${build.model}:${part!.partId}`));
      console.log(JSON.stringify({ seed, checkpointSeason: season - 1, county, plan,
        fairDays: day(bot.log[`s${season}:feature:county_fair`]), firstRegionalDays: day(bot.log[`s${season}:feature:regional`]),
        stateDays: day(bot.log[`s${bot.state.meta.seasonsPlayed + 1}:feature:state`]),
        finishDays: bot.heldReset ? day(bot.totalMs) : null, trips: visits,
        nativeTires: bot.state.meta.codex.parts.wheel_river ?? 0, nativeEngines: bot.state.meta.codex.parts.engine_quarry ?? 0, nativeFits,
        errors: bot.errors }));
    }
  }
}
