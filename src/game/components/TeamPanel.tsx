"use client";

import { useState } from "react";
import { DISCIPLINES } from "@/core/content/events";
import { HARDSHIP_BY_ID } from "@/core/content/modifiers";
import { CREW_BY_ID, TEAM_UPGRADES, crewLevel } from "@/core/content/team";
import { crewCap, LAYERS, teamAward } from "@/core/layers";
import { crewBusyRacing } from "@/core/crew";
import type { CrewMember, DisciplineId, GameState } from "@/core/types";
import { num } from "../format";
import { habitLabel, habitOptions } from "../labels";
import { useGame } from "../store";
import { ResetPlanner } from "./ResetPlanner";
import { Tips } from "./Tips";

function assignmentValue(a: CrewMember["assignment"]): string {
  return a.type === "habit" ? `habit:${a.template}` : a.type;
}

function CrewCard({ game, member }: { game: GameState; member: CrewMember }) {
  const dispatch = useGame((s) => s.dispatch);
  const def = CREW_BY_ID[member.id];
  if (!def) return null;
  const level = crewLevel(member.jobsDone);
  const racing = crewBusyRacing(game, member.id);
  const onChange = (value: string) => {
    const assignment: CrewMember["assignment"] = value.startsWith("habit:") ? { type: "habit", template: value.slice(6) } : ({ type: value } as CrewMember["assignment"]);
    dispatch({ type: "assignCrew", crewId: member.id, assignment });
  };
  return (
    <article className="card crew">
      <div className="card-body">
        <h3>
          {def.name} <span className="chip">{def.role}</span> <span className="muted num">Lv {level}{level >= 5 ? " · Legend" : ""}</span>
        </h3>
        <p className="blurb">
          {def.strength} <span className="muted">{def.quirk}</span>
        </p>
        <div className="mini-progress">
          <span>Morale</span>
          <div className="bar small" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(member.morale)}>
            <span style={{ width: `${member.morale}%` }} />
          </div>
        </div>
        <label className="inline">
          <span>Doing</span>
          <select value={assignmentValue(member.assignment)} disabled={racing} onChange={(e) => onChange(e.target.value)}>
            <option value="queue">Jobs from the queue</option>
            {habitOptions(game).map((t) => (
              <option key={t} value={`habit:${t}`}>
                Habit: {habitLabel(game, t)}
              </option>
            ))}
            {def.driverPerf && <option value="driver">Driving</option>}
            {def.dnfMult && <option value="spotter">Spotting</option>}
            <option value="rest">Resting</option>
          </select>
        </label>
        {racing && <p className="why">On the track. Assignments can change after the race.</p>}
        <button className="link-btn" disabled={racing} onClick={() => dispatch({ type: "dismiss", crewId: member.id })}>
          Let go
        </button>
      </div>
    </article>
  );
}

