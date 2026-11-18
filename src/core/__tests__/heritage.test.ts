import { expect, it } from "vitest";
import { racer } from "../../../tests/fixtures/rewrite";
import { decodeGameState } from "../../game/save";
import { apply, must } from "../index";
import { resolveRace, rollRace, settleRace } from "../race";
import type { GameState, JobSpec } from "../types";

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

it("donates a complete faithful shakedown car and prints a useful earlier manual after a real reset", () => {
  let game = garage("exhibit");
  const donation = { type: "heritage", move: { type: "donate", vehicleUid: "new-garage" } } as const;
  const booked = must(game, { type: "enqueue", spec: { ...sprint, vehicleUid: "new-garage" } });
  expect(apply(booked, donation).error).toMatch(/racing entries/);
  game = must(game, donation);
  expect(game.run.vehicles).toHaveLength(0);
  expect(game.meta.hallOfFame.at(-1)?.retirement?.kind).toBe("exhibit");
  expect(decodeGameState(game)?.meta.heritageRegister?.[0].carName).toBe("Meadow II");
  expect(apply(game, donation).error).toBeTruthy();
  game = nextSeason(game);
  const claim = { type: "heritage", move: { type: "claim", kind: "exhibit", model: "push_mower" } } as const;
  expect(apply(game, claim).error).toMatch(/12 Scrap/);
  game.run.cash = 12;
  game = must(game, claim);
  expect(game.run.cash).toBe(0);
  expect(game.run.available).toContain("blueprint:riding_mower");
  expect(game.run.learned).not.toContain("blueprint:riding_mower");
  game = must(game, { type: "enqueue", spec: { kind: "study", knowhowId: "blueprint:riding_mower" } });
  expect(game.run.jobs.some((job) => job.spec.kind === "study")).toBe(true);
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
  game.run.materials.metal = game.run.materials.rubber = 1;
  game = must(game, { type: "heritage", move: { type: "claim", kind: "special", model: "push_mower" } });
  game = must(game, { type: "setTune", vehicleUid: car.uid, tune: "reliable" });
  expect(decodeGameState(game)?.run.vehicles[0].tune).toBe("reliable");
  expect(game.run.learned).not.toContain("tech:tuning");
});
