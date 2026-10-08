import { RIVAL_BY_ID } from "./content/events";
import { rand } from "./rng";
import type { EventKind, GameState, RaceBeat } from "./types";

/** Laps per event on an oval (a drag strip is always one run). */
export const LAPS: Record<EventKind, number> = { sprint: 3, heat: 5, feature: 8 };

const CAR_NUMBERS = [3, 7, 11, 12, 23, 31, 44, 51, 66, 88] as const;
const COUNT_WORDS = ["", "one car", "two cars", "three cars", "four cars", "five cars"] as const;

const LOSS_TEXT: Record<string, string> = {
  engine: "engine starts to fade",
  wheel: "tyres give up the grip",
  frame: "frame flexes through the corners",
  fuel: "fuel line sputters",
  electronics: "wiring cuts out for a second",
  drivetrain: "chain jumps a tooth",
  exhaust: "exhaust comes loose and drags",
  body: "door flies open",
};

export interface BeatInput {
  startPos: number;
  position: number;
  fieldSize: number;
  dnf: boolean;
  weakSlot: string | null;
  durationMs: number;
  laps: number;
  /** The Feature rival, if there is one. */
  rivalId?: string;
  rivalBeaten: boolean;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

function carName(state: GameState): string {
  return `the #${CAR_NUMBERS[Math.floor(rand(state) * CAR_NUMBERS.length)]}`;
}

/** Where you are at the end of lap k, heading from the start toward `target` with a little back-and-forth. */
function plannedPosition(state: GameState, input: BeatInput, k: number, lastLap: number, target: number): number {
  if (!input.dnf && k === input.laps) return input.position;
  let planned = Math.round(input.startPos + (target - input.startPos) * (k / lastLap));
  if (k < lastLap && rand(state) < 0.3) planned += rand(state) < 0.5 ? -1 : 1;
  return clamp(planned, 1, input.fieldSize);
}

interface Story {
  beats: RaceBeat[];
  rivalTold: boolean;
  wearTold: boolean;
}

function tellLap(state: GameState, input: BeatInput, story: Story, k: number, from: number, to: number, midLap: number, lapMs: number): void {
  const rival = input.rivalId ? RIVAL_BY_ID[input.rivalId]?.name : undefined;
  if (to < from) {
    const n = from - to;
    const byRival = rival && input.rivalBeaten && !story.rivalTold && to <= 2;
    if (byRival) story.rivalTold = true;
    const who = byRival ? `${rival}!` : n === 1 ? `${carName(state)}.` : `${COUNT_WORDS[n] ?? `${n} cars`}.`;
    story.beats.push({ at: midLap, text: `Lap ${k}: you get by ${who}`, position: to, kind: byRival ? "rival" : "pass" });
    return;
  }
  if (to > from) {
    // Only blame a worn part when it actually cost you: a DNF or a finish behind where you started.
    if (input.weakSlot && !story.wearTold && (input.dnf || input.position > input.startPos)) {
      story.wearTold = true;
      story.beats.push({ at: midLap - lapMs * 0.15, text: `Lap ${k}: your ${LOSS_TEXT[input.weakSlot] ?? "car fades"}.`, position: from, kind: "wear" });
    }
    const who = to - from === 1 ? carName(state) : COUNT_WORDS[to - from] ?? `${to - from} cars`;
    story.beats.push({ at: midLap, text: `Lap ${k}: ${who} ${to - from === 1 ? "gets" : "get"} by you.`, position: to, kind: "passed" });
    return;
  }
  if (rival && !input.rivalBeaten && !story.rivalTold && to > 1 && k >= 2) {
    story.rivalTold = true;
    story.beats.push({ at: midLap, text: `Lap ${k}: ${rival} pulls away up front.`, position: to, kind: "rival" });
  } else if (k === Math.ceil(input.laps / 2)) {
    story.beats.push({ at: midLap, text: `Lap ${k}: holding P${to}.`, position: to, kind: "hold" });
  }
}

/** The race told lap by lap: 5–15 timestamped moments with your running position. */
export function buildBeats(state: GameState, input: BeatInput): RaceBeat[] {
  const { laps, durationMs, fieldSize, startPos, dnf } = input;
  const lapMs = durationMs / laps;
  const story: Story = { beats: [{ at: 0, text: `Green flag. You start P${startPos} of ${fieldSize}.`, position: startPos, kind: "start" }], rivalTold: false, wearTold: false };
  const dnfLap = dnf ? clamp(Math.round(laps * (0.45 + 0.4 * rand(state))), 1, laps) : null;
  const lastLap = dnfLap ?? laps;
  const target = dnf ? clamp(startPos + (rand(state) < 0.5 ? -1 : 1), 1, fieldSize) : input.position;
  let pos = startPos;
  for (let k = 1; k <= lastLap; k++) {
    if (dnfLap === k) break;
    const to = plannedPosition(state, input, k, lastLap, target);
    tellLap(state, input, story, k, pos, to, lapMs * (k - 0.5), lapMs);
    pos = to;
    if (!dnf && k === laps - 1 && laps >= 3) story.beats.push({ at: lapMs * k, text: `Last lap. You're P${pos}.`, position: pos, kind: "last_lap" });
  }
  if (dnfLap !== null) {
    const at = lapMs * (dnfLap - 0.5);
    if (input.weakSlot && !story.wearTold) story.beats.push({ at: at - lapMs * 0.2, text: `Lap ${dnfLap}: your ${LOSS_TEXT[input.weakSlot] ?? "car fades"}.`, position: pos, kind: "wear" });
    story.beats.push({ at, text: "Smoke, then silence. You coast into the infield. DNF.", position: fieldSize, kind: "dnf" });
  } else {
    story.beats.push({ at: durationMs, text: input.position === 1 ? "Checkered flag. You win!" : `Checkered flag. P${input.position} of ${fieldSize}.`, position: input.position, kind: "finish" });
  }
  return story.beats.sort((a, b) => a.at - b.at);
}
