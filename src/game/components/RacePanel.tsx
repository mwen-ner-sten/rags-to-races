"use client";

import Image from "next/image";
import { useState } from "react";
import { DISCIPLINES, EVENT_KINDS, VENUES, getVenue, venueName } from "@/core/content/events";
import { getPart } from "@/core/content/parts";
import { getVehicle } from "@/core/content/vehicles";
import { vehicleBusy } from "@/core/garage";
import { practiceBonus, weakestSlot } from "@/core/race";
import { retiredVehicle } from "@/core/vehicleArchive";
import type { GameState, RaceCall, Vehicle } from "@/core/types";
import { capitalize, conditionName, num, pct } from "../format";
import { venueSprite } from "../sprites";
import { useGame } from "../store";
import { DriversCall, type Call2 } from "./race/DriversCall";
import { EventCard } from "./race/EventCard";
import { OnTrack } from "./race/OnTrack";
import { finishText } from "./race/resultText";
import { VenueInfo } from "./race/VenueInfo";
import { DirtSignup, LockedVenue } from "./race/VenueCards";
import { ChoiceList } from "./ChoiceList";
import { PACE_OPTIONS, Segmented } from "./Segmented";
import { Tips } from "./Tips";
import { RaceNightPlanner } from "./RaceNightPlanner";

/** The part most likely to wear or fail, called out before you race. */
function WeakPart({ vehicle }: { vehicle: Vehicle }) {
  const slot = weakestSlot(vehicle);
  const part = slot ? vehicle.parts[slot] : undefined;
  if (!slot || !part || part.condition >= 3) return null;
  return (
    <p className="why">
      Watch the {slot}: a {conditionName(part.condition)} {getPart(part.partId).name} wears first and can end a race early. Clean or repair it in the Garage.
    </p>
  );
}

/** Sprint → Heat → Feature, showing how far up this venue's ladder you are. */
function Ladder({ game, venueId }: { game: GameState; venueId: string }) {
  const open = game.run.ladder[venueId] ?? [];
  const won = game.run.featureWins[venueId] !== undefined;
  return (
    <ol className="ladder-steps" aria-label="Event ladder">
      {EVENT_KINDS.map((e) => (
        <li key={e} className={open.includes(e) ? (e === "feature" && won ? "won" : "open") : "locked"}>
          {capitalize(e)}
          {e === "feature" && won && " (won)"}
        </li>
      ))}
    </ol>
  );
}

function Results({ game }: { game: GameState }) {
  const showReplay = useGame((s) => s.showReplay);
  const [venue, setVenue] = useState("");
  const [outcome, setOutcome] = useState("");
  const [limit, setLimit] = useState(12);
  const all = [...game.run.races].reverse();
  const venues = [...new Set(all.map((race) => race.venueId))];
  const races = all.filter((race) => (!venue || race.venueId === venue) &&
    (!outcome || (outcome === "dnf" ? race.dnf : race.position === 1 && !race.dnf)));
  if (all.length === 0) return null;
  const discipline = game.era?.discipline ?? "dirt";
  return (
    <section className="section" aria-labelledby="results-h">
      <h2 id="results-h">Results</h2>
      <div className="archive-filters">
        <label className="archive-field">Results venue
          <select value={venue} onChange={(event) => { setVenue(event.target.value); setLimit(12); }}>
            <option value="">All venues</option>
            {venues.map((id) => <option key={id} value={id}>{venueName(id, discipline)}</option>)}
          </select>
        </label>
        <Segmented label="Race outcome" value={outcome} onChange={(value) => { setOutcome(value); setLimit(12); }} options={[
          { value: "", label: "All results" },
          { value: "win", label: "Wins" },
          { value: "dnf", label: "DNFs" },
        ]} />
      </div>
      {!races.length && <p role="status">No matching races this season.</p>}
      <ul className={`results${races.some((r) => r.rounds !== undefined) ? " wide" : ""}`}>
        {races.slice(0, limit).map((r) => (
          <li key={r.id} className={r.position === 1 && !r.dnf ? "win" : r.dnf ? "dnf" : ""}>
            <span className="pos num">{finishText(r)}</span>
            <span>
              {venueName(r.venueId, discipline)} {capitalize(r.event)}
              {retiredVehicle(game, r.vehicleUid) && <span className="muted"> · {retiredVehicle(game, r.vehicleUid)!.name}</span>}
              {game.motorPool?.custody?.rig.uid === r.vehicleUid && <span className="muted"> · {game.motorPool.custody.rig.name} at the depot</span>}
            </span>
            <span className="num muted">
              +{num(r.prize)} Scrap Bucks · +{r.rep} Rep
            </span>
            <button className="link-btn" onClick={() => showReplay(r)}>
              Watch
            </button>
          </li>
        ))}
      </ul>
      {races.length > limit && <button className="btn" onClick={() => setLimit(limit + 12)}>Show older races</button>}
    </section>
  );
}

