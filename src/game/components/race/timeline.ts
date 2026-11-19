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

/** In a drag round the pass takes this share of the round; the car then holds at the line. */
export const PASS_SHARE = 0.8;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export type BracketEnd = "won" | "out" | "dnf";

/** Where the two cars are in a drag bracket at one moment. */
export interface BracketView {
  /** The round being shown (1-based); locked to the last round once the race has ended. */
  round: number;
  rounds: number;
  /** 0..1 down the strip for this round's pass. */
  progress: number;
  /** Your position against the other lane: 1 ahead, 2 behind, fractional while it changes. */
  rank: number;
  /** Strip progress at which your car stopped, in a round that ends in a DNF. */
  dnfAt?: number;
  /** Set once the final beat has happened. */
  ended: BracketEnd | null;
}

const roundOfTime = (at: number, roundMs: number, rounds: number): number => Math.max(1, Math.min(rounds, Math.floor(at / roundMs + 1e-9) + 1));

function bracketRank(beats: readonly RaceBeat[], ms: number, t0: number, roundMs: number): number {
  const inRound = (b: RaceBeat) => b.at >= t0 - 1e-6 && b.at < t0 + roundMs - 1e-6;
  const start = beats.find((b) => b.kind === "round" && inRound(b));
  const end = beats.find((b) => (b.kind === "pass" || b.kind === "finish" || b.kind === "dnf") && inRound(b));
  const from = start?.position ?? 1;
  if (!end) return from;
  if (end.at <= ms + 1e-6) return end.position;
  return from + (end.position - from) * smooth(clamp01((ms - t0) / Math.max(1, end.at - t0)));
}

/**
 * A drag race replays each round as its own pass: the race is split evenly into `rounds` segments, and
 * within a segment the strip runs 0→1 over the first {@link PASS_SHARE}, then holds. After the last beat
 * (the win, the loss that ends it, or a DNF) the cars stay parked for whatever time remains.
 */
export function bracketView(beats: readonly RaceBeat[], ms: number, durationMs: number, rounds: number): BracketView {
  const count = Math.max(1, Math.round(rounds));
  const roundMs = Math.max(1, durationMs) / count;
  const last = beats[beats.length - 1];
  const terminal = last && (last.kind === "finish" || last.kind === "dnf") ? last : undefined;
  const reached = terminal !== undefined && terminal.at <= ms + 1e-6;
  const round = reached ? roundOfTime(terminal.at, roundMs, count) : roundOfTime(ms, roundMs, count);
  const t0 = (round - 1) * roundMs;
  const dnfRound = terminal?.kind === "dnf" ? roundOfTime(terminal.at, roundMs, count) : 0;
  const ended: BracketEnd | null = !reached ? null : terminal.kind === "dnf" ? "dnf" : terminal.position === 1 ? "won" : "out";
  return {
    round,
    rounds: count,
    progress: clamp01((ms - t0) / (roundMs * PASS_SHARE)),
    rank: bracketRank(beats, ms, t0, roundMs),
    dnfAt: terminal && dnfRound === round ? clamp01((terminal.at - t0) / (roundMs * PASS_SHARE)) : undefined,
    ended,
  };
}

/** The status line for a drag race: "Round 2 of 3 · ahead", then "Won the event", "Out in round 2" or "DNF". */
export function bracketStatus(view: BracketView): string {
  if (view.ended === "won") return "Won the event";
  if (view.ended === "out") return `Out in round ${view.round}`;
  if (view.ended === "dnf") return "DNF";
  const where = view.rank < 1.5 ? "ahead" : "behind";
  return view.rounds === 1 ? `Your pass · ${where}` : `Round ${view.round} of ${view.rounds} · ${where}`;
}
