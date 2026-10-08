"use client";

import type { EventKind, RaceBeat } from "@/core/types";
import { capitalize, ordinal } from "../../format";
import { Track } from "./Track";
import { beatsSoFar, dnfProgress, lapsFor, rankAt } from "./timeline";

/** What any race view needs, whether it's running live or being replayed. */
export interface RaceShown {
  venueId: string;
  venueLabel: string;
  event: EventKind;
  vehicleId: string;
  fieldSize: number;
  beats: readonly RaceBeat[];
  laps?: number;
  durationMs: number;
  /** Team-era drag racing runs on a straight strip. */
  strip: boolean;
}

interface RaceScreenProps {
  race: RaceShown;
  /** Ms into the race. */
  ms: number;
  compact?: boolean;
  transitionMs?: number;
  /** How many recent moments to list (compact shows just the latest). */
  lines?: number;
}

export function RaceScreen({ race, ms, compact = false, transitionMs = 0, lines = 4 }: RaceScreenProps) {
  const progress = Math.max(0, Math.min(1, ms / Math.max(1, race.durationMs)));
  const shown = beatsSoFar(race.beats, ms);
  const latest = shown[shown.length - 1];
  const dnfAt = dnfProgress(race.beats, race.durationMs);
  const out = dnfAt !== undefined && progress >= dnfAt;
  const finished = progress >= 1;
  const rank = rankAt(race.beats, ms);
  const laps = lapsFor(race.event, race.laps, race.strip);
  const lap = Math.min(laps, Math.floor(progress * laps) + 1);
  const status = out ? "DNF" : `${finished ? "" : "Running "}${ordinal(Math.round(rank))}`;
  return (
    <div className={`race-screen ${compact ? "compact" : ""}`}>
      <div className="race-screen-head">
        <span className="race-pos num" aria-live="polite">
          {status}
        </span>
        <span className="muted">
          {race.venueLabel} · {capitalize(race.event)}
          {!race.strip && !finished && !out && ` · lap ${lap}/${laps}`}
        </span>
      </div>
      <Track
        venueId={race.venueId}
        shape={race.strip ? "strip" : "oval"}
        vehicleId={race.vehicleId}
        fieldSize={race.fieldSize}
        laps={laps}
        progress={progress}
        playerRank={rank}
        dnfAt={dnfAt}
        finished={finished}
        compact={compact}
        transitionMs={transitionMs}
        label={`${race.venueLabel} ${race.event}: ${status}`}
      />
      {compact ? (
        latest && <p className="race-line">{latest.text}</p>
      ) : (
        <ol className="race-lines" aria-live="polite">
          {[...shown]
            .reverse()
            .slice(0, lines)
            .map((b) => (
              <li key={`${b.at}-${b.text}`} className={b.kind ? `beat-${b.kind}` : ""}>
                {b.text}
              </li>
            ))}
        </ol>
      )}
    </div>
  );
}
