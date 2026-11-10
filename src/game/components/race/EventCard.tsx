"use client";

import { BRACKET_SPREAD, DISCIPLINES, RIVAL_BY_ID, VENUES, getVenue } from "@/core/content/events";
import { LAPS } from "@/core/raceBeats";
import { cautionChance, dnfChance, purseFactor, raceDurationMs, winChance } from "@/core/race";
import type { EventKind, GameState, JobSpec, Vehicle } from "@/core/types";
import { capitalize, duration, num, pct } from "../../format";
import { useGame } from "../../store";
import { eventStatus } from "./eventStatus";

type RaceSpec = Extract<JobSpec, { kind: "race" }>;

const NEXT: Record<EventKind, EventKind | null> = { sprint: "heat", heat: "feature", feature: null };

/** Without a Dyno you get a read, not a number. */
export function oddsLabel(p: number, dyno: boolean): string {
  if (dyno) return pct(p);
  if (p >= 0.7) return "Favourite";
  if (p >= 0.45) return "Good shot";
  if (p >= 0.25) return "Even-ish";
  if (p >= 0.1) return "Long shot";
  return "No chance";
}

function oddsBand(p: number): string {
  return p >= 0.45 ? "good" : p >= 0.25 ? "even" : "long";
}

/** What finishing well here gets you. */
function stakes(game: GameState, venueId: string, event: EventKind, bracket: boolean): string {
  const next = NEXT[event];
  if (next) return bracket ? `${event === "sprint" ? "Win to open the Heat" : "Reach the final to open the Feature"}.` : `Top 3 opens the ${capitalize(next)}.`;
  const rival = RIVAL_BY_ID[getVenue(venueId).rival];
  const opens = VENUES.find((v) => v.opens.type === "feature" && v.opens.venueId === venueId && !game.run.venuesOpen.includes(v.id));
  const invited = opens && opens.opens.type === "feature" && opens.opens.invitation && game.meta.records[venueId] === undefined;
  const opener = !opens ? "" : invited ? `A win earns next Season's invitation to the ${opens.name}.` : `A win opens the ${opens.name}.`;
  return [rival ? `Rival: ${rival.name}.` : "", opener].filter(Boolean).join(" ");
}

/** "1 pass", "2 rounds", "3 rounds" in a bracket; laps otherwise. */
function runLabel(event: EventKind, bracket: boolean): string {
  if (!bracket) return `${LAPS[event]} laps`;
  const rounds = BRACKET_SPREAD[event].length;
  return rounds === 1 ? "1 pass" : `${rounds} rounds`;
}

/** How much of the purse is left after the promoter trims one you keep winning (null when it's whole). */
function purseNote(factor: number): string | null {
  const share = Math.round(factor * 100);
  return share >= 100 ? null : `Purse is down to ${share}%: you keep winning this one. It recovers if you race elsewhere for a while.`;
}

/** What the driver's call is worth in this event, shown only when a call is set on an oval. */
function YellowLine({ game, event }: { game: GameState; event: EventKind }) {
  const chance = cautionChance(game, event);
  if (chance <= 0) return <p className="muted event-yellow">No yellow flags in a {capitalize(event)}: the driver’s call won’t matter here.</p>;
  return <p className="muted event-yellow">Yellow flag chance: {pct(chance)}</p>;
}

export function EventCard({ game, vehicle, spec, strip }: { game: GameState; vehicle: Vehicle; spec: RaceSpec; strip: boolean }) {
  const dispatch = useGame((s) => s.dispatch);
  const def = getVenue(spec.venueId).events[spec.event];
  const status = eventStatus(game, spec);
  const dyno = (game.team.upgrades.dyno ?? 0) > 0;
  const locked = status.kind === "locked";
  const bracket = strip && DISCIPLINES[game.era?.discipline ?? "dirt"].format === "bracket";
  const factor = purseFactor(game, spec.venueId, spec.event);
  const note = purseNote(factor);
  const showYellow = !!spec.call2 && !!game.era && !bracket;
  const p = winChance(game, vehicle, spec.venueId, spec.event, spec.call, spec.call2);
  return (
    <article className={`event-card ${status.kind}`}>
      <header className="event-head">
        <h4>{capitalize(spec.event)}</h4>
        {!locked && <span className={`odds ${oddsBand(p)}`}>{oddsLabel(p, dyno)}</span>}
      </header>
      <dl className="event-facts">
        <div>
          <dt>Entry</dt>
          <dd className="num">{def.entry ? `${num(def.entry)} Scrap Bucks` : "Free"}</dd>
        </div>
        <div>
          <dt>Win</dt>
          <dd className="num">
            {num(Math.round(def.prize * factor))} Scrap Bucks · {def.rep} Rep
          </dd>
        </div>
        <div>
          <dt>Race</dt>
          <dd className="num">
            {runLabel(spec.event, bracket)} · {duration(raceDurationMs(game, spec))}
          </dd>
        </div>
        {dyno && !locked && (
          <div>
            <dt>DNF</dt>
            <dd className="num">{pct(dnfChance(game, vehicle, spec.venueId, spec.event, spec.call, spec.call2))}</dd>
          </div>
        )}
      </dl>
      {note && <p className="why event-purse">{note}</p>}
      <p className="event-stakes muted">{stakes(game, spec.venueId, spec.event, bracket)}</p>
      {showYellow && <YellowLine game={game} event={spec.event} />}
      <div className="event-action">
        {status.kind === "ready" && (
          <button className="btn small act primary" onClick={() => dispatch({ type: "enqueue", spec })}>
            <span className="act-label">{status.action}</span>
            <span className="act-detail">{status.detail}</span>
          </button>
        )}
        {status.kind === "signed_up" && (
          <>
            <span className="chip">{status.text}</span>
            <button className="link-btn" onClick={() => dispatch({ type: "cancelQueued", index: status.queueIndex })}>
              Withdraw
            </button>
          </>
        )}
        {status.kind === "running" && <span className="chip win">{status.text}</span>}
        {(status.kind === "locked" || status.kind === "blocked") && <span className={status.kind === "blocked" ? "why" : "muted"}>{status.text}</span>}
      </div>
    </article>
  );
}