function RulesAndMastery({ game, discipline }: { game: GameState; discipline: DisciplineId }) {
  const disciplines = (Object.keys(DISCIPLINES) as DisciplineId[]).filter((id) => (game.meta.disciplineMastery[id] ?? 0) > 0);
  const hardships = Object.keys(game.meta.hardshipMastery).filter((id) => (game.meta.hardshipMastery[id] ?? 0) > 0 && HARDSHIP_BY_ID[id]);
  return (
    <>
      <section className="section" aria-labelledby="rules-h">
        <h2 id="rules-h">This team&apos;s rules</h2>
        <ul className="plain">
          {DISCIPLINES[discipline].rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </section>
      {(disciplines.length > 0 || hardships.length > 0) && (
        <section className="section" aria-labelledby="mastered-h">
          <h2 id="mastered-h">What you&apos;ve mastered</h2>
          <ul className="plain">
            {disciplines.map((id) => (
              <li key={id}>
                <strong>{DISCIPLINES[id].name}</strong> <span className="num muted">level {game.meta.disciplineMastery[id]}</span>
                <p className="blurb">{DISCIPLINES[id].mastery.text}</p>
              </li>
            ))}
            {hardships.map((id) => (
              <li key={id}>
                <strong>{HARDSHIP_BY_ID[id].name}</strong> <span className="num muted">done {game.meta.hardshipMastery[id]}×</span>
                <p className="blurb">{HARDSHIP_BY_ID[id].reward}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

export function TeamPanel() {
  const game = useGame((s) => s.game);
  const dispatch = useGame((s) => s.dispatch);
  const [planning, setPlanning] = useState(false);
  if (!game) return null;
  const gate = LAYERS.team.gate(game);
  if (planning) {
    return (
      <section className="section" aria-labelledby="team-plan-h">
        <h2 id="team-plan-h">{game.era ? "Start a new team" : "Found your team"}</h2>
        <ResetPlanner layer="team" onDone={() => setPlanning(false)} />
      </section>
    );
  }
  if (!game.era) {
    return (
      <section className="section" aria-labelledby="team-h">
        <h2 id="team-h">Lou&apos;s back bay</h2>
        <p className="sub">
          Win the State Invitational Feature and Lou offers you the empty bay behind his race shop. Founding a team ends Era 1: you pick a discipline, hire crew who work in parallel, and earn Team Points. Your Legacy Points and perk slots start over; everything in your Notebook stays.
        </p>
        <p>
          Founding now would give <strong className="num">{num(teamAward(game))}</strong> Team Points.
        </p>
        <div className="actions">
          <button className="btn primary big" disabled={!gate.ok} onClick={() => setPlanning(true)}>
            Found the team
          </button>
          {!gate.ok && <span className="why">{gate.reason}</span>}
        </div>
      </section>
    );
  }
  const era = game.era;
  const cap = crewCap(game);
  return (
    <div className="panel">
      <section className="section" aria-labelledby="team-h">
        <h2 id="team-h">{era.teamName}</h2>
        <p className="sub">
          {DISCIPLINES[era.discipline].name}. {DISCIPLINES[era.discipline].blurb}
        </p>
        <dl className="facts wide">
          <div>
            <dt>Team Points</dt>
            <dd className="num">{num(game.team.tp)}</dd>
          </div>
          <div>
            <dt>Next Team Reset adds</dt>
            <dd className="num">{num(teamAward(game))}</dd>
          </div>
          <div>
            <dt>Seasons with this team</dt>
            <dd className="num">{era.seasonIndex + 1}</dd>
          </div>
        </dl>
      </section>
      <RulesAndMastery game={game} discipline={era.discipline} />
      <section className="section" aria-labelledby="crew-h">
        <Tips ids={["crew"]} />
        <h2 id="crew-h">
          Crew <span className="muted num">{era.crew.length}/{cap}</span>
        </h2>
        {game.config.hardships.includes("solo") && <p className="notice">Solo Season: no crew until it ends.</p>}
        <div className="cards">
          {era.crew.map((m) => (
            <CrewCard key={m.id} game={game} member={m} />
          ))}
        </div>
        {game.run.candidates.length > 0 && (
          <>
            <h3 className="label">Looking for work this Season</h3>
            <div className="grid-list">
              {game.run.candidates.map((id) => {
                const def = CREW_BY_ID[id];
                return (
                  <div key={id} className="row-card">
                    <div>
                      <strong>{def.name}</strong> <span className="chip">{def.role}</span>
                      <p className="blurb">
                        {def.strength} <span className="muted">{def.quirk}</span>
                      </p>
                    </div>
                    <div className="row-action">
                      <button className="btn" disabled={era.crew.length >= cap} onClick={() => dispatch({ type: "hire", crewId: id })}>
                        Hire
                      </button>
                      {era.crew.length >= cap && <span className="why">Crew is full ({era.crew.length}/{cap})</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
      <section className="section" aria-labelledby="upgrades-h">
        <h2 id="upgrades-h">Shop upgrades</h2>
        <div className="grid-list">
          {TEAM_UPGRADES.map((u) => {
            const rank = game.team.upgrades[u.id] ?? 0;
            const cost = u.cost[rank];
            return (
              <div key={u.id} className="row-card">
                <div>
                  <strong>{u.name}</strong> {u.cost.length > 1 && <span className="muted num">{rank}/{u.cost.length}</span>}
                  <p className="blurb">{u.text}</p>
                </div>
                <div className="row-action">
                  <button className="btn wrap" disabled={cost === undefined || game.team.tp < cost} onClick={() => dispatch({ type: "buyTeamUpgrade", upgradeId: u.id })}>
                    {cost === undefined ? "Built" : `${cost} Team Points`}
                  </button>
                  {cost !== undefined && game.team.tp < cost && <span className="why">Needs {cost - game.team.tp} more Team Points</span>}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <section className="section">
        <div className="actions">
          <button className="btn" disabled={!gate.ok} onClick={() => setPlanning(true)}>
            Plan a Team Reset
          </button>
          {!gate.ok && <span className="why">{gate.reason}</span>}
        </div>
      </section>
    </div>
  );
}
