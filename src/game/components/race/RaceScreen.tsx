"use client";

import type { EventKind, RaceBeat } from "@/core/types";
import { capitalize, ordinal } from "../../format";
import { Track } from "./Track";
import { beatsSoFar, bracketStatus, bracketView, dnfProgress, lapsFor, rankAt } from "./timeline";

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
  /** Drag elimination rounds. Undefined on ovals and on old saves, which replay as one run. */
  rounds?: number;
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
  const bracket = race.strip && race.rounds !== undefined ? bracketView(race.beats, ms, race.durationMs, race.rounds) : null;
  const overall = Math.max(0, Math.min(1, ms / Math.max(1, race.durationMs)));
  const shown = beatsSoFar(race.beats, ms);
  const latest = shown[shown.length - 1];
  const dnfAt = bracket ? bracket.dnfAt : dnfProgress(race.beats, race.durationMs);
  const progress = bracket ? bracket.progress : overall;
  const out = dnfAt !== undefined && progress >= dnfAt;
  const finished = bracket ? progress >= 1 && bracket.ended !== "dnf" : overall >= 1;
  const rank = bracket ? bracket.rank : rankAt(race.beats, ms);
  const laps = lapsFor(race.event, race.laps, race.strip);
  const lap = Math.min(laps, Math.floor(progress * laps) + 1);
  const status = bracket ? bracketStatus(bracket) : out ? "DNF" : `${finished ? "" : "Running "}${ordinal(Math.round(rank))}`;
  const showLap = !race.strip && !finished && !out;
  return (
    <div className={`race-screen ${compact ? "compact" : ""}`}>
      <div className="race-screen-head">
        <span className="race-pos num" aria-live="polite">
          {status}
        </span>
        <span className="muted">
          {race.venueLabel} · {capitalize(race.event)}
          {showLap && ` · lap ${lap}/${laps}`}
        </span>
      </div>
      <Track
        venueId={race.venueId}
        shape={race.strip ? "strip" : "oval"}
        vehicleId={race.vehicleId}
        fieldSize={bracket ? 2 : race.fieldSize}
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
