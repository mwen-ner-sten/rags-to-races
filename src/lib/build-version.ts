export interface BuildCounter {
  date: string;
  build: number;
}

/** Format just the date portion: YYYY.MM.DD */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}.${m}.${d}`;
}

/** Format a CalVer version string: YYYY.MM.DD.BUILD */
export function formatVersion(date: Date, build: number): string {
  return `${formatDate(date)}.${build}`;
}

/** Bump the build counter: increment on same day, reset to 1 on a new day. */
export function bumpCounter(prev: BuildCounter, now: Date): BuildCounter {
  const date = formatDate(now);
  if (prev.date === date) {
    return { date, build: prev.build + 1 };
  }
  return { date, build: 1 };
}
