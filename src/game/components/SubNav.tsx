"use client";

import type { KeyboardEvent } from "react";

export interface SubNavItem<Id extends string> {
  id: Id;
  label: string;
  /** A count worth acting on, such as parts waiting on the driveway. */
  badge?: number;
  /** Something new or ready in this section. */
  dot?: boolean;
  dotLabel?: string;
}

interface SubNavProps<Id extends string> {
  /** Prefix for the tab ids: tabs get `${idPrefix}-tab-${id}` and control `${idPrefix}-panel`. */
  idPrefix: string;
  label: string;
  items: readonly SubNavItem<Id>[];
  value: Id;
  onChange: (id: Id) => void;
}

export function subNavTabId(idPrefix: string, id: string): string {
  return `${idPrefix}-tab-${id}`;
}

/** The sections inside one main tab. One look and one keyboard model wherever a tab has more than one job. */
export function SubNav<Id extends string>({ idPrefix, label, items, value, onChange }: SubNavProps<Id>) {
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (step === 0 || items.length === 0) return;
    e.preventDefault();
    const at = Math.max(0, items.findIndex((item) => item.id === value));
    const next = items[(at + step + items.length) % items.length].id;
    onChange(next);
    document.getElementById(subNavTabId(idPrefix, next))?.focus();
  };
  return (
    <div className="subtabs" role="tablist" aria-label={label} onKeyDown={onKey}>
      {items.map((item) => {
        const on = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={subNavTabId(idPrefix, item.id)}
            aria-controls={`${idPrefix}-panel`}
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            className={on ? "on" : ""}
            onClick={() => onChange(item.id)}
          >
            {item.label}
            {!!item.badge && <span className="tab-badge num">{item.badge}</span>}
            {!on && item.dot && <span className="tab-dot" aria-label={item.dotLabel ?? "Something new"} />}
          </button>
        );
      })}
    </div>
  );
}
