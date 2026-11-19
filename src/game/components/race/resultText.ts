import { ordinal } from "../../format";

/** The parts of a race result the wording depends on. */
export interface FinishInfo {
  position: number;
  fieldSize: number;
  dnf: boolean;
  /** Drag elimination rounds; undefined on an oval (and on saves from before brackets). */
  rounds?: number;
}

/** The round a bracket racer lost in. Position 2 is the final, 3 a semi-final, 5 a quarter-final. */
export function lostInRound(position: number, rounds: number): number {
  return Math.max(1, rounds - Math.round(Math.log2(Math.max(1, position - 1))));
}

/** How a race ended, in the player's words: "Won the event", "Lost in the final", "3rd of 6" or "DNF". */
export function finishText(info: FinishInfo): string {
  if (info.dnf) return "DNF";
  const { rounds } = info;
  if (rounds === undefined) return `${ordinal(info.position)} of ${info.fieldSize}`;
  if (info.position === 1) return "Won the event";
  const round = lostInRound(info.position, rounds);
  return round >= rounds ? "Lost in the final" : `Lost in round ${round} of ${rounds}`;
}
