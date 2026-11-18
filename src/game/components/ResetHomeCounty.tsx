"use client";

import { countyPassport, HOME_COUNTIES, HOME_COUNTY_IDS } from "@/core/counties";
import type { GameState, HomeCounty } from "@/core/types";

export function ResetHomeCounty({ game, county, onChoose }: { game: GameState; county: HomeCounty; onChoose: (county: HomeCounty) => void }) {
  const passport = countyPassport(game);
  return (
    <fieldset>
      <legend>Home county</legend>
      <p className="hint">Your county sets which local salvage sources you can visit next Season.</p>
      {!passport.earned && <p className="why">Learn Scouting and haul from three different sources to move. {Math.min(passport.visited, 3)}/3 sources visited. {passport.scouting ? "Scouting learned." : "Scouting still needed."}</p>}
      {HOME_COUNTY_IDS.map((id) => (
        <label key={id} className="check">
          <input type="radio" name="home-county" checked={county === id} disabled={id !== "home" && !passport.earned} onChange={() => onChoose(id)} />
          <span><strong>{HOME_COUNTIES[id].name}</strong> · {HOME_COUNTIES[id].summary}</span>
        </label>
      ))}
    </fieldset>
  );
}
