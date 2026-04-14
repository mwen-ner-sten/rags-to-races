export function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 10_000) return (n / 1_000).toFixed(1) + "K";
  return Math.floor(n).toString();
}

/**
 * Like formatNumber, but preserves fractional values under 10 so small
 * early-game gains (e.g. 0.1 rep from a DNF) are visible instead of
 * flooring to 0. Used for Rep in the HUD and progress trackers.
 */
export function formatRep(n: number): string {
  if (n >= 10) return formatNumber(n);
  if (n === 0) return "0";
  // Show one decimal, trim trailing zero (0.5 → "0.5", 1.0 → "1")
  const s = n.toFixed(1);
  return s.endsWith(".0") ? s.slice(0, -2) : s;
}

export function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
