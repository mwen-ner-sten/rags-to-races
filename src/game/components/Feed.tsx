"use client";

import { memo, useEffect, useMemo, useState } from "react";
import type { FeedItem, FeedKind } from "@/core/types";
import { duration } from "../format";
import { useGame } from "../store";

const KIND_LABEL: Record<FeedKind, string> = {
  haul: "Trip",
  driveway: "Driveway",
  bench: "Bench",
  habit: "Habit",
  place: "Place",
  knowhow: "Learned",
  build: "Built",
  race: "Race",
  story: "Note",
};

const SHORT_COUNT = 6;
const COMPACT_COUNT = 3;
const MOBILE_QUERY = "(max-width: 640px)";
/** Re-render the relative times this often (Season ms). */
const AGE_BUCKET_MS = 10_000;

export function feedAge(ms: number): string {
  return ms < 60_000 ? "just now" : `${duration(ms)} ago`;
}

/** Changes only when the feed's visible content does, so a 500 ms tick does not re-render the list. */
function feedSignature(feed: readonly FeedItem[] | undefined): string {
  return (feed ?? []).map((i) => `${i.id}|${i.text}|${i.count ?? 1}|${i.at}`).join("\n");
}

function useCompact(): boolean {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const query = window.matchMedia(MOBILE_QUERY);
    const sync = () => setCompact(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  return compact;
}

interface FeedRowProps {
  item: FeedItem;
  age: number;
}

const FeedRow = memo(function FeedRow({ item, age }: FeedRowProps) {
  return (
    <li className="lately-item" data-kind={item.kind}>
      <span className="lately-kind">{KIND_LABEL[item.kind]}</span>
      <span className="lately-text">
        {item.text}
        {(item.count ?? 1) > 1 && <span className="lately-count num"> ×{item.count}</span>}
      </span>
      <span className="lately-age num muted">{feedAge(age)}</span>
    </li>
  );
});

export function Lately() {
  const signature = useGame((s) => feedSignature(s.game?.run.feed));
  const ageBucket = useGame((s) => Math.floor((s.game?.run.seasonMs ?? 0) / AGE_BUCKET_MS));
  const compact = useCompact();
  const [expanded, setExpanded] = useState(false);
  // The signature stands in for the feed's identity: it changes whenever the content does.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const feed = useMemo(() => useGame.getState().game?.run.feed ?? [], [signature]);
  const now = ageBucket * AGE_BUCKET_MS;
  const newest = useMemo(() => [...feed].reverse(), [feed]);
  if (newest.length === 0) return null;
  const short = compact ? COMPACT_COUNT : SHORT_COUNT;
  const shown = expanded ? newest : newest.slice(0, short);
  return (
    <section className="lately" aria-labelledby="lately-h">
      <h3 id="lately-h" className="label">Lately</h3>
      <ol className="lately-list" aria-live="polite">
        {shown.map((item) => (
          <FeedRow key={item.id} item={item} age={Math.max(0, now - item.at)} />
        ))}
      </ol>
      {newest.length > short && (
        <button className="link-btn" onClick={() => setExpanded((e) => !e)} aria-expanded={expanded}>
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </section>
  );
}
