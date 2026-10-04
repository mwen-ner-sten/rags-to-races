"use client";

import Image from "next/image";
import { useState } from "react";
import { DISCIPLINES, EVENT_KINDS, RIVAL_BY_ID, VENUES, getVenue, venueName } from "@/core/content/events";
import { getVehicle } from "@/core/content/vehicles";
import { vehicleBusy } from "@/core/garage";
import { jobBlocker, nextEventInMs } from "@/core/jobs";
import { dnfChance, practiceBonus, winChance } from "@/core/race";
import type { EventKind, GameState, JobSpec, RaceCall, Vehicle } from "@/core/types";
import { capitalize, duration, num, ordinal, pct } from "../format";
import { venueSprite } from "../sprites";
import { useGame } from "../store";

type Call2 = Extract<JobSpec, { kind: "race" }>["call2"];

/** Without a Dyno you get a read, not a number. */
function oddsLabel(p: number, dyno: boolean): string {
  if (dyno) return pct(p);
  if (p >= 0.7) return "Favourite";
  if (p >= 0.45) return "Good shot";
  if (p >= 0.25) return "Even-ish";
  if (p >= 0.1) return "Long shot";
  return "No chance";
}

function EventRow({ game, vehicle, venueId, event, call, call2 }: { game: GameState; vehicle: Vehicle; venueId: string; event: EventKind; call: RaceCall; call2: Call2 }) {
  const dispatch = useGame((s) => s.dispatch);
  const venue = getVenue(venueId);
  const def = venue.events[event];
  const unlocked = (game.run.ladder[venueId] ?? []).includes(event);
  const spec = { kind: "race" as const, vehicleUid: vehicle.uid, venueId, event, call, call2 };
  const blocker = jobBlocker(game, spec);
  const wait = nextEventInMs(game, venueId, event);
  const dyno = (game.team.upgrades.dyno ?? 0) > 0;
  const p = winChance(game, vehicle, venueId, event, call, call2);
  const dnf = dnfChance(game, vehicle, venueId, event, call, call2);
  return (
    <tr className={unlocked ? "" : "locked"}>
      <th scope="row">{capitalize(event)}</th>
      <td className="num">{def.entry}</td>
      <td className="num">{num(def.prize)}</td>
      <td>{unlocked ? oddsLabel(p, dyno) : "Podium the last event"}</td>
      <td className="num">{dyno && unlocked ? pct(dnf) : ""}</td>
      <td>{wait > 0 ? <span className="muted">in {duration(wait)}</span> : <span className="muted">every {duration(def.everyMs)}</span>}</td>
      <td>
        <button className="btn small primary" disabled={!!blocker} title={blocker ?? undefined} onClick={() => dispatch({ type: "enqueue", spec })}>
          Enter
        </button>
      </td>
    </tr>
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
              {venueName(r.venueId, discipline)} {r.event}
            </span>
            <span className="num muted">
              +{num(r.prize)} SB · +{r.rep} Rep
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
  const driver = game.era?.crew.some((c) => c.assignment.type === "driver");
  if (!vehicle) return <p className="empty">Build something that runs first.</p>;
  const tier = getVehicle(vehicle.vehicleId).tier;
  return (
    <div className="panel">
      <section className="section" aria-labelledby="race-h">
        <h2 id="race-h">Race</h2>
        <p className="sub">
          {game.era ? `${discipline.name}. ` : ""}Events run on a schedule. A podium opens the next event at that venue, and a Feature win opens new venues.
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
        <p className="hint">Push is faster but wears parts and risks a DNF. Nurse it is safer and slower.</p>
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
                  {allowed ? (
                    <div className="table-wrap">
                      <table className="events">
                        <thead>
                          <tr>
                            <th scope="col">Event</th>
                            <th scope="col">Entry</th>
                            <th scope="col">Prize</th>
                            <th scope="col">Odds</th>
                            <th scope="col">DNF</th>
                            <th scope="col">Next</th>
                            <th scope="col">
                              <span className="sr-only">Enter</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {EVENT_KINDS.map((e) => (
                            <EventRow key={e} game={game} vehicle={vehicle} venueId={venue.id} event={e} call={call} call2={call2} />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="why">The {vehicle.name} can’t enter here (tier {tier}).</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
      <Results game={game} />
    </div>
  );
}
