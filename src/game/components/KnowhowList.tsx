"use client";

import { KNOWHOW } from "@/core/content/knowhow";
import { jobBlocker } from "@/core/jobs";
import { knowhowTier, studyMs } from "@/core/knowhowEngine";
import type { GameState } from "@/core/types";
import { duration } from "../format";
import { useGame } from "../store";

const TIER_TEXT = { learning: "Learning", familiar: "Familiar", second_nature: "Second Nature" } as const;

/** Techniques and plans you can study. Places are opened from Trips, so they aren't listed here. */
export function KnowhowList({ game }: { game: GameState }) {
  const dispatch = useGame((s) => s.dispatch);
  const rows = KNOWHOW.filter((k) => k.kind !== "place");
  return (
    <section className="section" aria-labelledby="knowhow-h">
      <h2 id="knowhow-h">Know-how</h2>
      <p className="sub">
        The first time, you work it out yourself: a long study job. Next Season it’s Familiar and takes a quarter of the time. After three Seasons it’s Second Nature and you just know it when the moment comes.
      </p>
      <ul className="knowhow">
        {rows.map((k) => {
          const learned = game.run.learned.includes(k.id);
          const available = game.run.available.includes(k.id);
          const tier = knowhowTier(game, k.id);
          const blocker = jobBlocker(game, { kind: "study", knowhowId: k.id });
          return (
            <li key={k.id} className={learned ? "learned" : available ? "ready" : "locked"}>
              <div>
                <strong>{k.name}</strong> <span className="chip">{TIER_TEXT[tier]}</span>
                <p className="blurb">{k.blurb}</p>
                {!learned && !available && <p className="why">{k.hint}</p>}
              </div>
              {learned ? (
                <span className="chip win">Known</span>
              ) : available ? (
                <div className="row-action">
                  <button className="btn small primary" disabled={!!blocker} onClick={() => dispatch({ type: "enqueue", spec: { kind: "study", knowhowId: k.id } })}>
                    Study · {duration(studyMs(game, k.id))}
                  </button>
                  {blocker && <span className="why">{blocker}</span>}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
