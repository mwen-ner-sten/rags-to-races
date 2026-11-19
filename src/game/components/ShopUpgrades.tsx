"use client";

import { TEAM_UPGRADES } from "@/core/content/team";
import type { GameState } from "@/core/types";
import { num } from "../format";
import { useGame } from "../store";

/** Permanent team upgrades, bought with Team Points. */
export function ShopUpgrades({ game }: { game: GameState }) {
  const dispatch = useGame((s) => s.dispatch);
  return (
    <section className="section" aria-labelledby="upgrades-h">
      <h2 id="upgrades-h">Shop upgrades</h2>
      <p className="sub">Bought with Team Points. You have <span className="num">{num(game.team.tp)}</span>. Team upgrades stay through every reset.</p>
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
              <div className="row-action">
                <button className="btn wrap" disabled={cost === undefined || game.team.tp < cost} onClick={() => dispatch({ type: "buyTeamUpgrade", upgradeId: u.id })}>
                  {cost === undefined ? "Built" : `${cost} Team Points`}
                </button>
                {cost !== undefined && game.team.tp < cost && <span className="why">Needs {cost - game.team.tp} more Team Points</span>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
