"use client";

import { venueName } from "@/core/content/events";
import { getVehicle } from "@/core/content/vehicles";
import type { ActiveJob, GameState } from "@/core/types";
import { duration } from "../../format";
import { RaceScreen, type RaceShown } from "./RaceScreen";

/** The store ticks every 500 ms; cars glide between ticks. */
const TICK_GLIDE_MS = 500;

/** The race-view inputs for a race job that's on the track, or null if it isn't a pre-rolled race. */
export function liveRace(game: GameState, job: ActiveJob): RaceShown | null {
  if (job.spec.kind !== "race" || !job.race) return null;
  const spec = job.spec;
  const vehicle = game.run.vehicles.find((v) => v.uid === spec.vehicleUid);
  const discipline = game.era?.discipline ?? "dirt";
  return {
    venueId: spec.venueId,
    venueLabel: venueName(spec.venueId, discipline),
    event: spec.event,
    vehicleId: vehicle ? getVehicle(vehicle.vehicleId).id : "push_mower",
    fieldSize: job.race.fieldSize,
    beats: job.race.beats,
    laps: job.race.laps,
    durationMs: job.race.durationMs,
    strip: discipline === "drag",
  };
}

/** A race on the track right now, revealed as it runs. */
export function RaceLive({ game, job, compact = false }: { game: GameState; job: ActiveJob; compact?: boolean }) {
  const race = liveRace(game, job);
  if (!race) return null;
  const done = 1 - job.remaining / Math.max(1, job.duration);
  const ms = done * race.durationMs;
  return (
    <div className="race-live">
      <RaceScreen race={race} ms={ms} compact={compact} transitionMs={TICK_GLIDE_MS} />
      {!compact && <p className="muted race-left num">{duration(Math.max(0, race.durationMs - ms))} to the flag</p>}
    </div>
  );
}
