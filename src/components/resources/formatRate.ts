/**
 * Number formatting for the resource rail. Pure functions so the rail, the
 * mobile strip, and the tooltips agree on every string.
 */

export type RateSign = "pos" | "neg" | "zero";

/** Anything smaller than this is displayed as a zero rate. */
const ZERO_EPSILON = 0.005;

export function rateSign(perSecond: number): RateSign {
  if (!Number.isFinite(perSecond) || Math.abs(perSecond) < ZERO_EPSILON) return "zero";
  return perSecond > 0 ? "pos" : "neg";
}

function compactMagnitude(abs: number): string {
  if (abs >= 1_000_000_000) return `${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${(abs / 1_000).toFixed(1)}K`;
  if (abs >= 100) return Math.round(abs).toString();
  if (abs >= 0.1) return abs.toFixed(1);
  return abs.toFixed(2);
}

/** "+1.2/s", "-0.50/s", "0/s". */
export function formatRate(perSecond: number): string {
  const sign = rateSign(perSecond);
  if (sign === "zero") return "0/s";
  const prefix = sign === "pos" ? "+" : "-";
  return `${prefix}${compactMagnitude(Math.abs(perSecond))}/s`;
}

/** Whole-number amount with thousands separators below 10K, compact above. */
export function formatAmount(amount: number): string {
  if (!Number.isFinite(amount)) return "0";
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${sign}${(abs / 1_000).toFixed(1)}K`;
  return `${sign}${Math.floor(abs).toLocaleString("en-US")}`;
}

/** 0–100 fill for a capped resource; null when there is no cap. */
export function capPercent(amount: number, cap?: number): number | null {
  if (cap == null || !Number.isFinite(cap) || cap <= 0) return null;
  return Math.max(0, Math.min(100, (amount / cap) * 100));
}