export function RacePanel({ initialVenue }: { initialVenue?: string }) {
  const game = useGame((s) => s.game);
  const [vehicleUid, setVehicleUid] = useState(() => {
    if (!initialVenue || !game) return "";
    const [minimum, maximum] = getVenue(initialVenue).tiers;
    return game.run.vehicles.findLast((car) => {
      const tier = getVehicle(car.vehicleId).tier;
      return tier >= minimum && tier <= maximum && !vehicleBusy(game, car.uid);
    })?.uid ?? "";
  });
  const [call, setCall] = useState<RaceCall>("nurse");
  const [call2, setCall2] = useState<Call2>(undefined);
  if (!game) return null;
  const vehicles = game.run.vehicles;
  const vehicle = vehicles.find((v) => v.uid === vehicleUid) ?? vehicles[vehicles.length - 1];
  const discipline = DISCIPLINES[game.era?.discipline ?? "dirt"];
  const driver = game.era?.crew.some((c) => c.assignment.type === "driver") ?? false;
  const activeCall2 = driver ? call2 : undefined;
  if (!vehicle) return <><p className="empty">Build something that runs first.</p><Results game={game} /></>;
  const tier = getVehicle(vehicle.vehicleId).tier;
  return (
    <div className="panel">
      <OnTrack game={game} />
      <section className="section" aria-labelledby="race-h">
        <h2 id="race-h">Race</h2>
        <Tips ids={["race"]} />
        <p className="sub">
          {game.era ? `${discipline.name}. ` : ""}Each event runs every few minutes. Sign up any time: if it isn’t running yet, you’ll start as soon as it is.
        </p>
        <div className="toolbar">
          <ChoiceList compact id="race-vehicle" label="Vehicle" value={vehicle.uid} onChange={setVehicleUid}
            items={vehicles.map((v) => {
              const busy = vehicleBusy(game, v.uid);
              return {
                id: v.uid,
                title: v.name,
                meta: `${getVehicle(v.vehicleId).name} · Tier ${getVehicle(v.vehicleId).tier}`,
                disabled: busy,
                reason: busy ? "Already signed up or racing." : undefined,
              };
            })} />
          <Segmented label="Call" value={call} options={[...PACE_OPTIONS].reverse()} onChange={setCall} />
        </div>
        <p className="hint">Push is faster but wears parts and risks a DNF. Nurse it is safer and slower. The odds below change with your call.</p>
        <DriversCall game={game} driver={driver} value={call2} onChange={setCall2} />
        <WeakPart vehicle={vehicle} />
        <RaceNightPlanner game={game} vehicle={vehicle} call={call} />
        <div className="venues">
          {VENUES.filter((v) => game.run.venuesOpen.includes(v.id)).map((venue) => {
            const allowed = tier >= venue.tiers[0] && tier <= venue.tiers[1];
            return (
              <article key={venue.id} className="card venue" id={`race-venue-${venue.id}`}>
                <Image src={venueSprite(venue.id)} alt="" width={120} height={64} />
                <div className="card-body">
                  <h3>
                    {venueName(venue.id, discipline.id)}
                    {game.run.featureWins[venue.id] !== undefined && <span className="chip win">Feature won</span>}
                  </h3>
                  <p className="blurb">
                    {discipline.id === "dirt" && venue.blurb} Tier {venue.tiers[0]}–{venue.tiers[1]}. Practice +{pct(practiceBonus(game, venue.id))}.
                  </p>
                  <VenueInfo game={game} venue={venue} />
                  <Ladder game={game} venueId={venue.id} />
                  {allowed ? (
                    <div className="event-grid">
                      {EVENT_KINDS.map((e) => (
                        <EventCard key={e} game={game} vehicle={vehicle} strip={discipline.id === "drag"} spec={{ kind: "race", vehicleUid: vehicle.uid, venueId: venue.id, event: e, call, call2: activeCall2 }} />
                      ))}
                    </div>
                  ) : (
                    <p className="why">The {vehicle.name} can’t enter here (tier {tier}).</p>
                  )}
                </div>
              </article>
            );
          })}
          <DirtSignup game={game} />
          <LockedVenue game={game} />
        </div>
      </section>
      <Results game={game} />
    </div>
  );
}
