import { expect, it } from "vitest";
import { racer, teamRacer } from "../../../tests/fixtures/rewrite";
import { decodeGameState } from "../../game/save";
import { apply, must } from "../index";
import { rollRace, settleRace, winChance } from "../race";
import { rallyRoute } from "../rally";
import type { JobSpec } from "../types";

type Race = Extract<JobSpec, { kind: "race" }>;

it("offers Stage Rally on a later Team Reset or through a grassroots challenge on first founding", () => {
  const game = racer();
  game.meta.stateWonEver = true;
  game.run.featureWins.county_fair = game.run.seasonMs;
  const reset = { type: "reset", layer: "team", choices: { ...game.config, discipline: "rally", teamName: "Quarry Works", colors: ["#123", "#eee"] } } as const;
  const action = { ...reset, choices: { ...reset.choices, colors: ["#123", "#eee"] as [string, string] } };
  expect(apply(game, action).error).toMatch(/on first founding/);
  game.meta.challengeRecords.hand_me_down = { completions: 1, bestSeasonMs: 500, bestVehicleName: "Red" };
  expect(decodeGameState(must(game, action))?.era?.discipline).toBe("rally");
  game.meta.challengeRecords = {};
  game.meta.totalTeamResets = 1;
  expect(must(game, action).era?.discipline).toBe("rally");
});

it("times individual sections, records the result once and preserves the booked splits after reload", () => {
  const game = teamRacer("stage-reload");
  game.era!.discipline = "rally";
  const spec: Race = { kind: "race", vehicleUid: game.run.vehicles[0].uid, event: "sprint", venueId: "backyard", call: "nurse", call2: "recce" };
  const entered = must(game, { type: "enqueue", spec });
  const saved = decodeGameState(entered)!;
  const job = saved.run.jobs.find((j) => j.spec.kind === "race")!;
  expect(job.race?.beats).toEqual(entered.run.jobs.find((j) => j.spec.kind === "race")?.race?.beats);
  const settled = must(saved, { type: "advance", ms: job.duration, away: true });
  expect(settled.run.races).toHaveLength(1);
  expect(settled.run.races[0].beats.filter((beat) => beat.text.startsWith("Stage "))).toHaveLength(2);
  expect(decodeGameState(settled)?.run.races[0].beats).toEqual(settled.run.races[0].beats);
  expect(rallyRoute("dirt", "heat")).toEqual(["loose gravel", "broken road", "fast lane"]);
});

it("predicts wins against a close field for three driver strategies and settles a rival Feature", () => {
  const game = teamRacer("rally-distribution");
  game.era!.discipline = "rally";
  const vehicle = game.run.vehicles[0];
  const spec: Race = { kind: "race", vehicleUid: vehicle.uid, venueId: "dirt", event: "feature", call: "nurse" };
  const rivals = [0.92, 0.95, 0.99, 1, 1.03].map((factor, i) => ({
    id: String(i), score: 10.5 * factor, variation: 1, rival: i === 4, out: 0.02,
  }));
  for (const call2 of [undefined, "cut", "recce"] as const) {
    const prediction = winChance(game, vehicle, spec.venueId, spec.event, spec.call, call2, rivals);
    expect(prediction).toBeGreaterThan(0.1);
    expect(prediction).toBeLessThan(0.9);
    let wins = 0, penalties = 0;
    for (let i = 0; i < 600; i++) {
      game.seed = `stage-trial-${i}`;
      game.rng = 0;
      const roll = rollRace(game, { ...spec, call2 }, rivals)!;
      if (!roll.dnf && roll.position === 1) wins++;
      penalties += roll.beats.filter((beat) => beat.text.includes("penalty")).length;
    }
    expect(Math.abs(wins / 600 - prediction)).toBeLessThan(0.075);
    expect(penalties > 0).toBe(call2 === "cut");
  }
  const roll = rollRace(game, spec)!;
  expect(settleRace(game, spec, roll)?.rival?.id).toBe("marisol");
});
