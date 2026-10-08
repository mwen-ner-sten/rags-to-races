"use client";

import { venueName } from "@/core/content/events";
import type { GameState } from "@/core/types";
import { capitalize, conditionName, num, ordinal } from "../../format";
import { useGame } from "../../store";
import { RaceLive } from "./RaceLive";

/** The top of the Race tab: the race on the track right now, or how the last one went. */
export function OnTrack({ game }: { game: GameState }) {
  const showReplay = useGame((s) => s.showReplay);
  const live = game.run.jobs.find((j) => j.spec.kind === "race" && j.race);
  if (live) {
    return (
      <section className="section on-track" aria-labelledby="on-track-h">
        <h2 id="on-track-h">On the track</h2>
        <RaceLive game={game} job={live} />
      </section>
    );
  }
  const last = game.run.races[game.run.races.length - 1];
  if (!last) return null;
  const discipline = game.era?.discipline ?? "dirt";
  return (
    <section className="section on-track" aria-labelledby="on-track-h">
      <h2 id="on-track-h">Last race</h2>
      <p className="last-race">
        <strong className={`race-pos num ${last.dnf ? "dnf" : last.position === 1 ? "win" : ""}`}>{last.dnf ? "DNF" : `${ordinal(last.position)} of ${last.fieldSize}`}</strong>{" "}
        {venueName(last.venueId, discipline)} {capitalize(last.event)} · +{num(last.prize)} Scrap Bucks · +{last.rep} Rep
      </p>
      {last.wear.length > 0 && <p className="muted">Wear: {last.wear.map((w) => `${w.slot} ${conditionName(w.from)} → ${conditionName(w.to)}`).join(", ")}</p>}
      <button className="btn small" onClick={() => showReplay(last)}>
        Watch it again
      </button>
    </section>
  );
}
