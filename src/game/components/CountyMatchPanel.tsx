"use client";

import { useState } from "react";
import { HOME_COUNTIES } from "@/core/counties";
import { COUNTY_RIVALS, countyBuildReady, countyEntryStatus, countyMatchBlocker, localRival } from "@/core/countyRivals";
import { getPart } from "@/core/content/parts";
import { venueName } from "@/core/content/events";
import { winChance } from "@/core/race";
import type { GameState, RaceCall } from "@/core/types";
import { ordinal, pct } from "../format";
import { useGame } from "../store";
import { getVehicle } from "@/core/content/vehicles";
import { ChoiceList } from "./ChoiceList";
import { PACE_OPTIONS_SHORT, Segmented } from "./Segmented";

export function CountyMatchPanel({ game }: { game: GameState }) {
  const dispatch = useGame((s) => s.dispatch);
  const [selected, setSelected] = useState("");
  const [pace, setPace] = useState<RaceCall>("nurse");
  const id = localRival(game);
  if (!id) return null;
  const rival = COUNTY_RIVALS[id];
  const contact = game.countyRivals?.[id];
  const cars = game.run.vehicles.filter((vehicle) => countyBuildReady(game, vehicle, id));
  const car = cars.find(({ uid }) => uid === selected) ?? cars[0];
  const issue = countyMatchBlocker(game, car?.uid ?? "", pace);
  const status = countyEntryStatus(game);
  return <section className="section" aria-labelledby="county-race-heading">
    <h2 id="county-race-heading">{HOME_COUNTIES[rival.county].name} matchup · {rival.name}</h2>
    <p>{rival.brief} Beat them while they are still running to earn a future Club loan of {getPart(rival.part).name}.</p>
    {contact?.earned ? <p role="status">{contact.earned.car} earned this offer in Season {contact.earned.season}.</p> : <>
      <p>{venueName("backyard", game.era?.discipline ?? "dirt")} Sprint. Use a Push Mower with a part hauled here this Season. The start is free.</p>
      {contact?.latest && <p>Last attempt · {contact.latest.dnf ? "Did not finish" : `Finished ${ordinal(contact.latest.position)}`}. {contact.latest.rivalOut
        ? "The rival retired. Try again when the Sprint reopens."
        : "Repair or change the build, then book another Sprint."}</p>}
      {status ? <p role="status">{status === "racing" ? "County match on track." : "County match signed up. Keep a local part installed."}</p> : <>
        {car && <>
          <ChoiceList compact id="county-match-car" label="Local build" value={car.uid} onChange={setSelected}
            items={cars.map((entry) => ({
              id: entry.uid,
              title: entry.name,
              meta: `${getVehicle(entry.vehicleId).name} · ${pct(winChance(game, entry, "backyard", "sprint", pace, undefined, undefined, undefined, id))} win odds`,
            }))} />
          <Segmented id="county-match-pace" label="Race pace" value={pace} options={PACE_OPTIONS_SHORT} onChange={setPace} />
          <p className="muted">Estimated event win odds {pct(winChance(game, car, "backyard", "sprint", pace, undefined, undefined, undefined, id))}</p>
        </>}
        {issue && <p className="why">{issue}</p>}
        <button className="btn primary" type="button" disabled={!!issue} onClick={() => {
          if (car) dispatch({ type: "countyMatch", move: { type: "enter", vehicleUid: car.uid, call: pace } });
        }}>Sign up against {rival.name}</button>
      </>}
    </>}
  </section>;
}
