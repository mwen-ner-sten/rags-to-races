"use client";

import { useGameStore } from "@/state/store";
import { EVENT_LADDER, type CircuitDefinition, type EventId } from "@/data/circuits";
import { getEventDefinition, isEventOpen, resolveEventCircuit } from "@/engine/eventLadder";
import { AUTO_EVENT_MIN_WIN_CHANCE, expectedRaceOn } from "@/engine/raceExpectation";
import { formatNumber } from "@/utils/format";

interface EventLadderProps {
  venue: CircuitDefinition;
  /** Event the next race here enters (pinned, or auto-race's pick). */
  activeEventId: EventId | null;
  pinnedEventId: EventId | null;
  onPin: (eventId: EventId | null) => void;
}

/**
 * The venue's Sprint / Heat / Feature ladder: what each pays, what it costs,
 * whether it is open, and which one the next race enters. Auto-race picks
 * the best contestable open event unless the player pins one.
 */
export default function EventLadder({ venue, activeEventId, pinnedEventId, onPin }: EventLadderProps) {
  // Expectation needs the whole state (bonuses, gear, skills); the panel re-renders on the same changes.
  const state = useGameStore();
  const venueWins = state.eventWins?.[venue.id];

  return (
    <section
      className="rounded-lg border p-3"
      style={{ borderColor: "var(--panel-border)", background: "var(--panel-bg)" }}
      aria-label={`${venue.name} events`}
      data-testid="event-ladder"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong className="text-sm uppercase tracking-wider" style={{ color: "var(--text-white)" }}>Events</strong>
        <button
          type="button"
          onClick={() => onPin(null)}
          className="rounded border px-2 py-1 text-xs"
          aria-pressed={pinnedEventId === null}
          style={pinnedEventId === null
            ? { borderColor: "var(--panel-border-active)", background: "var(--accent-bg)", color: "var(--text-white)" }
            : { borderColor: "var(--btn-border)", color: "var(--text-primary)" }}
          title={`Auto picks the best-paying open event you can contest (win chance ≥ ${Math.round(AUTO_EVENT_MIN_WIN_CHANCE * 100)}%).`}
        >
          Auto-pick
        </button>
      </div>
      <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-3">
        {EVENT_LADDER.map((event) => {
          const resolved = resolveEventCircuit(venue, event.id);
          const open = isEventOpen(event.id, venueWins);
          const wins = venueWins?.[event.id] ?? 0;
          const expectation = open ? expectedRaceOn(state, resolved) : null;
          const isActive = activeEventId === event.id;
          const isPinned = pinnedEventId === event.id;
          const opensAfter = event.opensAfter ? getEventDefinition(event.opensAfter).name : null;
          return (
            <button
              key={event.id}
              type="button"
              disabled={!open}
              onClick={() => onPin(isPinned ? null : event.id)}
              aria-pressed={isPinned}
              data-testid={`event-${venue.id}-${event.id}`}
              className="rounded-md border p-2 text-left text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              style={isActive
                ? { borderColor: "var(--panel-border-active)", background: "var(--accent-bg)" }
                : { borderColor: "var(--panel-border)", background: "var(--panel-bg)" }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold" style={{ color: "var(--text-white)" }}>{event.name}</span>
                <span style={{ color: isActive ? "var(--accent)" : "var(--text-muted)" }}>
                  {!open ? "🔒" : isPinned ? "Pinned" : isActive ? "Next race" : `${wins}W`}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5" style={{ color: "var(--text-muted)" }}>
                <span>Diff {formatNumber(resolved.difficulty)}</span>
                <span>${formatNumber(resolved.entryFee)}</span>
                <span>Prize ${formatNumber(resolved.rewardBase)}</span>
                <span>+{resolved.repReward} Rep</span>
              </div>
              <div className="mt-0.5" style={{ color: open ? "var(--text-secondary)" : "var(--warning)" }}>
                {!open
                  ? `Win a ${opensAfter} here to open`
                  : expectation
                    ? `${Math.round(expectation.winChance * 100)}% win · ${event.id === "feature" ? "rivals race here" : "no rivals"}`
                    : event.id === "feature" ? "Rivals race here" : "Open"}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
