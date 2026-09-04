/**
 * Player-facing copy for spendable Rep. Every locked card, unlock button and
 * the Rep tooltip read from here so the wording never drifts between panels.
 */
import { REP_DECAY } from "@/config/progression";
import { formatRep } from "@/utils/format";

export interface RepPurchaseView {
  /** Whole-Rep price shown on the button. */
  cost: number;
  affordable: boolean;
  /** Rep still missing, rounded up; 0 when affordable. */
  shortfall: number;
  /** Button label, e.g. "Unlock · 13 Rep". Free items read "Unlock". */
  label: string;
  /** Tooltip for a disabled button, e.g. "Need 8 more Rep"; undefined when affordable. */
  disabledReason?: string;
}

/** Describe buying something priced in Rep against the spendable balance. */
export function describeRepPurchase(cost: number, repPoints: number): RepPurchaseView {
  const safeCost = Number.isFinite(cost) && cost > 0 ? cost : 0;
  const balance = Number.isFinite(repPoints) ? repPoints : 0;
  const shortfall = Math.max(0, Math.ceil(safeCost - balance));
  const affordable = shortfall === 0;
  return {
    cost: safeCost,
    affordable,
    shortfall,
    label: safeCost > 0 ? `Unlock · ${formatRep(safeCost)} Rep` : "Unlock",
    disabledReason: affordable ? undefined : `Need ${formatRep(shortfall)} more Rep`,
  };
}

/** "Spendable Rep: 42" — the balance line under a set of unlock buttons. */
export function formatSpendableRep(repPoints: number): string {
  return `Spendable Rep: ${formatRep(Math.max(0, repPoints))}`;
}

export interface RepDecayView {
  /** "Decays toward 12" */
  toward: string;
  /** "Cools by half every 3 days when above your floor" */
  halfLife: string;
}

/** Plain-words description of Rep decay for the currency tooltip. */
export function describeRepDecay(repFloor: number, halfLifeMs: number = REP_DECAY.HALF_LIFE_MS): RepDecayView {
  const floor = Math.max(0, Number.isFinite(repFloor) ? repFloor : 0);
  return {
    toward: `Decays toward ${formatRep(floor)}`,
    halfLife: `Cools by half every ${formatDuration(halfLifeMs)} when above your floor`,
  };
}

function formatDuration(ms: number): string {
  const hours = ms / 3_600_000;
  if (hours >= 24) {
    const days = hours / 24;
    const rounded = Number.isInteger(days) ? days : Number(days.toFixed(1));
    return `${rounded} day${rounded === 1 ? "" : "s"}`;
  }
  const rounded = Number.isInteger(hours) ? hours : Number(hours.toFixed(1));
  return `${rounded} hour${rounded === 1 ? "" : "s"}`;
}
