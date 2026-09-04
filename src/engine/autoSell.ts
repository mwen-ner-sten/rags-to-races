import type { GameState } from "@/state/store";
import type { ScavengedPart } from "./scavenge";
import { getPartSaleValue } from "./sale";
import { CONDITIONS, type PartCondition } from "@/data/parts";
import { getPrestigeMilestoneBonuses } from "@/data/prestigeMilestones";

export interface AutoSellResult {
  keptParts: ScavengedPart[];
  soldParts: ScavengedPart[];
  scrapEarned: number;
}

/**
 * Every save auto-sells rusted finds from the first tick: parts strictly
 * below this condition are converted to Scrap Bucks as they are found.
 */
export const BASELINE_AUTO_SELL_THRESHOLD: PartCondition = "worn";

/**
 * Condition below which scavenged parts are sold automatically. The baseline
 * is rusted-only; the Junk Filter milestone hands the threshold to the player's
 * Sell Below Quality setting.
 */
export function getAutoSellThreshold(
  state: Pick<GameState, "prestigeCount" | "selectedSellBelowQuality">,
): PartCondition {
  const milestones = getPrestigeMilestoneBonuses(state.prestigeCount ?? 0);
  if (!milestones.autoSellThreshold) return BASELINE_AUTO_SELL_THRESHOLD;
  const chosen = state.selectedSellBelowQuality;
  return chosen && CONDITIONS.includes(chosen) ? chosen : BASELINE_AUTO_SELL_THRESHOLD;
}

/** Sell every part below `threshold` without discarding unknown inventory data. */
export function autoSellJunkParts(
  parts: readonly ScavengedPart[],
  threshold: PartCondition,
  sellValueBonus = 0,
): AutoSellResult {
  const thresholdIndex = CONDITIONS.indexOf(threshold);
  if (thresholdIndex <= 0) return { keptParts: [...parts], soldParts: [], scrapEarned: 0 };

  const keptParts: ScavengedPart[] = [];
  const soldParts: ScavengedPart[] = [];
  let scrapEarned = 0;
  for (const part of parts) {
    if (CONDITIONS.indexOf(part.condition) >= thresholdIndex) {
      keptParts.push(part);
      continue;
    }
    const value = getPartSaleValue(part, sellValueBonus);
    if (value === undefined) {
      keptParts.push(part);
      continue;
    }
    soldParts.push(part);
    scrapEarned += value;
  }
  return { keptParts, soldParts, scrapEarned };
}
