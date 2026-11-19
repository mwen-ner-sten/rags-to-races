"use client";
import Image from "next/image";

import { depotCharter } from "@/core/serviceShop";
import { useState } from "react";
import { DISCIPLINES, venueName } from "@/core/content/events";
import { HARDSHIP_BY_ID } from "@/core/content/modifiers";
import { CREW_BY_ID, TEAM_ORGANIZATIONS, crewLevel } from "@/core/content/team";
import { crewCap, LAYERS, teamAward } from "@/core/layers";
import { crewBusyRacing, crewTravelBlocker, teamOrganization } from "@/core/crew";
import { resolveFlags } from "@/core/rules";
import { APPRENTICE_JOBS, HANDOVER_TRACK_STARTS, crewCanApprentice, handoverName } from "@/core/crewLegacy";
import { habitName } from "@/core/habits";
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
  const handTools = resolveFlags(game).habitsDisabled;
  const discipline = game.era?.discipline ?? "dirt";
  const recordedWork = Object.entries(member.service?.workshop ?? {});
  const recordedStarts = Object.entries(member.service?.venues?.[discipline] ?? {}).filter(([venue]) => venue !== "backyard");
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
        {(recordedWork.length > 0 || recordedStarts.length > 0) && (
          <details>
            <summary>Handover experience</summary>
            <ul className="plain">
              {recordedWork.map(([routine, count]) => <li key={routine}>{habitName(routine)} · {count} crew jobs</li>)}
              {recordedStarts.map(([venue, count]) => <li key={venue}>{venueName(venue, discipline)} · {count} starts</li>)}
            </ul>
          </details>
        )}
        <div className="mini-progress">
          <span>Morale</span>
          <div className="bar small" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(member.morale)}>
            <span style={{ width: `${member.morale}%` }} />
          </div>
        </div>
        <label className="inline">
          <span>Doing</span>
          <select value={assignmentValue(member.assignment)} disabled={racing} onChange={(e) => onChange(e.target.value)}>
            <option value="queue" disabled={handTools && member.assignment.type !== "queue"}>{handTools ? "Queue paused for Hand Tools Only" : "Jobs from the queue"}</option>
            {!handTools && habitOptions(game).filter((template) => !crewTravelBlocker(game, template)).map((t) => (
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

export function TeamPanel({ plannedDiscipline }: { plannedDiscipline?: DisciplineId }) {
  const game = useGame((s) => s.game);
  const dispatch = useGame((s) => s.dispatch);
  const [planning, setPlanning] = useState<DisciplineId | boolean>(plannedDiscipline ?? false);
  if (!game) return null;
  const gate = LAYERS.team.gate(game);
  if (planning) {
    return (
      <section className="section" aria-labelledby="team-plan-h">
        <h2 id="team-plan-h">{game.era ? "Start a new team" : "Found your team"}</h2>
        <ResetPlanner layer="team" initialDiscipline={typeof planning === "string" ? planning : undefined} onDone={() => setPlanning(false)} />
      </section>
    );
  }
  if (!game.era) {
    return (
      <section className="section" aria-labelledby="team-h">
        <h2 id="team-h">Lou&apos;s back bay</h2>
        <p className="sub">
          A State Invitational win opens Lou’s back bay to either team. Customer jobs can also earn you a Workshop Collective when both business references are on file, all three of this Season’s customer jobs are done, and you have a hauler. Founding a team ends Era 1: you pick a discipline, hire crew who work in parallel, and earn Team Points. Your Legacy Points and perk slots start over; everything you know and everything in your Notebook stays.
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
  const handTools = resolveFlags(game).habitsDisabled;
  const organization = TEAM_ORGANIZATIONS[teamOrganization(game)];
  return (
    <div className="panel">
      <section className="section" aria-labelledby="team-h">
        <h2 id="team-h">{era.teamName}</h2>
        <Image className="team-garage-view" src={`/sprites/organizations/${teamOrganization(game)}.webp`} width={880} height={495} sizes="(max-width: 600px) 92vw, 640px" alt={organization.name} />
        <p className="sub">
          {DISCIPLINES[era.discipline].name}. {DISCIPLINES[era.discipline].blurb}
        </p>
        <p className="sub"><strong>{organization.name}</strong>. {organization.description}</p>
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
        {era.crew.length > 0 && !era.handover && <p className="sub">A level 2 crew member can leave a handover on Team Reset after {APPRENTICE_JOBS} jobs of one workshop routine or {HANDOVER_TRACK_STARTS} starts as a driver or spotter at the same venue.</p>}
        {era.handover && (
          <p className="sub"><strong>{handoverName(era.handover, era.discipline)}</strong>. {era.handover.type === "track_notes"
            ? "The notes qualify you for the Heat whenever this venue opens."
            : era.handover.completed >= APPRENTICE_JOBS
              ? "Graduated. This Habit stays with the team across Scrap Resets when Habits are enabled."
              : `${era.handover.completed}/${APPRENTICE_JOBS} jobs. ${handTools
                ? "Hand Tools Only pauses the apprenticeship this Season."
                : era.handover.apprenticeId
                  ? `${CREW_BY_ID[era.handover.apprenticeId].name} is the apprentice.`
                  : "Put an eligible recruit on Jobs from the queue. Their first matching job starts the apprenticeship."}`}
          </p>
        )}
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
                      {!handTools && era.handover?.type === "apprenticeship" && crewCanApprentice(game, id, era.handover.routine) && <p className="sub">Can apprentice with this team.</p>}
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
      <section className="section">
        <div className="actions">
          {depotCharter(game) && <p>Both depot receipts are filed. This Season qualifies for a Workshop Collective charter and earns 4 additional Team Points at your next Team Reset.</p>}
          <button className="btn" disabled={!gate.ok} onClick={() => setPlanning(true)}>
            Plan a Team Reset
          </button>
          {!gate.ok && <span className="why">{gate.reason}</span>}
        </div>
      </section>
    </div>
  );
}
