"use client";

import { useGameStore } from "@/state/store";
import type { ResourceRate } from "@/engine/rates";
import { CURRENCY_DEFINITIONS } from "@/data/currencies";
import { Section, Row, TooltipPanel, HoverTooltipWrapper } from "@/components/TooltipPrimitives";
import RateChip from "@/components/ui/RateChip";
import ResourceGlyph from "./ResourceGlyph";
import { capPercent, formatAmount, formatRate } from "./formatRate";

const CURRENCY_BY_ID = new Map(CURRENCY_DEFINITIONS.map((c) => [c.id, c]));

function ResourceTooltip({ anchorRect, rate }: { anchorRect: DOMRect; rate: ResourceRate }) {
  // Subscribe to the whole store so the breakdown updates while hovered.
  const state = useGameStore((s) => s);
  const currency = CURRENCY_BY_ID.get(rate.id);
  const sections = currency ? currency.getTooltip(state) : [];
  const sources = rate.sources ?? [];

  return (
    <TooltipPanel anchorRect={anchorRect}>
      {currency && (
        <div className="rr-tip__desc">{currency.description}</div>
      )}
      <Section label="Rate">
        {sources.map((source) => (
          <Row
            key={source.label}
            label={source.label}
            value={formatRate(source.perSecond)}
            color={source.perSecond > 0 ? "var(--success)" : source.perSecond < 0 ? "var(--danger)" : undefined}
            dim={source.perSecond === 0}
          />
        ))}
        <Row
          label="Net"
          value={formatRate(rate.perSecond)}
          color={rate.perSecond > 0 ? "var(--success)" : rate.perSecond < 0 ? "var(--danger)" : undefined}
        />
        {rate.cap != null && <Row label="Cap" value={formatAmount(rate.cap)} dim />}
      </Section>
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

export interface ResourceRowProps {
  rate: ResourceRate;
  /** Tighter row for the mobile strip. */
  compact?: boolean;
}

/**
 * One line of the resource rail: glyph, label, amount, rate chip, and a cap
 * bar when the resource is capped. Hover or keyboard focus opens the
 * breakdown tooltip.
 */
export default function ResourceRow({ rate, compact = false }: ResourceRowProps) {
  const percent = capPercent(rate.amount, rate.cap);
  const full = percent != null && percent >= 100;

  return (
    <HoverTooltipWrapper block renderTooltip={(anchorRect) => <ResourceTooltip anchorRect={anchorRect} rate={rate} />}>
      <div
        className={["rr-row", compact ? "rr-row--compact" : ""].filter(Boolean).join(" ")}
        data-resource={rate.id}
        tabIndex={0}
        role="group"
        aria-label={`${rate.label}: ${rate.prefix ?? ""}${formatAmount(rate.amount)}, ${formatRate(rate.perSecond)}`}
      >
        <span className="rr-icon" style={{ color: rate.color }}>
          <ResourceGlyph id={rate.id} size={compact ? 14 : 16} />
        </span>
        <div className="rr-main">
          <div className="rr-top">
            <span className="rr-label">{rate.label}</span>
            <RateChip perSecond={rate.perSecond} size="sm" />
          </div>
          <div className="rr-amount" style={{ color: rate.color }}>
            {rate.prefix}
            {formatAmount(rate.amount)}
            {rate.cap != null && <span className="rr-cap-text"> / {formatAmount(rate.cap)}</span>}
          </div>
          {percent != null && (
            <div className="rr-cap" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)} aria-label={`${rate.label} storage`}>
              <div className={["rr-cap__fill", full ? "rr-cap__fill--full" : ""].filter(Boolean).join(" ")} style={{ width: `${percent}%` }} />
            </div>
          )}
        </div>
      </div>
    </HoverTooltipWrapper>
  );
}
