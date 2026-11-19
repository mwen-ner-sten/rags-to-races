"use client";

import { counterBlocker } from "@/core/actions";
import { PARTS } from "@/core/content/parts";
import { counterPrice } from "@/core/garage";
import type { GameState } from "@/core/types";
import { num } from "../format";
import { useGame } from "../store";

export function PartsCounter({ game }: { game: GameState }) {
  const dispatch = useGame((s) => s.dispatch);
  const seen = PARTS.filter((p) => (game.meta.codex.parts[p.id] ?? 0) > 0 && p.category !== "junk" && p.category !== "body");
  const buyable = seen.filter((p) => {
    const reason = counterBlocker(game, p.id);
    return !reason || reason.startsWith("Needs");
  });
  return (
    <section className="section" aria-labelledby="counter-h">
      <h2 id="counter-h">Parts counter</h2>
      <p className="sub">Orders any part you’ve seen, in Good condition, for three times its value.</p>
      {buyable.length === 0 && <p className="empty">Nothing to order yet. Parts turn up here once you’ve found one on a trip.</p>}
      <div className="grid-list">
        {buyable.map((p) => (
          <div key={p.id} className="row-card">
            <div>
              <strong>{p.name}</strong> <span className="muted">T{p.tier} {p.category}</span>
            </div>
            <div className="row-action">
              <button className="btn small wrap" disabled={!!counterBlocker(game, p.id)} onClick={() => dispatch({ type: "buyPart", partId: p.id })}>
                {num(counterPrice(game, p.id))} Scrap Bucks
              </button>
              {counterBlocker(game, p.id) && <span className="why">{counterBlocker(game, p.id)}</span>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
