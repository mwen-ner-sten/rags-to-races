"use client";
import Image from "next/image";
import { organizationSprite } from "../sprites";

import { useMemo, useState } from "react";
import { DARES, PERK_BY_ID, SEASON_CHALLENGES, SEASON_CHALLENGE_IDS, challengeMastery, findChallengePerk, isSeasonChallenge, seasonObjectiveConflict } from "@/core/content/modifiers";
import { CREW_BY_ID, TEAM_ORGANIZATION_IDS, TEAM_ORGANIZATIONS, type TeamOrganization } from "@/core/content/team";
import { APPRENTICE_JOBS, HANDOVER_COST, crewHandoverOffers, handoverId, handoverName } from "@/core/crewLegacy";
import { BUILDER_LOADOUTS, LAYERS, SCRAP_LAYER, TEAM_LAYER, nextSeasonPerkSlots, nextTeamPerkSlots, nextSeasonTuneUpPoints, planBuilderLoadout, planPurchases, scrapAward, teamAward, teamResetLegacyBudget, type TeamChoices } from "@/core/layers";
import { homeCounty } from "@/core/counties";
import { CLUB_CHARTERS, clubGate, type ClubCharter } from "@/core/club";
import type { ClubCourseId } from "@/core/clubTrack";
import { COUNTY_RIVALS, type CountyRivalId } from "@/core/countyRivals";
import type { WorksFamily } from "@/core/manufacturer";
import { ClubTrackOptions } from "./ClubTrackOptions";
import { WorksDrawingPicker } from "./ManufacturerPanel";
import type { DisciplineId, GameState, HomeCounty, SeasonChallengeId, SkillId } from "@/core/types";
import { num, pct } from "../format";
import { useGame } from "../store";
import { ResetDisciplines } from "./ResetDisciplines";
import { ResetHardships } from "./ResetHardships";
import { ResetPerks } from "./ResetPerks";
import { ResetSalvage } from "./ResetSalvage";
import { workshopCharterOnly } from "@/core/serviceShop";
import { CheckpointShelf } from "./CheckpointShelf";
import { OpeningComparison } from "./OpeningComparison";
import { ResetHomeCounty } from "./ResetHomeCounty";
import { freightBlocker } from "@/core/salvageCarry";
import { scrapResetLegacyBudget } from "@/core/layers";
import { ResetCommitments } from "./ResetCommitments";
import { experimentalCareers } from "@/core/features";

const SKILLS: { id: SkillId; label: string }[] = [
  { id: "haul", label: "Haul (trip speed)" },
  { id: "wrench", label: "Wrench (bench speed)" },
  { id: "build", label: "Build (assembly speed)" },
  { id: "race", label: "Race prep (practice gain)" },
];

interface Props {
  layer: "scrap" | "team";
  onDone: () => void;
  initialClub?: ClubCharter;
  initialObjective?: SeasonChallengeId;
  initialDiscipline?: DisciplineId;
}

const clubCharters = Object.keys(CLUB_CHARTERS) as ClubCharter[];

