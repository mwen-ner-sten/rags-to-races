import type { HTMLAttributes, ReactNode } from "react";

export interface PanelProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  /** Small uppercase line above the title (e.g. "JUNKYARD"). */
  kicker?: ReactNode;
  title?: ReactNode;
  /** Right-aligned content on the header row (actions, a Stat, a RateChip). */
  aside?: ReactNode;
  /** Remove the inner padding so children (lists, tables) can bleed to the edge. */
  flush?: boolean;
  children?: ReactNode;
}

/**
 * Themed surface with an optional kicker/title header. Colours and borders
 * come from `.ui-panel` in globals.css so every theme renders it correctly.
 */
export default function Panel({ kicker, title, aside, flush = false, className, children, ...rest }: PanelProps) {
  const hasHeader = kicker != null || title != null || aside != null;
  return (
    <section className={["ui-panel", flush ? "ui-panel--flush" : "", className ?? ""].filter(Boolean).join(" ")} {...rest}>
      {hasHeader && (
        <header className="ui-panel__head">
          <div className="ui-panel__titles">
            {kicker != null && <div className="ui-kicker">{kicker}</div>}
            {title != null && <h2 className="ui-panel__title">{title}</h2>}
          </div>
          {aside != null && <div className="ui-panel__aside">{aside}</div>}
        </header>
      )}
      <div className="ui-panel__body">{children}</div>
    </section>
  );
}
