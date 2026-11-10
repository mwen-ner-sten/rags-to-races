"use client";

import { DISCIPLINES } from "@/core/content/events";
import { cautionChance } from "@/core/race";
import type { GameState, JobSpec } from "@/core/types";
import { pct } from "../../format";

export type Call2 = Extract<JobSpec, { kind: "race" }>["call2"];

interface DriversCallProps {
  game: GameState;
  /** Whether a crew member is assigned as driver. */
  driver: boolean;
  value: Call2;
  onChange: (next: Call2) => void;
}

/** Yellow flags only come out on a Team-era oval, in Heats and Features. */
function Yellow({ game }: { game: GameState }) {
  const heat = cautionChance(game, "heat");
  const feature = cautionChance(game, "feature");
  return (
    <p className="hint call2-yellow">
      Yellow flag chance: Heat {pct(heat)}, Feature {pct(feature)}. A Sprint never goes yellow, so the call won’t matter in a Sprint.
    </p>
  );
}

/** The driver's second call: two options, each explained, only once a driver is in the seat. */
export function DriversCall({ game, driver, value, onChange }: DriversCallProps) {
  if (!game.era) return null;
  const discipline = DISCIPLINES[game.era.discipline];
  const options = [discipline.secondCall.a, discipline.secondCall.b];
  if (!driver) return <p className="why">No driver, so no second call. Put someone in the driver’s seat.</p>;
  return (
    <div className="call2">
      <fieldset className="segmented">
        <legend>Driver’s call</legend>
        {options.map((o) => (
          <button key={o.id} className={value === o.id ? "on" : ""} aria-pressed={value === o.id} onClick={() => onChange(value === o.id ? undefined : o.id)}>
            {o.name}
          </button>
        ))}
      </fieldset>
      <ul className="call2-options">
        {options.map((o) => (
          <li key={o.id} className={value === o.id ? "on" : ""}>
            <strong>{o.name}.</strong> {o.text}
          </li>
        ))}
      </ul>
      {discipline.format === "oval" && <Yellow game={game} />}
    </div>
  );
}
