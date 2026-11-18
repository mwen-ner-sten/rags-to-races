"use client";

import { useState } from "react";
import { DISCIPLINES, VENUES, venueName } from "@/core/content/events";
import { DARE_BY_ID, HARDSHIP_BY_ID, PERK_BY_ID, SEASON_CHALLENGES, isSeasonChallenge } from "@/core/content/modifiers";
import type { SeasonResult } from "@/core/types";
import { getPart } from "@/core/content/parts";
import { HOME_COUNTIES } from "@/core/counties";
import { partOriginLabel } from "@/core/provenance";
import { TEAM_ORGANIZATIONS } from "@/core/content/team";
import { CLUB_CHARTERS } from "@/core/club";
import { CLUB_COURSES } from "@/core/clubTrack";
import { conditionName, duration } from "../format";

function Loadout({ season }: { season: SeasonResult }) {
  const { setup } = season;
  const objective = setup.dare && (isSeasonChallenge(setup.dare) ? SEASON_CHALLENGES[setup.dare] : DARE_BY_ID[setup.dare]);
  const perks = setup.perks.map((id) => PERK_BY_ID[id].name);
  const hardships = setup.hardships.map((id) => HARDSHIP_BY_ID[id].name);
  const training = Object.entries(setup.tuneUp).filter(([, points]) => points > 0).map(([skill, points]) => `${skill} +${points}`);
  return <section className="card">
    <h3>Season {season.season} · {season.teamName ?? "Home garage"}</h3>
    <p>{DISCIPLINES[season.discipline].name} · {season.endedBy === "team" ? "Team" : "Scrap"} Reset after {duration(season.durationMs)}</p>
    <p>{season.hauls} hauls · {season.builds} vehicles at reset</p>
    {season.organization && <p>{TEAM_ORGANIZATIONS[season.organization].name}</p>}
    {setup.club && <p>Club · {CLUB_CHARTERS[setup.club].name}</p>}
    {setup.clubCourse && <p>Course · {CLUB_COURSES[setup.clubCourse].name}</p>}
    {setup.clubLoan && <p>Track workshop loan · {getPart(CLUB_COURSES[setup.clubLoan].loanPart).name}</p>}
    {season.regularityFeatures && <p>Certified stages · {Object.keys(season.regularityFeatures).map((id) => venueName(id, "rally")).join(", ")}</p>}
    {setup.homeCounty && <p>Home county · {HOME_COUNTIES[setup.homeCounty].name}</p>}
    {setup.donor && <p>Donor · {conditionName(setup.donor.condition)} {getPart(setup.donor.partId).name} from {partOriginLabel(setup.donor)}</p>}
    {objective && <p>Objective · {objective.name}</p>}
    {hardships.length > 0 && <p>Hardships · {hardships.join(", ")}</p>}
    {perks.length > 0 && <p>Equipped perks · {perks.join(", ")}</p>}
    {training.length > 0 && <p>Tune-ups · {training.join(", ")}</p>}
  </section>;
}

export function SeasonLog({ log }: { log: readonly SeasonResult[] }) {
  const [firstId, setFirstId] = useState("");
  const [secondId, setSecondId] = useState("");
  if (!log.length) return <p className="empty">Finish a Season with a reset to record its loadout and Feature times here.</p>;
  const newest = [...log].reverse();
  const first = newest.find((entry) => String(entry.season) === firstId) ?? newest[0];
  const other = newest.filter((entry) => entry.season !== first.season);
  const second = other.find((entry) => String(entry.season) === secondId) ?? other[0];
  const selectSeason = (entries: SeasonResult[]) => entries.map((entry) => <option key={entry.season} value={entry.season}>Season {entry.season} · {entry.teamName ?? "Home garage"}</option>);
  return <div>
    <div className="row">
      <label>Season to inspect <select value={first.season} onChange={(e) => setFirstId(e.target.value)}>{selectSeason(newest)}</select></label>
      {second && <label>Compare with <select value={second.season} onChange={(e) => setSecondId(e.target.value)}>{selectSeason(other)}</select></label>}
    </div>
    <Loadout season={first} />
    {second && <Loadout season={second} />}
    <table>
      <caption>Time to first Feature win</caption>
      <thead><tr><th scope="col">Track</th><th scope="col">Season {first.season}</th>{second && <th scope="col">Season {second.season}</th>}</tr></thead>
      <tbody>{VENUES.filter(({ id }) => first.featureWins[id] !== undefined || second?.featureWins[id] !== undefined).map(({ id }) =>
        <tr key={id}><th scope="row">{venueName(id, first.discipline)}{second && second.discipline !== first.discipline && <> / {venueName(id, second.discipline)}</>}</th>
          <td>{first.featureWins[id] === undefined ? "No win" : duration(first.featureWins[id])}</td>
          {second && <td>{second.featureWins[id] === undefined ? "No win" : duration(second.featureWins[id])}</td>}
        </tr>)}</tbody>
    </table>
  </div>;
}
