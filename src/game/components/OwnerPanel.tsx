"use client";

import { useState } from "react";
import { DISCIPLINES, getVenue, venueName } from "@/core/content/events";
import { getPart } from "@/core/content/parts";
import { getVehicle } from "@/core/content/vehicles";
import { nextEventInMs } from "@/core/jobs";
import {
  CHARTERS, OWNER_CHARTERS, ROOKIE_KART_START_LIMIT, SPONSOR_IDS, TOUR_POINTS, TOUR_SPONSORS, currentTourEntry, enduranceTourUnlocked, entryPlanStatus, needsNewScoringCar, nominatedRookie, ownerCharterBlocker, ownerDrivenRound, ownerDriverView, ownerEntryBlocker, ownerGate, ownerRecords, queuedTourProblem, reverseTourUnlocked, rookieSponsorCars, sponsorProgress, sponsorRoundInstruction, sponsorshipBlocker, titleForecast, tourCalendar, tourCash, tourGarage, tourRoundStandings, tourRoundToken, tourScore,
  type OwnerTour,
} from "@/core/ownership";
import { dnfChance, winChance } from "@/core/race";
import { resolveFlags } from "@/core/rules";
import type { GameState, JobSpec, Vehicle } from "@/core/types";
import { capitalize, duration, num, ordinal, pct } from "../format";
import { useGame } from "../store";
import { ChoiceList, type ChoiceItem } from "./ChoiceList";
import { DriversCall } from "./race/DriversCall";
import { PACE_OPTIONS, Segmented } from "./Segmented";

type RaceSpec = Extract<JobSpec, { kind: "race" }>;

