import { useState } from "react";
import { VENUES, venueName } from "@/core/content/events";
import { getVehicle } from "@/core/content/vehicles";
import { CLUB_COURSES } from "@/core/clubTrack";
import { totalTime, type RallyCard } from "@/core/timecards";
import { capitalize } from "../format";

export function RallyCards({ cards }: { cards: readonly RallyCard[] }) {
  const [venue, setVenue] = useState("");
  const venues = VENUES.filter(({ id }) => cards.some((card) => card.venueId === id));
  const current = venues.find(({ id }) => id === venue) ?? venues[0];
  if (!current) return <p>Finish a Rally stage event to file its timecard.</p>;
  return <section>
    <label>Time control <select value={current.id} onChange={(e) => setVenue(e.target.value)}>
      {venues.map(({ id }) => <option key={id} value={id}>{venueName(id, "rally")}</option>)}
    </select></label>
    <ul className="plain">{cards.filter((card) => card.venueId === current.id).map((card) => <li key={`${card.event}:${card.vehicleId}:${card.course ?? "standard"}`}>
      <details>
        <summary><strong>{(totalTime(card.splitsMs) / 1000).toFixed(1)}s</strong> · {capitalize(card.event)} · {getVehicle(card.vehicleId).name}{card.course && ` · ${CLUB_COURSES[card.course].name}`}</summary>
        <p>{card.carName} · Season {card.season}</p>
        <ol>{card.splitsMs.map((ms, i) => <li key={i}>Stage {i + 1} · {(ms / 1000).toFixed(1)}s</li>)}</ol>
      </details>
    </li>)}</ul>
  </section>;
}
