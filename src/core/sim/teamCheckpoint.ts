import { Bot, SCHEDULES, type Schedule } from "./bot";
import type { GameState } from "../types";

/** Return the first unconfirmed founding offer reached by this actual garage. */
export function teamCheckpoint(game: GameState, schedule: Schedule = SCHEDULES.mixed, deadline = 150 * 86_400_000) {
  const bot = new Bot(game, "push");
  bot.holdAt = "team";
  bot.run(schedule, deadline);
  const reset = bot.heldReset;
  if (!reset || !("discipline" in reset.choices)) throw new Error(`Team founding unavailable for ${game.seed}`);
  return { state: bot.state, choices: reset.choices, elapsed: bot.totalMs };
}
