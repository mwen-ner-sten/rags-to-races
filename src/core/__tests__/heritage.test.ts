import { afterEach, beforeEach, expect, it } from "vitest";
import { racer } from "../../../tests/fixtures/rewrite";
import { decodeGameState } from "../../game/save";
import { apply, must } from "../index";
import { resolveRace, rollRace, settleRace } from "../race";
import type { GameState, JobSpec } from "../types";
import { setExperimentalCareers } from "../features";

// These systems are experimental and off by default; switch them on for this file only.
beforeEach(() => setExperimentalCareers(true));
afterEach(() => setExperimentalCareers(false));

const sprint = { kind: "race", venueId: "backyard", event: "sprint", call: "nurse", vehicleUid: "fixture-vehicle" } as const;
function nextSeason(state: GameState) {
  state.run.featureWins.county_fair = state.run.seasonMs;
  return must(state, { type: "reset", layer: "scrap", choices: state.config });
}
function garage(kind: "special" | "exhibit") {
  const first = racer("heritage-start");
  resolveRace(first, sprint);
  const state = nextSeason(first);
  const current = structuredClone(first.run.vehicles[0]);
  current.uid = "new-garage";
  current.name = "Meadow II";
  for (const p of Object.values(current.parts)) if (p) { p.uid = `second-${p.uid}`; p.condition = 3; }
  state.run.vehicles.push(current);
  return must(state, { type: "heritage", move: { type: "start", kind, archiveIndex: 0 } });
}

it("donates a complete faithful shakedown car and keeps its dedication across a real reset", () => {
  let game = garage("exhibit");
  const donation = { type: "heritage", move: { type: "donate", vehicleUid: "new-garage" } } as const;
  const booked = must(game, { type: "enqueue", spec: { ...sprint, vehicleUid: "new-garage" } });
  expect(apply(booked, donation).error).toMatch(/racing entries/);
  game = must(game, donation);
  expect(game.run.vehicles).toHaveLength(0);
  expect(game.meta.hallOfFame.at(-1)?.retirement?.kind).toBe("exhibit");
  expect(decodeGameState(game)?.meta.heritageRegister?.[0].carName).toBe("Meadow II");
  expect(apply(game, donation).error).toBeTruthy();
  game.run.featureWins.state = game.run.seasonMs;
  game.meta.stateWonEver = true;
  const team = must(game, { type: "reset", layer: "team", choices: { ...game.config, discipline: "dirt", teamName: "Museum", colors: ["#123456", "#ffffff"] } });
  expect(decodeGameState(team)?.meta.heritageRegister).toEqual(game.meta.heritageRegister);
  game = nextSeason(game);
  expect(game.run.heritageProject).toBeUndefined();
  expect(decodeGameState(game)?.meta.heritageRegister?.[0]).toMatchObject({ carName: "Meadow II", season: 3 });
  expect(apply(game, { type: "heritage", move: { type: "start", kind: "special", archiveIndex: 0 } }).error).toMatch(/already has a permanent/);
});

it("awards only the registered period-special setup that started the Feature, and keeps the car", () => {
  let game = garage("special");
  const car = game.run.vehicles[0];
  const feature: Extract<JobSpec, { kind: "race" }> = { ...sprint, event: "feature", vehicleUid: car.uid };
  expect(rollRace(game, feature)?.heritageEntry).toBeUndefined();
  car.parts.wheel!.partId = "wheel_knobby";
  const roll = rollRace(game, feature)!;
  expect(roll.heritageEntry).toBe(game.run.heritageProject?.uid);
  // Isolate the podium threshold from random performance; the actual wear and ticket came from entry.
  const passed = { ...roll, position: 3, dnf: false };
  const released = must(game, { type: "heritage", move: { type: "cancel" } });
  settleRace(released, feature, passed);
  expect(released.meta.heritageRegister).toBeUndefined();
  settleRace(game, feature, passed);
  expect(game.run.vehicles[0].name).toBe("Meadow II");
  expect(game.meta.heritageRegister?.[0].kind).toBe("special");
  game = nextSeason(game);
  game.run.vehicles.push(structuredClone(car));
  expect(apply(game, { type: "setTune", vehicleUid: car.uid, tune: "reliable" }).error).toMatch(/Learn Tuning/);
  // A jig already purchased in an older experimental save works until the Season ends.
  game.run.heritageSetups = ["push_mower"];
  const imported = decodeGameState(game)!;
  expect(must(imported, { type: "setTune", vehicleUid: car.uid, tune: "reliable" }).run.vehicles[0].tune).toBe("reliable");
});

it("retains the first build when a reset archives the 201st racer", () => {
  const state = racer("long-archive");
  const first = nextSeason(state).meta.hallOfFame[0];
  state.meta.hallOfFame = Array.from({ length: 200 }, (_, i) => ({ ...first, name: `Build ${i + 1}` }));
  const loaded = decodeGameState(nextSeason(state));
  expect(loaded?.meta.hallOfFame).toHaveLength(201);
  expect(loaded?.meta.hallOfFame[0].name).toBe("Build 1");
});
