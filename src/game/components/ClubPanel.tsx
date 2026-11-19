"use client";

import { useState } from "react";
import { CLUB_CHARTERS, clubEntryBlocker, clubEntryPrice, clubEntryStatus, clubGate, clubScore, ticketedGrant, type ClubAdmission, type ClubSeason } from "@/core/club";
import { CLUB_COURSES } from "@/core/clubTrack";
import { COUNTY_RIVALS } from "@/core/countyRivals";
import { HOME_COUNTIES } from "@/core/counties";
import { venueName } from "@/core/content/events";
import { getPart } from "@/core/content/parts";
import { getVehicle } from "@/core/content/vehicles";
import { SCRAP_LAYER } from "@/core/layers";
import { dnfChance, effectiveScore, winChance } from "@/core/race";
import { rallyRoute } from "@/core/rally";
import type { GameState, RaceCall } from "@/core/types";
import { capitalize, ordinal, pct } from "../format";
import { useGame } from "../store";
import { ResetPlanner } from "./ResetPlanner";

function MeetingEntry({ game, season }: { game: GameState; season: ClubSeason }) {
  const dispatch = useGame((s) => s.dispatch);
  const [vehicleUid, setVehicle] = useState("");
  const [admission, setAdmission] = useState<ClubAdmission>("ticketed");
  const [call, setCall] = useState<RaceCall>("nurse");
  const stop = CLUB_CHARTERS[season.charter].stops[season.rounds.length];
  const available = game.run.vehicles.filter(({ vehicleId }) => vehicleId === stop.vehicleId);
  const vehicle = available.find(({ uid }) => uid === vehicleUid) ?? available[0];
  const status = clubEntryStatus(game);
  const course = season.course ? CLUB_COURSES[season.course] : undefined;
  const stages = game.era?.discipline === "rally" ? rallyRoute(stop.venueId, stop.event, course?.stages) : null;
  const issue = vehicle ? clubEntryBlocker(game, vehicle.uid, admission, call) : `Build a ${getVehicle(stop.vehicleId).name} to enter.`;
  return (
    <section className="section" aria-labelledby="club-entry-heading">
      <h3 id="club-entry-heading">Next meeting · {venueName(stop.venueId, game.era?.discipline ?? "dirt")} {capitalize(stop.event)}</h3>
      {course && <p>{course.name}. {course.brief}</p>}
      {stages && <p>Stage surfaces · {stages.map(capitalize).join(" · ")}</p>}
      {status ? <p role="status">{status === "racing" ? "On track." : "Signed up. Waiting for its turn in the race queue."}</p> : <>
        <label className="inline" htmlFor="club-entrant">Club entry
          <select id="club-entrant" value={vehicle?.uid ?? ""} onChange={(event) => setVehicle(event.target.value)}>
            {!vehicle && <option value="">{getVehicle(stop.vehicleId).name} needed</option>}
            {available.map(({ uid, name }) => <option key={uid} value={uid}>{name}</option>)}
          </select>
        </label>
        <label className="inline" htmlFor="club-admission">Admission
          <select id="club-admission" value={admission} onChange={(event) => setAdmission(event.target.value as ClubAdmission)}>
            <option value="ticketed">Ticketed gates · {clubEntryPrice(stop, "ticketed", season.course)} Scrap Bucks</option>
            <option value="public">Free gates · {clubEntryPrice(stop, "public", season.course)} Scrap Bucks</option>
          </select>
        </label>
        {vehicle && <p className="muted">Estimated pace {effectiveScore(game, vehicle, stop.venueId, call, undefined, stop.event, season.course).toFixed(1)} · {pct(winChance(game, vehicle, stop.venueId, stop.event, call, undefined, undefined, season.course))} win odds · {pct(dnfChance(game, vehicle, stop.venueId, stop.event, call, undefined, season.course))} DNF risk</p>}
        <p>{admission === "public" ? "A finish at free gates earns 2 Rep and counts toward the club’s public requirement." : `A ticketed podium earns ${ticketedGrant(stop)} extra Scrap Bucks.`}</p>
        <label className="inline" htmlFor="club-call">Race pace
          <select id="club-call" value={call} onChange={(event) => setCall(event.target.value as RaceCall)}>
            <option value="nurse">Nurse</option><option value="push">Push</option>
          </select>
        </label>
        {issue && <p className="why">{issue}</p>}
        <button className="btn primary" type="button" disabled={!!issue} onClick={() => {
          if (vehicle) dispatch({ type: "club", move: { type: "enter", vehicleUid: vehicle.uid, call, admission } });
        }}>Sign up for club meeting</button>
      </>}
    </section>
  );
}

