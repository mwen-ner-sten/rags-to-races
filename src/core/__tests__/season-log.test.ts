import { expect, it } from "vitest";
import { decodeGameState } from "../../game/save";
import { apply, createGame, must } from "../index";

it("records the actual ending Season across Scrap and Team resets and decodes the comparison", () => {
  const game = createGame("season-comparison");
  const empty = structuredClone(game.config);
  const built = { ...empty, tuneUp: { ...empty.tuneUp, build: 3 } };
  expect(apply(game, { type: "reset", layer: "scrap", choices: empty }).error).toBeTruthy();
  expect(game.meta.seasonLog).toBeUndefined();
  game.run.seasonMs = 100_000;
  game.run.featureWins.county_fair = 93_000;
  game.run.stats.hauls = 28;
  const second = must(game, { type: "reset", layer: "scrap", choices: built });
  second.run.seasonMs = 120_000;
  second.run.featureWins.county_fair = 85_000;
  second.meta.stateWonEver = true;
  const third = must(second, { type: "reset", layer: "team", choices: { ...empty, discipline: "drag", teamName: "North Garage", colors: ["#222222", "#ccbbaa"] } });
  const log = decodeGameState(third)?.meta.seasonLog;
  expect(log).toHaveLength(2);
  expect(log?.[0]).toMatchObject({ season: 1, endedBy: "scrap", hauls: 28, setup: empty, featureWins: { county_fair: 93_000 } });
  expect(log?.[1]).toMatchObject({ season: 2, endedBy: "team", discipline: "dirt", setup: built, featureWins: { county_fair: 85_000 } });
  expect(third.era?.discipline).toBe("drag");
  third.meta.seasonLog![0].season = 2;
  expect(decodeGameState(third)).toBeNull();
});
