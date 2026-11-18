"use client";

import { useState } from "react";
import { haulOriginsOn } from "@/core/challenges";
import { VENUES, getVenue, venueName } from "@/core/content/events";
import { SEASON_CHALLENGES, SEASON_CHALLENGE_IDS, challengeMastery, isSeasonChallenge } from "@/core/content/modifiers";
import { getVehicle } from "@/core/content/vehicles";
import { LAYERS, scrapAward } from "@/core/layers";
import type { GameState } from "@/core/types";
import { duration, num, pct } from "../format";
import { useGame } from "../store";
import { ResetPlanner } from "./ResetPlanner";

export function LegacyPanel() {
  const game = useGame((s) => s.game);
  const [planning, setPlanning] = useState(false);
  if (!game) return null;
  const gate = LAYERS.scrap.gate(game);
  const discipline = game.era?.discipline ?? "dirt";
  if (planning) {
    return (
      <section className="section" aria-labelledby="plan-h">
        <h2 id="plan-h">Plan the Scrap Reset</h2>
        <ResetPlanner layer="scrap" onDone={() => setPlanning(false)} />
      </section>
    );
  }
  return (
    <section className="section" aria-labelledby="legacy-h">
      <h2 id="legacy-h">Legacy</h2>
      <p className="sub">
        Win the County Fair Feature and you can end the Season: scrap it all, keep what you learned, and spend Legacy Points on perks. Stop at the Fair for a quick Season, or push on to the Regional and State for a bigger one.
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
      <SeasonChallenges game={game} />
      <h3 className="label">Milestones this Season</h3>
      <ul className="milestones">
        {VENUES.map((v) => {
          const at = game.run.featureWins[v.id];
          const record = game.meta.records[v.id];
          return (
            <li key={v.id} className={at !== undefined ? "done" : ""}>
              <span>{venueName(v.id, discipline)} Feature</span>
              <span className="num">{v.lp} Legacy Points</span>
              <span className="muted">{at !== undefined ? `won at ${duration(at)}` : record !== undefined ? `best: ${duration(record)}` : ""}</span>
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
  const relayCars = vehicles.filter((vehicle) => challenge.relay?.some((entry) => (
    entry.vehicleUid === vehicle.uid && entry.frameUid === vehicle.parts.frame?.uid
  )));
  const [minTier, maxTier] = getVenue("county_fair").tiers;
  const fairCars = vehicles.filter((vehicle) => {
    const tier = getVehicle(vehicle.vehicleId).tier;
    return tier >= minTier && tier <= maxTier;
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
              {active === "homebuilt_relay" && relayCars.length > 0 && (
                <p className="hint">Qualified at the Dirt Track · {relayCars.map((vehicle) => vehicle.name).join(", ")}</p>
              )}
              {active === "parts_with_a_past" && fairCars.length > 0 && (
                <ul className="milestones">
                  {fairCars.map((vehicle) => {
                    const origins = haulOriginsOn(vehicle);
                    return <li key={vehicle.uid}><span>{vehicle.name} · {origins.length} haul locations</span><span className="muted">{origins.join(", ")}</span></li>;
                  })}
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
            return (
              <li key={id}>
                <span>{challenge.name} · {record.completions}×</span>
                <span className="num">+{pct(challengeMastery(record.completions))} {challenge.mastery.toLowerCase()}</span>
                <span className="muted">Best {duration(record.bestSeasonMs)} with {record.bestVehicleName}</span>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
