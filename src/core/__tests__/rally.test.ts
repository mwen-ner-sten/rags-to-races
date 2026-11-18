import { expect, it } from "vitest";
import { racer, teamRacer } from "../../../tests/fixtures/rewrite";
import { decodeGameState } from "../../game/save";
import { apply, must } from "../index";
import { jobBlocker } from "../jobs";
import { rollRace, settleRace, winChance } from "../race";
import { SCRAP_LAYER, TEAM_LAYER, scrapAward } from "../layers";
import { bankRallyTime, cardFor, judgeRegularity, stampRallyFeature, totalTime } from "../timecards";
import { rallyRoute } from "../rally";
import type { JobSpec } from "../types";

type Race = Extract<JobSpec, { kind: "race" }>;

function roadbookFixture() {
  const game = teamRacer("roadbook-equal-rng");
  game.era!.discipline = "rally";
  const car = racer("roadbook-car", "roadbook_special").run.vehicles[0];
  game.run.vehicles = [car];
  game.run.venuesOpen.push("county_fair");
  game.run.ladder.county_fair = ["sprint", "heat", "feature"];
  const spec: Race = { kind: "race", vehicleUid: car.uid, event: "feature", venueId: "county_fair", call: "nurse", call2: "recce" };
  return { game, car, spec };
}

it("uses equal RNG for calibrated and ordinary splits, lifting only on fast stages", () => {
  const { game, car, spec } = roadbookFixture();
  const trial = rollRace(structuredClone(game), spec)!;
  expect(trial.dnf).toBe(false);
  const splits = trial.rallyClock!.splitsMs;
  const target = splits.map((ms, stage) => Math.round(ms * (stage === 0 ? 1.25 : 0.85)));
  bankRallyTime(game, car, spec.venueId, spec.event, undefined, target);
  const ordinary = structuredClone(game);
  const calibrated = structuredClone(game);
  const flat = rollRace(ordinary, { ...spec, regularity: true })!;
  const held = rollRace(calibrated, { ...spec, regularity: true, holdMarks: true })!;
  expect(calibrated.rng).toBe(ordinary.rng);
  expect(flat.rallyClock?.splitsMs).toEqual(splits);
  expect(held.rallyClock?.splitsMs).toEqual([Math.round(target[0] * 0.99), ...splits.slice(1)]);
  expect(held.rallyClock?.regularity).toEqual({ matched: 1, required: 4, passed: false });
  expect(held.beats.filter(({ text }) => text.includes("Lifted for"))).toHaveLength(1);
});

it("requires a regularity entry and working Roadbook electronics to arm the tripmeter", () => {
  const { game, car, spec } = roadbookFixture();
  bankRallyTime(game, car, spec.venueId, spec.event, undefined, [1000, 1500, 2000, 2500]);
  expect(jobBlocker(game, { ...spec, holdMarks: true }, true)).toMatch(/regularity entry/);
  const calibrated = { ...spec, regularity: true, holdMarks: true } as const;
  expect(jobBlocker(game, calibrated, true)).toBeNull();
  car.parts.electronics!.condition = 2;
  expect(jobBlocker(game, calibrated, true)).toBeNull();
  car.parts.electronics!.condition = 1;
  expect(jobBlocker(game, calibrated, true)).toMatch(/Worn or better electronics/);
  car.parts.electronics!.condition = 3;
  car.parts.electronics!.partId = "elec_ignition";
  expect(jobBlocker(game, calibrated, true)).toMatch(/Worn or better electronics/);
  const ordinary = racer("ordinary-electronics", "beater_car").run.vehicles[0];
  game.run.vehicles = [ordinary];
  bankRallyTime(game, ordinary, spec.venueId, spec.event, undefined, [1000, 1500, 2000, 2500]);
  expect(jobBlocker(game, calibrated, true)).toMatch(/Use a Roadbook Special/);
});

it("validates frozen stage counts and totals in active and finished saves while accepting older clocks", () => {
  const { game, car, spec } = roadbookFixture();
  const baseline = [1000, 1500, 2000, 2500];
  bankRallyTime(game, car, spec.venueId, spec.event, undefined, baseline);
  const entered = must(game, { type: "enqueue", spec: { ...spec, regularity: true, holdMarks: true } });
  const job = entered.run.jobs.find((entry) => entry.spec.kind === "race")!;
  const valid = decodeGameState(entered);
  expect(valid?.run.jobs.find((entry) => entry.id === job.id)?.race?.rallyClock?.referenceSplitsMs).toEqual(baseline);
  const finished = must(valid!, { type: "advance", ms: job.duration, away: true });
  expect(finished.run.races.at(-1)?.rallyClock?.referenceSplitsMs).toEqual(baseline);
  for (const candidate of [entered, finished]) {
    const clock = candidate.run.races.at(-1)?.rallyClock ?? candidate.run.jobs.find((entry) => entry.spec.kind === "race")!.race!.rallyClock!;
    clock.referenceSplitsMs = baseline.slice(0, -1);
    clock.previousMs = totalTime(clock.referenceSplitsMs);
    expect(decodeGameState(candidate)).toBeNull();
    clock.referenceSplitsMs = baseline;
    expect(decodeGameState(candidate)).toBeNull();
    delete clock.referenceSplitsMs;
    delete clock.referenceSeason;
    expect(decodeGameState(candidate)).not.toBeNull();
  }
});

