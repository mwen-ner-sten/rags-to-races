"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

export interface NavTab<T extends string> {
  id: T;
  label: string;
  /** An unread tip lives on this tab (never set for the active tab). */
  unread: boolean;
  /** What the unread dot means when it isn't a tip. */
  unreadLabel?: string;
  /** Small count badge, e.g. parts waiting on the driveway. */
  badge?: number;
  badgeLabel?: string;
}

interface TabNavProps<T extends string> {
  tabs: readonly NavTab<T>[];
  active: T;
  onShow: (id: T) => void;
}

/** In bottom-bar (touch / phone) mode this many tabs stay on the bar; the rest move into the More sheet. */
const BAR_TABS = 4;
/** With this many tabs or fewer there is no More button: everything fits on the bar. */
const BAR_CAPACITY = 5;

interface Edges {
  start: boolean;
  end: boolean;
}

function TabMarks<T extends string>({ tab }: { tab: NavTab<T> }) {
  return (
    <>
      {tab.unread && <span className="tab-dot" aria-label={tab.unreadLabel ?? "New tip"} />}
      {tab.badge !== undefined && tab.badge > 0 && (
        <span className="tab-badge num" aria-label={tab.badgeLabel ?? `${tab.badge}`}>
          {tab.badge}
        </span>
      )}
    </>
  );
}

function Chevron({ dir }: { dir: "start" | "end" }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
      <polyline points={dir === "start" ? "9,2 4,7 9,12" : "5,2 10,7 5,12"} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Section navigation. One set of tab buttons is always rendered; CSS decides the layout:
 * a sticky top bar (with scroll hints) on pointer devices, a fixed bottom bar plus a More
 * sheet on phones and touchscreens. See `.tabnav` in globals.css for the media query.
 */
export function TabNav<T extends string>({ tabs, active, onShow }: TabNavProps<T>) {
  const [open, setOpen] = useState(false);
  const [edges, setEdges] = useState<Edges>({ start: false, end: false });
  const wrapRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const sheetId = useId();

  const hasMore = tabs.length > BAR_CAPACITY;
  const hiddenTabs = hasMore ? tabs.slice(BAR_TABS) : [];
  const activeHidden = hiddenTabs.find((t) => t.id === active);
  const hiddenUnread = hiddenTabs.some((t) => t.unread);
  const layoutKey = tabs.map((t) => t.id).join(",");

  const measure = useCallback(() => {
    const el = navRef.current;
    if (!el) return;
    const start = el.scrollLeft > 1;
    const end = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    setEdges((previous) => (previous.start === start && previous.end === end ? previous : { start, end }));
  }, []);

  useEffect(() => {
    measure();
    const el = navRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure, layoutKey]);

  const closeSheet = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) moreRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const sheet = sheetRef.current;
    const target = sheet?.querySelector<HTMLButtonElement>("button[aria-current]") ?? sheet?.querySelector<HTMLButtonElement>("button");
    target?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSheet(true);
    };
    const onPointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !wrapRef.current?.contains(event.target)) closeSheet(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open, closeSheet]);

  const scrollByChunk = (direction: 1 | -1) => {
    const el = navRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * Math.max(160, el.clientWidth * 0.6), behavior: reduce ? "auto" : "smooth" });
  };

  const choose = (id: T) => {
    onShow(id);
    if (open) closeSheet(true);
  };

  const moreLabel = `More${activeHidden ? ` · ${activeHidden.label}` : ""}${hiddenUnread && !activeHidden ? " (new tip)" : ""}`;

  return (
    <div ref={wrapRef} className="tabnav" data-edge-start={edges.start} data-edge-end={edges.end}>
      <nav ref={navRef} className="tabs" aria-label="Sections" onScroll={measure}>
        {tabs.map((t, i) => (
          <button
            key={t.id}
            type="button"
            className={active === t.id ? "on" : ""}
            aria-current={active === t.id ? "page" : undefined}
            data-overflow={hasMore && i >= BAR_TABS ? "true" : undefined}
            onClick={() => choose(t.id)}
          >
            <span className="tab-label">{t.label}</span>
            <TabMarks tab={t} />
          </button>
        ))}
        {hasMore && (
          <button
            ref={moreRef}
            type="button"
            className={`tab-more${activeHidden ? " on" : ""}`}
            aria-label={moreLabel}
            aria-expanded={open}
            aria-controls={sheetId}
            onClick={() => (open ? closeSheet(false) : setOpen(true))}
          >
            <span className="tab-label">More</span>
            {activeHidden && <span className="tab-sub">{activeHidden.label}</span>}
            {hiddenUnread && !activeHidden && <span className="tab-dot" aria-hidden="true" />}
          </button>
        )}
      </nav>
      {edges.start && (
        <button type="button" className="tabs-chev start" aria-label="Earlier sections" onClick={() => scrollByChunk(-1)}>
          <Chevron dir="start" />
        </button>
      )}
      {edges.end && (
        <button type="button" className="tabs-chev end" aria-label="More sections" onClick={() => scrollByChunk(1)}>
          <Chevron dir="end" />
        </button>
      )}
      {hasMore && (
        <div ref={sheetRef} id={sheetId} className="tab-sheet" role="group" aria-label="Other sections" hidden={!open}>
          {hiddenTabs.map((t) => (
            <button key={t.id} type="button" className={active === t.id ? "on" : ""} aria-current={active === t.id ? "page" : undefined} onClick={() => choose(t.id)}>
              <span className="tab-label">{t.label}</span>
              <TabMarks tab={t} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
