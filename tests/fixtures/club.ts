import { must } from "../../src/core";
import type { GameState } from "../../src/core/types";
import { teamRacer } from "./rewrite";

export function clubCandidate(seed = "grassroots-fixture"): GameState {
  const start = teamRacer(seed);
  start.era!.milestones.push("state");
  start.run.featureWins.county_fair = 0;
  const game = must(start, { type: "owner", move: { type: "found", charter: "privateer" } });
  game.owner!.tour.rounds = Array.from({ length: 5 }, (_, round) => ({
    raceId: `past-${round}`, vehicleUid: "fixture-vehicle", carName: "Old stock", position: 1, dnf: false,
  }));
  game.owner!.tour.status = "champion";
  game.owner!.titles = game.owner!.charterTitles.privateer = 1;
  game.promoter = { clock: 0, season: 2, certified: ["homecoming", "ironworks"], archive: [], meet: null };
  return game;
}