it.each([
  { countyMatch: "inez" as const },
  { tourRound: "owner-round" },
  { worksRound: "works-round" },
])("isolates a tagged Rally event from regularity and the ordinary timecard (%j)", (special) => {
  const { game, car, spec } = roadbookFixture();
  bankRallyTime(game, car, spec.venueId, spec.event, undefined, [1_000_000, 1_000_000, 1_000_000, 1_000_000]);
  const ordinary = structuredClone(game.meta.rallyCards);
  const tagged = { ...spec, ...special };
  const regularity = { ...tagged, regularity: true, holdMarks: true } as const;
  expect(jobBlocker(game, regularity, true)).toMatch(/standard Rally event/);
  expect(decodeGameState({ ...game, run: { ...game.run, queue: [regularity] } })).toBeNull();
  const roll = rollRace(game, tagged)!;
  expect(roll.dnf).toBe(false);
  expect(roll.rallyClock?.splitsMs).toHaveLength(4);
  expect(roll.rallyClock?.referenceSplitsMs).toBeUndefined();
  const result = settleRace(game, tagged, roll)!;
  expect(result.rallyClock?.regularity).toBeUndefined();
  expect(game.meta.rallyCards).toEqual(ordinary);
});

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

it("matches an old class clock in a losing car to enter a fresh Season on a County Forest certificate", () => {
  let game = teamRacer("county-regularity");
  game.era!.discipline = "rally";
  game.run.vehicles = racer("clock-kart", "go_kart").run.vehicles;
  game.run.venuesOpen.push("county_fair");
  game.run.ladder.county_fair = ["sprint", "heat", "feature"];
  const car = game.run.vehicles[0];
  const spec: Race = { kind: "race", vehicleUid: car.uid, venueId: "county_fair", event: "feature", call: "nurse", call2: "recce" };
  expect(apply(game, { type: "enqueue", spec: { ...spec, regularity: true } }).error).toMatch(/class time/);
  const first = rollRace(game, spec)!;
  expect(first.dnf).toBe(false);
  settleRace(game, spec, first);
  const baseline = structuredClone(cardFor(game, "county_fair", "feature", "go_kart")!);
  expect(baseline.splitsMs).toHaveLength(4);
  expect(judgeRegularity(baseline.splitsMs.map((ms) => ms * 1.15), baseline, false).passed).toBe(false);
  const clockEntry: Race = { ...spec, regularity: true };
  let sealed;
  for (let i = 0; i < 200; i++) {
    game.seed = `county-regularity-${i}`;
    const attempt = must(game, { type: "enqueue", spec: clockEntry });
    if (attempt.run.jobs.some((job) => job.race?.rallyClock?.regularity?.passed && job.race.position >= 4)) { sealed = attempt; break; }
  }
  expect(sealed).toBeTruthy();
  game = decodeGameState(sealed)!;
  const raceJob = game.run.jobs.find((job) => job.spec.kind === "race")!;
  game = must(game, { type: "advance", ms: raceJob.duration, away: true });
  expect(game.run.races.at(-1)).toMatchObject({ prize: 0, rallyClock: { regularity: { matched: 4, passed: true } } });
  expect(game.run.featureWins.county_fair).toBeUndefined();
  expect(game.run.venuesOpen).toContain("regional");
  expect(scrapAward(game)).toBe(6);
  expect(TEAM_LAYER.gate(game).ok).toBe(true);
  expect(SCRAP_LAYER.gate(game).ok).toBe(true);
  const newGame = must(game, { type: "reset", layer: "scrap", choices: game.config });
  expect(decodeGameState(newGame)?.meta.seasonLog?.at(-1)?.regularityFeatures).toHaveProperty("county_fair");
  expect(cardFor(newGame, "county_fair", "feature", "go_kart")).toEqual(baseline);
  expect(newGame.run.regularityFeatures).toBeUndefined();
});

it("requires a later Season to redeem the Ridgeway regularity invitation for State Forest", () => {
  const game = teamRacer();
  game.era!.discipline = "rally";
  stampRallyFeature(game, "regional");
  stampRallyFeature(game, "regional");
  expect(game.run.venuesOpen).not.toContain("state");
  game.meta.seasonsPlayed++;
  game.run.regularityFeatures = {};
  stampRallyFeature(game, "regional");
  expect(game.run.venuesOpen).toContain("state");
});

it("plays both stage clocks from the frozen splits and stops the reference clock on retirement", async () => {
  const {referencePosition}=await import("../timecards");
  const clock={splitsMs:[1000,1000],referenceSplitsMs:[2000,500]};
  expect(referencePosition(clock,2,.5)).toBe(.25);
  expect(referencePosition(clock,2,1)).toBe(.5);
  expect(referencePosition({...clock,splitsMs:[1000]},2,1)).toBe(.25);
  expect(referencePosition({splitsMs:[1000,1000]},2,.5)).toBeUndefined();
});
