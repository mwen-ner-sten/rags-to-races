"use client";

import { useState } from "react";
import { VENUES, getVenue } from "@/core/content/events";
import { getVehicle } from "@/core/content/vehicles";
import { nextRaceNightSpec, raceNightBlocker, RACE_NIGHT_STARTS } from "@/core/raceNight";
import type { GameState, RaceCall, Vehicle } from "@/core/types";
import { capitalize } from "../format";
import { useGame } from "../store";

export function RaceNightPlanner({ game, vehicle, call }: { game: GameState; vehicle: Vehicle; call: RaceCall }) {
  const dispatch = useGame((store) => store.dispatch);
  const [chosen, setChosen] = useState("");
  if (game.era || game.run.featureWins.county_fair !== undefined) return null;
  const tier = getVehicle(vehicle.vehicleId).tier;
  const venues = VENUES.filter((venue) => game.run.venuesOpen.includes(venue.id) && tier >= venue.tiers[0] && tier <= venue.tiers[1]);
  const venueId = venues.some((venue) => venue.id === chosen) ? chosen : venues.at(-1)?.id;
  const night = game.run.raceNight;
  if (!venueId && !night) return null;
  const upcoming = nextRaceNightSpec(game);
  const blocker = venueId ? raceNightBlocker(game, vehicle.uid, venueId, call) : null;
  const entered = night ? game.run.vehicles.find((entry) => entry.uid === night.vehicleUid) : null;
  const preview = venueId ? getVenue(venueId).events[game.run.ladder[venueId]?.at(-1) ?? "sprint"].entry : 0;
  const max = venueId ? getVenue(venueId).events.feature.entry * RACE_NIGHT_STARTS : 0;

  return (
    <details open={!!night || undefined}>
      <summary>Race Night</summary>
      <p className="hint">Reserve your hands for up to {RACE_NIGHT_STARTS} starts at one venue. A podium can move you to the next event. Queued trips, studies and other races wait. Bench work can continue.</p>
      {night ? (
        <>
          <p>{entered?.name} at {getVenue(night.venueId).name} · {night.startsLeft} starts left{upcoming ? ` · Next ${capitalize(upcoming.event)}` : ""}</p>
          <button className="btn" onClick={() => dispatch({ type: "raceNight", move: { type: "cancel" } })}>Cancel remaining starts</button>
        </>
      ) : venueId && (
        <>
          <label className="inline"><span>Night&apos;s venue</span>
            <select value={venueId} onChange={(event) => setChosen(event.target.value)}>
              {venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}
            </select>
          </label>
          <p className="hint">{vehicle.name} will {call === "nurse" ? "nurse it" : "push"}. First entry costs {preview} Scrap Bucks. The most you could pay in entry fees is {max} Scrap Bucks. {game.run.featureWins[venueId] === undefined ? "The night ends after winning the Feature." : "The night uses the highest open event to earn prizes and Rep."}</p>
          {blocker && <p className="why">{blocker}</p>}
          <button className="btn" disabled={!!blocker} onClick={() => dispatch({ type: "raceNight", move: { type: "plan", vehicleUid: vehicle.uid, venueId, call } })}>Reserve Race Night</button>
        </>
      )}
    </details>
  );
}
