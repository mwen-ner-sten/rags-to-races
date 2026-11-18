"use client";

import { countyPassport, HOME_COUNTIES, HOME_COUNTY_IDS } from "@/core/counties";
import type { GameState, HomeCounty } from "@/core/types";

export function ResetHomeCounty({ game, county, fixedByBaton, onChoose }: { game: GameState; county: HomeCounty; fixedByBaton?: boolean; onChoose: (county: HomeCounty) => void }) {
  const passport = countyPassport(game);
  return (
    <fieldset>
      <legend>Home county</legend>
      <p className="hint">Your county sets which local salvage sources you can visit next Season.</p>
      {fixedByBaton && <p className="hint">The County Baton handoff sets the destination. Change the County Baton selection to choose another county.</p>}
      {!passport.earned && <p className="why">Learn Scouting and haul from three different sources to move. {Math.min(passport.visited, 3)}/3 sources visited. {passport.scouting ? "Scouting learned." : "Scouting still needed."}</p>}
      {HOME_COUNTY_IDS.map((id) => (
        <label key={id} className="check">
          <input type="radio" name="home-county" checked={county === id} disabled={fixedByBaton || (id !== "home" && !passport.earned)} onChange={() => onChoose(id)} />
          <span><strong>{HOME_COUNTIES[id].name}</strong> · {HOME_COUNTIES[id].summary}</span>
        </label>
      ))}
    </fieldset>
  );
}
