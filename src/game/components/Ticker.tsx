"use client";

import { useEffect, useRef } from "react";
import { useGame } from "../store";
import { KIND_LABEL, Lately } from "./Feed";

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
  const kind = fresh?.kind ?? lastKind;
  const text = fresh?.text ?? lastText ?? "Quiet in the garage.";
  return (
    <button
      type="button"
      className={`ticker ticker-${placement}`}
      data-fresh={fresh ? "true" : undefined}
      data-kind={kind}
      onClick={onOpen}
      aria-label="Open recent events"
    >
      {kind && <span className="ticker-kind">{KIND_LABEL[kind]}</span>}
      <span key={fresh?.id ?? "idle"} className="ticker-text" role="status">
        {text}
      </span>
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
