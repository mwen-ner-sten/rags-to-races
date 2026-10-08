"use client";

import Image from "next/image";
import { useState } from "react";
import { DISCIPLINES, EVENT_KINDS, RIVAL_BY_ID, VENUES, getVenue, venueName } from "@/core/content/events";
import { getPart } from "@/core/content/parts";
import { getVehicle } from "@/core/content/vehicles";
import { vehicleBusy } from "@/core/garage";
import { canOpenPlace, placeRepCost } from "@/core/knowhowEngine";
import { practiceBonus, weakestSlot } from "@/core/race";
import type { GameState, JobSpec, RaceCall, Vehicle } from "@/core/types";
import { capitalize, conditionName, num, ordinal, pct } from "../format";
import { venueSprite } from "../sprites";
import { useGame } from "../store";
import { EventCard } from "./race/EventCard";
import { OnTrack } from "./race/OnTrack";
import { Tips } from "./Tips";

type Call2 = Extract<JobSpec, { kind: "race" }>["call2"];

/** The Dirt Track opens with Rep rather than a Feature win, so it gets a sign-up card once it's within reach. */
function DirtSignup({ game }: { game: GameState }) {
  const dispatch = useGame((s) => s.dispatch);
  if (game.run.venuesOpen.includes("dirt") || game.run.featureWins.backyard === undefined) return null;
  const venue = getVenue("dirt");
  const blocker = canOpenPlace(game, "place:dirt");
  return (
    <article className="card venue locked">
      <Image src={venueSprite(venue.id)} alt="" width={120} height={64} />
      <div className="card-body">
        <h3>{venue.name}</h3>
        <p className="blurb">
          {venue.blurb} Tier {venue.tiers[0]}–{venue.tiers[1]}.
        </p>
        <div className="actions">
          <button className="btn" disabled={!!blocker} title={blocker ?? undefined} onClick={() => dispatch({ type: "openPlace", knowhowId: "place:dirt" })}>
            Sign up · {placeRepCost(game, "place:dirt")} Rep
          </button>
          {blocker && <span className="why">{blocker}</span>}
        </div>
      </div>
    </article>
  );
}

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
  const races = [...game.run.races].reverse().slice(0, 12);
  if (races.length === 0) return null;
  const discipline = game.era?.discipline ?? "dirt";
  return (
    <section className="section" aria-labelledby="results-h">
      <h2 id="results-h">Results</h2>
      <ul className="results">
        {races.map((r) => (
          <li key={r.id} className={r.position === 1 && !r.dnf ? "win" : r.dnf ? "dnf" : ""}>
            <span className="pos num">{r.dnf ? "DNF" : ordinal(r.position)}</span>
            <span>
              {venueName(r.venueId, discipline)} {capitalize(r.event)}
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
    </section>
  );
}

export function RacePanel() {
  const game = useGame((s) => s.game);
  const [vehicleUid, setVehicleUid] = useState<string>("");
  const [call, setCall] = useState<RaceCall>("nurse");
  const [call2, setCall2] = useState<Call2>(undefined);
  if (!game) return null;
  const vehicles = game.run.vehicles;
  const vehicle = vehicles.find((v) => v.uid === vehicleUid) ?? vehicles[vehicles.length - 1];
  const discipline = DISCIPLINES[game.era?.discipline ?? "dirt"];
  const driver = game.era?.crew.some((c) => c.assignment.type === "driver") ?? false;
  const activeCall2 = driver ? call2 : undefined;
  if (!vehicle) return <p className="empty">Build something that runs first.</p>;
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
          <label>
            <span>Vehicle</span>
            <select value={vehicle.uid} onChange={(e) => setVehicleUid(e.target.value)}>
              {vehicles.map((v) => (
                <option key={v.uid} value={v.uid} disabled={vehicleBusy(game, v.uid)}>
                  {v.name} (T{getVehicle(v.vehicleId).tier})
                </option>
              ))}
            </select>
          </label>
          <fieldset className="segmented">
            <legend>Call</legend>
            <button className={call === "push" ? "on" : ""} aria-pressed={call === "push"} onClick={() => setCall("push")}>
              Push
            </button>
            <button className={call === "nurse" ? "on" : ""} aria-pressed={call === "nurse"} onClick={() => setCall("nurse")}>
              Nurse it
            </button>
          </fieldset>
          {driver && (
            <fieldset className="segmented">
              <legend>Driver’s call</legend>
              <button className={call2 === discipline.secondCall.a.id ? "on" : ""} onClick={() => setCall2(call2 === discipline.secondCall.a.id ? undefined : discipline.secondCall.a.id)}>
                {discipline.secondCall.a.name}
              </button>
              <button className={call2 === discipline.secondCall.b.id ? "on" : ""} onClick={() => setCall2(call2 === discipline.secondCall.b.id ? undefined : discipline.secondCall.b.id)}>
                {discipline.secondCall.b.name}
              </button>
            </fieldset>
          )}
        </div>
        <p className="hint">Push is faster but wears parts and risks a DNF. Nurse it is safer and slower. The odds below change with your call.</p>
        <WeakPart vehicle={vehicle} />
        <div className="venues">
          {VENUES.filter((v) => game.run.venuesOpen.includes(v.id)).map((venue) => {
            const allowed = tier >= venue.tiers[0] && tier <= venue.tiers[1];
            const rival = RIVAL_BY_ID[venue.rival];
            return (
              <article key={venue.id} className="card venue">
                <Image src={venueSprite(venue.id)} alt="" width={120} height={64} />
                <div className="card-body">
                  <h3>
                    {venueName(venue.id, discipline.id)}
                    {game.run.featureWins[venue.id] !== undefined && <span className="chip win">Feature won</span>}
                  </h3>
                  <p className="blurb">
                    {venue.blurb} Tier {venue.tiers[0]}–{venue.tiers[1]}. Feature rival: {rival?.name}. Practice +{pct(practiceBonus(game, venue.id))}.
                  </p>
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
        </div>
      </section>
      <Results game={game} />
    </div>
  );
}
