"use client";

import { useState } from "react";
import { VENUES, venueName } from "@/core/content/events";
import { LAYERS, scrapAward } from "@/core/layers";
import { duration, num } from "../format";
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
      <h3 className="label">Milestones this Season</h3>
      <ul className="milestones">
        {VENUES.map((v) => {
          const at = game.run.featureWins[v.id];
          const record = game.meta.records[v.id];
          return (
            <li key={v.id} className={at !== undefined ? "done" : ""}>
              <span>{venueName(v.id, discipline)} Feature</span>
              <span className="num">{v.lp} LP</span>
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
