"use client";

import Button from "./Button";
import { describeRepPurchase } from "@/engine/repPurchase";

export interface RepUnlockControlProps {
  /** Rep price of the item. */
  cost: number;
  /** Spendable Rep balance. */
  repPoints: number;
  onUnlock: () => void;
  /** Extra text after the price, e.g. "· $50" for a workshop line's first level. */
  suffix?: string;
  /** A hard block such as a missing prerequisite. Wins over the Rep shortfall. */
  blockedReason?: string;
  /** A softer block such as missing Scrap Bucks. Shown only when Rep is covered. */
  secondaryReason?: string;
  testId?: string;
  tutorialTarget?: string;
  size?: "sm" | "md";
  block?: boolean;
}

/**
 * The one "Unlock · N Rep" button. Locked content is bought, never granted,
 * so every locked card renders this instead of a threshold sentence. When the
 * player cannot afford it the button is disabled and its tooltip says how much
 * more Rep is needed.
 */
export default function RepUnlockControl({
  cost,
  repPoints,
  onUnlock,
  suffix,
  blockedReason,
  secondaryReason,
  testId,
  tutorialTarget,
  size = "sm",
  block = false,
}: RepUnlockControlProps) {
  const view = describeRepPurchase(cost, repPoints);
  const reason = blockedReason ?? view.disabledReason ?? secondaryReason;
  const disabled = reason !== undefined;
  const label = suffix ? `${view.label} ${suffix}` : view.label;

  return (
    <div className="mt-2 flex flex-col gap-1">
      <Button
        variant="primary"
        size={size}
        block={block}
        onClick={onUnlock}
        disabled={disabled}
        title={reason}
        aria-label={disabled ? `${label} — ${reason}` : label}
        data-testid={testId}
        data-tutorial={tutorialTarget}
        data-rep-cost={view.cost}
      >
        {label}
      </Button>
      {reason && (
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {reason}
        </span>
      )}
    </div>
  );
}
