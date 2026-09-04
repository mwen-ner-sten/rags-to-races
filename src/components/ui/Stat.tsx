import type { ReactNode } from "react";
import RateChip from "./RateChip";

export interface StatProps {
  label: ReactNode;
  value: ReactNode;
  /** Net per-second change; renders a RateChip when provided. */
  rate?: number;
  /** Colour for the value; defaults to the heading token. */
  color?: string;
  align?: "left" | "right";
  size?: "sm" | "md";
  className?: string;
}

/**
 * Label + value (+ optional rate) block used by the header, the mobile
 * resource strip, and anywhere a number needs a caption.
 */
export default function Stat({ label, value, rate, color, align = "left", size = "md", className }: StatProps) {
  return (
    <div className={["ui-stat", `ui-stat--${align}`, `ui-stat--${size}`, className ?? ""].filter(Boolean).join(" ")}>
      <div className="ui-stat__label">{label}</div>
      <div className="ui-stat__row">
        <span className="ui-stat__value" style={color ? { color } : undefined}>{value}</span>
        {rate != null && <RateChip perSecond={rate} size="sm" />}
      </div>
    </div>
  );
}
