"use client";

import type { ResourceRate } from "@/engine/rates";
import type { TabId } from "@/components/navigation/tabs";
import Stat from "@/components/ui/Stat";
import { formatAmount } from "@/components/resources/formatRate";
import { selectRelevantRates } from "@/components/resources/selectRelevant";

interface Props {
  activeTab: TabId;
  /** Rates from useResourceRates; the bar never talks to the store itself. */
  rates: readonly ResourceRate[];
  /** How many currencies to show, most relevant to `activeTab` first. */
  limit?: number;
  size?: "sm" | "md";
}

/**
 * Context-aware inline currency strip built from <Stat>. Picks the resources
 * most relevant to the active tab (CurrencyDefinition.relevantTabs, then
 * showOnAllTabs) and gated by their unlock conditions.
 */
export default function CurrencyBar({ activeTab, rates, limit = 3, size = "md" }: Props) {
  const shown = selectRelevantRates(rates, activeTab, limit);

  return (
    <div className="currency-bar" data-testid="currency-bar">
      {shown.map((rate) => (
        <Stat
          key={rate.id}
          className="currency-bar__item"
          size={size}
          label={rate.label}
          value={`${rate.prefix ?? ""}${formatAmount(rate.amount)}`}
          rate={rate.perSecond}
          color={rate.color}
        />
      ))}
    </div>
  );
}