export function ClubPanel() {
  const game = useGame((s) => s.game);
  const [planning, setPlanning] = useState(false);
  if (!game || clubGate(game)) return null;
  const season = game.club?.active;
  const report = season && clubScore(season);
  const definition = season && CLUB_CHARTERS[season.charter];
  const course = season?.course ? CLUB_COURSES[season.course] : undefined;
  const visitor = game.config.clubVisitor && COUNTY_RIVALS[game.config.clubVisitor];
  const gate = SCRAP_LAYER.gate(game);
  return (
    <div className="panel">
      <header className="section">
        <h2>Grassroots Club</h2>
        <p>Open a local calendar alongside your next racing Season. Club meetings use the same cars, venue ladders, workshop, and race queue.</p>
      </header>
      {planning ? <ResetPlanner layer="scrap" initialClub={season?.charter ?? "yard_co_op"} onDone={() => setPlanning(false)} /> : (
        <>
          {season && definition && report && <>
            <section className="section" aria-labelledby="club-calendar-heading">
              <h3 id="club-calendar-heading">{definition.name}</h3>
              {visitor && <p>{visitor.name} sent a {getPart(visitor.part).name} from {HOME_COUNTIES[visitor.county].name} for this Season’s workshop loan.</p>}
              <p>{report.points}/{definition.points} points · {report.finishes}/{definition.finishes} finishes · {report.publicFinishes}/{definition.publicFinishes} free-gate finishes</p>
              {course && <p>{course.name} · {report.coursePodiums}/{course.podiums} {course.proofCall === "push" ? "Push" : "Nurse"} podiums</p>}
              <ol className="plain">{definition.stops.map((stop, index) => {
                const finish = season.rounds[index];
                return <li key={`${stop.venueId}-${stop.event}`}>
                  <strong>{venueName(stop.venueId, game.era?.discipline ?? "dirt")} {capitalize(stop.event)}</strong> · {getVehicle(stop.vehicleId).name}
                  {finish && <p>{finish.vehicle} · {finish.dnf ? "Did not finish" : ordinal(finish.position)} · {finish.admission === "public" ? "Free gates" : "Ticketed"}{finish.call && ` · ${capitalize(finish.call)}`}</p>}
                </li>;
              })}</ol>
              {report.complete && <p role="status">{report.certified
                ? `Certified. The board paid ${definition.grant} Scrap Bucks and ${definition.rep} Rep into this Season.`
                : "The calendar finished short of its targets. Your results will go into the club archive when the Season ends."}</p>}
              {report.complete && course && <p>{report.trackCertified
                ? `Track certified. ${getPart(course.loanPart).name} can be borrowed in future Club seasons.`
                : `Track license pending. Certify the club with ${course.podiums} ${course.proofCall === "push" ? "Push" : "Nurse"} podiums.`}</p>}
            </section>
            {!report.complete && <MeetingEntry key={`${season.season}-${season.rounds.length}`} game={game} season={season} />}
          </>}
          {(!season || report?.complete) && <section className="section">
            <h3>Next Season</h3>
            <p>A club charter is chosen at Scrap Reset. Your team, crew, Owner titles, and Circuit certificates carry forward.</p>
            <button className="btn primary" type="button" disabled={!gate.ok} onClick={() => setPlanning(true)}>Plan a Club Season</button>
            {!gate.ok && <p className="why">{gate.reason}</p>}
          </section>}
        </>
      )}
      {!!game.club?.history.length && <section className="section" aria-labelledby="club-history-heading">
        <h3 id="club-history-heading">Club history</h3>
        <ul className="plain">{game.club.history.map((past) => (
          <li key={past.season}>Season {past.season} · {CLUB_CHARTERS[past.charter].name} · {capitalize(past.status)} · {clubScore(past).points} points{past.course && ` · ${CLUB_COURSES[past.course].name}${clubScore(past).trackCertified ? " certified" : ""}`}</li>
        ))}</ul>
      </section>}
    </div>
  );
}
