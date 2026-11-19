"use client";

import { useId, useState, type ReactNode } from "react";

export interface ChoiceItem {
  id: string;
  title: ReactNode;
  /** What the player needs to compare: condition, stats, cost, where it came from. */
  meta?: ReactNode;
  /** A short marker such as "Suggested". */
  tag?: string;
  disabled?: boolean;
  /** Why it can't be picked, shown as text. */
  reason?: string;
}

export interface ChoiceListProps {
  label: string;
  items: readonly ChoiceItem[];
  /** The chosen item's id. An id that isn't in `items` shows as nothing chosen. */
  value: string;
  onChange: (id: string) => void;
  /** Lets the first item of the fieldset be found by tests and jump targets. */
  id?: string;
  /** Shown instead of the list when there is nothing to choose from. */
  emptyText?: ReactNode;
  /** Show only the chosen row with a Change button; opens to the full list. Good where several choices stack up. */
  compact?: boolean;
  hideLabel?: boolean;
}

function Row({ item }: { item: ChoiceItem }) {
  return (
    <span className="choice-text">
      <span className="choice-title">
        {item.title}
        {item.tag && <span className="choice-tag">{item.tag}</span>}
      </span>
      {item.meta && <span className="choice-meta">{item.meta}</span>}
      {item.disabled && item.reason && <span className="why">{item.reason}</span>}
    </span>
  );
}

/**
 * Pick one thing from a list where the rows carry what you need to compare.
 * Replaces native dropdowns for vehicles, parts and stock: nothing is hidden behind a click.
 */
export function ChoiceList({ label, items, value, onChange, id, emptyText, compact, hideLabel }: ChoiceListProps) {
  const name = useId();
  const [open, setOpen] = useState(false);
  const chosen = items.find((item) => item.id === value);
  const legend = <legend className={hideLabel ? "sr-only" : undefined}>{label}</legend>;

  if (items.length === 0) {
    return (
      <fieldset className="choice-list" id={id}>
        {legend}
        {emptyText && <p className="empty">{emptyText}</p>}
      </fieldset>
    );
  }

  // One valid answer is not a choice: say what it is and move on.
  if (items.length === 1 && chosen && !chosen.disabled) {
    return (
      <fieldset className="choice-list" id={id}>
        {legend}
        <div className="choice-row only"><Row item={chosen} /></div>
      </fieldset>
    );
  }

  if (compact && !open && chosen) {
    return (
      <fieldset className="choice-list" id={id}>
        {legend}
        <div className="choice-row only">
          <Row item={chosen} />
          <button type="button" className="link-btn" aria-expanded={false} onClick={() => setOpen(true)}>
            Change<span className="sr-only"> {label}</span> ({items.length})
          </button>
        </div>
      </fieldset>
    );
  }

  return (
    <fieldset className="choice-list" id={id}>
      {legend}
      <div className="choice-rows">
        {items.map((item) => (
          <label key={item.id} className={`choice-row${item.id === value ? " on" : ""}${item.disabled ? " off" : ""}`}>
            <input
              type="radio"
              name={name}
              checked={item.id === value}
              disabled={item.disabled}
              onChange={() => {
                onChange(item.id);
                if (compact) setOpen(false);
              }}
            />
            <Row item={item} />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
