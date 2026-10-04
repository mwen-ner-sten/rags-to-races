"use client";

import { useState } from "react";
import { DISCIPLINES } from "@/core/content/events";
import { CREW_BY_ID, TEAM_UPGRADES, crewLevel } from "@/core/content/team";
import { crewCap, LAYERS, teamAward } from "@/core/layers";
import type { CrewMember, GameState } from "@/core/types";
import { num } from "../format";
import { habitLabel, habitOptions } from "../labels";
import { useGame } from "../store";
import { ResetPlanner } from "./ResetPlanner";

function assignmentValue(a: CrewMember["assignment"]): string {
  return a.type === "habit" ? `habit:${a.template}` : a.type;
}

function CrewCard({ game, member }: { game: GameState; member: CrewMember }) {
  const dispatch = useGame((s) => s.dispatch);
  const def = CREW_BY_ID[member.id];
  if (!def) return null;
  const level = crewLevel(member.jobsDone);
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
          <select value={assignmentValue(member.assignment)} onChange={(e) => onChange(e.target.value)}>
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
        <button className="link-btn" onClick={() => dispatch({ type: "dismiss", crewId: member.id })}>
          Let go
        </button>
      </div>
    </article>
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
      <section className="section" aria-labelledby="crew-h">
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
                    <button className="btn" disabled={era.crew.length >= cap} onClick={() => dispatch({ type: "hire", crewId: id })}>
                      Hire
                    </button>
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
                <button className="btn" disabled={cost === undefined || game.team.tp < cost} onClick={() => dispatch({ type: "buyTeamUpgrade", upgradeId: u.id })}>
                  {cost === undefined ? "Built" : `${cost} TP`}
                </button>
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
