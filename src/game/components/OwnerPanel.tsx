"use client";

import { useState } from "react";
import { DISCIPLINES, getVenue, venueName } from "@/core/content/events";
import { getPart } from "@/core/content/parts";
import { getVehicle } from "@/core/content/vehicles";
import { nextEventInMs } from "@/core/jobs";
import {
  CHARTERS, OWNER_CHARTERS, SPONSOR_IDS, TOUR_POINTS, TOUR_SPONSORS, currentTourEntry, enduranceTourUnlocked, needsNewScoringCar, ownerCharterBlocker, ownerEntryBlocker, ownerGate, ownerRecords, queuedTourProblem, reverseTourUnlocked, sponsorProgress, sponsorshipBlocker, titleForecast, tourCalendar, tourCash, tourGarage, tourRoundStandings, tourScore,
  type OwnerTour,
} from "@/core/ownership";
import { dnfChance, winChance } from "@/core/race";
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
  const stop = tourCalendar(tour)[tour.rounds.length];
  if (!stop || tour.status !== "active") return null;
  const pending = currentTourEntry(game);
  const venue = getVenue(stop.venueId);
  const wait = nextEventInMs(game, stop.venueId, stop.event);
  const driver = !resolveFlags(game).crewDisabled && !!game.era?.crew.some((crew) => crew.assignment.type === "driver");
  const driverCall = driver ? call2 : undefined;
  const cars = tourGarage(game, tour, call, driverCall);
  const selected = cars.find((car) => car.uid === carUid) ?? cars[0];
  const blocked = selected ? ownerEntryBlocker(game, tour, selected.uid, call, driverCall) : "No eligible car in the garage.";
  const name = venueName(stop.venueId, tour.discipline);
  const forecast = titleForecast(tour);
  return (
    <section className="section" aria-labelledby="owner-round">
      <h3 id="owner-round">Round {tour.rounds.length + 1} · {name} {capitalize(stop.event)}</h3>
      <p className="sub">{venue.events[stop.event].entry} Scrap Bucks to enter. {wait > 0 ? `Next start in ${duration(wait)}.` : "Entries open."}</p>
      {stop.vehicleId && <p className="sub">{getVehicle(stop.vehicleId).name} only.</p>}
      {tour.discipline === "dirt" && <p className="sub">{venue.character}</p>}
      {needsNewScoringCar(tour) && <p className="notice">For the title, this round needs a score from a car that hasn’t scored in this tour yet.</p>}
      {pending ? (
        <div className="actions">
          <p className="sub">{pending === "racing" ? "On track. The result counts when the race finishes." : "Signed up. The team will start when the event and car are ready."}</p>
          {pending === "queued" && <p className="why">{queuedTourProblem(game, tour)}</p>}
          {pending === "queued" && <button className="btn" onClick={() => dispatch({ type: "owner", move: { type: "withdraw" } })}>Withdraw entry</button>}
        </div>
      ) : (
        <>
          {cars.length > 0 && (
            <>
              <label htmlFor="owner-car">Race car</label>
              <select className="input" id="owner-car" value={selected?.uid ?? ""} onChange={(event) => setCarUid(event.target.value)}>
                {cars.map((car, index) => <option value={car.uid} key={car.uid}>{car.name} · {getVehicle(car.vehicleId).name}{index === 0 ? " · Suggested" : ""}</option>)}
              </select>
              <fieldset className="segmented">
                <legend>Pace</legend>
                <button className={call === "nurse" ? "on" : ""} aria-pressed={call === "nurse"} onClick={() => setCall("nurse")}>Nurse it</button>
                <button className={call === "push" ? "on" : ""} aria-pressed={call === "push"} onClick={() => setCall("push")}>Push</button>
              </fieldset>
              {driver && <DriversCall game={game} driver={driver} value={call2} onChange={setCall2} />}
              {selected && !blocked && <p className="sub">{pct(winChance(game, selected, stop.venueId, stop.event, call, driverCall))} chance to win · {pct(dnfChance(game, selected, stop.venueId, stop.event, call, driverCall))} DNF risk</p>}
            </>
          )}
          <div className="actions">
            <button className="btn primary" disabled={!selected || !!blocked} onClick={() => selected && dispatch({ type: "owner", move: { type: "enter", vehicleUid: selected.uid, call, call2: driverCall } })}>Enter round</button>
            <button className="btn" onClick={() => dispatch({ type: "owner", move: { type: "skip" } })}>Skip round</button>
          </div>
          {blocked && <p className="why">{blocked}</p>}
          {forecast.status === "possible" && forecast.maximumAfterSkip < charter.target && <p className="why">Skipping this round would put the title out of reach on points.</p>}
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
  const [sponsor, setSponsor] = useState<OwnerTour["sponsor"]>();
  if (!game) return null;
  const gate = ownerGate(game);
  const owner = game.owner;
  const tour = owner?.tour;
  const active = tour?.status === "active";
  const replayable = !!game.era && (gate.ok || !!owner);
  const titleLabel = owner?.titles === 1 ? "title" : "titles";
  const cupLocked = ownerCharterBlocker(game, "county_to_state");
  const personalBests = owner && game.era ? ownerRecords(owner)[game.era.discipline] : undefined;

  return (
    <div className="panel">
      <section className="section" aria-labelledby="owner-heading">
        <h2 id="owner-heading">Championships {owner && <span className="muted num">· {owner.titles} {titleLabel}</span>}</h2>
        {!owner && <p className="sub">Sign a touring charter and take your existing team, crew and garage on the road.</p>}
        {!replayable && <p className="why">{gate.reason}</p>}
        {tour && <p className="sub">{CHARTERS[tour.charter].name} · {DISCIPLINES[tour.discipline].name}{tour.itinerary && ` · ${capitalize(tour.itinerary)} itinerary`}</p>}
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
          {!!owner?.titles && <p className="sub">Titles in any two disciplines unlock the all-Feature itinerary for that charter.</p>}
          {!!owner?.titles && (
            <>
              <label htmlFor="owner-sponsor">Sponsorship</label>
              <select className="input" id="owner-sponsor" value={sponsor ?? ""} onChange={(event) => setSponsor(SPONSOR_IDS.find((id) => id === event.target.value))}>
                <option value="">Self-funded</option>
                {SPONSOR_IDS.map((id) => <option key={id} value={id} disabled={!!sponsorshipBlocker(game, id)}>{TOUR_SPONSORS[id].name}</option>)}
              </select>
              {sponsor && <p className="sub">{TOUR_SPONSORS[sponsor].term}. Stake {num(TOUR_SPONSORS[sponsor].stake)} Scrap Bucks. Complete the contract to recover the stake and earn {num(TOUR_SPONSORS[sponsor].bonus)} more.</p>}
            </>
          )}
          <div className="grid-list">
            {OWNER_CHARTERS.map((charterId) => {
              const charter = CHARTERS[charterId];
              const locked = ownerCharterBlocker(game, charterId) ?? (sponsor && sponsorshipBlocker(game, sponsor));
              return (
                <div className="row-card" key={charterId}>
                  <div>
                    <strong>{charter.name}</strong>
                    <p className="blurb">{charter.description}</p>
                    <p className="muted">{charter.target} points to win · {num(charter.purse)} Scrap Bucks · {charter.teamPoints} Team Points</p>
                    {personalBests?.[charterId] && <p className="muted">Personal best · {personalBests[charterId].points} points</p>}
                    {locked && <p className="why">{locked}</p>}
                  </div>
                  <div className="row-action">
                    <button className="btn" disabled={!!locked} onClick={() => dispatch({ type: "owner", move: { type: owner ? "start" : "found", charter: charterId, sponsor } })}>
                      {locked ? "Locked" : owner ? "Start tour" : "Sign charter"}
                    </button>
                    {reverseTourUnlocked(game, charterId) && (
                      <button className="btn" disabled={!!locked} onClick={() => dispatch({ type: "owner", move: { type: "start", charter: charterId, sponsor, itinerary: "reverse" } })}>Run in reverse</button>
                    )}
                    {enduranceTourUnlocked(game, charterId) && (
                      <button className="btn" disabled={!!locked} onClick={() => dispatch({ type: "owner", move: { type: "start", charter: charterId, sponsor, itinerary: "endurance" } })}>Run all Features</button>
                    )}
                  </div>
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
            {owner.history.map((past) => (
              <li key={past.id}>
                <details>
                  <summary>{CHARTERS[past.charter].name} · {DISCIPLINES[past.discipline].name} · {capitalize(past.status)} · {tourScore(past).points} points</summary>
                  {past.itinerary && <p className="sub">{capitalize(past.itinerary)} itinerary</p>}
                  <TourRounds tour={past} />
                </details>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function TourCalendar({ tour }: { tour: OwnerTour }) {
  const charter = CHARTERS[tour.charter];
  const score = tourScore(tour);
  const forecast = tour.status === "active" ? titleForecast(tour) : null;
  const contract = sponsorProgress(tour);
  const cash = tourCash(tour);
  return (
    <section className="section" aria-labelledby="owner-calendar">
      <h3 id="owner-calendar">Calendar <span className="muted num">· {score.points}/{charter.target} points</span></h3>
      <p className="sub">Best four rounds count. Finishes pay {TOUR_POINTS.join(", ")} points from first through sixth. A DNF or skip pays zero.</p>
      {forecast?.status === "possible" && <p className="sub">Maximum possible with wins in all remaining rounds · {forecast.maximum} points</p>}
      {forecast?.status === "secured" && <p className="notice">Title secured. Finish or skip the remaining rounds to collect.</p>}
      {forecast?.status === "out" && <p className="notice">The title is out of reach this tour. You can still improve the result or retire.</p>}
      {charter.minCars > 1 && <p className="sub">{charter.minCars} cars must each score in at least one round. Your lineup has {score.cars} scoring cars so far.</p>}
      {tour.sponsor && contract && (
        <p className="sub">{TOUR_SPONSORS[tour.sponsor].name} · {TOUR_SPONSORS[tour.sponsor].term} · {contract.completed}/{contract.target}
          {tour.status !== "active" && (contract.payout ? ` · Paid ${num(contract.payout)} Scrap Bucks` : " · Stake forfeited")}
        </p>
      )}
      {cash && (cash.entries > 0 || cash.stake > 0) && (
        <details>
          <summary>Settled race budget · {cash.net >= 0 ? "+" : "−"}{num(Math.abs(cash.net))} Scrap Bucks</summary>
          <p className="sub">Entry fees {num(cash.entries)} · Race prizes {num(cash.prizes)} · Title purse {num(cash.title)}
            {tour.sponsor && ` · Sponsor stake ${num(cash.stake)} · Sponsor payout ${num(cash.sponsor)}`}
          </p>
        </details>
      )}
      {tour.status !== "active" && <p className="notice">{tour.status === "champion" ? "Championship won." : tour.status === "retired" ? "Tour retired." : "Tour complete. The title requirements were unmet."}</p>}
      <TourRounds tour={tour} />
    </section>
  );
}

function TourRounds({ tour }: { tour: OwnerTour }) {
  const standings = tourRoundStandings(tour);
  return (
    <ol className="grid-list">
      {tourCalendar(tour).map((stop, index) => {
        const finish = tour.rounds[index];
        const standing = standings[index];
        const result = finish
          ? `${finish.carName} · ${finish.dnf ? "DNF" : ordinal(finish.position)} · ${standing.points} pts${standing.points > 0 && !standing.counts ? " (dropped)" : ""}`
          : finish === null ? "Skipped" : index === tour.rounds.length && tour.status === "active" ? "Next" : tour.status === "retired" ? "Unrun" : "Pending";
        return (
          <li className="row-card" key={index}>
            <strong>{index + 1}. {venueName(stop.venueId, tour.discipline)} {capitalize(stop.event)}{stop.vehicleId && ` · ${getVehicle(stop.vehicleId).name}`}</strong>
            {finish?.setup ? (
              <details>
                <summary>{result}</summary>
                <p className="sub">{[
                  finish.setup.engine && getPart(finish.setup.engine).name,
                  finish.setup.tires && getPart(finish.setup.tires).name,
                  `${capitalize(finish.setup.tune)} tune`,
                  finish.setup.call === "nurse" ? "Nurse it" : "Push",
                ].filter(Boolean).join(" · ")}</p>
              </details>
            ) : <span className="muted">{result}</span>}
          </li>
        );
      })}
    </ol>
  );
}
