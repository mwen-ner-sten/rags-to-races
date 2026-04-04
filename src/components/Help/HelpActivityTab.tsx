"use client";

import { useState, useEffect } from "react";
import { useGameStore, type LogCategory } from "@/state/store";

const CATEGORIES: { id: LogCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "scavenge", label: "Scav" },
  { id: "sell", label: "Sell" },
  { id: "race", label: "Race" },
  { id: "build", label: "Build" },
  { id: "upgrade", label: "Upg" },
  { id: "prestige", label: "Pres" },
  { id: "gear", label: "Gear" },
  { id: "craft", label: "Craft" },
  { id: "trade", label: "Trade" },
  { id: "tick", label: "Auto" },
];

const CATEGORY_COLORS: Record<LogCategory, string> = {
  scavenge: "#6aaa3a",
  sell: "#d4a030",
  race: "#5599dd",
  build: "#c87030",
  upgrade: "#9966cc",
  prestige: "#d4a030",
  gear: "#44aacc",
  craft: "#44aa88",
  trade: "#cc6699",
  tick: "#888",
};

function formatTimeAgo(ts: number): string {
  const diff = Math.max(0, Date.now() - ts);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}

export default function HelpActivityTab() {
  const [filter, setFilter] = useState<LogCategory | "all">("all");
  const [, setTick] = useState(0);

  const activityLog = useGameStore((s) => s.activityLog);
  const clearActivityLog = useGameStore((s) => s.clearActivityLog);

  // Update relative timestamps every 10s
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  const filtered = filter === "all"
    ? activityLog
    : activityLog.filter((e) => e.category === filter);
  const entries = [...filtered].reverse();

  return (
    <div style={{
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,.1)",
      background: "rgba(12,12,16,.6)",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px 8px",
        borderBottom: "1px solid rgba(255,255,255,.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.7)" }}>
          Activity Log
        </span>
        <button
          onClick={clearActivityLog}
          style={{
            fontSize: 10,
            color: "rgba(255,255,255,.35)",
            background: "none",
            border: "1px solid rgba(255,255,255,.1)",
            borderRadius: 4,
            padding: "2px 8px",
            cursor: "pointer",
            letterSpacing: ".05em",
          }}
        >
          Clear
        </button>
      </div>

      {/* Category filters */}
      <div style={{
        padding: "6px 12px",
        borderBottom: "1px solid rgba(255,255,255,.06)",
        display: "flex",
        flexWrap: "wrap",
        gap: 3,
      }}>
        {CATEGORIES.map((cat) => {
          const active = filter === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              style={{
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: ".04em",
                padding: "6px 14px",
                borderRadius: 6,
                border: `1px solid ${active ? "rgba(255,255,255,.2)" : "rgba(255,255,255,.06)"}`,
                background: active ? "rgba(255,255,255,.1)" : "transparent",
                color: active ? "#fff" : "rgba(255,255,255,.35)",
                cursor: "pointer",
                transition: "all .1s",
              }}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Log entries */}
      <div style={{
        overflowY: "auto",
        minHeight: 0,
        maxHeight: "calc(100vh - 320px)",
      }}>
        {entries.length === 0 ? (
          <div style={{ padding: "32px 16px", textAlign: "center", fontSize: 12, color: "rgba(255,255,255,.25)" }}>
            No activity yet. Start scavenging!
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                padding: "6px 12px",
                borderBottom: "1px solid rgba(255,255,255,.04)",
              }}
            >
              {/* Category badge */}
              <span style={{
                marginTop: 2,
                flexShrink: 0,
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: ".06em",
                textTransform: "uppercase",
                padding: "1px 5px",
                borderRadius: 3,
                color: CATEGORY_COLORS[entry.category],
                background: `${CATEGORY_COLORS[entry.category]}18`,
                border: `1px solid ${CATEGORY_COLORS[entry.category]}30`,
              }}>
                {entry.category === "tick" ? "auto" : entry.category}
              </span>

              {/* Message */}
              <span style={{ flex: 1, fontSize: 11, lineHeight: 1.5, color: "rgba(255,255,255,.7)" }}>
                {entry.message}
              </span>

              {/* Currency deltas + timestamp */}
              <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1 }}>
                {entry.scrapDelta != null && entry.scrapDelta !== 0 && (
                  <span style={{
                    fontSize: 10,
                    fontWeight: 600,
                    fontFamily: "monospace",
                    color: entry.scrapDelta > 0 ? "#6aaa3a" : "#dd5544",
                  }}>
                    {entry.scrapDelta > 0 ? "+" : ""}${entry.scrapDelta}
                  </span>
                )}
                {entry.repDelta != null && entry.repDelta !== 0 && (
                  <span style={{
                    fontSize: 10,
                    fontWeight: 600,
                    fontFamily: "monospace",
                    color: "#5599dd",
                  }}>
                    {entry.repDelta > 0 ? "+" : ""}{entry.repDelta} rep
                  </span>
                )}
                {entry.lpDelta != null && entry.lpDelta !== 0 && (
                  <span style={{
                    fontSize: 10,
                    fontWeight: 600,
                    fontFamily: "monospace",
                    color: "#d4a030",
                  }}>
                    {entry.lpDelta > 0 ? "+" : ""}{entry.lpDelta} LP
                  </span>
                )}
                <span style={{ fontSize: 9, color: "rgba(255,255,255,.2)" }}>
                  {formatTimeAgo(entry.timestamp)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: "6px 12px",
        borderTop: "1px solid rgba(255,255,255,.06)",
        textAlign: "center",
        fontSize: 10,
        color: "rgba(255,255,255,.2)",
      }}>
        {entries.length} of {activityLog.length} entries
        {filter !== "all" && " (filtered)"}
      </div>
    </div>
  );
}
