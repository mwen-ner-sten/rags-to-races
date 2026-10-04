"use client";

import { useMemo, useState } from "react";
import { DISCIPLINES } from "@/core/content/events";
import { DARES, HARDSHIPS, PERKS, PERK_BY_ID } from "@/core/content/modifiers";
import { CREW_BY_ID } from "@/core/content/team";
import { LAYERS, hardshipCap, nextSeasonPerkSlots, nextSeasonTuneUpPoints, planPurchases, scrapAward, teamAward, type TeamChoices } from "@/core/layers";
import type { DisciplineId, GameState, SkillId } from "@/core/types";
import { num } from "../format";
import { useGame } from "../store";

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
  const slots = isTeam ? 2 + (game.team.upgrades.legacy_ledger ?? 0) + ((game.meta.hardshipMastery.rookie_plates ?? 0) > 0 ? 1 : 0) : nextSeasonPerkSlots(game);
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
  const spent = SKILLS.reduce((sum, s) => sum + tune[s.id], 0);

  const shelf = PERKS.filter((p) => p.unlock.type === "lp" || game.meta.perksUnlocked.includes(p.id));
  const locked = PERKS.filter((p) => !shelf.includes(p));
  const gate = LAYERS[layer].gate(game);

  const confirm = () => {
    const base = { buy, perks: equip, tuneUp: tune, dare, hardships };
    const choices = isTeam ? ({ ...base, discipline, teamName, colors: [colorA, colorB], keepCrewId: keepCrew || null } satisfies TeamChoices) : base;
    if (dispatch({ type: "reset", layer, choices })) onDone();
  };

  return (
    <div className="planner">
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

      <fieldset>
        <legend>
          Perk shelf · <span className="num">{num(lpLeft)}</span> LP to spend
        </legend>
        <ul className="perks">
          {shelf.map((p) => {
            const rank = ranks[p.id] ?? 0;
            const cost = p.cost[rank];
            const canBuy = rank < p.maxRank && cost !== undefined && lpLeft >= cost;
            const isEquipped = equip.includes(p.id);
            return (
              <li key={p.id} className={isEquipped ? "equipped" : ""}>
                <div>
                  <strong>{p.name}</strong> <span className="chip">{p.kind}</span>
                  {p.maxRank > 1 && (
                    <span className="muted num">
                      {" "}
                      rank {rank}/{p.maxRank}
                    </span>
                  )}
                  <p className="blurb">{p.text}</p>
                </div>
                <div className="perk-actions">
                  {rank < p.maxRank && (
                    <button className="btn small" disabled={!canBuy} onClick={() => setBuy([...buy, p.id])}>
                      Buy · {cost} LP
                    </button>
                  )}
                  {rank > 0 && (
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={isEquipped}
                        disabled={!isEquipped && equip.length >= slots}
                        onChange={(e) => setEquip(e.target.checked ? [...equip, p.id] : equip.filter((id) => id !== p.id))}
                      />
                      Equip
                    </label>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <p className="hint">
          {equip.length}/{slots} slots used.{" "}
          {buy.length > 0 && (
            <button className="link-btn" onClick={() => setBuy([])}>
              Undo purchases
            </button>
          )}
        </p>
        {locked.length > 0 && (
          <p className="hint">
            Still to unlock:{" "}
            {locked
              .map((p) => (p.unlock.type === "dare" ? `${p.name} (dare)` : p.unlock.type === "milestone" ? `${p.name} (win the ${p.unlock.venueId} Feature)` : p.name))
              .join(", ")}
            .
          </p>
        )}
      </fieldset>

      <fieldset>
        <legend>
          Tune-up points · {spent}/{points}
        </legend>
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

      {teamEraNext && (
        <fieldset>
          <legend>
            Hardships (optional, up to {hardshipCap(game)})
          </legend>
          {HARDSHIPS.map((h) => (
            <label key={h.id} className="check">
              <input
                type="checkbox"
                checked={hardships.includes(h.id)}
                disabled={!hardships.includes(h.id) && hardships.length >= hardshipCap(game)}
                onChange={(e) => setHardships(e.target.checked ? [...hardships, h.id] : hardships.filter((x) => x !== h.id))}
              />
              <span>
                <strong>{h.name}</strong>: {h.rule} Reward: {h.reward}. <span className="muted">Done {game.meta.hardshipMastery[h.id] ?? 0}×</span>
              </span>
            </label>
          ))}
        </fieldset>
      )}

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
          <div className="disciplines">
            {(Object.keys(DISCIPLINES) as DisciplineId[]).map((id) => (
              <label key={id} className={`card choice ${discipline === id ? "on" : ""}`}>
                <input type="radio" name="discipline" checked={discipline === id} onChange={() => setDiscipline(id)} />
                <strong>{DISCIPLINES[id].name}</strong>
                <p className="blurb">{DISCIPLINES[id].blurb}</p>
                <p className="muted small">Mastery: {DISCIPLINES[id].mastery.text}. You have {game.meta.disciplineMastery[id] ?? 0} levels.</p>
              </label>
            ))}
          </div>
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
        <button className="btn primary big" disabled={!gate.ok} onClick={confirm}>
          {isTeam ? (game.era ? "Fold the team and start over" : "Found the team") : "End the Season: Scrap Reset"}
        </button>
        <button className="btn" onClick={onDone}>
          Not yet
        </button>
        {!gate.ok && <span className="why">{gate.reason}</span>}
      </div>
    </div>
  );
}
