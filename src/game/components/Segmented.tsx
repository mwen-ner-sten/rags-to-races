import type { ReactNode } from "react";
import type { RaceCall } from "@/core/types";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
  /** Why it is disabled, shown as text. */
  reason?: string;
}

export interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
  id?: string;
  /** Text under the control, e.g. the chosen option's blurb. */
  hint?: ReactNode;
  /** Keep the legend for screen readers only. */
  hideLabel?: boolean;
}

/** Nurse or Push, in the long-form wording used on the owner and race screens. */
export const PACE_OPTIONS: readonly SegmentedOption<RaceCall>[] = [
  { value: "nurse", label: "Nurse it" },
  { value: "push", label: "Push" },
];

/** The same choice with the short wording used on the club and county screens. */
export const PACE_OPTIONS_SHORT: readonly SegmentedOption<RaceCall>[] = [
  { value: "nurse", label: "Nurse" },
  { value: "push", label: "Push" },
];

/** A small fixed choice shown as one row of buttons instead of a native dropdown. */
export function Segmented<T extends string>({ label, value, options, onChange, id, hint, hideLabel }: SegmentedProps<T>) {
  const reasons = [...new Set(options.flatMap((o) => (o.disabled && o.reason ? [o.reason] : [])))];
  return (
    <div className="segmented-field">
      <fieldset className="segmented" id={id}>
        <legend className={hideLabel ? "sr-only" : undefined}>{label}</legend>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            className={value === o.value ? "on" : ""}
            aria-pressed={value === o.value}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </fieldset>
      {reasons.map((reason) => <p key={reason} className="why segmented-note">{reason}</p>)}
      {hint !== undefined && hint !== null && hint !== false && <p className="muted segmented-note">{hint}</p>}
    </div>
  );
}
