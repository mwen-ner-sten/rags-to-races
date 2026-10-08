import { LAPS } from "@/core/raceBeats";
import type { EventKind, RaceBeat } from "@/core/types";

/** How long before a beat the car starts moving into its new position (as a share of the gap to the previous beat). */
const MOVE_SHARE = 0.4;

const smooth = (x: number) => x * x * (3 - 2 * x);

/** Your running position at `ms`, fractional while an overtake is happening. */
export function rankAt(beats: readonly RaceBeat[], ms: number): number {
  if (beats.length === 0) return 1;
  let i = 0;
  while (i + 1 < beats.length && beats[i + 1].at <= ms) i++;
  const here = beats[i];
  const next = beats[i + 1];
  if (!next || next.position === here.position || next.kind === "dnf") return here.position;
  const window = Math.max(1, (next.at - here.at) * MOVE_SHARE);
  const t = Math.max(0, Math.min(1, (ms - (next.at - window)) / window));
  return here.position + (next.position - here.position) * smooth(t);
}

/** Beats that have happened by `ms`. */
export function beatsSoFar(beats: readonly RaceBeat[], ms: number): RaceBeat[] {
  return beats.filter((b) => b.at <= ms + 1e-6);
}

/** Progress (0..1) at which the car stopped, if it did. */
export function dnfProgress(beats: readonly RaceBeat[], durationMs: number): number | undefined {
  const stop = beats.find((b) => b.kind === "dnf");
  return stop ? stop.at / Math.max(1, durationMs) : undefined;
}

/** Laps for a race result that may predate lap counts. */
export function lapsFor(event: EventKind, laps: number | undefined, strip: boolean): number {
  if (strip) return 1;
  return laps ?? LAPS[event];
}
