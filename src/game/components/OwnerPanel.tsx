"use client";

import { useState } from "react";
import { DISCIPLINES, getVenue, venueName } from "@/core/content/events";
import { getVehicle } from "@/core/content/vehicles";
import { nextEventInMs } from "@/core/jobs";
import {
  CHARTERS, OWNER_CHARTERS, TOUR_POINTS, currentTourEntry, finishPoints, ownerCharterBlocker, ownerClassBlocker, ownerEntryBlocker, ownerGate, tourScore,
  type OwnerTour,
} from "@/core/ownership";
import { winChance } from "@/core/race";
import { resolveFlags } from "@/core/rules";
import type { GameState, JobSpec } from "@/core/types";
import { capitalize, duration, num, ordinal, pct } from "../format";
import { useGame } from "../store";
import { DriversCall } from "./race/DriversCall";

type RaceSpec = Extract<JobSpec, { kind: "race" }>;

function RoundEntry({ game, tour }: { game: GameState; tour: OwnerTour }) {
  const dispatch = useGame((state) => state.dispatch);
  const [carUid, setCarUid] = useState("");
  const [call, setCall] = useState<RaceSpec["call"]>("nurse");
  const [call2, setCall2] = useState<RaceSpec["call2"]>();
  const [retiring, setRetiring] = useState(false);
  const charter = CHARTERS[tour.charter];
  const stop = charter.calendar[tour.rounds.length];
  if (!stop || tour.status !== "active") return null;
  const pending = currentTourEntry(game);
  const venue = getVenue(stop.venueId);
  const wait = nextEventInMs(game, stop.venueId, stop.event);
  const cars = game.run.vehicles.filter((car) => {
    const tier = getVehicle(car.vehicleId).tier;
    return tier >= venue.tiers[0] && tier <= venue.tiers[1] && !ownerClassBlocker(tour, car);
  });
  const selected = cars.find((car) => car.uid === carUid) ?? cars.find(
    (car) => !ownerEntryBlocker(game, tour, car.uid, call),
  ) ?? cars[0];
  const driver = !resolveFlags(game).crewDisabled && !!game.era?.crew.some((crew) => crew.assignment.type === "driver");
  const driverCall = driver ? call2 : undefined;
  const blocked = selected ? ownerEntryBlocker(game, tour, selected.uid, call, driverCall) : "No eligible car in the garage.";
  const name = venueName(stop.venueId, tour.discipline);
  return (
    <section className="section" aria-labelledby="owner-round">
      <h3 id="owner-round">Round {tour.rounds.length + 1} · {name} {capitalize(stop.event)}</h3>
      <p className="sub">{venue.events[stop.event].entry} Scrap Bucks to enter. {wait > 0 ? `Next start in ${duration(wait)}.` : "Entries open."}</p>
      {stop.vehicleId && <p className="sub">{getVehicle(stop.vehicleId).name} only.</p>}
      {tour.discipline === "dirt" && <p className="sub">{venue.character}</p>}
      {pending ? (
        <div className="actions">
          <p className="sub">{pending === "racing" ? "On track. The result counts when the race finishes." : "Signed up. The team will start when the event and car are ready."}</p>
          {pending === "queued" && <button className="btn" onClick={() => dispatch({ type: "owner", move: { type: "withdraw" } })}>Withdraw entry</button>}
        </div>
      ) : (
        <>
          {cars.length > 0 && (
            <>
              <label htmlFor="owner-car">Race car</label>
              <select className="input" id="owner-car" value={selected?.uid ?? ""} onChange={(event) => setCarUid(event.target.value)}>
                {cars.map((car) => <option value={car.uid} key={car.uid}>{car.name} · {getVehicle(car.vehicleId).name}</option>)}
              </select>
              <fieldset className="segmented">
                <legend>Pace</legend>
                <button className={call === "nurse" ? "on" : ""} aria-pressed={call === "nurse"} onClick={() => setCall("nurse")}>Nurse it</button>
                <button className={call === "push" ? "on" : ""} aria-pressed={call === "push"} onClick={() => setCall("push")}>Push</button>
              </fieldset>
              {driver && <DriversCall game={game} driver={driver} value={call2} onChange={setCall2} />}
              {selected && !blocked && <p className="sub">{pct(winChance(game, selected, stop.venueId, stop.event, call, driverCall))} chance to win.</p>}
            </>
          )}
          <div className="actions">
            <button className="btn primary" disabled={!selected || !!blocked} onClick={() => selected && dispatch({ type: "owner", move: { type: "enter", vehicleUid: selected.uid, call, call2: driverCall } })}>Enter round</button>
            <button className="btn" onClick={() => dispatch({ type: "owner", move: { type: "skip" } })}>Skip round</button>
          </div>
          {blocked && <p className="why">{blocked}</p>}
        </>
      )}
      {pending !== "racing" && (
        retiring ? (
          <div className="actions">
            <span className="why">End this tour without the title purse?</span>
            <button className="btn" onClick={() => dispatch({ type: "owner", move: { type: "retire" } })}>Confirm retirement</button>
            <button className="btn" onClick={() => setRetiring(false)}>Keep racing</button>
          </div>
        ) : <button className="btn" onClick={() => setRetiring(true)}>Retire from tour</button>
      )}
    </section>
  );
}

