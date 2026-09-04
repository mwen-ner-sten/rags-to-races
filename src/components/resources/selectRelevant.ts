import type { ResourceRate } from "@/engine/rates";
import { CURRENCY_DEFINITIONS } from "@/data/currencies";
import type { TabId } from "@/components/navigation/tabs";

const CURRENCY_BY_ID = new Map(CURRENCY_DEFINITIONS.map((c) => [c.id, c]));

/**
 * Relevance of a resource to the tab the player is looking at:
 *   2 — the currency lists this tab in relevantTabs
 *   1 — the currency shows on every tab
 *   0 — anything else (derived resources, off-tab currencies)
 */
export function resourceRelevance(id: string, activeTab: TabId): number {
  const def = CURRENCY_BY_ID.get(id);
  if (!def) return 0;
  if (def.relevantTabs?.includes(activeTab)) return 2;
  if (def.showOnAllTabs) return 1;
  return 0;
}

/** Only the resources the player is allowed to see. */
export function visibleRates(rates: readonly ResourceRate[]): ResourceRate[] {
  return rates.filter((r) => r.visible);
}

/**
 * The `limit` most relevant visible resources for a tab, most relevant first,
 * ties broken by definition order so the list is stable between renders.
 */
export function selectRelevantRates(rates: readonly ResourceRate[], activeTab: TabId, limit = 3): ResourceRate[] {
  return visibleRates(rates)
    .map((rate, index) => ({ rate, index, score: resourceRelevance(rate.id, activeTab) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((entry) => entry.rate);
}
