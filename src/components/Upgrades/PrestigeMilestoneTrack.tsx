"use client";

import { useGameStore } from "@/state/store";
import { PRESTIGE_MILESTONE_DEFINITIONS } from "@/data/prestigeMilestones";
import type { PrestigeMilestoneDefinition } from "@/data/prestigeMilestones";

export default function PrestigeMilestoneTrack() {
  const prestigeCount = useGameStore((s) => s.prestigeCount);

  if (PRESTIGE_MILESTONE_DEFINITIONS.length === 0) return null;

  const firstUnearned = PRESTIGE_MILESTONE_DEFINITIONS.find(
    (m) => prestigeCount < m.prestigeRequired,
  );

  return (
    <div className="flex flex-col gap-2">
      <h3
        style={{ color: "var(--text-heading)" }}
        className="text-sm font-semibold uppercase tracking-widest"
      >
        Prestige Milestones
      </h3>
      <div
        style={{
          background: "var(--panel-bg)",
          borderColor: "var(--panel-border)",
          maxHeight: "24rem",
          overflowY: "auto",
        }}
        className="rounded-lg border p-3"
      >
        <div className="flex flex-col">
          {PRESTIGE_MILESTONE_DEFINITIONS.map((milestone, idx) => {
            const earned = prestigeCount >= milestone.prestigeRequired;
            const isNext = !earned && milestone.id === firstUnearned?.id;
            const isLast = idx === PRESTIGE_MILESTONE_DEFINITIONS.length - 1;

            return (
              <MilestoneNode
                key={milestone.id}
                milestone={milestone}
                earned={earned}
                isNext={isNext}
                isLast={isLast}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MilestoneNode({
  milestone,
  earned,
  isNext,
  isLast,
}: {
  milestone: PrestigeMilestoneDefinition;
  earned: boolean;
  isNext: boolean;
  isLast: boolean;
}) {
  const isSoftwall = milestone.reward.type === "softwall";

  return (
    <div className="flex gap-3" style={{ minHeight: "3rem" }}>
      {/* Timeline column: dot + line */}
      <div className="flex flex-col items-center" style={{ width: "1.25rem" }}>
        {/* Dot */}
        <div
          className="flex items-center justify-center rounded-full shrink-0"
          style={{
            width: "1.25rem",
            height: "1.25rem",
            background: earned
              ? "var(--success)"
              : isNext
                ? "var(--accent)"
                : "var(--panel-border)",
            border: isSoftwall && !earned
              ? "2px solid var(--accent-border)"
              : "2px solid transparent",
          }}
        >
          {earned && (
            <span
              style={{ color: "var(--text-white)", fontSize: "0.65rem", lineHeight: 1 }}
            >
              &#10003;
            </span>
          )}
        </div>
        {/* Connecting line */}
        {!isLast && (
          <div
            className="flex-1"
            style={{
              width: "2px",
              background: earned ? "var(--success)" : "var(--panel-border)",
              opacity: earned ? 0.5 : 0.3,
            }}
          />
        )}
      </div>

      {/* Content column */}
      <div className="flex flex-col gap-0.5 pb-3" style={{ flex: 1 }}>
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-semibold"
            style={{
              color: earned
                ? "var(--success)"
                : isNext
                  ? "var(--accent)"
                  : "var(--text-muted)",
            }}
          >
            Prestige {milestone.prestigeRequired}
          </span>
          {isSoftwall && (
            <span
              className="text-xs rounded px-1"
              style={{
                color: "var(--accent)",
                background: "var(--accent-bg)",
                border: "1px solid var(--accent-border)",
                fontSize: "0.6rem",
                lineHeight: "1rem",
              }}
            >
              SOFTWALL
            </span>
          )}
        </div>
        <span
          className="text-sm font-semibold"
          style={{
            color: earned
              ? "var(--text-white)"
              : isNext
                ? "var(--text-heading)"
                : "var(--text-muted)",
          }}
        >
          {milestone.name}
        </span>
        <span
          className="text-xs"
          style={{
            color: earned
              ? "var(--text-secondary)"
              : isNext
                ? "var(--text-secondary)"
                : "var(--text-muted)",
          }}
        >
          {milestone.description}
        </span>
        {isNext && (
          <span
            className="text-xs font-semibold mt-0.5"
            style={{ color: "var(--accent)" }}
          >
            Next at Prestige {milestone.prestigeRequired}
          </span>
        )}
        {earned && (
          <span
            className="text-xs italic mt-0.5"
            style={{ color: "var(--text-muted)" }}
          >
            {milestone.flavorText}
          </span>
        )}
      </div>
    </div>
  );
}