export function OwnerPanel() {
  const game = useGame((state) => state.game);
  const dispatch = useGame((state) => state.dispatch);
  if (!game) return null;
  const gate = ownerGate(game);
  const owner = game.owner;
  const tour = owner?.tour;
  const active = tour?.status === "active";
  const replayable = !!game.era && (gate.ok || !!owner);
  const titleLabel = owner?.titles === 1 ? "title" : "titles";
  const cupLocked = ownerCharterBlocker(game, "county_to_state");

  return (
    <div className="panel">
      <section className="section" aria-labelledby="owner-heading">
        <h2 id="owner-heading">Championships {owner && <span className="muted num">· {owner.titles} {titleLabel}</span>}</h2>
        {!owner && <p className="sub">Sign a touring charter and take your existing team, crew and garage on the road.</p>}
        {!replayable && <p className="why">{gate.reason}</p>}
        {tour && <p className="sub">{CHARTERS[tour.charter].name} · {DISCIPLINES[tour.discipline].name}</p>}
        {active && cupLocked && <p className="sub">County-to-State Cup invitation · {cupLocked}</p>}
      </section>
      {tour && (
        <>
          <TourCalendar tour={tour} />
          {active && <RoundEntry key={`${tour.id}:${tour.rounds.length}`} game={game} tour={tour} />}
        </>
      )}
      {replayable && !active && (
        <section className="section" aria-labelledby="owner-charters">
          <h3 id="owner-charters">Choose a charter</h3>
          <div className="grid-list">
            {OWNER_CHARTERS.map((charterId) => {
              const charter = CHARTERS[charterId];
              const locked = ownerCharterBlocker(game, charterId);
              return (
                <div className="row-card" key={charterId}>
                  <div>
                    <strong>{charter.name}</strong>
                    <p className="blurb">{charter.description}</p>
                    <p className="muted">{charter.target} points to win · {num(charter.purse)} Scrap Bucks · {charter.teamPoints} Team Points</p>
                    {locked && <p className="why">{locked}</p>}
                  </div>
                  <button className="btn" disabled={!!locked} onClick={() => dispatch({ type: "owner", move: { type: owner ? "start" : "found", charter: charterId } })}>
                    {locked ? "Locked" : owner ? "Start tour" : "Sign charter"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}
      {owner && owner.history.length > 0 && (
        <section className="section" aria-labelledby="owner-history">
          <h3 id="owner-history">Past championships</h3>
          <ul>
            {owner.history.map((past) => <li key={past.id}>{CHARTERS[past.charter].name} · {capitalize(past.status)} · {tourScore(past).points} points</li>)}
          </ul>
        </section>
      )}
    </div>
  );
}

function TourCalendar({ tour }: { tour: OwnerTour }) {
  const charter = CHARTERS[tour.charter];
  const score = tourScore(tour);
  return (
    <section className="section" aria-labelledby="owner-calendar">
      <h3 id="owner-calendar">Calendar <span className="muted num">· {score.points}/{charter.target} points</span></h3>
      <p className="sub">Best four rounds count. Finishes pay {TOUR_POINTS.join(", ")} points from first through sixth. A DNF or skip pays zero.</p>
      {charter.minCars > 1 && <p className="sub">{charter.minCars} cars must each score in at least one round. Your lineup has {score.cars} scoring cars so far.</p>}
      {tour.status !== "active" && <p className="notice">{tour.status === "champion" ? "Championship won." : tour.status === "retired" ? "Tour retired." : "Tour complete. The title requirements were unmet."}</p>}
      <ol className="grid-list">
        {charter.calendar.map((stop, index) => {
          const finish = tour.rounds[index];
          const result = finish
            ? `${finish.carName} · ${finish.dnf ? "DNF" : ordinal(finish.position)} · ${finishPoints(finish)} pts`
            : finish === null ? "Skipped" : index === tour.rounds.length && tour.status === "active" ? "Next" : "Pending";
          return (
            <li className="row-card" key={index}>
              <strong>{index + 1}. {venueName(stop.venueId, tour.discipline)} {capitalize(stop.event)}{stop.vehicleId && ` · ${getVehicle(stop.vehicleId).name}`}</strong>
              <span className="muted">{result}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