export function ResetPlanner({ layer, onDone, initialClub, initialObjective, initialDiscipline }: Props) {
  const game = useGame((s) => s.game) as GameState;
  const dispatch = useGame((s) => s.dispatch);
  const isTeam = layer === "team";
  const [retainedPartUid, setRetainedPartUid] = useState("");
  const [county, setCounty] = useState<HomeCounty>(() => homeCounty(game));
  const [plannedFreight, setFreight] = useState(false);
  const [club, setClub] = useState<ClubCharter | undefined>(initialClub);
  const [clubCourse, setClubCourse] = useState<ClubCourseId | undefined>();
  const [clubLoan, setClubLoan] = useState<ClubCourseId | CountyRivalId | undefined>();
  const [worksPlan, setWorksPlan] = useState<WorksFamily | undefined>();
  const experimental = experimentalCareers();
  const canFreight = !isTeam && !!retainedPartUid && !freightBlocker(game, county, retainedPartUid);
  const freight = canFreight && plannedFreight;
  const award = isTeam ? teamAward(game) : scrapAward(game);
  const lpAvailable = isTeam ? teamResetLegacyBudget(game) : scrapResetLegacyBudget(game, freight);
  const slots = isTeam ? nextTeamPerkSlots(game) : nextSeasonPerkSlots(game, !!retainedPartUid && !freight);
  const points = isTeam ? 5 : nextSeasonTuneUpPoints(game);
  const teamEraNext = isTeam || game.era !== null;

  const [buy, setBuy] = useState<string[]>([]);
  const [equip, setEquip] = useState<string[]>(() => game.config.perks.filter((id) => (game.meta.perks[id] ?? 0) > 0).slice(0, slots));
  const [tune, setTune] = useState<Record<SkillId, number>>(() => {
    const prev = game.config.tuneUp;
    const total = prev.haul + prev.wrench + prev.build + prev.race;
    return total <= points ? { ...prev } : { haul: 0, wrench: 0, build: 0, race: 0 };
  });
  const [dare, setDare] = useState<string | null>(initialObjective ?? null);
  const [hardships, setHardships] = useState<string[]>([]);
  const [discipline, setDiscipline] = useState<DisciplineId>(initialDiscipline ?? (game.era?.discipline === "dirt" ? "drag" : "dirt"));
  const [teamName, setTeamName] = useState(game.era?.teamName ?? "");
  const [colorA, setColorA] = useState(game.era?.colors[0] ?? "#c8372d");
  const [colorB, setColorB] = useState(game.era?.colors[1] ?? "#f2f2ee");
  const [keepCrew, setKeepCrew] = useState<string>("");
  const workshopCharter = workshopCharterOnly(game);
  const [organization, setOrganization] = useState<TeamOrganization>(workshopCharter ? "collective" : game.era?.organization ?? "independent");
  const [handoverKey, setHandoverKey] = useState("");

  const plan = useMemo(() => planPurchases(game, buy, lpAvailable), [game, buy, lpAvailable]);
  const ranks = typeof plan === "string" ? game.meta.perks : plan.ranks;
  const lpLeft = typeof plan === "string" ? 0 : plan.lpLeft;
  const equipped = equip.filter((id) => (ranks[id] ?? 0) > 0);
  const spent = SKILLS.reduce((sum, s) => sum + tune[s.id], 0);

  const gate = LAYERS[layer].gate(game);
  const nextDiscipline = isTeam ? discipline : game.era?.discipline ?? "dirt";
  const conflict = seasonObjectiveConflict(hardships, dare, nextDiscipline);
  const choices = {
    homeCounty: isTeam ? undefined : county,
    countyFreight: !isTeam && freight ? true as const : undefined,
    buy, perks: equipped, tuneUp: tune, dare, hardships, retainedPartUid: isTeam ? undefined : retainedPartUid || undefined,
    club: isTeam ? undefined : club, clubCourse: !isTeam && club ? clubCourse : undefined,
    clubLoan: !isTeam && club && clubLoan && !Object.hasOwn(COUNTY_RIVALS, clubLoan) ? clubLoan as ClubCourseId : undefined,
    clubVisitor: !isTeam && club && clubLoan && Object.hasOwn(COUNTY_RIVALS, clubLoan) ? clubLoan as CountyRivalId : undefined,
    worksPlan: isTeam ? undefined : worksPlan,
  };
  const handovers = isTeam ? crewHandoverOffers(game, discipline) : [];
  const handover = handovers.find((offer) => handoverId(offer) === handoverKey);
  const teamChoices = { ...choices, discipline, organization, handover, teamName, colors: [colorA, colorB], keepCrewId: keepCrew || null } satisfies TeamChoices;
  const blocker = gate.ok ? (isTeam ? TEAM_LAYER.validate(game, teamChoices) : SCRAP_LAYER.validate(game, choices)) : gate.reason;
  const activeChallenge = game.config.dare;

  const confirm = () => {
    if (dispatch({ type: "reset", layer, choices: isTeam ? teamChoices : choices })) onDone();
  };

  return (
    <div className="planner">
      <p className="hint">Completing all {DARES.length} Dares permanently adds one perk slot, including after a Team Reset.</p>
      <div className="award">
        <span className="big num">{num(award)}</span> {isTeam ? "Team Points" : "Legacy Points"} for this {isTeam ? "team" : "Season"}
      </div>
      {isTeam && <p className="hint">{num(scrapAward(game))} Legacy Points from this Season are available to spend below. {num(lpLeft)} unspent Legacy Points will expire when the team resets.</p>}
      {isTeam && (
        <fieldset>
          <legend>Your team</legend>
          <label className="inline">
            <span>Team name</span>
            <input value={teamName} maxLength={40} onChange={(e) => setTeamName(e.target.value)} placeholder="Curbside Racing" />
          </label>
          <label className="inline">
            <span>Colours</span>
            <input type="color" value={colorA} onChange={(e) => setColorA(e.target.value)} aria-label="Main colour" />
            <input type="color" value={colorB} onChange={(e) => setColorB(e.target.value)} aria-label="Second colour" />
          </label>
          <ResetDisciplines game={game} chosen={discipline} onChoose={setDiscipline} />
          <fieldset id="team-organization">
            <legend>Team organization</legend>
            <div className="organization-options">
            {TEAM_ORGANIZATION_IDS.map((id) => (
              <label className="organization-choice" key={id}>
                <Image src={organizationSprite(id)} width={880} height={495} sizes="(max-width: 600px) 90vw, 340px" alt="" />
                <span><input type="radio" name="team-organization" disabled={workshopCharter && id !== "collective"} checked={organization === id} onChange={() => setOrganization(id)} /> <strong>{TEAM_ORGANIZATIONS[id].name}</strong></span>
                <span>{TEAM_ORGANIZATIONS[id].description}</span>
              </label>
            ))}
            </div>
          </fieldset>
          {handovers.length > 0 && (
            <>
              <label className="inline">
                <span>Crew handover</span>
                <select id="team-handover" value={handover ? handoverKey : ""} onChange={(event) => setHandoverKey(event.target.value)}>
                  <option value="">No handover</option>
                  {handovers.map((offer) => (
                    <option key={handoverId(offer)} value={handoverId(offer)}>{handoverName(offer, discipline)}</option>
                  ))}
                </select>
              </label>
              {handover && <p className="hint">
                Costs {HANDOVER_COST} Team Points from your balance and this reset’s award. {handover.type === "apprenticeship"
                  ? `One new crew member must finish ${APPRENTICE_JOBS} matching jobs to teach the Habit to this team across future Seasons.`
                  : "Open the venue as usual. These notes let you enter its Heat directly in future Seasons with this team."}
              </p>}
            </>
          )}
          {game.era && (game.team.upgrades.old_hands ?? 0) > 0 && (
            <label className="inline">
              <span>Keep one crew member</span>
              <select value={keepCrew} onChange={(e) => setKeepCrew(e.target.value)}>
                <option value="">Nobody</option>
                {game.era.crew.map((c) => (
                  <option key={c.id} value={c.id}>
                    {CREW_BY_ID[c.id]?.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </fieldset>
      )}

      <div className="keep-lose">
        <div>
          <h3 className="label">You keep</h3>
          <ul>
            <li>What you know and your Notebook: Codex, Know-how, Habit memory, records, rivals, Hall of Fame</li>
            <li>Perks you own{isTeam ? " (slots go back to the base)" : ""}</li>
            {isTeam ? <li>Team Points and team upgrades</li> : <li>Legacy Points you don’t spend</li>}
            {!isTeam && game.era && <li>Your team, crew, discipline and organization</li>}
          </ul>
        </div>
        <div>
          <h3 className="label">You lose</h3>
          <ul>
            <li>{retainedPartUid && !isTeam ? "Other parts" : "Parts"}, vehicles, Scrap Bucks, Rep, tools</li>
            <li>Places and venues opened this Season</li>
            {isTeam && <li>Unspent Legacy Points and your crew{game.team.upgrades.old_hands ? " (keep one with Old Hands)" : ""}. Choose your next discipline and organization below.</li>}
          </ul>
        </div>
      </div>

      {!isTeam && <ResetHomeCounty game={game} county={county} onChoose={(nextCounty) => {
        setCounty(nextCounty);
        setFreight(false);
      }} />}
      {!isTeam && <ResetSalvage game={game} value={retainedPartUid} slots={nextSeasonPerkSlots(game)} rookie={hardships.includes("rookie_plates")} freight={freight} onFreight={canFreight ? setFreight : undefined} onChange={(uid) => {
        setRetainedPartUid(uid);
        setFreight(false);
      }} />}
      {!isTeam && !clubGate(game) && <fieldset>
        <legend>Club charter (optional)</legend>
        <p className="hint">Your team and Circuit certificates carry forward. The club supplies its opening support alongside your usual perks and any retained part.</p>
        <label className="check"><input type="radio" name="club-charter" checked={!club} onChange={() => setClub(undefined)} /> Race without a club</label>
        {clubCharters.map((id) => <label className="check" key={id}>
          <input type="radio" name="club-charter" checked={club === id} onChange={() => setClub(id)} />
          <span><strong>{CLUB_CHARTERS[id].name}</strong>. {CLUB_CHARTERS[id].opening}</span>
        </label>)}
      </fieldset>}
      {!isTeam && club && <ClubTrackOptions game={game} course={clubCourse} loan={clubLoan} onCourse={setClubCourse} onLoan={setClubLoan} />}
      {!isTeam && experimental && <WorksDrawingPicker game={game} value={worksPlan} onChange={setWorksPlan} />}

      <fieldset>
        <legend>Builder loadouts</legend>
        <p className="hint">A loadout sets equipped perks and tune-ups. Review any perk purchases before confirming the reset.</p>
        {(Object.keys(BUILDER_LOADOUTS) as (keyof typeof BUILDER_LOADOUTS)[]).map((routeId) => {
          const route = BUILDER_LOADOUTS[routeId];
          const draft = planBuilderLoadout(game, routeId, slots, points, lpAvailable, buy);
          const reason = hardships.includes("rookie_plates") ? "Rookie Plates disables perks" : typeof draft === "string" ? draft : null;
          return (
            <div key={routeId} className="row-card">
              <div><strong>{route.name}</strong><p className="hint">{route.note}</p></div>
              <div className="row-action">
                <button className="btn small wrap" disabled={!!reason} onClick={() => {
                  if (typeof draft === "string") return;
                  setBuy(draft.buy);
                  setEquip(draft.perks);
                  setTune(draft.tuneUp);
                }}>{typeof draft !== "string" && draft.lpCost > 0 ? `Plan · ${num(draft.lpCost)} Legacy Points` : "Use loadout"}</button>
                {reason && <span className="why">{reason}</span>}
              </div>
            </div>
          );
        })}
      </fieldset>

      <ResetPerks
        game={game}
        ranks={ranks}
        lpLeft={lpLeft}
        slots={slots}
        equipped={equipped}
        purchases={buy.length}
        onBuy={(id) => setBuy([...buy, id])}
        onUndo={() => setBuy([])}
        onEquip={setEquip}
      />

      <fieldset>
        <legend>
          Tune-up points · {spent}/{points}
        </legend>
        {spent >= points && <p className="why">No tune-up points left to spend</p>}
        <div className="steppers">
          {SKILLS.map((s) => (
            <div key={s.id} className="stepper">
              <span>{s.label}</span>
              <button className="btn small" aria-label={`Less ${s.label}`} disabled={tune[s.id] <= 0} onClick={() => setTune({ ...tune, [s.id]: tune[s.id] - 1 })}>
                −
              </button>
              <span className="num">+{tune[s.id] * 10}%</span>
              <button className="btn small" aria-label={`More ${s.label}`} disabled={spent >= points} onClick={() => setTune({ ...tune, [s.id]: tune[s.id] + 1 })}>
                +
              </button>
            </div>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Objective for next Season (optional)</legend>
        <label className="check">
          <input type="radio" name="dare" checked={dare === null} onChange={() => setDare(null)} /> Standard Season
        </label>
        {DARES.filter((d) => !game.meta.daresCompleted.includes(d.id)).map((d) => (
          <label key={d.id} className="check">
            <input type="radio" name="dare" checked={dare === d.id} onChange={() => setDare(d.id)} />
            <span>
              <strong>{d.name}</strong>: {d.text} Unlocks {PERK_BY_ID[d.unlocksPerk].name}.
            </span>
          </label>
        ))}
        {SEASON_CHALLENGE_IDS.map((id) => {
          const challenge = SEASON_CHALLENGES[id];
          const done = game.meta.challengeRecords[id]?.completions ?? 0;
          const perk = findChallengePerk(id);
          const unavailable = seasonObjectiveConflict(hardships, id, nextDiscipline);
          return (
            <label key={id} className="check">
              <input id={`reset-objective-${id}`} type="radio" name="dare" checked={dare === id} disabled={dare !== id && !!unavailable} onChange={() => setDare(id)} />
              <span>
                <strong>{challenge.name}</strong>. {challenge.text} {challenge.mastery} increases by 5% per completion, up to 15%.
                {done > 0 && <span className="muted"> Completed {done}× · +{pct(challengeMastery(done))}.</span>}
                {perk?.unlock.type === "challenge" && (
                  <span> {done < perk.unlock.completions ? `Complete it ${perk.unlock.completions} times to unlock ${perk.name}.` : `${perk.name} is unlocked.`}</span>
                )}
                {unavailable && <span className="why"> {unavailable}</span>}
              </span>
            </label>
          );
        })}
      </fieldset>

      {teamEraNext && <ResetHardships game={game} chosen={hardships} conflict={conflict} onChange={setHardships} />}

      <CheckpointShelf />
      <OpeningComparison game={game} layer={layer} choices={isTeam ? teamChoices : choices} blocker={blocker} />
      <ResetCommitments game={game} />
      {isSeasonChallenge(activeChallenge) && game.run.challenge.completedAt === undefined && (
        <p className="why">This reset ends your current {SEASON_CHALLENGES[activeChallenge].name} attempt. You can select it again for the next Season.</p>
      )}
      <div className="actions">
        <button className="btn primary big wrap" disabled={!!blocker} onClick={confirm}>
          {isTeam ? (game.era ? "Fold the team and start over" : "Found the team") : "End the Season: Scrap Reset"}
        </button>
        <button className="btn" onClick={onDone}>
          Not yet
        </button>
        {blocker && <span className="why">{blocker}</span>}
      </div>
    </div>
  );
}