function modelMeta(car: Vehicle, extra?: string): string {
  const model = getVehicle(car.vehicleId);
  return [model.name, `Tier ${model.tier}`, extra].filter(Boolean).join(" · ");
}

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
  const pendingSpec = [...game.run.queue, ...game.run.jobs.map((job) => job.spec)]
    .find((spec) => spec.kind === "race" && spec.tourRound === tourRoundToken(tour));
  const venue = getVenue(stop.venueId);
  const wait = nextEventInMs(game, stop.venueId, stop.event);
  const ownerDriving = ownerDrivenRound(tour);
  const field = ownerDriverView(game, ownerDriving);
  const sponsorInstruction = sponsorRoundInstruction(tour);
  const driver = !ownerDriving && !resolveFlags(game).crewDisabled && !!game.era?.crew.some((crew) => crew.assignment.type === "driver");
  const driverCall = driver ? call2 : undefined;
  const cars = tourGarage(game, tour, call, driverCall);
  const selected = cars.find((car) => car.uid === carUid) ?? cars.find((car) => car.uid === nominatedRookie(tour)) ?? cars[0];
  const blocked = selected ? ownerEntryBlocker(game, tour, selected.uid, call, driverCall) : "No eligible car in the garage.";
  const name = venueName(stop.venueId, tour.discipline);
  const forecast = titleForecast(tour);
  return (
    <section className="section" aria-labelledby="owner-round">
      <h3 id="owner-round">Round {tour.rounds.length + 1} · {name} {capitalize(stop.event)}</h3>
      <p className="sub">{venue.events[stop.event].entry} Scrap Bucks to enter. {wait > 0 ? `Next start in ${duration(wait)}.` : "Entries open."}</p>
      {stop.vehicleId && <p className="sub">{getVehicle(stop.vehicleId).name} only.</p>}
      {sponsorInstruction && <p className="notice">{sponsorInstruction}</p>}
      {tour.discipline === "dirt" && <p className="sub">{venue.character}</p>}
      {needsNewScoringCar(tour) && <p className="notice">For the title, this round needs a score from a car that hasn’t scored in this tour yet.</p>}
      {pending ? (
        <div className="actions">
          <p className="sub">{pending === "racing" ? "On track. The result counts when the race finishes." : "Signed up. The team will start when the event and car are ready."}</p>
          {pendingSpec?.kind === "race" && pendingSpec.tourReserve !== undefined && (
            <p className="sub">From your entry plan · {game.run.vehicles.find((car) => car.uid === pendingSpec.vehicleUid)?.name}</p>
          )}
          {pending === "queued" && <p className="why">{queuedTourProblem(game, tour)}</p>}
          {pending === "queued" && <button className="btn" onClick={() => dispatch({ type: "owner", move: { type: "withdraw" } })}>Withdraw entry</button>}
        </div>
      ) : (
        <>
          {cars.length > 0 && (
            <>
              <ChoiceList compact id="owner-car" label="Race car" value={selected?.uid ?? ""} onChange={setCarUid}
                items={cars.map((car, index): ChoiceItem => ({
                  id: car.uid,
                  title: car.name,
                  meta: modelMeta(car, `${pct(winChance(field, car, stop.venueId, stop.event, call, driverCall))} to win`),
                  tag: index === 0 ? "Suggested" : undefined,
                }))} />
              <Segmented label="Pace" value={call} options={PACE_OPTIONS} onChange={setCall} />
              {driver && <DriversCall game={game} driver={driver} value={call2} onChange={setCall2} />}
              {selected && !blocked && <p className="sub">{pct(winChance(field, selected, stop.venueId, stop.event, call, driverCall))} chance to win · {pct(dnfChance(field, selected, stop.venueId, stop.event, call, driverCall))} DNF risk</p>}
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

function TourEntryPlan({ game, tour }: { game: GameState; tour: OwnerTour }) {
  const dispatch = useGame((state) => state.dispatch);
  const plan = tour.entryPlan;
  const [leadUid, setLeadUid] = useState(() => plan?.leadUid ?? tourGarage(game, tour, "nurse")[0]?.uid ?? "");
  const [reserveUid, setReserveUid] = useState(plan?.reserveUid ?? "");
  const [call, setCall] = useState<RaceSpec["call"]>(plan?.call ?? "nurse");
  const [cashFloor, setCashFloor] = useState(String(plan?.cashFloor ?? 0));
  const status = entryPlanStatus(game, tour);
  const garage = game.run.vehicles;
  const save = () => dispatch({ type: "owner", move: {
    type: "plan_entries", settings: { leadUid, reserveUid: reserveUid || undefined, call, cashFloor: Number(cashFloor) },
  } });
  return (
    <details className="section" open={!!plan?.enabled}>
      <summary>Entry plan{plan && (plan.enabled ? " · Running" : " · Paused")}</summary>
      <p className="sub">Your team files one race entry at a time, including while you’re away, until this championship ends. The reserve car can take the round when the lead can’t enter. Withdraw a planned entry to pause the plan.</p>
      <ChoiceList compact id="owner-lead" label="Lead car" value={leadUid} onChange={setLeadUid}
        items={[{ id: "", title: "Choose a car" }, ...garage.map((car): ChoiceItem => ({ id: car.uid, title: car.name, meta: modelMeta(car) }))]} />
      <ChoiceList compact id="owner-reserve" label="Reserve car" value={reserveUid} onChange={setReserveUid}
        items={[{ id: "", title: "None" }, ...garage.filter((car) => car.uid !== leadUid).map((car): ChoiceItem => ({ id: car.uid, title: car.name, meta: modelMeta(car) }))]} />
      <Segmented label="Planned pace" value={call} options={PACE_OPTIONS} onChange={setCall} />
      <label className="inline">
        <span>Keep at least this many Scrap Bucks</span>
        <input type="number" min={0} step={1} value={cashFloor} onChange={(event) => setCashFloor(event.target.value)} />
      </label>
      <p className="hint">Planned entry fees are paid at the green flag. The plan checks your balance again at that point.</p>
      {plan?.enabled && status && <p className="why">{status}</p>}
      <div className="actions">
        <button className="btn" disabled={!garage.some((car) => car.uid === leadUid) || leadUid === reserveUid} onClick={save}>
          {plan?.enabled ? "Update entry plan" : "Start entry plan"}
        </button>
        {plan?.enabled && <button className="btn" onClick={() => dispatch({ type: "owner", move: { type: "pause_plan" } })}>Pause entry plan</button>}
      </div>
    </details>
  );
}

export function OwnerPanel() {
  const game = useGame((state) => state.game);
  const dispatch = useGame((state) => state.dispatch);
  const [sponsor, setSponsor] = useState<OwnerTour["sponsor"]>();
  const [nomination, setNomination] = useState("");
  if (!game) return null;
  const gate = ownerGate(game);
  const owner = game.owner;
  const tour = owner?.tour;
  const active = tour?.status === "active";
  const replayable = !!game.era && (gate.ok || !!owner);
  const titleLabel = owner?.titles === 1 ? "title" : "titles";
  const cupLocked = ownerCharterBlocker(game, "county_to_state");
  const personalBests = owner && game.era ? ownerRecords(owner)[game.era.discipline] : undefined;
  const rookies = rookieSponsorCars(game);
  const sponsorVehicleUid = sponsor === "rookie_kart"
    ? rookies.find((car) => car.uid === nomination)?.uid ?? rookies[0]?.uid : undefined;

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
          {active && reverseTourUnlocked(game, tour.charter) && <TourEntryPlan key={tour.id} game={game} tour={tour} />}
        </>
      )}
      {replayable && !active && (
        <section className="section" aria-labelledby="owner-charters">
          <h3 id="owner-charters">Choose a charter</h3>
          {!!owner?.titles && <p className="sub">Titles in any two disciplines unlock the all-Feature itinerary for that charter.</p>}
          {!!owner?.titles && (
            <>
              <ChoiceList id="owner-sponsor" label="Sponsorship" value={sponsor ?? ""}
                onChange={(id) => setSponsor(SPONSOR_IDS.find((sponsorId) => sponsorId === id))}
                items={[{ id: "", title: "Self-funded" }, ...SPONSOR_IDS.map((id): ChoiceItem => {
                  const blocker = sponsorshipBlocker(game, id);
                  return { id, title: TOUR_SPONSORS[id].name, meta: `${TOUR_SPONSORS[id].term}. Stake ${num(TOUR_SPONSORS[id].stake)} Scrap Bucks`, disabled: !!blocker, reason: blocker ?? undefined };
                })]} />
              {sponsor && <p className="sub">{TOUR_SPONSORS[sponsor].term}. Stake {num(TOUR_SPONSORS[sponsor].stake)} Scrap Bucks. Complete the contract to recover the stake and earn {num(TOUR_SPONSORS[sponsor].bonus)} more.</p>}
              {!rookies.length && <p className="hint">Development Seat needs a Go-Kart with at most {ROOKIE_KART_START_LIMIT} starts when you sign.</p>}
              {sponsor === "rookie_kart" && rookies.length > 0 && (
                <ChoiceList compact id="owner-rookie" label="Nominate a rookie Go-Kart" value={sponsorVehicleUid ?? ""} onChange={setNomination}
                  items={rookies.map((car): ChoiceItem => ({ id: car.uid, title: car.name, meta: `${getVehicle(car.vehicleId).name} · ${car.history.races} starts` }))} />
              )}
            </>
          )}
          <div className="grid-list">
            {OWNER_CHARTERS.map((charterId) => {
              const charter = CHARTERS[charterId];
              const locked = ownerCharterBlocker(game, charterId) ?? (sponsor && sponsorshipBlocker(game, sponsor, charterId, undefined, sponsorVehicleUid));
              const enduranceLocked = locked ?? (sponsor && sponsorshipBlocker(game, sponsor, charterId, "endurance", sponsorVehicleUid));
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
                    <button className="btn" disabled={!!locked} onClick={() => dispatch({ type: "owner", move: { type: owner ? "start" : "found", charter: charterId, sponsor, sponsorVehicleUid } })}>
                      {locked ? "Locked" : owner ? "Start tour" : "Sign charter"}
                    </button>
                    {reverseTourUnlocked(game, charterId) && (
                      <button className="btn" disabled={!!locked} onClick={() => dispatch({ type: "owner", move: { type: "start", charter: charterId, sponsor, sponsorVehicleUid, itinerary: "reverse" } })}>Run in reverse</button>
                    )}
                    {enduranceTourUnlocked(game, charterId) && (
                      <>
                        <button className="btn" disabled={!!enduranceLocked} onClick={() => dispatch({ type: "owner", move: { type: "start", charter: charterId, sponsor, sponsorVehicleUid, itinerary: "endurance" } })}>Run all Features</button>
                        {enduranceLocked && !locked && <span className="why">{enduranceLocked}</span>}
                      </>
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
        <p className="sub">{TOUR_SPONSORS[tour.sponsor].name} · {TOUR_SPONSORS[tour.sponsor].term}{tour.sponsorCar && ` (${tour.sponsorCar.name})`} · {contract.completed}/{contract.target}
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
          ? `${finish.carName} · ${finish.dnf ? "DNF" : ordinal(finish.position)} · ${standing.points} pts${standing.points > 0 && !standing.counts ? " (dropped)" : ""}${finish.planned ? " · Planned entry" : ""}${finish.ownerDriven ? " · Owner drove" : ""}`
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
