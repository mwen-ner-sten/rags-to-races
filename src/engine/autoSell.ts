import type { ScavengedPart } from "./scavenge";
import { getPartSaleValue } from "./sale";

export interface AutoSellResult {
  keptParts: ScavengedPart[];
  soldParts: ScavengedPart[];
  scrapEarned: number;
}

/** Apply the prestige Junk Filter without discarding unknown inventory data. */
export function autoSellRustedParts(
  parts: readonly ScavengedPart[],
  enabled: boolean,
  sellValueBonus = 0,
): AutoSellResult {
  if (!enabled) return { keptParts: [...parts], soldParts: [], scrapEarned: 0 };

  const keptParts: ScavengedPart[] = [];
  const soldParts: ScavengedPart[] = [];
  let scrapEarned = 0;
  for (const part of parts) {
    if (part.condition !== "rusted") {
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
