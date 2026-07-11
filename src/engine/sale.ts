import { getAddonById } from "@/data/addons";
import { CONDITION_MULTIPLIERS, getPartById } from "@/data/parts";
import type { ScavengedPart } from "@/engine/scavenge";

/**
 * Return the exact Scrap Bucks paid for an inventory item.
 *
 * Every recognized item is worth at least $1. This keeps a sell action from
 * silently discarding low-value or zero-base-value parts after condition
 * scaling and gives automated/bulk sale paths one shared valuation rule.
 */
export function getPartSaleValue(
  part: ScavengedPart,
  sellValueBonus = 0,
): number | undefined {
  const definition = part.type === "addon"
    ? getAddonById(part.definitionId)
    : getPartById(part.definitionId);
  if (!definition) return undefined;

  const multiplier = CONDITION_MULTIPLIERS[part.condition];
  const safeBonus = Number.isFinite(sellValueBonus)
    ? Math.max(-1, sellValueBonus)
    : 0;
  return Math.max(
    1,
    Math.floor(definition.scrapValue * multiplier * (1 + safeBonus)),
  );
}
