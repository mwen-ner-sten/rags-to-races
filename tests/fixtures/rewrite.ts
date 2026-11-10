import { createGame } from "../../src/core";
import { getVehicle } from "../../src/core/content/vehicles";
import type { GameState, Vehicle } from "../../src/core/types";

/** Accelerated fixtures for regression checks; no player saves or production controls are involved. */
export function racer(seed = "rewrite-regression", vehicleId = "push_mower"): GameState {
  const game = createGame(seed);
  const def = getVehicle(vehicleId);
  const vehicle: Vehicle = {
    uid: "fixture-vehicle", vehicleId, name: "Regression racer", tune: "balanced", builtAtSeasonMs: 0,
    history: { races: 0, wins: 0, dnfs: 0, bestFinish: null },
    parts: Object.fromEntries(def.slots.map((slot) => [slot.slot, { uid: `fixture-${slot.slot}`, partId: slot.accepts[0], condition: 4, origin: "Regression fixture" }])),
  };
  game.run.vehicles.push(vehicle);
  game.run.cash = 10_000;
  game.run.revealed = ["haul", "garage", "build", "race", "codex", "legacy", "habits"];
  game.meta.seasonsPlayed = 1;
  for (const part of Object.values(vehicle.parts)) if (part) game.meta.codex.parts[part.partId] = 1;
  return game;
}

export function teamRacer(seed = "crew-regression"): GameState {
  const game = racer(seed);
  game.era = {
    discipline: "dirt", teamName: "Regression team", colors: ["#c8372d", "#f2f2ee"],
    crew: [
      { id: "deshawn", assignment: { type: "driver" }, morale: 100, workedInWindowMs: 0, windowStartMs: 0, jobsDone: 19 },
      { id: "pearl", assignment: { type: "spotter" }, morale: 100, workedInWindowMs: 0, windowStartMs: 0, jobsDone: 19 },
    ],
    milestones: [], hardshipsCompleted: 0, legends: [], seasonIndex: 0,
  };
  game.run.revealed.push("team", "crew");
  game.run.habitSlots = [];
  return game;
}

export function swapMeetGame(): GameState {
  const game = createGame("swap-meet-regression");
  game.meta.seasonsPlayed = 1;
  game.meta.perks.swap_meet = 1;
  game.config.perks = ["swap_meet"];
  game.meta.perksUnlocked.push("swap_meet");
  game.meta.daresCompleted.push("packrat");
  game.run.revealed = ["haul", "garage", "bench", "build", "materials"];
  game.run.inventory = ["engine_small", "wheel_busted", "frame_mower"].map((partId, i) => ({ uid: `offer-${i}`, partId, condition: 1, origin: "Regression fixture" }));
  for (const part of game.run.inventory) game.meta.codex.parts[part.partId] = 1;
  game.meta.codex.parts.engine_lawn = 1;
  return game;
}

export function saveText(game: unknown, savedAt = Date.now()): string {
  return Buffer.from(JSON.stringify({ savedAt, game }), "utf8").toString("base64");
}
