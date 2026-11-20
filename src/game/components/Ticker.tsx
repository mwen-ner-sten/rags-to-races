"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useGame } from "../store";
import { KIND_LABEL, Lately } from "./Feed";
import { radioPool } from "../radioLines";

/** How long a fresh note holds the ticker, shorter while others wait behind it. */
const SHOW_MS = 4500;
const QUEUED_SHOW_MS = 2500;

/** Advances the ticker: drops the note on show once it has had its time. Renders nothing. */
export function TickerClock() {
  const current = useGame((s) => s.toasts[0]?.id);
  const queued = useGame((s) => s.toasts.length > 1);
  const dismiss = useGame((s) => s.dismissToast);
  useEffect(() => {
    if (!current) return;
    const t = window.setTimeout(() => dismiss(current), queued ? QUEUED_SHOW_MS : SHOW_MS);
    return () => window.clearTimeout(t);
  }, [current, queued, dismiss]);
  return null;
}

/** After news fades, the latest item stays this long before the radio takes over. */
const HOLD_LATEST_MS = 12_000;
/** Each radio line stays up this long. */
const RADIO_LINE_MS = 14_000;

function shuffled(lines: readonly string[]): string[] {
  const deck = [...lines];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/** A radio line while the ticker has been idle a while, else null. Deals the whole pool before repeating. */
function useRadio(idle: boolean, teamFounded: boolean): string | null {
  const [line, setLine] = useState<string | null>(null);
  const deck = useRef<string[]>([]);
  useEffect(() => {
    deck.current = [];
  }, [teamFounded]);
  useEffect(() => {
    if (!idle) return;
    const next = () => {
      if (deck.current.length === 0) deck.current = shuffled(radioPool(teamFounded));
      setLine(deck.current.pop() ?? null);
    };
    let interval: number | undefined;
    const hold = window.setTimeout(() => {
      next();
      interval = window.setInterval(next, RADIO_LINE_MS);
    }, HOLD_LATEST_MS);
    return () => {
      window.clearTimeout(hold);
      window.clearInterval(interval);
      // Fresh news interrupts the radio; the next quiet spell starts with the latest item again.
      setLine(null);
    };
  }, [idle, teamFounded]);
  return idle ? line : null;
}

/** Scroll speed for a line too long for the ticker, in px per second. */
const RUN_PX_PER_S = 45;
/** Time the line rests at each end before scrolling back. */
const RUN_REST_MS = 1800;

interface TickerTextProps {
  text: string;
  /** Announce it to screen readers (fresh news only, not idle chatter). */
  live: boolean;
}

/** The ticker's text window: a line that doesn't fit scrolls across and back so it can be read whole. */
function TickerText({ text, live }: TickerTextProps) {
  const windowRef = useRef<HTMLSpanElement>(null);
  const runRef = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const outer = windowRef.current;
    const inner = runRef.current;
    if (!outer || !inner) return;
    const measure = () => {
      const over = inner.scrollWidth - outer.clientWidth;
      if (over > 4) {
        const travelMs = (over / RUN_PX_PER_S) * 1000;
        outer.style.setProperty("--run", `${-over}px`);
        outer.style.setProperty("--run-ms", `${Math.round(travelMs + 2 * RUN_REST_MS)}ms`);
        outer.dataset.run = "true";
      } else {
        delete outer.dataset.run;
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [text]);
  return (
    <span ref={windowRef} className="ticker-text" role={live ? "status" : undefined}>
      <span ref={runRef} className="ticker-run">
        {text}
      </span>
    </span>
  );
}

interface TickerProps {
  /** `inline` sits in the desktop header row; `strip` is the sticky line on phones and touchscreens. */
  placement: "inline" | "strip";
  onOpen: () => void;
}

/**
 * One line of race radio: the newest news while it is fresh, then the latest feed item, dimmed.
 * Never covers the game; tap it for the whole feed.
 */
export function Ticker({ placement, onOpen }: TickerProps) {
  const fresh = useGame((s) => s.toasts[0]);
  const waiting = useGame((s) => Math.max(0, s.toasts.length - 1));
  const lastText = useGame((s) => s.game?.run.feed.at(-1)?.text);
  const lastKind = useGame((s) => s.game?.run.feed.at(-1)?.kind);
  const teamFounded = useGame((s) => !!s.game?.era);
  const radio = useRadio(!fresh, teamFounded);
  const kind = fresh?.kind ?? (radio ? undefined : lastKind);
  const text = fresh?.text ?? radio ?? lastText ?? "Quiet in the garage.";
  return (
    <button
      type="button"
      className={`ticker ticker-${placement}`}
      data-fresh={fresh ? "true" : undefined}
      data-kind={radio && !fresh ? "radio" : kind}
      onClick={onOpen}
      aria-label="Open recent events"
    >
      {radio && !fresh ? <span className="ticker-kind">Radio</span> : kind && <span className="ticker-kind">{KIND_LABEL[kind]}</span>}
      <TickerText key={fresh?.id ?? radio ?? "idle"} text={text} live={!!fresh} />
      {waiting > 0 && <span className="ticker-more num">+{waiting}</span>}
    </button>
  );
}

interface FeedSheetProps {
  open: boolean;
  onClose: () => void;
}

/** The whole Lately feed in a dialog, opened from the ticker. */
export function FeedSheet({ open, onClose }: FeedSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog ref={ref} className="feed-sheet" onClose={onClose} aria-label="Recent events">
      {open && <Lately all />}
      <div className="actions">
        <button className="btn" type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </dialog>
  );
}
