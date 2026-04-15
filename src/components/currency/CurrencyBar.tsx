"use client";

import { useGameStore } from "@/state/store";
import { getVisibleCurrencies, type TabId } from "@/data/currencies";
import CurrencyDisplay from "./CurrencyDisplay";

interface Props {
  activeTab: TabId;
  /** Font-size variant passed to each CurrencyDisplay. */
  size?: "sm" | "md";
  /** Horizontal gap between currency cells. */
  gap?: string;
}

/**
 * Context-aware currency bar. Renders only currencies relevant to the active
 * tab (per their `relevantTabs` / `showOnAllTabs` definitions) and gated by
 * their unlock conditions.
 */
export default function CurrencyBar({ activeTab, size = "md", gap = "1.75rem" }: Props) {
  const state = useGameStore((s) => s);
  const currencies = getVisibleCurrencies(activeTab, state);

  return (
    <div style={{ display: "flex", alignItems: "center", gap }}>
      {currencies.map((c) => (
        <CurrencyDisplay key={c.id} currency={c} size={size} />
      ))}
    </div>
  );
}
