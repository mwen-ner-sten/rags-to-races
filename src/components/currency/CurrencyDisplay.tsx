"use client";

import { useGameStore } from "@/state/store";
import type { CurrencyDefinition } from "@/data/currencies";
import { Section, Row, TooltipPanel, HoverTooltipWrapper } from "@/components/TooltipPrimitives";

function CurrencyTooltipContent({
  anchorRect,
  currency,
}: {
  anchorRect: DOMRect;
  currency: CurrencyDefinition;
}) {
  // Subscribe to the full store so tooltip updates live while hovered
  const state = useGameStore((s) => s);
  const sections = currency.getTooltip(state);

  return (
    <TooltipPanel anchorRect={anchorRect}>
      <div
        style={{
          fontSize: "0.72rem",
          color: "var(--text-secondary, #9a8570)",
          marginBottom: "0.6rem",
          fontStyle: "italic",
          lineHeight: 1.4,
        }}
      >
        {currency.description}
      </div>
      {sections.map((section) => (
        <Section key={section.label} label={section.label}>
          {section.rows.map((r, i) => (
            <Row key={`${section.label}-${i}`} label={r.label} value={r.value} color={r.color} dim={r.dim} />
          ))}
        </Section>
      ))}
    </TooltipPanel>
  );
}

export interface CurrencyDisplayProps {
  currency: CurrencyDefinition;
  /** HUD font-size variant. Theme shells can override. */
  size?: "sm" | "md";
}

export default function CurrencyDisplay({ currency, size = "md" }: CurrencyDisplayProps) {
  const value = useGameStore(currency.getValue);
  const valueFontSize = size === "sm" ? "0.95rem" : "1.1rem";
  const labelFontSize = size === "sm" ? "0.5rem" : "0.55rem";

  return (
    <HoverTooltipWrapper
      renderTooltip={(anchorRect) => (
        <CurrencyTooltipContent anchorRect={anchorRect} currency={currency} />
      )}
    >
      <div
        data-currency={currency.id}
        style={{ textAlign: "right", lineHeight: 1.1 }}
      >
        <div
          style={{
            fontSize: valueFontSize,
            fontWeight: 700,
            color: currency.color,
            letterSpacing: ".04em",
          }}
        >
          {currency.prefix}{currency.formatValue(value)}
        </div>
        <div
          style={{
            fontSize: labelFontSize,
            color: "var(--text-muted, #7a6040)",
            letterSpacing: ".15em",
            marginTop: 2,
          }}
        >
          {currency.shortLabel}
        </div>
      </div>
    </HoverTooltipWrapper>
  );
}
