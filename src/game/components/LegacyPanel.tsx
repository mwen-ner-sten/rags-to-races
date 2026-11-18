"use client";

import { useState } from "react";
import { challengeVehicleFit } from "@/core/challenges";
import { VENUES, venueName } from "@/core/content/events";
import { SEASON_CHALLENGES, SEASON_CHALLENGE_IDS, challengeMastery, findChallengePerk, isSeasonChallenge } from "@/core/content/modifiers";
import { LAYERS, perkSlots, scrapAward } from "@/core/layers";
import type { GameState, SeasonChallengeId } from "@/core/types";
import { duration, num, pct } from "../format";
import { useGame } from "../store";
import { ResetPlanner } from "./ResetPlanner";
import { CountyBatonStatus } from "./CountyBaton";
import { FREIGHT_COST } from "@/core/countyBaton";

export function LegacyPanel({ initialObjective }: { initialObjective?: SeasonChallengeId }) {
  const game = useGame((s) => s.game);
  const [planning, setPlanning] = useState<SeasonChallengeId | boolean>(initialObjective ?? false);
  if (!game) return null;
  const gate = LAYERS.scrap.gate(game);
  const discipline = game.era?.discipline ?? "dirt";
  if (planning) {
    return (
      <section className="section" aria-labelledby="plan-h">
        <h2 id="plan-h">Plan the Scrap Reset</h2>
        <ResetPlanner layer="scrap" initialObjective={typeof planning === "string" ? planning : undefined} onDone={() => setPlanning(false)} />
      </section>
    );
  }
  return (
    <section className="section" aria-labelledby="legacy-h">
      <h2 id="legacy-h">Legacy</h2>
      <p className="sub">
        Win the County Fair Feature and you can end the Season: scrap it all, keep what you learned, and spend Legacy Points on perks. Stop at the Fair for a quick Season, or push on to the Regional and State for a bigger one.
        {discipline === "rally" && " A County Forest regularity certificate also qualifies. Each certified Feature earns half its normal points until you win it outright."}
      </p>
      <dl className="facts wide">
        <div>
          <dt>Legacy Points</dt>
          <dd className="num">{num(game.scrap.lp)}</dd>
        </div>
        <div>
          <dt>This Season would add</dt>
          <dd className="num">{num(scrapAward(game))}</dd>
        </div>
        <div>
          <dt>Scrap Resets</dt>
          <dd className="num">{game.scrap.resets}</dd>
        </div>
      </dl>
      {game.config.salvageSlot && <p className="hint">Salvage carryover took one perk slot this Season. {perkSlots(game)} slots are available for perks.</p>}
      {game.config.countyFreight && <p className="hint">The county freight permit cost {FREIGHT_COST} Legacy Points this Season. All {perkSlots(game)} perk slots are available.</p>}
      <SeasonChallenges game={game} />
      <CountyBatonStatus game={game} />
      <h3 className="label">Milestones this Season</h3>
      <ul className="milestones">
        {VENUES.map((v) => {
          const at = game.run.featureWins[v.id];
          const certified = game.run.regularityFeatures?.[v.id];
          const record = game.meta.records[v.id];
          return (
            <li key={v.id} className={at !== undefined || certified !== undefined ? "done" : ""}>
              <span>{venueName(v.id, discipline)} Feature</span>
              <span className="num">{at === undefined && certified !== undefined ? Math.ceil(v.lp / 2) : v.lp} Legacy Points</span>
              <span className="muted">{at !== undefined ? `won at ${duration(at)}` : certified !== undefined ? `certified at ${duration(certified)}` : record !== undefined ? `best: ${duration(record)}` : ""}</span>
            </li>
          );
        })}
      </ul>
      <p className="hint">Beat your best time to a milestone and it pays 25% more.</p>
      <div className="actions">
        <button className="btn primary big" disabled={!gate.ok} onClick={() => setPlanning(true)}>
          Plan the Scrap Reset
        </button>
        {!gate.ok && <span className="why">{gate.reason}</span>}
      </div>
    </section>
  );
}

function SeasonChallenges({ game }: { game: GameState }) {
  const active = game.config.dare;
  const current = isSeasonChallenge(active) ? SEASON_CHALLENGES[active] : null;
  const records = SEASON_CHALLENGE_IDS.filter((id) => !!game.meta.challengeRecords[id]);
  if (!current && !records.length) return null;

  const { challenge, vehicles } = game.run;
  const target = active === "parts_with_a_past" || challenge.relay?.length || challenge.handMeDownEngines?.length ? "county_fair" : "dirt";
  const targetLabel = venueName(target, game.era?.discipline ?? "dirt");
  const cars = vehicles.flatMap((vehicle) => {
    const fit = challengeVehicleFit(game, target, vehicle);
    return fit ? [{ vehicle, fit }] : [];
  });
  return (
    <>
      <h3 className="label">Season challenges</h3>
      {current && (
        <>
          <p><strong>{current.name}</strong> · {challenge.completedAt === undefined ? "In progress" : `Completed in ${duration(challenge.completedAt)}`}</p>
          {challenge.completedAt === undefined && (
            <>
              <p className="hint">{current.text} A repeat Feature win counts.</p>
              {cars.length > 0 && (
                <ul className="milestones">
                  {cars.map(({ vehicle, fit }) => <li key={vehicle.uid}><span>{vehicle.name} · {targetLabel}</span><span className={fit.ready ? "muted" : "why"}>{fit.text}</span></li>)}
                </ul>
              )}
            </>
          )}
        </>
      )}
      {records.length > 0 && (
        <ul className="milestones">
          {records.map((id) => {
            const record = game.meta.challengeRecords[id]!;
            const challenge = SEASON_CHALLENGES[id];
            const perk = findChallengePerk(id);
            return (
              <li key={id}>
                <span>{challenge.name} · {record.completions}×</span>
                <span className="num">+{pct(challengeMastery(record.completions))} {challenge.mastery.toLowerCase()}</span>
                <span className="muted">Best {duration(record.bestSeasonMs)} with {record.bestVehicleName}</span>
                {perk?.unlock.type === "challenge" && record.completions >= perk.unlock.completions && <span className="muted">Unlocked {perk.name}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
