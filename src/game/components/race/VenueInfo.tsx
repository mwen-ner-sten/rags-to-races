"use client";

import { DISCIPLINES, RIVAL_BY_ID, type VenueDef, type VenueDemand } from "@/core/content/events";
import type { GameState } from "@/core/types";

type Stat = keyof VenueDemand;
type Weight = "more" | "normal" | "less";

const STATS: readonly { id: Stat; label: string }[] = [
  { id: "power", label: "Power" },
  { id: "handling", label: "Handling" },
  { id: "reliability", label: "Reliability" },
];

const WORDS: Record<Weight, string> = { more: "counts more", normal: "normal", less: "counts less" };
const MARKS: Record<Weight, string> = { more: "▲", normal: "●", less: "▼" };

/** A demand multiplier read as plain words. 1 is neutral. */
export function demandWeight(multiplier: number): Weight {
  if (multiplier >= 1.1) return "more";
  if (multiplier <= 0.9) return "less";
  return "normal";
}

/** What the venue asks of a car, as labelled chips (text as well as shape, so it isn't colour-only). */
function Demand({ demand }: { demand: VenueDemand }) {
  return (
    <ul className="demand" aria-label="What counts here">
      {STATS.map(({ id, label }) => {
        const weight = demandWeight(demand[id]);
        return (
          <li key={id} className={`demand-chip demand-${weight}`}>
            <span aria-hidden="true">{MARKS[weight]}</span> {label}: {WORDS[weight]}
          </li>
        );
      })}
    </ul>
  );
}

/** Your record against the Feature rival, and how they race. */
function Rival({ game, rivalId }: { game: GameState; rivalId: string }) {
  const rival = RIVAL_BY_ID[rivalId];
  if (!rival) return null;
  const record = game.meta.rivals[rival.id];
  const raced = record !== undefined && record.wins + record.losses > 0;
  return (
    <p className="venue-rival">
      <strong>{rival.name}</strong> (Feature rival): {rival.style}{" "}
      <span className="muted num">{raced ? `You ${record.wins} – ${record.losses} them` : "You haven’t raced them yet"}</span>
    </p>
  );
}

/** The character line, what counts here, and the Feature rival, shown on each open venue. */
export function VenueInfo({ game, venue }: { game: GameState; venue: VenueDef }) {
  const bracket = DISCIPLINES[game.era?.discipline ?? "dirt"].format === "bracket";
  return (
    <div className="venue-info">
      {bracket ? <p className="venue-character">A drag strip rewards power, tyre grip and low weight.</p> : <p className="venue-character">{venue.character}</p>}
      {!bracket && <Demand demand={venue.demand} />}
      <Rival game={game} rivalId={venue.rival} />
    </div>
  );
}
