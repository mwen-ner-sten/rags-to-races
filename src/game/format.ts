import { CONDITION_NAMES } from "@/core/content/parts";
import type { Condition } from "@/core/types";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** "45s", "12m", "3h 20m", "2d 4h". */
export function duration(ms: number): string {
  if (ms < MIN) return `${Math.max(1, Math.ceil(ms / 1000))}s`;
  if (ms < HOUR) return `${Math.ceil(ms / MIN)}m`;
  if (ms < DAY) {
    const h = Math.floor(ms / HOUR);
    const m = Math.round((ms % HOUR) / MIN);
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  const d = Math.floor(ms / DAY);
  const h = Math.round((ms % DAY) / HOUR);
  return h ? `${d}d ${h}h` : `${d}d`;
}

/** Season clock: "Day 3, 14:05". */
export function seasonClock(ms: number): string {
  const day = Math.floor(ms / DAY) + 1;
  const inDay = ms % DAY;
  const h = Math.floor(inDay / HOUR);
  const m = Math.floor((inDay % HOUR) / MIN);
  return `Day ${day}, ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function num(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function pct(p: number): string {
  return `${Math.round(p * 100)}%`;
}

export function conditionName(c: Condition): string {
  return CONDITION_NAMES[c];
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
