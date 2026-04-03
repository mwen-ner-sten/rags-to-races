"use client";

import { useState, useEffect, useRef } from "react";
import { useGameStore, type LogCategory } from "@/state/store";

const CATEGORIES: { id: LogCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "scavenge", label: "Scavenge" },
  { id: "sell", label: "Sell" },
  { id: "race", label: "Race" },
  { id: "build", label: "Build" },
  { id: "upgrade", label: "Upgrade" },
  { id: "prestige", label: "Prestige" },
  { id: "gear", label: "Gear" },
  { id: "craft", label: "Craft" },
  { id: "trade", label: "Trade" },
  { id: "tick", label: "Auto" },
];

const CATEGORY_COLORS: Record<LogCategory, string> = {
  scavenge: "var(--success)",
  sell: "var(--warning)",
  race: "var(--accent)",
  build: "var(--accent-secondary)",
  upgrade: "var(--info)",
  prestige: "var(--warning)",
  gear: "var(--accent)",
  craft: "var(--accent-secondary)",
  trade: "var(--info)",
  tick: "var(--text-muted)",
};

function formatTimeAgo(ts: number): string {
  const diff = Math.max(0, Date.now() - ts);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export default function LogPanel() {
  const activityLog = useGameStore((s) => s.activityLog);
  const clearActivityLog = useGameStore((s) => s.clearActivityLog);
  const [filter, setFilter] = useState<LogCategory | "all">("all");
  const [, setTick] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Update relative timestamps every 10s
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  const filtered = filter === "all"
    ? activityLog
    : activityLog.filter((e) => e.category === filter);

  // Show newest first
  const entries = [...filtered].reverse();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2
          className="text-sm font-semibold uppercase tracking-widest"
          style={{ color: "var(--text-heading)" }}
        >
          Activity Log
        </h2>
        <button
          onClick={clearActivityLog}
          className="rounded-md border px-2 py-1 text-xs transition-colors hover:opacity-80"
          style={{
            borderColor: "var(--btn-border)",
            color: "var(--text-secondary)",
          }}
        >
          Clear
        </button>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setFilter(cat.id)}
            className={`rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
              filter === cat.id ? "opacity-100" : "opacity-50 hover:opacity-75"
            }`}
            style={{
              background: filter === cat.id ? "var(--accent-bg)" : "transparent",
              color: filter === cat.id ? "var(--accent)" : "var(--text-muted)",
              border: `1px solid ${filter === cat.id ? "var(--accent-border)" : "var(--panel-border)"}`,
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Log entries */}
      <div
        ref={scrollRef}
        className="max-h-[70vh] overflow-y-auto rounded-lg border"
        style={{
          borderColor: "var(--panel-border)",
          background: "var(--panel-bg)",
        }}
      >
        {entries.length === 0 ? (
          <div
            className="px-4 py-8 text-center text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            No activity yet. Start scavenging!
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--divider)" }}>
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-2 px-3 py-2"
              >
                {/* Category badge */}
                <span
                  className="mt-0.5 inline-block shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
                  style={{
                    color: CATEGORY_COLORS[entry.category],
                    background: "var(--accent-bg)",
                    border: `1px solid ${CATEGORY_COLORS[entry.category]}`,
                    opacity: 0.8,
                  }}
                >
                  {entry.category === "tick" ? "auto" : entry.category}
                </span>

                {/* Message */}
                <span
                  className="flex-1 text-xs leading-relaxed"
                  style={{ color: "var(--text-primary)" }}
                >
                  {entry.message}
                </span>

                {/* Currency deltas */}
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  {entry.scrapDelta != null && entry.scrapDelta !== 0 && (
                    <span
                      className="text-[10px] font-semibold"
                      style={{
                        color: entry.scrapDelta > 0 ? "var(--success)" : "var(--danger)",
                      }}
                    >
                      {entry.scrapDelta > 0 ? "+" : ""}${entry.scrapDelta}
                    </span>
                  )}
                  {entry.repDelta != null && entry.repDelta !== 0 && (
                    <span
                      className="text-[10px] font-semibold"
                      style={{ color: "var(--info)" }}
                    >
                      {entry.repDelta > 0 ? "+" : ""}{entry.repDelta} rep
                    </span>
                  )}
                  {entry.lpDelta != null && entry.lpDelta !== 0 && (
                    <span
                      className="text-[10px] font-semibold"
                      style={{ color: "var(--warning)" }}
                    >
                      {entry.lpDelta > 0 ? "+" : ""}{entry.lpDelta} LP
                    </span>
                  )}
                </div>

                {/* Timestamp */}
                <span
                  className="mt-0.5 shrink-0 text-[10px]"
                  style={{ color: "var(--text-muted)" }}
                >
                  {formatTimeAgo(entry.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        className="text-center text-[10px]"
        style={{ color: "var(--text-muted)" }}
      >
        Showing {entries.length} of {activityLog.length} entries
        {filter !== "all" && " (filtered)"}
      </div>
    </div>
  );
}
