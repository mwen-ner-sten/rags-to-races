"use client";

import { useMemo, useState } from "react";
import { DARES, PERK_BY_ID, hardshipConflict } from "@/core/content/modifiers";
import { CREW_BY_ID } from "@/core/content/team";
import { LAYERS, nextSeasonPerkSlots, nextTeamPerkSlots, nextSeasonTuneUpPoints, planPurchases, scrapAward, teamAward, type TeamChoices } from "@/core/layers";
import type { DisciplineId, GameState, SkillId } from "@/core/types";
import { num } from "../format";
import { useGame } from "../store";
import { ResetDisciplines } from "./ResetDisciplines";
import { ResetHardships } from "./ResetHardships";
import { ResetPerks } from "./ResetPerks";

const SKILLS: { id: SkillId; label: string }[] = [
  { id: "haul", label: "Haul (trip speed)" },
  { id: "wrench", label: "Wrench (bench speed)" },
  { id: "build", label: "Build (assembly speed)" },
  { id: "race", label: "Race prep (practice gain)" },
];

interface Props {
  layer: "scrap" | "team";
  onDone: () => void;
}

export function ResetPlanner({ layer, onDone }: Props) {
  const game = useGame((s) => s.game) as GameState;
  const dispatch = useGame((s) => s.dispatch);
  const isTeam = layer === "team";
  const award = isTeam ? teamAward(game) : scrapAward(game);
  const lpAvailable = isTeam ? game.scrap.lp : game.scrap.lp + award;
  const slots = isTeam ? nextTeamPerkSlots(game) : nextSeasonPerkSlots(game);
  const points = isTeam ? 5 : nextSeasonTuneUpPoints(game);
  const teamEraNext = isTeam || game.era !== null;

  const [buy, setBuy] = useState<string[]>([]);
  const [equip, setEquip] = useState<string[]>(() => game.config.perks.filter((id) => (game.meta.perks[id] ?? 0) > 0).slice(0, slots));
  const [tune, setTune] = useState<Record<SkillId, number>>(() => {
    const prev = game.config.tuneUp;
    const total = prev.haul + prev.wrench + prev.build + prev.race;
    return total <= points ? { ...prev } : { haul: 0, wrench: 0, build: 0, race: 0 };
  });
  const [dare, setDare] = useState<string | null>(null);
  const [hardships, setHardships] = useState<string[]>([]);
  const [discipline, setDiscipline] = useState<DisciplineId>(game.era?.discipline === "dirt" ? "drag" : "dirt");
  const [teamName, setTeamName] = useState(game.era?.teamName ?? "");
  const [colorA, setColorA] = useState(game.era?.colors[0] ?? "#c8372d");
  const [colorB, setColorB] = useState(game.era?.colors[1] ?? "#f2f2ee");
  const [keepCrew, setKeepCrew] = useState<string>("");

  const plan = useMemo(() => planPurchases(game, buy, lpAvailable), [game, buy, lpAvailable]);
  const ranks = typeof plan === "string" ? game.meta.perks : plan.ranks;
  const lpLeft = typeof plan === "string" ? 0 : plan.lpLeft;
  const equipped = equip.filter((id) => (ranks[id] ?? 0) > 0);
  const spent = SKILLS.reduce((sum, s) => sum + tune[s.id], 0);

  const gate = LAYERS[layer].gate(game);
  const conflict = hardshipConflict(hardships, dare);
  const blocker = gate.ok ? conflict : gate.reason;

  const confirm = () => {
    const base = { buy, perks: equipped, tuneUp: tune, dare, hardships };
    const choices = isTeam ? ({ ...base, discipline, teamName, colors: [colorA, colorB], keepCrewId: keepCrew || null } satisfies TeamChoices) : base;
    if (dispatch({ type: "reset", layer, choices })) onDone();
  };

  return (
    <div className="planner">
      <p className="hint">Completing all {DARES.length} Dares permanently adds one perk slot, including after a Team Reset.</p>
      <div className="award">
        <span className="big num">{num(award)}</span> {isTeam ? "Team Points" : "Legacy Points"} for this {isTeam ? "team" : "Season"}
      </div>
      <div className="keep-lose">
        <div>
          <h3 className="label">You keep</h3>
          <ul>
            <li>Your Notebook: Codex, Know-how, Habit memory, records, rivals, Hall of Fame</li>
            <li>Perks you own{isTeam ? " (slots go back to the base)" : ""}</li>
            {isTeam ? <li>Team Points and team upgrades</li> : <li>Legacy Points you don’t spend</li>}
            {!isTeam && game.era && <li>Your team, crew and discipline</li>}
          </ul>
        </div>
        <div>
          <h3 className="label">You lose</h3>
          <ul>
            <li>Parts, vehicles, Scrap Bucks, Rep, tools</li>
            <li>Places and venues opened this Season</li>
            {isTeam && <li>Unspent Legacy Points, your crew{game.team.upgrades.old_hands ? " (keep one with Old Hands)" : ""}, discipline</li>}
          </ul>
        </div>
      </div>

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
        <legend>Dare for next Season (optional)</legend>
        <label className="check">
          <input type="radio" name="dare" checked={dare === null} onChange={() => setDare(null)} /> No dare
        </label>
        {DARES.filter((d) => !game.meta.daresCompleted.includes(d.id)).map((d) => (
          <label key={d.id} className="check">
            <input type="radio" name="dare" checked={dare === d.id} onChange={() => setDare(d.id)} />
            <span>
              <strong>{d.name}</strong>: {d.text} Unlocks {PERK_BY_ID[d.unlocksPerk].name}.
            </span>
          </label>
        ))}
      </fieldset>

      {teamEraNext && <ResetHardships game={game} chosen={hardships} conflict={conflict} onChange={setHardships} />}

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
